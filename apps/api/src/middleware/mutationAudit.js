import {prisma} from '../lib/prisma.js';
const MUTATING=new Set(['POST','PUT','PATCH','DELETE']);
const SKIP_PREFIXES=['/api/auth/login','/api/auth/register'];
export function mutationAudit(request,response,next){
  if(!MUTATING.has(request.method)||SKIP_PREFIXES.some(p=>request.originalUrl?.startsWith(p)))return next();
  const started=Date.now();
  response.on('finish',()=>{
    if(response.statusCode>=500)return;
    const auth=request.auth||request.apiAuth||null;
    const companyId=auth?.companyId||null;
    if(!auth&&!companyId)return;
    queueMicrotask(async()=>{
      try{
        await prisma.auditLog.create({data:{
          userId:request.auth?.sub||null,
          action:`HTTP_${request.method}`,
          entity:'ApiMutation',
          description:`${request.method} ${request.originalUrl||request.url}`,
          ipAddress:request.ip,
          metadata:{
            companyId,
            requestId:request.id||null,
            route:request.originalUrl||request.url,
            method:request.method,
            statusCode:response.statusCode,
            durationMs:Date.now()-started,
            apiCredentialId:request.apiAuth?.credentialId||null
          }
        }});
      }catch(error){request.log?.error({err:error,requestId:request.id},'mutation.audit.failed');}
    });
  });
  next();
}
