import {Router} from 'express';
import crypto from 'node:crypto';
import net from 'node:net';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {processDueWebhookDeliveries,retryDeadLetterJob,replayIntegrationEvent} from '../services/integrationEvents.js';

import {APP_VERSION} from '../lib/version.js';
const router=Router();
router.use(requireAuth);

const EVENT_CATALOG=[
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

const PROVIDERS=[
  {key:'GENERIC',label:'API / Sistema genérico'},
  {key:'SHOPIFY',label:'Shopify'},
  {key:'MERCADO_PAGO',label:'Mercado Pago'},
  {key:'GOOGLE_SHEETS',label:'Google Sheets'},
  {key:'N8N',label:'n8n'},
  {key:'MAKE',label:'Make'},
  {key:'ZAPIER',label:'Zapier'},
  {key:'CUSTOM',label:'Personalizada'}
];

function masterKey(){
  const source=process.env.INTEGRATION_ENCRYPTION_KEY||process.env.JWT_SECRET||'buzzbee-development-only-key';
  return crypto.createHash('sha256').update(source).digest();
}

function encryptSecret(secret){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',masterKey(),iv);
  const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,encrypted].map(x=>x.toString('base64url')).join('.');
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

function createApiSecret(){
  const id=crypto.randomBytes(8).toString('hex');
  const secret=crypto.randomBytes(24).toString('base64url');
  const prefix=`bb_live_${id}`;
  const full=`${prefix}.${secret}`;
  return {
    full,
    prefix,
    last4:secret.slice(-4),
    hash:crypto.createHash('sha256').update(full).digest('hex')
  };
}

function privateIp(host){
  const ip=net.isIP(host)?host:null;
  if(!ip)return false;
  if(ip==='127.0.0.1'||ip==='::1'||ip==='0.0.0.0'||ip==='::')return true;
  if(ip.startsWith('10.')||ip.startsWith('192.168.')||ip.startsWith('169.254.'))return true;
  const m=ip.match(/^172\.(\d+)\./);
  if(m&&Number(m[1])>=16&&Number(m[1])<=31)return true;
  if(ip.toLowerCase().startsWith('fc')||ip.toLowerCase().startsWith('fd')||ip.toLowerCase().startsWith('fe80:'))return true;
  return false;
}
function safeUrl(value){
  try{
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol))return null;
    const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
    const blockedHost=
      host==='localhost'||
      host.endsWith('.localhost')||
      host.endsWith('.local')||
      host==='metadata.google.internal'||
      host==='metadata'||
      privateIp(host);
    if(blockedHost)return null;
    if(process.env.NODE_ENV==='production'&&u.protocol!=='https:')return null;
    return u.toString();
  }catch{return null}
}

function stringifyBody(value){
  try{return JSON.stringify(value)}catch{return String(value)}
}

async function deliverWebhook({webhook,event,payload,companyId,attempt=1}){
  const requestId=crypto.randomUUID();
  const body=JSON.stringify({
    id:requestId,
    event,
    createdAt:new Date().toISOString(),
    companyId,
    data:payload
  });

  const log=await prisma.webhookDeliveryLog.create({
    data:{
      companyId,
      webhookId:webhook.id,
      event,
      requestId,
      attempt,
      payload
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
    const timer=setTimeout(()=>controller.abort(),Math.min(Math.max(webhook.timeoutMs||8000,1000),20000));

    let response;
    try{
      response=await fetch(webhook.url,{
        method:'POST',
        headers:{
          'content-type':'application/json',
          'user-agent':'BuzzBee-Webhook/1.0',
          'x-buzzbee-event':event,
          'x-buzzbee-request-id':requestId,
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
    const success=response.ok;

    await prisma.webhookDeliveryLog.update({
      where:{id:log.id},
      data:{
        status:success?'SUCCESS':'FAILED',
        statusCode:response.status,
        durationMs,
        responseBody:text||null,
        error:success?null:`HTTP ${response.status}`,
        deliveredAt:new Date()
      }
    });

    await prisma.webhookEndpoint.update({
      where:{id:webhook.id},
      data:{
        lastDeliveryAt:new Date(),
        ...(success
          ?{lastSuccessAt:new Date(),failureCount:0,lastError:null}
          :{failureCount:{increment:1},lastError:`HTTP ${response.status}`})
      }
    });

    return {ok:success,statusCode:response.status,durationMs,responseBody:text};
  }catch(error){
    const durationMs=Date.now()-started;
    const message=error.name==='AbortError'?'Tiempo de espera agotado':(error.message||'Error de entrega');

    await prisma.webhookDeliveryLog.update({
      where:{id:log.id},
      data:{
        status:'FAILED',
        durationMs,
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

    return {ok:false,durationMs,error:message};
  }
}

router.get('/catalog',requirePermission('integrations.read'),async(_req,res)=>{
  res.json({providers:PROVIDERS,events:EVENT_CATALOG});
});

router.get('/dashboard',requirePermission('integrations.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [
      connections,
      apiKeys,
      webhooks,
      deliveries,
      successCount,
      failureCount,
      apiAccessLogs,
      eventLogs,
      queueJobs
    ]=await Promise.all([
      prisma.integrationConnection.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:50
      }),
      prisma.apiCredential.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        select:{
          id:true,name:true,prefix:true,last4:true,scopes:true,status:true,
          lastUsedAt:true,expiresAt:true,revokedAt:true,createdAt:true
        }
      }),
      prisma.webhookEndpoint.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        select:{
          id:true,name:true,url:true,events:true,active:true,timeoutMs:true,
          failureCount:true,lastDeliveryAt:true,lastSuccessAt:true,lastError:true,
          createdAt:true
        }
      }),
      prisma.webhookDeliveryLog.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:40,
        include:{webhook:{select:{name:true,url:true}}}
      }),
      prisma.webhookDeliveryLog.count({
        where:{companyId,status:'SUCCESS'}
      }),
      prisma.webhookDeliveryLog.count({
        where:{companyId,status:'FAILED'}
      }),
      prisma.apiAccessLog.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:40,
        include:{credential:{select:{name:true,prefix:true}}}
      }),
      prisma.integrationEventLog.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:40,
        // Selección explícita para mantener compatibilidad con instalaciones
        // previas a los campos de trazabilidad agregados en v10.8.
        select:{
          id:true,companyId:true,event:true,entityType:true,entityId:true,
          status:true,endpoints:true,delivered:true,failed:true,
          createdAt:true,dispatchedAt:true
        }
      }),
      prisma.webhookDeliveryJob.findMany({
        where:{companyId},
        orderBy:{createdAt:'desc'},
        take:60,
        include:{webhook:{select:{name:true,url:true}}}
      })
    ]);

    const activeKeys=apiKeys.filter(x=>x.status==='ACTIVE').length;
    const activeWebhooks=webhooks.filter(x=>x.active).length;
    const queueReady=queueJobs.filter(x=>['READY','RETRY_WAIT','PROCESSING'].includes(x.status)).length;
    const deadLetters=queueJobs.filter(x=>x.status==='DEAD_LETTER').length;
    const totalDeliveries=successCount+failureCount;
    const successRate=totalDeliveries
      ?Math.round((successCount/totalDeliveries)*100)
      :100;

    res.json({
      summary:{
        connections:connections.filter(x=>x.status==='ACTIVE').length,
        activeKeys,
        activeWebhooks,
        deliveries:totalDeliveries,
        successRate,
        failures:failureCount,
        queueReady,
        deadLetters
      },
      connections,
      apiKeys,
      webhooks,
      deliveries,
      apiAccessLogs,
      eventLogs,
      queueJobs
    });
  }catch(e){next(e)}
});

router.post('/connections',requirePermission('integrations.manage'),async(req,res,next)=>{
  try{
    const name=String(req.body?.name||'').trim();
    const provider=String(req.body?.provider||'GENERIC').trim().toUpperCase();
    const baseUrl=req.body?.baseUrl?safeUrl(req.body.baseUrl):null;

    if(!name)return res.status(400).json({ok:false,message:'El nombre es obligatorio.'});
    if(req.body?.baseUrl&&!baseUrl){
      return res.status(400).json({ok:false,message:'URL base inválida.'});
    }

    const row=await prisma.integrationConnection.create({
      data:{
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        name,
        provider,
        description:req.body?.description||null,
        baseUrl,
        status:'ACTIVE',
        settings:req.body?.settings||{}
      }
    });

    res.status(201).json({ok:true,connection:row});
  }catch(e){next(e)}
});

router.patch('/connections/:id',requirePermission('integrations.manage'),async(req,res,next)=>{
  try{
    const row=await prisma.integrationConnection.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!row)return res.status(404).json({ok:false,message:'Conexión no encontrada.'});

    const data={};
    if(req.body?.name!==undefined)data.name=String(req.body.name).trim();
    if(req.body?.description!==undefined)data.description=req.body.description||null;
    if(req.body?.status!==undefined)data.status=req.body.status;
    if(req.body?.baseUrl!==undefined){
      const url=req.body.baseUrl?safeUrl(req.body.baseUrl):null;
      if(req.body.baseUrl&&!url)return res.status(400).json({ok:false,message:'URL base inválida.'});
      data.baseUrl=url;
    }

    const updated=await prisma.integrationConnection.update({
      where:{id:row.id},
      data
    });
    res.json({ok:true,connection:updated});
  }catch(e){next(e)}
});

router.post('/api-keys',requirePermission('integrations.keys'),async(req,res,next)=>{
  try{
    const name=String(req.body?.name||'').trim();
    const scopes=Array.isArray(req.body?.scopes)?req.body.scopes:[];
    if(!name)return res.status(400).json({ok:false,message:'El nombre de la API Key es obligatorio.'});
    if(!scopes.length)return res.status(400).json({ok:false,message:'Selecciona al menos un scope.'});

    const key=createApiSecret();

    const credential=await prisma.apiCredential.create({
      data:{
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        name,
        prefix:key.prefix,
        secretHash:key.hash,
        last4:key.last4,
        scopes,
        expiresAt:req.body?.expiresAt?new Date(req.body.expiresAt):null
      },
      select:{
        id:true,name:true,prefix:true,last4:true,scopes:true,status:true,
        expiresAt:true,createdAt:true
      }
    });

    res.status(201).json({
      ok:true,
      credential,
      secret:key.full,
      warning:'Copia esta clave ahora. BuzzBee no volverá a mostrar el secreto completo.'
    });
  }catch(e){next(e)}
});

router.post('/api-keys/:id/revoke',requirePermission('integrations.keys'),async(req,res,next)=>{
  try{
    const row=await prisma.apiCredential.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!row)return res.status(404).json({ok:false,message:'API Key no encontrada.'});
    if(row.status==='REVOKED')return res.json({ok:true});

    const updated=await prisma.apiCredential.update({
      where:{id:row.id},
      data:{status:'REVOKED',revokedAt:new Date()}
    });
    res.json({ok:true,credential:updated});
  }catch(e){next(e)}
});

router.post('/webhooks',requirePermission('integrations.manage'),async(req,res,next)=>{
  try{
    const name=String(req.body?.name||'').trim();
    const url=safeUrl(req.body?.url);
    const events=Array.isArray(req.body?.events)?req.body.events.filter(Boolean):[];

    if(!name)return res.status(400).json({ok:false,message:'El nombre es obligatorio.'});
    if(!url)return res.status(400).json({ok:false,message:'URL de webhook inválida.'});
    if(!events.length)return res.status(400).json({ok:false,message:'Selecciona al menos un evento.'});

    const unknown=events.filter(x=>!EVENT_CATALOG.includes(x));
    if(unknown.length){
      return res.status(400).json({ok:false,message:`Eventos no soportados: ${unknown.join(', ')}`});
    }

    const secret=crypto.randomBytes(32).toString('base64url');

    const webhook=await prisma.webhookEndpoint.create({
      data:{
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        name,
        url,
        events,
        timeoutMs:Math.min(Math.max(Number(req.body?.timeoutMs)||8000,1000),20000),
        signingSecretEnc:encryptSecret(secret)
      },
      select:{
        id:true,name:true,url:true,events:true,active:true,timeoutMs:true,createdAt:true
      }
    });

    res.status(201).json({
      ok:true,
      webhook,
      signingSecret:secret,
      warning:'Copia el signing secret ahora. Solo se guarda cifrado.'
    });
  }catch(e){next(e)}
});

router.patch('/webhooks/:id',requirePermission('integrations.manage'),async(req,res,next)=>{
  try{
    const row=await prisma.webhookEndpoint.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!row)return res.status(404).json({ok:false,message:'Webhook no encontrado.'});

    const data={};

    if(req.body?.name!==undefined)data.name=String(req.body.name).trim();
    if(req.body?.active!==undefined)data.active=Boolean(req.body.active);

    if(req.body?.url!==undefined){
      const url=safeUrl(req.body.url);
      if(!url)return res.status(400).json({ok:false,message:'URL de webhook inválida.'});
      data.url=url;
    }

    if(req.body?.events!==undefined){
      const events=Array.isArray(req.body.events)?req.body.events.filter(Boolean):[];
      if(!events.length)return res.status(400).json({ok:false,message:'Selecciona al menos un evento.'});
      const unknown=events.filter(x=>!EVENT_CATALOG.includes(x));
      if(unknown.length)return res.status(400).json({ok:false,message:`Eventos no soportados: ${unknown.join(', ')}`});
      data.events=events;
    }

    const updated=await prisma.webhookEndpoint.update({
      where:{id:row.id},
      data,
      select:{
        id:true,name:true,url:true,events:true,active:true,timeoutMs:true,
        failureCount:true,lastDeliveryAt:true,lastSuccessAt:true,lastError:true,
        createdAt:true
      }
    });

    res.json({ok:true,webhook:updated});
  }catch(e){next(e)}
});

router.post('/webhooks/:id/rotate-secret',requirePermission('integrations.manage'),async(req,res,next)=>{
  try{
    const row=await prisma.webhookEndpoint.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!row)return res.status(404).json({ok:false,message:'Webhook no encontrado.'});

    const secret=crypto.randomBytes(32).toString('base64url');

    await prisma.webhookEndpoint.update({
      where:{id:row.id},
      data:{signingSecretEnc:encryptSecret(secret)}
    });

    res.json({
      ok:true,
      signingSecret:secret,
      warning:'El secreto anterior dejó de ser válido. Copia el nuevo secreto ahora.'
    });
  }catch(e){next(e)}
});

router.post('/webhooks/:id/test',requirePermission('integrations.test'),async(req,res,next)=>{
  try{
    const webhook=await prisma.webhookEndpoint.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!webhook)return res.status(404).json({ok:false,message:'Webhook no encontrado.'});
    if(!webhook.active)return res.status(409).json({ok:false,message:'Activa el webhook antes de probarlo.'});

    const result=await deliverWebhook({
      webhook,
      event:'integration.test',
      payload:{
        message:'Prueba de conectividad desde BuzzBee Integration Hub',
        requestedBy:req.auth.sub
      },
      companyId:req.auth.companyId
    });

    res.status(result.ok?200:502).json({
      ok:result.ok,
      result
    });
  }catch(e){next(e)}
});

router.get('/deliveries',requirePermission('integrations.read'),async(req,res,next)=>{
  try{
    const rows=await prisma.webhookDeliveryLog.findMany({
      where:{
        companyId:req.auth.companyId,
        ...(req.query?.webhookId?{webhookId:String(req.query.webhookId)}:{})
      },
      orderBy:{createdAt:'desc'},
      take:100,
      include:{webhook:{select:{name:true,url:true}}}
    });
    res.json({deliveries:rows});
  }catch(e){next(e)}
});


router.post('/queue/process',requirePermission('integrations.test'),async(req,res,next)=>{
  try{
    const result=await processDueWebhookDeliveries({
      limit:Math.min(Math.max(Number(req.body?.limit)||25,1),100),
      companyId:req.auth.companyId
    });
    res.json({ok:true,result});
  }catch(e){next(e)}
});

router.post('/queue/:id/retry',requirePermission('integrations.test'),async(req,res,next)=>{
  try{
    const job=await retryDeadLetterJob({
      companyId:req.auth.companyId,
      jobId:req.params.id
    });
    const result=await processDueWebhookDeliveries({
      limit:1,
      companyId:req.auth.companyId
    });
    res.json({ok:true,job,result});
  }catch(e){
    if(e.message?.includes('no encontrada'))return res.status(404).json({ok:false,message:e.message});
    if(e.message?.includes('Dead Letter'))return res.status(409).json({ok:false,message:e.message});
    next(e);
  }
});

router.get('/metrics',requirePermission('integrations.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const days=Math.min(Math.max(Number(req.query?.days)||7,1),90);
    const since=new Date(Date.now()-days*24*60*60_000);

    const [events,deliveries,apiAccess,deadLetters,replays,deduped]=await Promise.all([
      prisma.integrationEventLog.findMany({
        where:{companyId,createdAt:{gte:since}},
        select:{createdAt:true,status:true,event:true,endpoints:true,delivered:true,failed:true,replayOfId:true,dedupKey:true}
      }),
      prisma.webhookDeliveryLog.findMany({
        where:{companyId,createdAt:{gte:since}},
        select:{createdAt:true,status:true,durationMs:true,event:true}
      }),
      prisma.apiAccessLog.findMany({
        where:{companyId,createdAt:{gte:since}},
        select:{createdAt:true,statusCode:true,durationMs:true}
      }),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'DEAD_LETTER'}}),
      prisma.integrationEventLog.count({where:{companyId,replayOfId:{not:null},createdAt:{gte:since}}}),
      prisma.integrationEventLog.count({where:{companyId,dedupKey:{not:null},createdAt:{gte:since}}})
    ]);

    const bucket=new Map();
    for(let i=days-1;i>=0;i--){
      const d=new Date();
      d.setUTCHours(0,0,0,0);
      d.setUTCDate(d.getUTCDate()-i);
      const key=d.toISOString().slice(0,10);
      bucket.set(key,{date:key,events:0,deliveries:0,success:0,failed:0,apiRequests:0});
    }
    const keyOf=v=>new Date(v).toISOString().slice(0,10);

    for(const row of events){
      const b=bucket.get(keyOf(row.createdAt));
      if(b)b.events+=1;
    }
    for(const row of deliveries){
      const b=bucket.get(keyOf(row.createdAt));
      if(b){
        b.deliveries+=1;
        if(row.status==='SUCCESS')b.success+=1;
        if(row.status==='FAILED')b.failed+=1;
      }
    }
    for(const row of apiAccess){
      const b=bucket.get(keyOf(row.createdAt));
      if(b)b.apiRequests+=1;
    }

    const success=deliveries.filter(x=>x.status==='SUCCESS').length;
    const failed=deliveries.filter(x=>x.status==='FAILED').length;
    const durations=deliveries.map(x=>Number(x.durationMs||0)).filter(x=>x>0);
    const apiDurations=apiAccess.map(x=>Number(x.durationMs||0)).filter(x=>x>0);
    const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;

    res.json({
      ok:true,
      periodDays:days,
      summary:{
        events:events.length,
        webhookDeliveries:deliveries.length,
        webhookSuccessRate:(success+failed)?Math.round(success/(success+failed)*100):100,
        avgWebhookDurationMs:avg(durations),
        apiRequests:apiAccess.length,
        apiErrorRate:apiAccess.length?Math.round(apiAccess.filter(x=>x.statusCode>=400).length/apiAccess.length*100):0,
        avgApiDurationMs:avg(apiDurations),
        deadLetters,
        replays,
        dedupTrackedEvents:deduped
      },
      daily:[...bucket.values()]
    });
  }catch(error){next(error)}
});

router.post('/events/:id/replay',requirePermission('integrations.test'),async(req,res,next)=>{
  try{
    const result=await replayIntegrationEvent({
      companyId:req.auth.companyId,
      eventLogId:req.params.id,
      requestedBy:req.auth.sub
    });
    res.status(202).json({ok:true,result});
  }catch(error){
    if(error.message?.includes('no encontrado'))return res.status(404).json({ok:false,message:error.message});
    next(error);
  }
});

router.get('/health',async(_req,res)=>{
  res.json({
    ok:true,
    service:'integration-hub',
    version:APP_VERSION,
    encryptionConfigured:Boolean(process.env.INTEGRATION_ENCRYPTION_KEY),
    apiKeyAuth:'prefix-lookup-timing-safe-hash-active-tenant'
  });
});

export default router;
