import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const moduleSchema=z.object({
  key:z.string().trim().min(2).max(80).regex(/^[a-z0-9._-]+$/),
  name:z.string().trim().min(2).max(120),
  description:z.string().trim().max(1000).optional().nullable(),
  category:z.string().trim().max(80).optional().nullable(),
  icon:z.string().trim().max(80).optional().nullable(),
  route:z.string().trim().max(120).optional().nullable(),
  active:z.boolean().default(true),
  sortOrder:z.coerce.number().int().min(0).default(0),
});

const planSchema=z.object({
  key:z.string().trim().min(2).max(60).regex(/^[a-z0-9._-]+$/),
  name:z.string().trim().min(2).max(120),
  description:z.string().trim().max(1000).optional().nullable(),
  monthlyPrice:z.coerce.number().min(0).default(0),
  annualPrice:z.coerce.number().min(0).default(0),
  currency:z.string().trim().min(3).max(3).default('MXN'),
  active:z.boolean().default(true),
  sortOrder:z.coerce.number().int().min(0).default(0),
  moduleIds:z.array(z.string().cuid()).default([]),
});


function normalizeBillingDay(value){
  const day=Number(value);
  if(!Number.isInteger(day))return 1;
  return Math.min(Math.max(day,1),28);
}

function getNextBillingDate(from,billingDay){
  const source=new Date(from);
  const day=normalizeBillingDay(billingDay);
  const candidate=new Date(source);
  candidate.setHours(0,0,0,0);
  candidate.setDate(day);
  if(candidate<=source){
    candidate.setMonth(candidate.getMonth()+1);
    candidate.setDate(day);
  }
  return candidate;
}

function serializeSubscription(subscription){
  if(!subscription)return null;
  const plain={...subscription};
  if(plain.plan){
    plain.plan={...plain.plan};
    for(const field of ['monthlyPrice','annualPrice']){
      if(plain.plan[field]!=null&&typeof plain.plan[field]?.toNumber==='function'){
        plain.plan[field]=plain.plan[field].toNumber();
      }
    }
    if(Array.isArray(plain.plan.limits)){
      plain.plan.limits=plain.plan.limits.map(limit=>({
        ...limit,
        limitValue:typeof limit.limitValue?.toNumber==='function'
          ?limit.limitValue.toNumber()
          :limit.limitValue
      }));
    }
  }
  return plain;
}

async function audit(req, action, entity, entityId, description){
  await prisma.auditLog.create({data:{userId:req.auth.sub,action,entity,entityId,description,ipAddress:req.ip}});
}

router.get('/dashboard',requirePermission('modules.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [modules,companyModules,plans,subscriptions,overrides,usage]=await Promise.all([
      prisma.module.findMany({
        where:{active:true},
        include:{features:true},
        orderBy:[{sortOrder:'asc'},{name:'asc'}],
      }),
      prisma.companyModule.findMany({
        where:{companyId},
        include:{module:{include:{features:true}},features:{include:{feature:true}}},
      }),
      prisma.subscriptionPlan.findMany({
        where:{active:true},
        include:{modules:{include:{module:true}},limits:true},
        orderBy:[{sortOrder:'asc'},{monthlyPrice:'asc'}],
      }),
      prisma.companySubscription.findMany({
        where:{companyId},
        include:{plan:{include:{modules:{include:{module:true}},limits:true}}},
        orderBy:{createdAt:'desc'},
      }),
      prisma.companyFeatureLimit.findMany({where:{companyId},orderBy:{metricKey:'asc'}}),
      prisma.usageRecord.findMany({where:{companyId},orderBy:{periodStart:'desc'},take:100}),
    ]);

    companyModules.sort((a,b)=>
      (a.module?.sortOrder??0)-(b.module?.sortOrder??0) ||
      String(a.module?.name??'').localeCompare(String(b.module?.name??''),'es')
    );
    const currentSubscription=subscriptions.find(s=>['TRIAL','ACTIVE','PAST_DUE'].includes(s.status))||subscriptions[0]||null;
    const enabled=companyModules.filter(m=>m.enabled).length;
    const available=modules.length;
    res.json({
      ok:true,
      modules,
      companyModules,
      plans,
      subscriptions,
      currentSubscription: serializeSubscription(currentSubscription),
      overrides,
      usage,
      summary:{
        modulesAvailable:available,
        modulesEnabled:enabled,
        modulesDisabled:Math.max(0,available-enabled),
        plan:currentSubscription?.plan?.name||'Sin plan',
        status:currentSubscription?.status||'NONE',
      },
    });
  }catch(error){next(error)}
});

router.post('/catalog',requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const parsed=moduleSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const module=await prisma.module.create({data:{...parsed.data,key:parsed.data.key.toLowerCase(),description:parsed.data.description||null,category:parsed.data.category||null,icon:parsed.data.icon||null,route:parsed.data.route||null}});
    await audit(req,'CREATE','Module',module.id,`Módulo creado: ${module.key}`);
    res.status(201).json({ok:true,module});
  }catch(error){
    if(error.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese módulo'});
    next(error)
  }
});

router.put('/company/:moduleId',requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({enabled:z.boolean(),expiresAt:z.coerce.date().optional().nullable(),settings:z.any().optional().nullable()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Configuración inválida'});
    const module=await prisma.module.findUnique({where:{id:req.params.moduleId}});
    if(!module)return res.status(404).json({ok:false,message:'Módulo no encontrado'});
    const companyModule=await prisma.companyModule.upsert({
      where:{companyId_moduleId:{companyId:req.auth.companyId,moduleId:module.id}},
      update:{enabled:parsed.data.enabled,expiresAt:parsed.data.expiresAt||null,settings:parsed.data.settings??undefined,enabledAt:parsed.data.enabled?new Date():undefined},
      create:{companyId:req.auth.companyId,moduleId:module.id,enabled:parsed.data.enabled,expiresAt:parsed.data.expiresAt||null,settings:parsed.data.settings??undefined},
      include:{module:true},
    });
    await audit(req,'UPDATE','CompanyModule',companyModule.id,`${module.name}: ${parsed.data.enabled?'activado':'desactivado'}`);
    res.json({ok:true,companyModule});
  }catch(error){next(error)}
});

router.put('/company/:companyModuleId/features/:featureId',requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({enabled:z.boolean(),settings:z.any().optional().nullable()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Configuración inválida'});
    const cm=await prisma.companyModule.findFirst({where:{id:req.params.companyModuleId,companyId:req.auth.companyId}});
    if(!cm)return res.status(404).json({ok:false,message:'Módulo de empresa no encontrado'});
    const feature=await prisma.moduleFeature.findFirst({where:{id:req.params.featureId,moduleId:cm.moduleId}});
    if(!feature)return res.status(404).json({ok:false,message:'Feature no encontrada'});
    const row=await prisma.companyModuleFeature.upsert({
      where:{companyModuleId_featureId:{companyModuleId:cm.id,featureId:feature.id}},
      update:{enabled:parsed.data.enabled,settings:parsed.data.settings??undefined},
      create:{companyModuleId:cm.id,featureId:feature.id,enabled:parsed.data.enabled,settings:parsed.data.settings??undefined},
      include:{feature:true},
    });
    res.json({ok:true,feature:row});
  }catch(error){next(error)}
});

router.post('/plans',requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const parsed=planSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const existingCount=await prisma.module.count({where:{id:{in:parsed.data.moduleIds}}});
    if(existingCount!==parsed.data.moduleIds.length)return res.status(400).json({ok:false,message:'Uno o más módulos no existen'});
    const plan=await prisma.subscriptionPlan.create({
      data:{
        key:parsed.data.key.toLowerCase(),
        name:parsed.data.name,
        description:parsed.data.description||null,
        monthlyPrice:parsed.data.monthlyPrice,
        annualPrice:parsed.data.annualPrice,
        currency:parsed.data.currency.toUpperCase(),
        active:parsed.data.active,
        sortOrder:parsed.data.sortOrder,
        modules:{create:parsed.data.moduleIds.map(moduleId=>({moduleId,enabled:true}))},
      },
      include:{modules:{include:{module:true}}},
    });
    await audit(req,'CREATE','SubscriptionPlan',plan.id,`Plan creado: ${plan.name}`);
    res.status(201).json({ok:true,plan});
  }catch(error){
    if(error.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese plan'});
    next(error)
  }
});

router.post('/subscriptions', requireAuth, requirePermission('modules.manage'), async (req, res, next) => {
  try {
    const schema = z.object({
      planId: z.string().cuid(),
      billingDay: z.number().int().min(1).max(28),
      notes: z.string().trim().max(1000).optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({error: parsed.error.flatten()});
    }

    const companyId = req.auth.companyId;
    const userId = req.auth.sub;
    const now = new Date();
    const billingDay = normalizeBillingDay(parsed.data.billingDay);

    const plan = await prisma.subscriptionPlan.findFirst({
      where: {id: parsed.data.planId, active: true},
      include: {modules: true, limits: true},
    });

    if (!plan) {
      return res.status(404).json({error: 'Plan no encontrado o inactivo.'});
    }

    const current = await prisma.companySubscription.findFirst({
      where: {
        companyId,
        status: {in: ['TRIAL', 'ACTIVE', 'PAST_DUE']},
      },
      orderBy: {startedAt: 'desc'},
      include: {plan: true},
    });

    if (current?.planChangeLockedUntil && now < new Date(current.planChangeLockedUntil)) {
      return res.status(409).json({
        error: 'El plan está bloqueado hasta la siguiente fecha de facturación.',
        code: 'PLAN_CHANGE_LOCKED',
        currentPlan: current.plan?.name ?? null,
        planChangeLockedUntil: current.planChangeLockedUntil,
        nextBillingAt: current.nextBillingAt,
      });
    }

    if (current?.planId === plan.id) {
      return res.status(409).json({
        error: 'La empresa ya tiene este plan activo.',
        code: 'PLAN_ALREADY_ACTIVE',
      });
    }

    const nextBillingAt = getNextBillingDate(now, billingDay);

    const subscription = await runSerializable(prisma, async (tx) => {
      await tx.companySubscription.updateMany({
        where: {
          companyId,
          status: {in: ['TRIAL', 'ACTIVE', 'PAST_DUE']},
        },
        data: {
          status: 'EXPIRED',
          currentPeriodEnd: now,
        },
      });

      const created = await tx.companySubscription.create({
        data: {
          companyId,
          planId: plan.id,
          changedById: userId,
          status: 'ACTIVE',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: nextBillingAt,
          billingDay,
          nextBillingAt,
          planChangeLockedUntil: nextBillingAt,
          notes: parsed.data.notes ?? null,
        },
        include: {
          plan: {include: {limits: true}},
          changedBy: {select: {id: true, name: true, email: true}},
        },
      });

      // El plan elegido entra en vigor inmediatamente.
      const planModuleIds = new Set(
        plan.modules.filter((row) => row.enabled).map((row) => row.moduleId),
      );

      const allModules = await tx.module.findMany({
        where: {active: true},
        select: {id: true},
      });

      for (const module of allModules) {
        await tx.companyModule.upsert({
          where: {companyId_moduleId: {companyId, moduleId: module.id}},
          update: {
            enabled: planModuleIds.has(module.id),
            enabledAt: planModuleIds.has(module.id) ? now : undefined,
          },
          create: {
            companyId,
            moduleId: module.id,
            enabled: planModuleIds.has(module.id),
            enabledAt: now,
          },
        });
      }

      return created;
    });

    return res.status(201).json({
      subscription: serializeSubscription(subscription),
      message: `Plan ${plan.name} aplicado inmediatamente. Próximo corte: ${nextBillingAt.toISOString()}.`,
    });
  } catch (error) {
    next(error);
  }
});


router.get('/usage',requirePermission('modules.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const now=new Date();
    const subscription=await prisma.companySubscription.findFirst({
      where:{companyId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},
      orderBy:{startedAt:'desc'},
      include:{plan:{include:{limits:true}}}
    });
    const periodStart=subscription?.currentPeriodStart??new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
    const periodEnd=subscription?.currentPeriodEnd??new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));

    const [records,overrides]=await Promise.all([
      prisma.usageRecord.findMany({
        where:{companyId,periodStart:{lte:periodStart},periodEnd:{gte:periodEnd}},
        orderBy:{metricKey:'asc'}
      }),
      prisma.companyFeatureLimit.findMany({where:{companyId},orderBy:{metricKey:'asc'}})
    ]);

    const planLimits=new Map((subscription?.plan?.limits||[]).map(row=>[row.metricKey,row]));
    const overrideLimits=new Map(overrides.map(row=>[row.metricKey,row]));
    const usageMap=new Map(records.map(row=>[row.metricKey,row]));
    const keys=[...new Set([...planLimits.keys(),...overrideLimits.keys(),...usageMap.keys()])].sort();

    const metrics=keys.map(metricKey=>{
      const usage=usageMap.get(metricKey);
      const limit=overrideLimits.get(metricKey)||planLimits.get(metricKey)||null;
      const used=Number(usage?.quantity||0);
      const limitValue=limit?Number(limit.limitValue):null;
      const ratio=limitValue&&limitValue>0?used/limitValue:null;
      return {
        metricKey,
        metricType:usage?.metricType||limit?.metricType||'COUNT',
        used,
        limit:limitValue,
        hardLimit:Boolean(limit?.hardLimit),
        source:overrideLimits.has(metricKey)?'OVERRIDE':planLimits.has(metricKey)?'PLAN':'USAGE_ONLY',
        percent:ratio==null?null:Math.round(ratio*1000)/10,
        exceeded:limitValue!=null&&used>limitValue,
      };
    });

    res.json({
      ok:true,
      period:{start:periodStart,end:periodEnd},
      subscription:subscription?{id:subscription.id,status:subscription.status,planId:subscription.planId}:null,
      metrics
    });
  }catch(error){next(error)}
});

router.get('/saas-status',requirePermission('modules.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [subscription,moduleCount,enabledModules,limits,usage,apiKeys,webhooks,deadLetters]=await Promise.all([
      prisma.companySubscription.findFirst({
        where:{companyId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},
        orderBy:{startedAt:'desc'},
        include:{plan:true,scheduledPlan:true}
      }),
      prisma.module.count({where:{active:true}}),
      prisma.companyModule.count({where:{companyId,enabled:true}}),
      prisma.companyFeatureLimit.count({where:{companyId}}),
      prisma.usageRecord.count({where:{companyId}}),
      prisma.apiCredential.count({where:{companyId,status:'ACTIVE'}}),
      prisma.webhookEndpoint.count({where:{companyId,active:true}}),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'DEAD_LETTER'}}),
    ]);

    res.json({
      ok:true,
      subscription:subscription?{
        status:subscription.status,
        plan:subscription.plan?.name||null,
        billingCycle:subscription.billingCycle,
        nextBillingAt:subscription.nextBillingAt,
        scheduledPlan:subscription.scheduledPlan?.name||null,
      }:null,
      platform:{
        moduleCatalog:moduleCount,
        enabledModules,
        limitOverrides:limits,
        usageRecords:usage,
        activeApiKeys:apiKeys,
        activeWebhooks:webhooks,
        deadLetters,
      }
    });
  }catch(error){next(error)}
});

router.put('/limits/:metricKey',requirePermission('modules.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({metricType:z.enum(['COUNT','STORAGE_MB','API_CALLS','TRANSACTIONS','USERS','CUSTOM']).default('COUNT'),limitValue:z.coerce.number().min(0),hardLimit:z.boolean().default(false)}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Límite inválido'});
    const limit=await prisma.companyFeatureLimit.upsert({
      where:{companyId_metricKey:{companyId:req.auth.companyId,metricKey:req.params.metricKey}},
      update:parsed.data,
      create:{companyId:req.auth.companyId,metricKey:req.params.metricKey,...parsed.data},
    });
    res.json({ok:true,limit});
  }catch(error){next(error)}
});

export default router;
