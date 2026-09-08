import express from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

import {APP_VERSION} from '../lib/version.js';
const router=express.Router();

function addMonths(date,months){
  const d=new Date(date);
  const day=d.getUTCDate();
  const result=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+months,1,0,0,0,0));
  const last=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();
  result.setUTCDate(Math.min(day,last));
  return result;
}
function addYears(date,years){
  const d=new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear()+years,d.getUTCMonth(),d.getUTCDate(),0,0,0,0));
}
function nextCycleDate(from,cycle){return cycle==='ANNUAL'?addYears(from,1):addMonths(from,1)}
function planPrice(plan,cycle){return Number(cycle==='ANNUAL'?(plan.annualPrice??Number(plan.monthlyPrice)*10):plan.monthlyPrice)}
function daysBetween(a,b){return Math.max(1,(new Date(b)-new Date(a))/86400000)}
function roundMoney(n){return Math.round((Number(n)+Number.EPSILON)*100)/100}

async function auditBilling(req,action,entity,entityId,description,metadata=null){
  await prisma.auditLog.create({
    data:{
      userId:req.auth?.sub||null,
      action,
      entity,
      entityId:entityId||null,
      description,
      ipAddress:req.ip||null,
      metadata:metadata||undefined
    }
  });
}

router.get('/health',(_req,res)=>res.json({ok:true,module:'billing',version:APP_VERSION}));

async function syncCompanyModules(tx,companyId,plan,now){
  const enabledIds=new Set(plan.modules.filter(x=>x.enabled).map(x=>x.moduleId));
  const modules=await tx.module.findMany({where:{active:true},select:{id:true}});
  for(const module of modules){
    const enabled=enabledIds.has(module.id);
    await tx.companyModule.upsert({
      where:{companyId_moduleId:{companyId,moduleId:module.id}},
      update:{enabled,enabledAt:enabled?now:undefined},
      create:{companyId,moduleId:module.id,enabled,enabledAt:now},
    });
  }
}

router.get('/dashboard',requireAuth,requirePermission('modules.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const subscription=await prisma.companySubscription.findFirst({
      where:{companyId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},
      orderBy:{startedAt:'desc'},
      include:{
        plan:{include:{modules:{include:{module:true}},limits:true}},
        scheduledPlan:true
      }
    });
    const invoices=await prisma.billingInvoice.findMany({
      where:{companyId},
      orderBy:{createdAt:'desc'},
      take:12,
      include:{lines:true,payments:{orderBy:{attemptedAt:'desc'},take:1}}
    });
    const credits=await prisma.billingCredit.findMany({where:{companyId,remaining:{gt:0}},orderBy:{createdAt:'desc'}});
    const methods=await prisma.billingPaymentMethod.findMany({where:{companyId,active:true},orderBy:[{isDefault:'desc'},{createdAt:'desc'}]});
    const changes=await prisma.subscriptionChange.findMany({
      where:{companyId},orderBy:{createdAt:'desc'},take:20,
      include:{fromPlan:true,toPlan:true}
    });
    res.json({subscription,invoices,credits,methods,changes});
  }catch(e){next(e)}
});

router.post('/change-plan',requireAuth,requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const schema=z.object({
      planId:z.string().cuid(),
      billingCycle:z.enum(['MONTHLY','ANNUAL']).optional(),
    });
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.flatten()});

    const companyId=req.auth.companyId;
    const userId=req.auth.sub;
    const now=new Date();

    const current=await prisma.companySubscription.findFirst({
      where:{companyId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},
      orderBy:{startedAt:'desc'},
      include:{plan:{include:{modules:true}}}
    });
    if(!current)return res.status(409).json({error:'La empresa no tiene una suscripción activa.'});

    const target=await prisma.subscriptionPlan.findFirst({
      where:{id:parsed.data.planId,active:true},
      include:{modules:true,limits:true}
    });
    if(!target)return res.status(404).json({error:'Plan no encontrado.'});

    const cycle=parsed.data.billingCycle??current.billingCycle??'MONTHLY';
    if(current.planId===target.id && cycle===current.billingCycle){
      return res.status(409).json({error:'El plan y ciclo seleccionados ya están activos.'});
    }

    const currentPrice=planPrice(current.plan,current.billingCycle);
    const targetPrice=planPrice(target,cycle);
    const isUpgrade=targetPrice>currentPrice;
    const type=current.planId===target.id?'CYCLE_CHANGE':isUpgrade?'UPGRADE':'DOWNGRADE';

    if(type==='DOWNGRADE'){
      const effectiveAt=current.currentPeriodEnd??current.nextBillingAt;
      if(!effectiveAt)return res.status(409).json({error:'La suscripción actual no tiene fin de periodo definido.'});

      const change=await prisma.$transaction(async tx=>{
        await tx.subscriptionChange.updateMany({
          where:{subscriptionId:current.id,status:'PENDING'},
          data:{status:'CANCELLED'}
        });
        const created=await tx.subscriptionChange.create({
          data:{
            companyId,subscriptionId:current.id,fromPlanId:current.planId,toPlanId:target.id,
            requestedById:userId,type:'DOWNGRADE',status:'PENDING',effectiveAt,
            metadata:{billingCycle:cycle}
          },include:{fromPlan:true,toPlan:true}
        });
        await tx.companySubscription.update({
          where:{id:current.id},
          data:{scheduledPlanId:target.id,scheduledChangeAt:effectiveAt}
        });
        return created;
      });
      await auditBilling(req,'SCHEDULE','CompanySubscription',current.id,
        `Downgrade programado a ${target.name}`,
        {fromPlanId:current.planId,toPlanId:target.id,effectiveAt});
      return res.status(202).json({
        mode:'scheduled',change,
        message:`El plan ${target.name} se aplicará al terminar el periodo actual.`
      });
    }

    const periodStart=current.currentPeriodStart??current.startedAt;
    const periodEnd=current.currentPeriodEnd??current.nextBillingAt??nextCycleDate(periodStart,current.billingCycle);
    const totalDays=daysBetween(periodStart,periodEnd);
    const remainingDays=Math.max(0,daysBetween(now,periodEnd));
    const remainingRatio=Math.min(1,remainingDays/totalDays);

    const credit=roundMoney(currentPrice*remainingRatio);
    const proratedTarget=roundMoney(targetPrice*remainingRatio);
    const charge=roundMoney(Math.max(0,proratedTarget-credit));
    const nextAt=periodEnd;

    const result=await prisma.$transaction(async tx=>{
      const invoiceNo=`BILL-${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${Date.now().toString().slice(-6)}`;
      const invoice=await tx.billingInvoice.create({
        data:{
          companyId,subscriptionId:current.id,number:invoiceNo,status:charge>0?'OPEN':'PAID',
          currency:target.currency??'MXN',subtotal:charge,tax:0,total:charge,
          dueAt:now,paidAt:charge===0?now:null,periodStart:now,periodEnd:nextAt,
          lines:{create:[
            {type:'CREDIT',description:`Crédito proporcional ${current.plan.name}`,quantity:1,unitAmount:-credit,amount:-credit},
            {type:'PRORATION',description:`Cargo proporcional ${target.name}`,quantity:1,unitAmount:proratedTarget,amount:proratedTarget},
          ]}
        },include:{lines:true}
      });

      const change=await tx.subscriptionChange.create({
        data:{
          companyId,subscriptionId:current.id,fromPlanId:current.planId,toPlanId:target.id,
          requestedById:userId,type,status:'APPLIED',effectiveAt:now,appliedAt:now,
          proratedAmount:proratedTarget,creditAmount:credit,chargeAmount:charge,
          metadata:{billingCycle:cycle,remainingRatio}
        }
      });

      const updated=await tx.companySubscription.update({
        where:{id:current.id},
        data:{
          planId:target.id,billingCycle:cycle,scheduledPlanId:null,scheduledChangeAt:null,
          currentPeriodEnd:nextAt,nextBillingAt:nextAt,planChangeLockedUntil:null
        },
        include:{plan:true}
      });

      await syncCompanyModules(tx,companyId,target,now);
      return {invoice,change,subscription:updated};
    });

    await auditBilling(req,'CHANGE_PLAN','CompanySubscription',current.id,
      `Cambio inmediato de plan a ${target.name}`,
      {fromPlanId:current.planId,toPlanId:target.id,cycle,charge});
    return res.status(201).json({
      mode:'immediate',
      ...result,
      message:`${target.name} quedó activo inmediatamente. Cargo prorrateado: ${charge.toFixed(2)} ${target.currency??'MXN'}.`
    });
  }catch(e){next(e)}
});

router.post('/apply-scheduled',requireAuth,requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const now=new Date();
    const current=await prisma.companySubscription.findFirst({
      where:{companyId,status:{in:['ACTIVE','PAST_DUE']},scheduledPlanId:{not:null},scheduledChangeAt:{lte:now}},
      orderBy:{startedAt:'desc'}
    });
    if(!current)return res.status(404).json({error:'No hay cambio programado listo para aplicar.'});

    const target=await prisma.subscriptionPlan.findUnique({where:{id:current.scheduledPlanId},include:{modules:true}});
    if(!target)return res.status(404).json({error:'Plan programado no encontrado.'});

    const result=await prisma.$transaction(async tx=>{
      const change=await tx.subscriptionChange.findFirst({
        where:{subscriptionId:current.id,status:'PENDING'},
        orderBy:{createdAt:'desc'}
      });
      const cycle=change?.metadata?.billingCycle??current.billingCycle;
      const nextAt=nextCycleDate(now,cycle);

      await tx.companySubscription.update({
        where:{id:current.id},
        data:{
          planId:target.id,billingCycle:cycle,currentPeriodStart:now,currentPeriodEnd:nextAt,
          nextBillingAt:nextAt,scheduledPlanId:null,scheduledChangeAt:null
        }
      });
      if(change)await tx.subscriptionChange.update({where:{id:change.id},data:{status:'APPLIED',appliedAt:now,effectiveAt:now}});
      await syncCompanyModules(tx,companyId,target,now);
      return {target,nextAt};
    });
    await auditBilling(req,'APPLY_SCHEDULED','CompanySubscription',current.id,
      `Cambio programado aplicado: ${result.target.name}`,
      {planId:result.target.id,nextBillingAt:result.nextAt});
    res.json({message:`Cambio programado aplicado: ${result.target.name}.`,nextBillingAt:result.nextAt});
  }catch(e){next(e)}
});

router.post('/payment-methods',requireAuth,requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const schema=z.object({
      provider:z.string().min(2),
      externalId:z.string().optional().nullable(),
      brand:z.string().optional().nullable(),
      last4:z.string().length(4).optional().nullable(),
      expMonth:z.number().int().min(1).max(12).optional().nullable(),
      expYear:z.number().int().min(2026).optional().nullable(),
      isDefault:z.boolean().optional().default(true),
    });
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.flatten()});
    const companyId=req.auth.companyId;
    const method=await prisma.$transaction(async tx=>{
      if(parsed.data.isDefault){
        await tx.billingPaymentMethod.updateMany({where:{companyId},data:{isDefault:false}});
      }
      return tx.billingPaymentMethod.create({data:{companyId,...parsed.data}});
    });
    await auditBilling(req,'CREATE','BillingPaymentMethod',method.id,
      `Método de pago registrado (${method.provider})`,
      {provider:method.provider,last4:method.last4||null,isDefault:method.isDefault});
    res.status(201).json(method);
  }catch(e){next(e)}
});

export default router;
