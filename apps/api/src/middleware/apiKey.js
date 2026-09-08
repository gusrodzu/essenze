import crypto from 'node:crypto';
import {prisma} from '../lib/prisma.js';

function hashKey(value){
  return crypto.createHash('sha256').update(value).digest('hex');
}
function safeHashEqual(a,b){
  const left=Buffer.from(String(a||''),'hex');
  const right=Buffer.from(String(b||''),'hex');
  return left.length===right.length && left.length>0 && crypto.timingSafeEqual(left,right);
}

export function requireApiKeyScope(scope){
  return async function apiKeyMiddleware(req,res,next){
    const started=Date.now();
    const authorization=req.headers.authorization;
    const headerKey=req.headers['x-api-key'];
    const raw=authorization?.startsWith('Bearer bb_live_')
      ?authorization.slice(7)
      :typeof headerKey==='string'?headerKey:null;

    if(!raw||!raw.startsWith('bb_live_')){
      return res.status(401).json({ok:false,message:'API Key requerida',requestId:req.id||null});
    }

    const prefix=raw.split('.')[0];
    try{
      const credential=await prisma.apiCredential.findUnique({
        where:{prefix},
        include:{company:{select:{active:true}}}
      });

      if(
        !credential ||
        credential.status!=='ACTIVE' ||
        !credential.company?.active ||
        !safeHashEqual(hashKey(raw),credential.secretHash)
      ){
        return res.status(401).json({ok:false,message:'API Key inválida o revocada',requestId:req.id||null});
      }

      if(credential.expiresAt&&credential.expiresAt<=new Date()){
        return res.status(401).json({ok:false,message:'API Key expirada',requestId:req.id||null});
      }

      const scopes=Array.isArray(credential.scopes)?credential.scopes:[];
      if(scope&&!scopes.includes(scope)){
        return res.status(403).json({ok:false,message:`Scope requerido: ${scope}`,requestId:req.id||null});
      }

      req.apiAuth={
        companyId:credential.companyId,
        credentialId:credential.id,
        scope
      };

      await prisma.apiCredential.update({
        where:{id:credential.id},
        data:{lastUsedAt:new Date()}
      });

      res.on('finish',()=>{
        prisma.apiAccessLog.create({
          data:{
            companyId:credential.companyId,
            credentialId:credential.id,
            method:req.method,
            path:req.originalUrl,
            scope:scope||null,
            statusCode:res.statusCode,
            durationMs:Date.now()-started,
            ipAddress:req.ip||null,
            userAgent:req.headers['user-agent']||null
          }
        }).catch(()=>{});
      });

      next();
    }catch(error){
      next(error);
    }
  };
}
