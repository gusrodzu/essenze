import {Router} from 'express';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {getWorkerHealth} from '../services/workerHealth.js';

const router=Router();
router.use(requireAuth);

router.get('/health',async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const staleBefore=new Date(Date.now()-5*60_000);
    const [ready,retrying,processing,stale,deadLetters,recentFailures,recentSuccesses,recentEvents]=await Promise.all([
      prisma.webhookDeliveryJob.count({where:{companyId,status:'READY'}}),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'RETRY_WAIT'}}),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'PROCESSING'}}),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'PROCESSING',lockedAt:{lt:staleBefore}}}),
      prisma.webhookDeliveryJob.count({where:{companyId,status:'DEAD_LETTER'}}),
      prisma.webhookDeliveryLog.count({where:{companyId,status:'FAILED',createdAt:{gte:new Date(Date.now()-24*60*60_000)}}}),
      prisma.webhookDeliveryLog.count({where:{companyId,status:'SUCCESS',createdAt:{gte:new Date(Date.now()-24*60*60_000)}}}),
      prisma.integrationEventLog.count({where:{companyId,createdAt:{gte:new Date(Date.now()-24*60*60_000)}}})
    ]);
    const workers=getWorkerHealth();
    const degraded=stale>0||deadLetters>0||workers.some(w=>w.enabled&&w.lastError&&!w.running);
    res.json({
      ok:!degraded,
      status:degraded?'DEGRADED':'HEALTHY',
      requestId:req.id||null,
      workers,
      webhookQueue:{
        ready,retrying,processing,stale,deadLetters,
        recentFailures24h:recentFailures,
        recentSuccesses24h:recentSuccesses,
        recentEvents24h:recentEvents,
        successRate24h:(recentSuccesses+recentFailures)
          ?Math.round(recentSuccesses/(recentSuccesses+recentFailures)*100)
          :100
      },
      timestamp:new Date().toISOString()
    });
  }catch(error){next(error)}
});
export default router;
