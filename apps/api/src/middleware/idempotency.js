import crypto from 'node:crypto';
import {prisma} from '../lib/prisma.js';

const MUTATING=new Set(['POST','PUT','PATCH','DELETE']);
const KEY_PATTERN=/^[A-Za-z0-9._:-]{8,160}$/;

function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  }
  return value;
}

function hashRequest(req){
  const raw=JSON.stringify({
    method:req.method,
    path:req.originalUrl.split('?')[0],
    body:stable(req.body??null)
  });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function cloneJson(value){
  try{return JSON.parse(JSON.stringify(value));}
  catch{return {ok:false,message:'Respuesta no serializable'};}
}

export function idempotency({ttlHours=24}={}){
  return async function idempotencyMiddleware(req,res,next){
    if(!MUTATING.has(req.method))return next();

    const key=String(req.headers['idempotency-key']||'').trim();
    if(!key)return next();
    if(!KEY_PATTERN.test(key)){
      return res.status(400).json({
        ok:false,
        message:'Idempotency-Key inválida. Usa 8-160 caracteres alfanuméricos, punto, guion, guion bajo o dos puntos.',
        requestId:req.id||null
      });
    }

    const companyId=req.auth?.companyId||req.apiAuth?.companyId;
    if(!companyId)return res.status(401).json({ok:false,message:'Tenant no disponible',requestId:req.id||null});

    const scope=`${req.method}:${req.originalUrl.split('?')[0]}`;
    const requestHash=hashRequest(req);
    const expiresAt=new Date(Date.now()+ttlHours*60*60*1000);

    let record;
    try{
      record=await prisma.idempotencyRecord.create({
        data:{
          companyId,key,scope,requestHash,status:'PROCESSING',
          requestId:req.id||null,expiresAt
        }
      });
      res.setHeader('x-idempotency-status','new');
    }catch(error){
      if(error?.code!=='P2002')return next(error);

      const existing=await prisma.idempotencyRecord.findUnique({
        where:{companyId_scope_key:{companyId,scope,key}}
      });
      if(!existing)return next(error);

      if(existing.requestHash!==requestHash){
        return res.status(409).json({
          ok:false,
          message:'La misma Idempotency-Key ya fue usada con una solicitud diferente.',
          requestId:req.id||null
        });
      }

      if(existing.status==='COMPLETED'&&existing.responseStatus!=null){
        res.setHeader('x-idempotency-status','replayed');
        res.setHeader('x-original-request-id',existing.requestId||'unknown');
        return res.status(existing.responseStatus).json(existing.responseBody??{ok:true,replayed:true});
      }

      return res.status(409).json({
        ok:false,
        code:'IDEMPOTENCY_IN_PROGRESS',
        message:'Ya existe una solicitud con esta Idempotency-Key en proceso. Reintenta en unos segundos.',
        requestId:req.id||null
      });
    }

    const originalJson=res.json.bind(res);
    let captured=false;
    res.json=(body)=>{
      if(!captured){
        captured=true;
        const responseStatus=res.statusCode;
        const responseBody=cloneJson(body);
        queueMicrotask(()=>{
          prisma.idempotencyRecord.update({
            where:{id:record.id},
            data:{
              status:responseStatus>=500?'FAILED':'COMPLETED',
              responseStatus,
              responseBody
            }
          }).catch(error=>req.log?.error({err:error,requestId:req.id},'idempotency.persist.failed'));
        });
      }
      return originalJson(body);
    };

    res.on('close',()=>{
      if(!captured&&!res.writableEnded){
        prisma.idempotencyRecord.update({
          where:{id:record.id},
          data:{status:'FAILED'}
        }).catch(()=>{});
      }
    });

    next();
  };
}
