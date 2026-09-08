import crypto from 'node:crypto';
import {prisma} from '../lib/prisma.js';
import {runAutomationsForEventAsync} from './flowEngine.js';

const RETRY_DELAYS_MS=[
  60_000,
  5*60_000,
  15*60_000,
  60*60_000
];

function masterKey(){
  const source=process.env.INTEGRATION_ENCRYPTION_KEY||process.env.JWT_SECRET||'buzzbee-development-only-key';
  return crypto.createHash('sha256').update(source).digest();
}

function decryptSecret(value){
  const [ivB64,tagB64,dataB64]=String(value).split('.');
  const decipher=crypto.createDecipheriv(
    'aes-256-gcm',
    masterKey(),
    Buffer.from(ivB64,'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64,'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64,'base64url')),
    decipher.final()
  ]).toString('utf8');
}

async function refreshEventStatus(eventLogId){
  if(!eventLogId)return;

  const jobs=await prisma.webhookDeliveryJob.findMany({
    where:{eventLogId},
    select:{status:true}
  });

  if(!jobs.length){
    await prisma.integrationEventLog.update({
      where:{id:eventLogId},
      data:{
        status:'DISPATCHED',
        endpoints:0,
        delivered:0,
        failed:0,
        dispatchedAt:new Date()
      }
    });
    return;
  }

  const delivered=jobs.filter(x=>x.status==='COMPLETED').length;
  const dead=jobs.filter(x=>x.status==='DEAD_LETTER').length;
  const pending=jobs.length-delivered-dead;

  let status='PENDING';
  let dispatchedAt=null;

  if(pending===0){
    status=dead===0?'DISPATCHED':delivered>0?'PARTIAL':'FAILED';
    dispatchedAt=new Date();
  }else if(delivered>0||dead>0){
    status='PARTIAL';
  }

  await prisma.integrationEventLog.update({
    where:{id:eventLogId},
    data:{
      status,
      endpoints:jobs.length,
      delivered,
      failed:dead,
      ...(dispatchedAt?{dispatchedAt}:{})
    }
  });
}

async function sendDelivery(job){
  const webhook=job.webhook;
  const requestId=job.requestId;
  const correlationId=job.eventLog?.correlationId||job.eventLogId||requestId;
  const body=JSON.stringify({
    id:requestId,
    correlationId,
    event:job.event,
    createdAt:new Date().toISOString(),
    companyId:job.companyId,
    data:job.payload
  });

  const attempt=job.attempt+1;
  const log=await prisma.webhookDeliveryLog.create({
    data:{
      companyId:job.companyId,
      webhookId:webhook.id,
      event:job.event,
      requestId,
      attempt,
      payload:job.payload
    }
  });

  const started=Date.now();

  try{
    const secret=decryptSecret(webhook.signingSecretEnc);
    const timestamp=Math.floor(Date.now()/1000).toString();
    const signature=crypto
      .createHmac('sha256',secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const controller=new AbortController();
    const timer=setTimeout(
      ()=>controller.abort(),
      Math.min(Math.max(webhook.timeoutMs||8000,1000),20000)
    );

    let response;
    try{
      response=await fetch(webhook.url,{
        method:'POST',
        headers:{
          'content-type':'application/json',
          'user-agent':'BuzzBee-Webhook/3.0',
          'x-buzzbee-event':job.event,
          'x-buzzbee-request-id':requestId,
          'x-buzzbee-correlation-id':correlationId,
          'x-buzzbee-attempt':String(attempt),
          'x-buzzbee-timestamp':timestamp,
          'x-buzzbee-signature':`sha256=${signature}`
        },
        body,
        signal:controller.signal
      });
    }finally{
      clearTimeout(timer);
    }

    const text=(await response.text()).slice(0,3000);
    const durationMs=Date.now()-started;

    await prisma.webhookDeliveryLog.update({
      where:{id:log.id},
      data:{
        status:response.ok?'SUCCESS':'FAILED',
        statusCode:response.status,
        durationMs,
        responseBody:text||null,
        error:response.ok?null:`HTTP ${response.status}`,
        deliveredAt:new Date()
      }
    });

    if(response.ok){
      await prisma.webhookEndpoint.update({
        where:{id:webhook.id},
        data:{
          lastDeliveryAt:new Date(),
          lastSuccessAt:new Date(),
          failureCount:0,
          lastError:null
        }
      });
      return {ok:true,attempt};
    }

    await prisma.webhookEndpoint.update({
      where:{id:webhook.id},
      data:{
        lastDeliveryAt:new Date(),
        failureCount:{increment:1},
        lastError:`HTTP ${response.status}`
      }
    });

    return {ok:false,attempt,error:`HTTP ${response.status}`};
  }catch(error){
    const message=error.name==='AbortError'
      ?'Tiempo de espera agotado'
      :(error.message||'Error de entrega');

    await prisma.webhookDeliveryLog.update({
      where:{id:log.id},
      data:{
        status:'FAILED',
        durationMs:Date.now()-started,
        error:message,
        deliveredAt:new Date()
      }
    });

    await prisma.webhookEndpoint.update({
      where:{id:webhook.id},
      data:{
        lastDeliveryAt:new Date(),
        failureCount:{increment:1},
        lastError:message
      }
    });

    return {ok:false,attempt,error:message};
  }
}

async function processJob(job){
  const claimed=await prisma.webhookDeliveryJob.updateMany({
    where:{
      id:job.id,
      status:{in:['READY','RETRY_WAIT']}
    },
    data:{
      status:'PROCESSING',
      lockedAt:new Date()
    }
  });

  if(claimed.count===0)return {processed:false};

  const current=await prisma.webhookDeliveryJob.findUnique({
    where:{id:job.id},
    include:{webhook:true,eventLog:{select:{correlationId:true}}}
  });

  if(!current?.webhook?.active){
    await prisma.webhookDeliveryJob.update({
      where:{id:job.id},
      data:{
        status:'DEAD_LETTER',
        lastError:'Webhook desactivado o eliminado.',
        attempt:current?.attempt||0,
        lockedAt:null
      }
    });
    await refreshEventStatus(current?.eventLogId);
    return {processed:true,ok:false,deadLetter:true};
  }

  const result=await sendDelivery(current);

  if(result.ok){
    await prisma.webhookDeliveryJob.update({
      where:{id:current.id},
      data:{
        status:'COMPLETED',
        attempt:result.attempt,
        completedAt:new Date(),
        lockedAt:null,
        lastError:null
      }
    });
  }else{
    const exhausted=result.attempt>=current.maxAttempts;
    const delay=RETRY_DELAYS_MS[Math.min(result.attempt-1,RETRY_DELAYS_MS.length-1)];

    await prisma.webhookDeliveryJob.update({
      where:{id:current.id},
      data:exhausted
        ?{
            status:'DEAD_LETTER',
            attempt:result.attempt,
            lockedAt:null,
            lastError:result.error
          }
        :{
            status:'RETRY_WAIT',
            attempt:result.attempt,
            nextAttemptAt:new Date(Date.now()+delay),
            lockedAt:null,
            lastError:result.error
          }
    });
  }

  await refreshEventStatus(current.eventLogId);
  return {
    processed:true,
    ok:result.ok,
    attempt:result.attempt
  };
}

export async function processDueWebhookDeliveries({limit=20,companyId=null}={}){
  // Recover jobs that were PROCESSING when the process stopped.
  const staleBefore=new Date(Date.now()-5*60_000);
  await prisma.webhookDeliveryJob.updateMany({
    where:{
      ...(companyId?{companyId}:{}),
      status:'PROCESSING',
      lockedAt:{lt:staleBefore}
    },
    data:{
      status:'RETRY_WAIT',
      nextAttemptAt:new Date(),
      lockedAt:null,
      lastError:'Entrega recuperada después de una interrupción del worker.'
    }
  });

  const jobs=await prisma.webhookDeliveryJob.findMany({
    where:{
      ...(companyId?{companyId}:{}),
      status:{in:['READY','RETRY_WAIT']},
      nextAttemptAt:{lte:new Date()}
    },
    orderBy:{nextAttemptAt:'asc'},
    take:Math.min(Math.max(Number(limit)||20,1),100),
    select:{id:true}
  });

  const results=[];
  for(const job of jobs){
    results.push(await processJob(job));
  }

  return {
    found:jobs.length,
    processed:results.filter(x=>x.processed).length,
    succeeded:results.filter(x=>x.ok).length,
    failed:results.filter(x=>x.processed&&!x.ok).length
  };
}

export async function retryDeadLetterJob({companyId,jobId}){
  const job=await prisma.webhookDeliveryJob.findFirst({
    where:{id:jobId,companyId}
  });

  if(!job)throw new Error('Entrega no encontrada.');
  if(job.status!=='DEAD_LETTER'){
    throw new Error('Solo se pueden reintentar entregas en Dead Letter.');
  }

  const updated=await prisma.webhookDeliveryJob.update({
    where:{id:job.id},
    data:{
      status:'READY',
      attempt:0,
      nextAttemptAt:new Date(),
      lockedAt:null,
      completedAt:null,
      lastError:null
    }
  });

  if(job.eventLogId){
    await prisma.integrationEventLog.update({
      where:{id:job.eventLogId},
      data:{status:'PENDING',dispatchedAt:null}
    });
  }

  return updated;
}

export async function emitIntegrationEvent({
  companyId,
  event,
  entityType=null,
  entityId=null,
  payload={},
  dedupKey=null,
  correlationId=null,
  sourceRequestId=null,
  replayOfId=null,
  bypassDedup=false
}){
  const normalizedDedup=dedupKey?String(dedupKey).slice(0,180):null;

  if(normalizedDedup&&!bypassDedup){
    const existing=await prisma.integrationEventLog.findUnique({
      where:{companyId_dedupKey:{companyId,dedupKey:normalizedDedup}}
    });
    if(existing){
      return {
        eventLogId:existing.id,
        enqueued:existing.endpoints,
        deduplicated:true,
        correlationId:existing.correlationId||existing.id
      };
    }
  }

  const generatedCorrelationId=correlationId||crypto.randomUUID();

  let eventLog;
  try{
    eventLog=await prisma.integrationEventLog.create({
      data:{
        companyId,
        event,
        entityType,
        entityId,
        payload,
        status:'PENDING',
        dedupKey:normalizedDedup,
        correlationId:generatedCorrelationId,
        sourceRequestId:sourceRequestId||null,
        replayOfId:replayOfId||null
      }
    });
  }catch(error){
    if(error?.code==='P2002'&&normalizedDedup&&!bypassDedup){
      const existing=await prisma.integrationEventLog.findUnique({
        where:{companyId_dedupKey:{companyId,dedupKey:normalizedDedup}}
      });
      if(existing){
        return {
          eventLogId:existing.id,
          enqueued:existing.endpoints,
          deduplicated:true,
          correlationId:existing.correlationId||existing.id
        };
      }
    }
    throw error;
  }

  runAutomationsForEventAsync({
    companyId,
    eventLogId:eventLog.id,
    event,
    entityType,
    entityId,
    payload
  });

  const endpoints=await prisma.webhookEndpoint.findMany({
    where:{companyId,active:true}
  });

  const matching=endpoints.filter(
    endpoint=>Array.isArray(endpoint.events)&&endpoint.events.includes(event)
  );

  if(!matching.length){
    await prisma.integrationEventLog.update({
      where:{id:eventLog.id},
      data:{
        status:'DISPATCHED',
        endpoints:0,
        delivered:0,
        failed:0,
        dispatchedAt:new Date()
      }
    });
    return {eventLogId:eventLog.id,enqueued:0,deduplicated:false,correlationId:eventLog.correlationId||eventLog.id};
  }

  await prisma.webhookDeliveryJob.createMany({
    data:matching.map(webhook=>({
      companyId,
      webhookId:webhook.id,
      eventLogId:eventLog.id,
      event,
      payload,
      requestId:crypto.randomUUID(),
      status:'READY',
      attempt:0,
      maxAttempts:4,
      nextAttemptAt:new Date()
    }))
  });

  await prisma.integrationEventLog.update({
    where:{id:eventLog.id},
    data:{endpoints:matching.length}
  });

  // Fast path: queue remains durable, but attempt first delivery immediately.
  setImmediate(()=>{
    processDueWebhookDeliveries({limit:matching.length,companyId}).catch(error=>{
      console.error('[WebhookQueue]',error);
    });
  });

  return {eventLogId:eventLog.id,enqueued:matching.length,deduplicated:false,correlationId:eventLog.correlationId||eventLog.id};
}

export async function replayIntegrationEvent({companyId,eventLogId,requestedBy=null}){
  const original=await prisma.integrationEventLog.findFirst({
    where:{id:eventLogId,companyId}
  });
  if(!original)throw new Error('Evento de integración no encontrado.');

  const replay=await emitIntegrationEvent({
    companyId,
    event:original.event,
    entityType:original.entityType,
    entityId:original.entityId,
    payload:{
      ...((original.payload&&typeof original.payload==='object')?original.payload:{}),
      _buzzbeeReplay:{
        originalEventLogId:original.id,
        requestedBy,
        replayedAt:new Date().toISOString()
      }
    },
    correlationId:original.correlationId||original.id,
    sourceRequestId:null,
    replayOfId:original.id,
    bypassDedup:true
  });

  return {
    ...replay,
    originalEventLogId:original.id
  };
}

export function emitIntegrationEventAsync(args){
  setImmediate(()=>{
    emitIntegrationEvent(args).catch(error=>{
      console.error('[IntegrationEvent]',args.event,error);
    });
  });
}

export async function emitLowStockEvents({companyId,productIds=[],warehouseIds=[]}){
  const uniqueProducts=[...new Set(productIds.filter(Boolean))];
  if(!uniqueProducts.length)return [];

  const balances=await prisma.inventoryBalance.findMany({
    where:{
      productId:{in:uniqueProducts},
      warehouse:{branch:{companyId}},
      ...(warehouseIds.length?{warehouseId:{in:[...new Set(warehouseIds)]}}:{})
    },
    include:{
      product:{select:{id:true,sku:true,name:true,unit:true,minStock:true}},
      warehouse:{select:{id:true,code:true,name:true}}
    }
  });

  const low=balances.filter(
    row=>Number(row.quantity)<=Number(row.product.minStock)
  );

  for(const row of low){
    emitIntegrationEventAsync({
      companyId,
      event:'inventory.low_stock',
      entityType:'InventoryBalance',
      entityId:row.id,
      payload:{
        product:row.product,
        warehouse:row.warehouse,
        quantity:Number(row.quantity),
        minStock:Number(row.product.minStock)
      }
    });
  }

  return low;
}
