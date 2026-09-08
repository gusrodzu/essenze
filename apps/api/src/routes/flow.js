import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';
import {runFlow} from '../services/flowEngine.js';

const router=Router();
router.use(requireAuth);
router.use(idempotency());

const ACTION_TYPES=[
  {
    key:'NOTIFY',
    label:'Enviar notificación',
    description:'Crea una notificación interna para un usuario.'
  },
  {
    key:'CREATE_PURCHASE_REQUEST',
    label:'Crear solicitud de compra',
    description:'Crea automáticamente una SOLPED para un producto y almacén.'
  },
  {
    key:'CREATE_APPROVAL',
    label:'Crear aprobación',
    description:'Inicia un workflow de aprobación existente.'
  }
];

const TRIGGER_EVENTS=[
  'customer.created',
  'customer.updated',
  'supplier.created',
  'supplier.updated',
  'product.created',
  'product.updated',
  'sales.order.created',
  'purchase.order.created',
  'inventory.low_stock',
  'expense.submitted',
  'approval.required',
  'datahub.import.completed',
  'intelligence.insight.created',
  'intelligence.insight.escalated',
  'business_party.created',
  'business_party.updated',
  'business_parties.synced'
];

const conditionSchema=z.object({
  mode:z.enum(['ALL','ANY']).default('ALL'),
  rules:z.array(z.object({
    path:z.string().min(1),
    operator:z.enum(['eq','neq','gt','gte','lt','lte','contains','exists','in']),
    value:z.any().optional()
  })).default([])
});

const actionSchema=z.object({
  key:z.string().trim().min(1).max(60),
  type:z.enum(['NOTIFY','CREATE_PURCHASE_REQUEST','CREATE_APPROVAL']),
  config:z.record(z.any()).default({})
});

const flowSchema=z.object({
  key:z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9._-]*$/),
  name:z.string().trim().min(2).max(140),
  description:z.string().trim().max(800).optional().nullable(),
  triggerEvent:z.enum(TRIGGER_EVENTS),
  runAsUserId:z.string().cuid(),
  active:z.boolean().default(true),
  stopOnError:z.boolean().default(true),
  conditions:conditionSchema.default({mode:'ALL',rules:[]}),
  actions:z.array(actionSchema).min(1).max(12)
});

router.get('/catalog',requirePermission('flow.read'),async(req,res,next)=>{
  try{
    const [users,approvalWorkflows,warehouses]=await Promise.all([
      prisma.user.findMany({
        where:{companyId:req.auth.companyId,active:true},
        select:{id:true,firstName:true,lastName:true,email:true},
        orderBy:[{firstName:'asc'},{lastName:'asc'}]
      }),
      prisma.approvalWorkflow.findMany({
        where:{companyId:req.auth.companyId,active:true},
        select:{id:true,key:true,name:true,entityType:true},
        orderBy:{name:'asc'}
      }),
      prisma.warehouse.findMany({
        where:{branch:{companyId:req.auth.companyId},active:true},
        select:{id:true,name:true,code:true},
        orderBy:{name:'asc'}
      })
    ]);

    res.json({
      triggerEvents:TRIGGER_EVENTS,
      actionTypes:ACTION_TYPES,
      operators:['eq','neq','gt','gte','lt','lte','contains','exists','in'],
      users,
      approvalWorkflows,
      warehouses,
      templateExamples:[
        '{{event.data.product.id}}',
        '{{event.data.warehouse.id}}',
        '{{event.data.quantity}}',
        '{{event.data.minStock}}',
        '{{actions.restock.id}}',
        '{{actions.restock.folio}}'
      ]
    });
  }catch(e){next(e)}
});

router.get('/dashboard',requirePermission('flow.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [flows,runs]=await Promise.all([
      prisma.automationFlow.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        include:{
          createdBy:{select:{firstName:true,lastName:true}},
          runAsUser:{select:{id:true,firstName:true,lastName:true,email:true}}
        }
      }),
      prisma.automationFlowRun.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:60,
        include:{
          flow:{select:{id:true,key:true,name:true}},
          actionRuns:{orderBy:{sequence:'asc'}}
        }
      })
    ]);

    const summary={
      flows:flows.length,
      active:flows.filter(x=>x.active).length,
      runs:runs.length,
      errors:runs.filter(x=>['FAILED','COMPLETED_WITH_ERRORS'].includes(x.status)).length
    };

    res.json({summary,flows,runs});
  }catch(e){next(e)}
});

router.post('/',requirePermission('flow.manage'),async(req,res,next)=>{
  try{
    const parsed=flowSchema.safeParse(req.body);
    if(!parsed.success){
      return res.status(400).json({
        ok:false,
        message:parsed.error.issues[0]?.message||'Automatización inválida'
      });
    }

    const user=await prisma.user.findFirst({
      where:{
        id:parsed.data.runAsUserId,
        companyId:req.auth.companyId,
        active:true
      }
    });
    if(!user)return res.status(404).json({ok:false,message:'Usuario de ejecución no encontrado.'});

    const flow=await prisma.automationFlow.create({
      data:{
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        ...parsed.data
      }
    });

    res.status(201).json({ok:true,flow});
  }catch(e){
    if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe una automatización con esa clave.'});
    next(e)
  }
});

router.put('/:id',requirePermission('flow.manage'),async(req,res,next)=>{
  try{
    const parsed=flowSchema.safeParse(req.body);
    if(!parsed.success){
      return res.status(400).json({
        ok:false,
        message:parsed.error.issues[0]?.message||'Automatización inválida'
      });
    }

    const current=await prisma.automationFlow.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!current)return res.status(404).json({ok:false,message:'Automatización no encontrada.'});

    const user=await prisma.user.findFirst({
      where:{
        id:parsed.data.runAsUserId,
        companyId:req.auth.companyId,
        active:true
      }
    });
    if(!user)return res.status(404).json({ok:false,message:'Usuario de ejecución no encontrado.'});

    const flow=await prisma.automationFlow.update({
      where:{id:current.id},
      data:parsed.data
    });

    res.json({ok:true,flow});
  }catch(e){
    if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe una automatización con esa clave.'});
    next(e)
  }
});

router.patch('/:id/status',requirePermission('flow.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({active:z.boolean()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Estado inválido.'});

    const current=await prisma.automationFlow.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!current)return res.status(404).json({ok:false,message:'Automatización no encontrada.'});

    const flow=await prisma.automationFlow.update({
      where:{id:current.id},
      data:{active:parsed.data.active}
    });

    res.json({ok:true,flow});
  }catch(e){next(e)}
});

router.post('/:id/test',requirePermission('flow.run'),async(req,res,next)=>{
  try{
    const flow=await prisma.automationFlow.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!flow)return res.status(404).json({ok:false,message:'Automatización no encontrada.'});

    const event=String(req.body?.event||flow.triggerEvent);
    const payload=req.body?.payload&&typeof req.body.payload==='object'
      ?req.body.payload
      :{};

    const run=await runFlow({
      flow,
      event,
      entityType:'FLOW_TEST',
      entityId:null,
      payload
    });

    res.json({ok:true,run});
  }catch(e){next(e)}
});

router.get('/runs/:id',requirePermission('flow.read'),async(req,res,next)=>{
  try{
    const run=await prisma.automationFlowRun.findFirst({
      where:{
        id:req.params.id,
        companyId:req.auth.companyId
      },
      include:{
        flow:true,
        actionRuns:{orderBy:{sequence:'asc'}}
      }
    });
    if(!run)return res.status(404).json({ok:false,message:'Ejecución no encontrada.'});
    res.json({ok:true,run});
  }catch(e){next(e)}
});

export default router;
