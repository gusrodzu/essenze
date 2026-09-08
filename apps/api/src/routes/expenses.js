import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';

const router=Router();
router.use(requireAuth);
router.use(idempotency());

const expenseSchema=z.object({
  categoryId:z.string().min(1),
  employeeId:z.string().optional().nullable(),
  title:z.string().min(2).max(160),
  description:z.string().max(1200).optional().nullable(),
  merchant:z.string().max(160).optional().nullable(),
  expenseDate:z.string().min(8),
  amount:z.coerce.number().positive(),
  taxAmount:z.coerce.number().min(0).optional().default(0),
  currency:z.string().length(3).optional().default('MXN'),
  paymentMethod:z.enum(['CASH','CORPORATE_CARD','PERSONAL_CARD','TRANSFER','OTHER']).optional().default('PERSONAL_CARD'),
  reimbursable:z.boolean().optional().default(true),
  receiptUrl:z.string().url().optional().nullable().or(z.literal('')),
  receiptNumber:z.string().max(100).optional().nullable(),
  notes:z.string().max(1000).optional().nullable(),
});

async function nextFolio(companyId){const year=String(new Date().getFullYear());return nextSequenceFolio({companyId,scope:'expense',prefix:'GAS',digits:4,period:year,model:'expense',where:{companyId,folio:{startsWith:`GAS-${year}-`}}})}

async function approvalFor(companyId, expenseId){
  return prisma.approvalRequest.findFirst({
    where:{companyId,entityType:'EXPENSE',entityId:expenseId},
    orderBy:{requestedAt:'desc'},
    include:{workflow:true,steps:{orderBy:{sequence:'asc'}}}
  });
}

async function createApproval({companyId,userId,expense}){
  const workflow=await prisma.approvalWorkflow.findFirst({
    where:{companyId,entityType:'EXPENSE',active:true},
    orderBy:[{priority:'asc'},{createdAt:'asc'}],
    include:{rules:{orderBy:{sequence:'asc'}}}
  });
  if(!workflow)return null;
  const amount=Number(expense.amount);
  const rules=workflow.rules.filter(r=>{
    if(r.minAmount!=null && amount<Number(r.minAmount))return false;
    if(r.maxAmount!=null && amount>Number(r.maxAmount))return false;
    return true;
  });
  if(!rules.length)return null;
  return prisma.approvalRequest.create({
    data:{
      companyId,workflowId:workflow.id,entityType:'EXPENSE',entityId:expense.id,entityFolio:expense.folio,
      title:`Autorizar gasto ${expense.folio}`,description:expense.title,requestedById:userId,status:'PENDING',
      amount:expense.amount,currency:expense.currency,currentStep:1,
      metadata:{categoryId:expense.categoryId,employeeId:expense.employeeId},
      steps:{create:rules.map((r,i)=>({
        ruleId:r.id,sequence:i+1,name:r.name,approverUserId:r.approverUserId,roleId:r.roleId,
        permissionKey:r.permissionKey,status:i===0?'PENDING':'WAITING'
      }))}
    },
    include:{workflow:true,steps:true}
  });
}

router.get('/dashboard',requirePermission('expenses.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [expenses,categories,employees]=await Promise.all([
      prisma.expense.findMany({
        where:{companyId},
        orderBy:{expenseDate:'desc'},
        take:200,
        include:{category:true,employee:true,createdBy:{select:{id:true,firstName:true,lastName:true,email:true}}}
      }),
      prisma.expenseCategory.findMany({where:{companyId,active:true},orderBy:{name:'asc'}}),
      prisma.employee.findMany({where:{companyId},orderBy:[{lastName:'asc'},{firstName:'asc'}]})
    ]);
    const approvals=await prisma.approvalRequest.findMany({
      where:{companyId,entityType:'EXPENSE',entityId:{in:expenses.map(x=>x.id)}},
      orderBy:{requestedAt:'desc'},include:{workflow:true,steps:{orderBy:{sequence:'asc'}}}
    });
    const map=new Map();
    for(const a of approvals)if(!map.has(a.entityId))map.set(a.entityId,a);
    const rows=expenses.map(e=>({...e,approval:map.get(e.id)||null}));
    const summary={
      total:rows.reduce((s,x)=>s+Number(x.amount),0),
      pending:rows.filter(x=>['SUBMITTED'].includes(x.status)).length,
      approved:rows.filter(x=>x.status==='APPROVED').length,
      reimbursable:rows.filter(x=>x.reimbursable && x.status!=='PAID').reduce((s,x)=>s+Number(x.amount),0)
    };
    res.json({expenses:rows,categories,employees,summary});
  }catch(e){next(e)}
});

router.post('/',requirePermission('expenses.create'),async(req,res,next)=>{
  try{
    const parsed=expenseSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const category=await prisma.expenseCategory.findFirst({where:{id:parsed.data.categoryId,companyId:req.auth.companyId,active:true}});
    if(!category)return res.status(404).json({ok:false,message:'Categoría no encontrada'});
    const folio=await nextFolio(req.auth.companyId);
    const e=await prisma.expense.create({
      data:{...parsed.data,receiptUrl:parsed.data.receiptUrl||null,companyId:req.auth.companyId,createdById:req.auth.sub,folio,
        currency:parsed.data.currency.toUpperCase(),expenseDate:new Date(`${parsed.data.expenseDate}T12:00:00.000Z`)},
      include:{category:true,employee:true}
    });
    res.status(201).json({ok:true,expense:e});
  }catch(e){next(e)}
});

router.post('/:id/submit',requirePermission('expenses.create'),async(req,res,next)=>{
  try{
    const expense=await prisma.expense.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!expense)return res.status(404).json({ok:false,message:'Gasto no encontrado'});
    if(expense.status!=='DRAFT')return res.status(409).json({ok:false,message:'Solo se pueden enviar gastos en borrador'});
    const approval=await createApproval({companyId:req.auth.companyId,userId:req.auth.sub,expense});
    const updated=await prisma.expense.update({
      where:{id:expense.id},
      data:approval?{status:'SUBMITTED',submittedAt:new Date()}:{status:'APPROVED',submittedAt:new Date(),approvedAt:new Date()}
    });
    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'expense.submitted',
      entityType:'Expense',
      entityId:updated.id,
      payload:{expense:updated,approvalRequired:Boolean(approval)}
    });
    if(approval){
      emitIntegrationEventAsync({
        companyId:req.auth.companyId,
        event:'approval.required',
        entityType:'ApprovalRequest',
        entityId:approval.id,
        payload:{
          approvalRequest:approval,
          source:{entityType:'EXPENSE',entityId:updated.id,folio:updated.folio}
        }
      });
    }
    res.json({ok:true,expense:updated,approval,approvalRequired:Boolean(approval)});
  }catch(e){next(e)}
});

router.post('/:id/sync-approval',requirePermission('expenses.read'),async(req,res,next)=>{
  try{
    const expense=await prisma.expense.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!expense)return res.status(404).json({ok:false,message:'Gasto no encontrado'});
    const approval=await approvalFor(req.auth.companyId,expense.id);
    if(!approval)return res.json({ok:true,expense,approval:null});
    let data={};
    if(approval.status==='APPROVED' && expense.status==='SUBMITTED')data={status:'APPROVED',approvedAt:new Date()};
    if(approval.status==='REJECTED' && expense.status==='SUBMITTED')data={status:'REJECTED',rejectedAt:new Date()};
    const updated=Object.keys(data).length?await prisma.expense.update({where:{id:expense.id},data}):expense;
    res.json({ok:true,expense:updated,approval});
  }catch(e){next(e)}
});

router.post('/:id/pay',requirePermission('expenses.pay'),async(req,res,next)=>{
  try{
    const expense=await prisma.expense.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!expense)return res.status(404).json({ok:false,message:'Gasto no encontrado'});
    const approval=await approvalFor(req.auth.companyId,expense.id);
    if(approval?.status==='APPROVED' && expense.status==='SUBMITTED'){
      await prisma.expense.update({where:{id:expense.id},data:{status:'APPROVED',approvedAt:new Date()}});
      expense.status='APPROVED';
    }
    if(expense.status!=='APPROVED')return res.status(409).json({ok:false,message:'El gasto debe estar aprobado antes de pagarse'});
    const updated=await prisma.expense.update({where:{id:expense.id},data:{status:'PAID',paidAt:new Date()}});
    res.json({ok:true,expense:updated});
  }catch(e){next(e)}
});

router.post('/:id/cancel',requirePermission('expenses.manage'),async(req,res,next)=>{
  try{
    const expense=await prisma.expense.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!expense)return res.status(404).json({ok:false,message:'Gasto no encontrado'});
    if(expense.status==='PAID')return res.status(409).json({ok:false,message:'Un gasto pagado no puede cancelarse'});
    const updated=await prisma.expense.update({where:{id:expense.id},data:{status:'CANCELLED',cancelledAt:new Date()}});
    res.json({ok:true,expense:updated});
  }catch(e){next(e)}
});

export default router;
