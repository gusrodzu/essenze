import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {intelligenceDashboard,metricHistory,scanIntelligence} from '../services/intelligence.js';

const router=Router();
router.use(requireAuth);

router.get('/dashboard',requirePermission('intelligence.read'),async(req,res,next)=>{
  try{
    res.json(await intelligenceDashboard(req.auth.companyId));
  }catch(e){next(e)}
});

router.post('/scan',requirePermission('intelligence.scan'),async(req,res,next)=>{
  try{
    const result=await scanIntelligence(req.auth.companyId);
    res.json({ok:true,...result});
  }catch(e){next(e)}
});

router.patch('/insights/:id/status',requirePermission('intelligence.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      status:z.enum(['ACKNOWLEDGED','RESOLVED','DISMISSED','OPEN'])
    }).safeParse(req.body);

    if(!parsed.success){
      return res.status(400).json({ok:false,message:'Estado inválido.'});
    }

    const insight=await prisma.intelligenceInsight.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });

    if(!insight){
      return res.status(404).json({ok:false,message:'Insight no encontrado.'});
    }

    const now=new Date();
    const data={
      status:parsed.data.status,
      acknowledgedAt:parsed.data.status==='ACKNOWLEDGED'?now:null,
      resolvedAt:parsed.data.status==='RESOLVED'?now:null,
      dismissedAt:parsed.data.status==='DISMISSED'?now:null
    };

    const updated=await prisma.intelligenceInsight.update({
      where:{id:insight.id},
      data
    });

    res.json({ok:true,insight:updated});
  }catch(e){next(e)}
});


router.get('/history',requirePermission('intelligence.read'),async(req,res,next)=>{
  try{
    const days=Math.min(Math.max(Number(req.query.days)||30,7),180);
    const metricKeys=String(req.query.metrics||'')
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean)
      .slice(0,20);

    res.json(await metricHistory(req.auth.companyId,{days,metricKeys}));
  }catch(e){next(e)}
});

router.get('/metrics',requirePermission('intelligence.read'),async(req,res,next)=>{
  try{
    const metrics=await prisma.intelligenceMetricDefinition.findMany({
      where:{companyId:req.auth.companyId,active:true},
      orderBy:[{category:'asc'},{name:'asc'}]
    });
    res.json({metrics});
  }catch(e){next(e)}
});

export default router;
