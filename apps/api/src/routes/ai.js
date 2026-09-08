import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {askBuzzBeeAI} from '../services/buzzbeeAI.js';

const router=Router();
router.use(requireAuth);

router.get('/context',requirePermission('ai.read'),async(req,res)=>{
  res.json({
    ok:true,
    mode:'READ_ONLY',
    providerConfigured:Boolean(process.env.OPENAI_API_KEY),
    model:process.env.BUZZBEE_AI_MODEL||null
  });
});

router.post('/ask',requirePermission('ai.read'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      question:z.string().trim().min(2).max(1200),
      route:z.string().max(300).optional().default(''),
      context:z.string().max(80).optional()
    }).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Pregunta inválida.'});

    const result=await askBuzzBeeAI({
      companyId:req.auth.companyId,
      userId:req.auth.sub,
      question:parsed.data.question,
      route:parsed.data.route,
      context:parsed.data.context
    });

    await prisma.auditLog.create({
      data:{
        userId:req.auth.sub,
        action:'AI_QUERY',
        entity:'BuzzBeeAI',
        description:`Consulta BuzzBee AI (${result.context})`,
        ipAddress:req.ip,
        metadata:{question:parsed.data.question.slice(0,500),provider:result.provider,mode:result.mode}
      }
    });

    res.json({ok:true,...result});
  }catch(error){next(error)}
});

export default router;
