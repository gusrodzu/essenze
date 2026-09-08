import {prisma} from '../lib/prisma.js';
import {nextFolio as nextSequenceFolio} from './sequence.js';

const OPERATORS=new Set([
  'eq','neq','gt','gte','lt','lte','contains','exists','in'
]);

function getPath(obj,path){
  if(!path)return undefined;
  return String(path).split('.').reduce(
    (acc,key)=>acc==null?undefined:acc[key],
    obj
  );
}

function compare(actual,operator,expected){
  if(operator==='exists')return expected===false?actual==null:actual!=null;
  if(operator==='eq')return String(actual??'')===String(expected??'');
  if(operator==='neq')return String(actual??'')!==String(expected??'');
  if(operator==='gt')return Number(actual)>Number(expected);
  if(operator==='gte')return Number(actual)>=Number(expected);
  if(operator==='lt')return Number(actual)<Number(expected);
  if(operator==='lte')return Number(actual)<=Number(expected);
  if(operator==='contains'){
    if(Array.isArray(actual))return actual.map(String).includes(String(expected));
    return String(actual??'').toLowerCase().includes(String(expected??'').toLowerCase());
  }
  if(operator==='in'){
    return Array.isArray(expected)&&expected.map(String).includes(String(actual));
  }
  return false;
}

export function evaluateConditions(conditions,context){
  if(!conditions||typeof conditions!=='object')return true;
  const mode=conditions.mode==='ANY'?'ANY':'ALL';
  const rules=Array.isArray(conditions.rules)?conditions.rules:[];

  if(!rules.length)return true;

  const results=rules.map(rule=>{
    if(!OPERATORS.has(rule.operator))return false;
    return compare(getPath(context,rule.path),rule.operator,rule.value);
  });

  return mode==='ANY'?results.some(Boolean):results.every(Boolean);
}

function resolveTemplateString(value,context){
  return String(value).replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_m,path)=>{
    const resolved=getPath(context,path.trim());
    if(resolved===undefined||resolved===null)return '';
    if(typeof resolved==='object')return JSON.stringify(resolved);
    return String(resolved);
  });
}

export function resolveTemplates(value,context){
  if(Array.isArray(value))return value.map(v=>resolveTemplates(v,context));
  if(value&&typeof value==='object'){
    return Object.fromEntries(
      Object.entries(value).map(([k,v])=>[k,resolveTemplates(v,context)])
    );
  }
  if(typeof value==='string'){
    const exact=value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if(exact){
      const resolved=getPath(context,exact[1].trim());
      return resolved===undefined?'':resolved;
    }
    return resolveTemplateString(value,context);
  }
  return value;
}

async function nextPurchaseRequestFolio(companyId){
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({
    companyId,scope:'purchase-request',prefix:'SC',digits:4,period:year,
    model:'purchaseRequest',
    where:{companyId,folio:{startsWith:`SC-${year}-`}}
  });
}

async function actionNotify({companyId,runAsUserId,config}){
  const userId=config.userId||runAsUserId||null;
  const notification=await prisma.notification.create({
    data:{
      companyId,
      userId,
      type:config.type||'INFO',
      title:String(config.title||'Automatización BuzzBee'),
      message:String(config.message||'Una automatización fue ejecutada.'),
      link:config.link||null
    }
  });
  return {id:notification.id,type:'Notification'};
}

async function actionCreatePurchaseRequest({companyId,runAsUserId,config}){
  const warehouseId=String(config.warehouseId||'');
  const productId=String(config.productId||'');
  const quantity=Number(config.quantity||0);

  if(!warehouseId)throw new Error('CREATE_PURCHASE_REQUEST requiere warehouseId.');
  if(!productId)throw new Error('CREATE_PURCHASE_REQUEST requiere productId.');
  if(!(quantity>0))throw new Error('CREATE_PURCHASE_REQUEST requiere quantity > 0.');

  const [warehouse,product]=await Promise.all([
    prisma.warehouse.findFirst({
      where:{id:warehouseId,branch:{companyId},active:true}
    }),
    prisma.product.findFirst({
      where:{id:productId,companyId,active:true}
    })
  ]);

  if(!warehouse)throw new Error('Almacén no disponible para la solicitud automática.');
  if(!product)throw new Error('Producto no disponible para la solicitud automática.');

  const folio=await nextPurchaseRequestFolio(companyId);
  const request=await prisma.purchaseRequest.create({
    data:{
      companyId,
      warehouseId,
      requestedById:runAsUserId,
      folio,
      title:config.title||`Reposición automática · ${product.name}`,
      justification:config.justification||'Generada automáticamente por BuzzBee Flow.',
      priority:config.priority||'NORMAL',
      status:config.submit===false?'DRAFT':'PENDING',
      submittedAt:config.submit===false?null:new Date(),
      items:{
        create:[{
          productId,
          quantity,
          estimatedUnitCost:Number(config.estimatedUnitCost??product.cost??0),
          notes:config.notes||'Reposición creada por automatización'
        }]
      }
    },
    include:{
      warehouse:true,
      items:{include:{product:true}}
    }
  });

  return {
    id:request.id,
    folio:request.folio,
    status:request.status,
    type:'PurchaseRequest'
  };
}

async function actionCreateApproval({companyId,runAsUserId,config}){
  const workflowKey=String(config.workflowKey||'');
  const entityType=String(config.entityType||'');
  const entityId=String(config.entityId||'');

  if(!workflowKey)throw new Error('CREATE_APPROVAL requiere workflowKey.');
  if(!entityType)throw new Error('CREATE_APPROVAL requiere entityType.');
  if(!entityId)throw new Error('CREATE_APPROVAL requiere entityId.');

  const workflow=await prisma.approvalWorkflow.findFirst({
    where:{companyId,key:workflowKey,active:true},
    include:{rules:{orderBy:{sequence:'asc'}}}
  });

  if(!workflow)throw new Error(`Workflow "${workflowKey}" no encontrado o inactivo.`);

  const amount=config.amount==null?null:Number(config.amount);
  const applicable=workflow.rules.filter(rule=>{
    if(amount==null)return true;
    if(rule.minAmount!=null&&amount<Number(rule.minAmount))return false;
    if(rule.maxAmount!=null&&amount>Number(rule.maxAmount))return false;
    return true;
  });

  if(!applicable.length)throw new Error('El workflow no tiene reglas aplicables.');

  const request=await prisma.approvalRequest.create({
    data:{
      companyId,
      workflowId:workflow.id,
      entityType,
      entityId,
      entityFolio:config.entityFolio||null,
      title:config.title||`Autorizar ${entityType}`,
      description:config.description||'Solicitud generada por BuzzBee Flow.',
      requestedById:runAsUserId,
      status:'PENDING',
      currentStep:1,
      amount,
      currency:config.currency||'MXN',
      metadata:{source:'BUZZBEE_FLOW',...(config.metadata||{})},
      steps:{
        create:applicable.map((rule,index)=>({
          ruleId:rule.id,
          sequence:index+1,
          name:rule.name,
          approverUserId:rule.approverUserId,
          roleId:rule.roleId,
          permissionKey:rule.permissionKey,
          status:index===0?'PENDING':'WAITING'
        }))
      }
    },
    include:{workflow:true,steps:true}
  });

  return {
    id:request.id,
    status:request.status,
    type:'ApprovalRequest',
    workflowKey
  };
}

async function executeAction(args){
  if(args.action.type==='NOTIFY')return actionNotify(args);
  if(args.action.type==='CREATE_PURCHASE_REQUEST')return actionCreatePurchaseRequest(args);
  if(args.action.type==='CREATE_APPROVAL')return actionCreateApproval(args);
  throw new Error(`Tipo de acción no soportado: ${args.action.type}`);
}

export async function runFlow({
  flow,
  eventLogId=null,
  event,
  entityType=null,
  entityId=null,
  payload={}
}){
  const baseContext={
    trace:{
      correlationId:eventLogId||null,
      eventLogId:eventLogId||null
    },
    event:{
      name:event,
      entityType,
      entityId,
      data:payload
    },
    actions:{}
  };

  const matches=evaluateConditions(flow.conditions,baseContext);

  if(!matches){
    return prisma.automationFlowRun.create({
      data:{
        companyId:flow.companyId,
        flowId:flow.id,
        eventLogId,
        event,
        entityType,
        entityId,
        status:'SKIPPED',
        input:baseContext,
        context:baseContext,
        completedAt:new Date()
      }
    });
  }

  const run=await prisma.automationFlowRun.create({
    data:{
      companyId:flow.companyId,
      flowId:flow.id,
      eventLogId,
      event,
      entityType,
      entityId,
      status:'RUNNING',
      input:baseContext
    }
  });

  const actions=Array.isArray(flow.actions)?flow.actions:[];
  let failed=0;
  const context=structuredClone(baseContext);

  for(let i=0;i<actions.length;i++){
    const action=actions[i];
    const actionKey=String(action.key||`step_${i+1}`);
    const actionType=String(action.type||'');
    const resolvedConfig=resolveTemplates(action.config||{},context);

    const actionRun=await prisma.automationFlowActionRun.create({
      data:{
        runId:run.id,
        actionKey,
        actionType,
        sequence:i+1,
        status:'PENDING',
        input:resolvedConfig,
        startedAt:new Date()
      }
    });

    try{
      const output=await executeAction({
        companyId:flow.companyId,
        runAsUserId:flow.runAsUserId,
        action:{...action,type:actionType},
        config:resolvedConfig
      });

      context.actions[actionKey]=output;

      await prisma.automationFlowActionRun.update({
        where:{id:actionRun.id},
        data:{
          status:'COMPLETED',
          output,
          completedAt:new Date()
        }
      });
    }catch(error){
      failed++;
      context.actions[actionKey]={error:error.message||'Error'};

      await prisma.automationFlowActionRun.update({
        where:{id:actionRun.id},
        data:{
          status:'FAILED',
          error:error.message||'Error ejecutando acción',
          completedAt:new Date()
        }
      });

      if(flow.stopOnError){
        const remaining=actions.slice(i+1);
        for(let j=0;j<remaining.length;j++){
          const skipped=remaining[j];
          await prisma.automationFlowActionRun.create({
            data:{
              runId:run.id,
              actionKey:String(skipped.key||`step_${i+j+2}`),
              actionType:String(skipped.type||''),
              sequence:i+j+2,
              status:'SKIPPED',
              error:'Omitida porque una acción anterior falló.'
            }
          });
        }
        break;
      }
    }
  }

  const finalStatus=failed
    ?'COMPLETED_WITH_ERRORS'
    :'COMPLETED';

  const updated=await prisma.automationFlowRun.update({
    where:{id:run.id},
    data:{
      status:finalStatus,
      context,
      completedAt:new Date(),
      error:failed?`${failed} acción(es) fallaron.`:null
    },
    include:{actionRuns:{orderBy:{sequence:'asc'}}}
  });

  await prisma.automationFlow.update({
    where:{id:flow.id},
    data:{
      runCount:{increment:1},
      lastRunAt:new Date(),
      lastError:failed?`${failed} acción(es) fallaron.`:null
    }
  });

  return updated;
}

export async function runAutomationsForEvent({
  companyId,eventLogId=null,event,entityType=null,entityId=null,payload={}
}){
  const flows=await prisma.automationFlow.findMany({
    where:{companyId,triggerEvent:event,active:true},
    orderBy:{createdAt:'asc'}
  });

  const results=[];
  for(const flow of flows){
    try{
      results.push(await runFlow({
        flow,eventLogId,event,entityType,entityId,payload
      }));
    }catch(error){
      console.error('[BuzzBeeFlow]',flow.key,error);
      await prisma.automationFlow.update({
        where:{id:flow.id},
        data:{lastRunAt:new Date(),lastError:error.message||'Error de ejecución'}
      }).catch(()=>{});
    }
  }
  return results;
}

export function runAutomationsForEventAsync(args){
  setImmediate(()=>{
    runAutomationsForEvent(args).catch(error=>{
      console.error('[BuzzBeeFlow]',args.event,error);
    });
  });
}
