import express from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';
import {applyApprovalDecisionToEntity} from '../services/procurementFlow.js';

const router=express.Router();

async function canAct(userId, step){
  if(step.approverUserId && step.approverUserId===userId) return true;
  if(!step.roleId && !step.permissionKey) return true;

  const memberships=await prisma.userRole.findMany({
    where:{
      userId,
      user:{companyId:step.request.companyId,active:true}
    },
    include:{
      role:{
        include:{
          permissions:{include:{permission:true}}
        }
      }
    }
  });

  if(!memberships.length)return false;
  if(step.roleId&&memberships.some(m=>m.roleId===step.roleId))return true;
  if(step.permissionKey){
    return memberships.some(m=>
      m.role?.permissions?.some(x=>x.permission?.key===step.permissionKey)
    );
  }
  return false;
}

router.get('/dashboard',requireAuth,requirePermission('approvals.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const userId=req.auth.sub;
    const [workflows,requests]=await Promise.all([
      prisma.approvalWorkflow.findMany({
        where:{companyId},
        orderBy:[{active:'desc'},{priority:'asc'},{name:'asc'}],
        include:{rules:{orderBy:{sequence:'asc'},include:{approverUser:true,role:true}}}
      }),
      prisma.approvalRequest.findMany({
        where:{companyId},
        orderBy:{requestedAt:'desc'},
        take:100,
        include:{
          workflow:true,requestedBy:true,
          steps:{orderBy:{sequence:'asc'},include:{approverUser:true,decidedBy:true,role:true}},
          actions:{orderBy:{createdAt:'desc'},include:{actor:true}}
        }
      })
    ]);

    const inbox=[];
    for(const r of requests.filter(x=>x.status==='PENDING')){
      const step=r.steps.find(s=>s.status==='PENDING');
      if(step && await canAct(userId,{...step,request:r})) inbox.push(r);
    }

    res.json({
      workflows,requests,inbox,
      requestedByMe:requests.filter(x=>x.requestedById===userId),
      summary:{
        pending:requests.filter(x=>x.status==='PENDING').length,
        approved:requests.filter(x=>x.status==='APPROVED').length,
        rejected:requests.filter(x=>x.status==='REJECTED').length,
        myInbox:inbox.length,
      }
    });
  }catch(e){next(e)}
});

router.post('/workflows',requireAuth,requirePermission('approvals.manage'),async(req,res,next)=>{
  try{
    const schema=z.object({
      key:z.string().min(2).max(80),
      name:z.string().min(2).max(120),
      description:z.string().max(500).optional().nullable(),
      entityType:z.string().min(2).max(80),
      active:z.boolean().optional().default(true),
      priority:z.number().int().min(1).max(999).optional().default(100),
      rules:z.array(z.object({
        sequence:z.number().int().min(1),
        name:z.string().min(2).max(120),
        actorType:z.enum(['USER','ROLE','PERMISSION']),
        approverUserId:z.string().cuid().optional().nullable(),
        roleId:z.string().cuid().optional().nullable(),
        permissionKey:z.string().optional().nullable(),
        minAmount:z.number().optional().nullable(),
        maxAmount:z.number().optional().nullable(),
        required:z.boolean().optional().default(true),
      })).min(1)
    });
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.flatten()});

    const data=parsed.data;
    const workflow=await prisma.approvalWorkflow.create({
      data:{
        companyId:req.auth.companyId,key:data.key,name:data.name,description:data.description,
        entityType:data.entityType,active:data.active,priority:data.priority,
        rules:{create:data.rules.map(r=>({...r,minAmount:r.minAmount??null,maxAmount:r.maxAmount??null}))}
      },
      include:{rules:true}
    });
    res.status(201).json(workflow);
  }catch(e){next(e)}
});

router.post('/requests',requireAuth,requirePermission('approvals.read'),async(req,res,next)=>{
  try{
    const schema=z.object({
      workflowId:z.string().cuid(),
      entityType:z.string().min(2),
      entityId:z.string().min(1),
      entityFolio:z.string().optional().nullable(),
      title:z.string().min(2).max(180),
      description:z.string().max(1000).optional().nullable(),
      amount:z.number().optional().nullable(),
      currency:z.string().length(3).optional().default('MXN'),
      metadata:z.any().optional(),
    });
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.flatten()});

    const workflow=await prisma.approvalWorkflow.findFirst({
      where:{id:parsed.data.workflowId,companyId:req.auth.companyId,active:true},
      include:{rules:{orderBy:{sequence:'asc'}}}
    });
    if(!workflow)return res.status(404).json({error:'Workflow no encontrado o inactivo.'});

    const amount=parsed.data.amount??null;
    const applicable=workflow.rules.filter(r=>{
      if(amount==null) return true;
      if(r.minAmount!=null && amount<Number(r.minAmount)) return false;
      if(r.maxAmount!=null && amount>Number(r.maxAmount)) return false;
      return true;
    });
    if(!applicable.length)return res.status(409).json({error:'El workflow no tiene reglas aplicables.'});

    const request=await prisma.approvalRequest.create({
      data:{
        companyId:req.auth.companyId,workflowId:workflow.id,entityType:parsed.data.entityType,
        entityId:parsed.data.entityId,entityFolio:parsed.data.entityFolio,title:parsed.data.title,
        description:parsed.data.description,requestedById:req.auth.sub,amount,currency:parsed.data.currency,
        metadata:parsed.data.metadata,
        steps:{create:applicable.map((r,i)=>({
          ruleId:r.id,sequence:i+1,name:r.name,approverUserId:r.approverUserId,roleId:r.roleId,
          permissionKey:r.permissionKey,status:i===0?'PENDING':'WAITING'
        }))}
      },
      include:{workflow:true,steps:true}
    });
    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'approval.required',
      entityType:'ApprovalRequest',
      entityId:request.id,
      payload:{approvalRequest:request}
    });
    res.status(201).json(request);
  }catch(e){next(e)}
});

async function decide(req,res,next,decision){
  try{
    const schema=z.object({comment:z.string().max(1000).optional().nullable()});
    const parsed=schema.safeParse(req.body??{});
    if(!parsed.success)return res.status(400).json({error:parsed.error.flatten()});

    const request=await prisma.approvalRequest.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId},
      include:{steps:{orderBy:{sequence:'asc'}}}
    });
    if(!request)return res.status(404).json({error:'Solicitud no encontrada.'});
    if(request.status!=='PENDING')return res.status(409).json({error:'La solicitud ya fue resuelta.'});

    const step=request.steps.find(s=>s.status==='PENDING');
    if(!step)return res.status(409).json({error:'No hay un paso pendiente.'});

    const allowed=await canAct(req.auth.sub,{...step,request});
    if(!allowed)return res.status(403).json({error:'No eres aprobador de este paso.'});

    const result=await prisma.$transaction(async tx=>{
      await tx.approvalStep.update({
        where:{id:step.id},
        data:{status:decision,decidedById:req.auth.sub,decidedAt:new Date(),comment:parsed.data.comment??null}
      });
      await tx.approvalAction.create({
        data:{requestId:request.id,stepId:step.id,actorId:req.auth.sub,action:decision,comment:parsed.data.comment??null}
      });

      if(decision==='REJECTED'){
        return tx.approvalRequest.update({
          where:{id:request.id},
          data:{status:'REJECTED',decidedAt:new Date()}
        });
      }

      const nextStep=request.steps.find(s=>s.sequence>step.sequence && s.status==='WAITING');
      if(nextStep){
        await tx.approvalStep.update({where:{id:nextStep.id},data:{status:'PENDING'}});
        return tx.approvalRequest.update({where:{id:request.id},data:{currentStep:nextStep.sequence}});
      }

      return tx.approvalRequest.update({
        where:{id:request.id},
        data:{status:'APPROVED',decidedAt:new Date()}
      });
    });
    if(['APPROVED','REJECTED'].includes(result.status)){
      await applyApprovalDecisionToEntity({
        companyId:req.auth.companyId,
        userId:req.auth.sub,
        approvalRequest:{...request,status:result.status,id:request.id}
      });
    }

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:result.status==='APPROVED'
        ?'approval.approved'
        :result.status==='REJECTED'
          ?'approval.rejected'
          :'approval.step.completed',
      entityType:'ApprovalRequest',
      entityId:request.id,
      payload:{requestId:request.id,status:result.status,currentStep:result.currentStep}
    });

    res.json(result);
  }catch(e){next(e)}
}

router.post('/requests/:id/approve',requireAuth,requirePermission('approvals.decide'),(req,res,next)=>decide(req,res,next,'APPROVED'));
router.post('/requests/:id/reject',requireAuth,requirePermission('approvals.decide'),(req,res,next)=>decide(req,res,next,'REJECTED'));

router.post('/requests/:id/cancel',requireAuth,requirePermission('approvals.read'),async(req,res,next)=>{
  try{
    const request=await prisma.approvalRequest.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!request)return res.status(404).json({error:'Solicitud no encontrada.'});
    if(request.requestedById!==req.auth.sub)return res.status(403).json({error:'Solo el solicitante puede cancelar.'});
    if(request.status!=='PENDING')return res.status(409).json({error:'Solo solicitudes pendientes pueden cancelarse.'});
    const updated=await prisma.approvalRequest.update({
      where:{id:request.id},
      data:{status:'CANCELLED',cancelledAt:new Date()}
    });
    res.json(updated);
  }catch(e){next(e)}
});

export default router;
