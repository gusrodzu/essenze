import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {nextSequence} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router=Router();
router.use(requireAuth);

const schema=z.object({
  categoryId:z.string().min(1),
  name:z.string().min(2).max(160),
  description:z.string().max(1000).optional().nullable(),
  serialNumber:z.string().max(120).optional().nullable(),
  brand:z.string().max(100).optional().nullable(),
  model:z.string().max(100).optional().nullable(),
  location:z.string().max(160).optional().nullable(),
  custodian:z.string().max(160).optional().nullable(),
  acquisitionDate:z.string().min(8),
  acquisitionCost:z.coerce.number().positive(),
  residualValue:z.coerce.number().min(0).optional().default(0),
  usefulLifeMonths:z.coerce.number().int().positive(),
  depreciationStartDate:z.string().min(8),
  supplierName:z.string().max(160).optional().nullable(),
  invoiceReference:z.string().max(120).optional().nullable(),
  notes:z.string().max(1000).optional().nullable(),
});

function monthsBetween(start,end){
  const s=new Date(start),e=new Date(end);
  let m=(e.getUTCFullYear()-s.getUTCFullYear())*12+(e.getUTCMonth()-s.getUTCMonth());
  if(e.getUTCDate()<s.getUTCDate())m--;
  return Math.max(0,m);
}
function calc(asset){
  const cost=Number(asset.acquisitionCost);
  const residual=Number(asset.residualValue||0);
  const depreciable=Math.max(0,cost-residual);
  const monthly=asset.usefulLifeMonths>0?depreciable/asset.usefulLifeMonths:0;
  const elapsed=Math.min(asset.usefulLifeMonths,monthsBetween(asset.depreciationStartDate,new Date()));
  const accumulated=Math.min(depreciable,monthly*elapsed);
  return {
    monthlyDepreciation:monthly,
    calculatedAccumulatedDepreciation:accumulated,
    bookValue:Math.max(residual,cost-accumulated),
    elapsedMonths:elapsed,
    remainingMonths:Math.max(0,asset.usefulLifeMonths-elapsed)
  };
}
async function nextCode(companyId){const value=await nextSequence({companyId,scope:'fixed-asset',period:'GLOBAL',model:'fixedAsset',where:{companyId}});return `AF-${String(value).padStart(5,'0')}`;}

router.get('/dashboard',requirePermission('fixed_assets.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const [assets,categories]=await Promise.all([
      prisma.fixedAsset.findMany({where:{companyId},orderBy:{createdAt:'desc'},include:{category:true,createdBy:{select:{id:true,firstName:true,lastName:true,email:true}}}}),
      prisma.fixedAssetCategory.findMany({where:{companyId,active:true},orderBy:{name:'asc'}})
    ]);
    const rows=assets.map(a=>({...a,...calc(a)}));
    const active=rows.filter(x=>x.status==='ACTIVE');
    const summary={
      assetCount:active.length,
      acquisitionCost:active.reduce((s,x)=>s+Number(x.acquisitionCost),0),
      accumulatedDepreciation:active.reduce((s,x)=>s+x.calculatedAccumulatedDepreciation,0),
      bookValue:active.reduce((s,x)=>s+x.bookValue,0)
    };
    res.json({assets:rows,categories,summary});
  }catch(e){next(e)}
});

router.post('/',requirePermission('fixed_assets.create'),async(req,res,next)=>{
  try{
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Datos inválidos'});
    const category=await prisma.fixedAssetCategory.findFirst({where:{id:parsed.data.categoryId,companyId:req.auth.companyId,active:true}});
    if(!category)return res.status(404).json({ok:false,message:'Categoría no encontrada'});
    const code=await nextCode(req.auth.companyId);
    const asset=await prisma.fixedAsset.create({
      data:{
        ...parsed.data,
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        code,
        acquisitionDate:new Date(`${parsed.data.acquisitionDate}T12:00:00.000Z`),
        depreciationStartDate:new Date(`${parsed.data.depreciationStartDate}T12:00:00.000Z`)
      },
      include:{category:true}
    });
    res.status(201).json({ok:true,asset:{...asset,...calc(asset)}});
  }catch(e){next(e)}
});

router.post('/:id/recalculate',requirePermission('fixed_assets.manage'),async(req,res,next)=>{
  try{
    const asset=await prisma.fixedAsset.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!asset)return res.status(404).json({ok:false,message:'Activo no encontrado'});
    const calculated=calc(asset);
    const updated=await prisma.fixedAsset.update({where:{id:asset.id},data:{accumulatedDepreciation:calculated.calculatedAccumulatedDepreciation}});
    res.json({ok:true,asset:{...updated,...calculated}});
  }catch(e){next(e)}
});

router.post('/:id/dispose',requirePermission('fixed_assets.dispose'),async(req,res,next)=>{
  try{
    const body=z.object({reason:z.string().min(2),amount:z.coerce.number().min(0).optional().default(0),status:z.enum(['DISPOSED','SOLD','LOST']).optional().default('DISPOSED')}).safeParse(req.body);
    if(!body.success)return res.status(400).json({ok:false,message:'Datos de baja inválidos'});
    const asset=await prisma.fixedAsset.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!asset)return res.status(404).json({ok:false,message:'Activo no encontrado'});
    if(asset.status!=='ACTIVE')return res.status(409).json({ok:false,message:'Solo se pueden dar de baja activos activos'});
    const updated=await prisma.fixedAsset.update({where:{id:asset.id},data:{status:body.data.status,disposedAt:new Date(),disposalReason:body.data.reason,disposalAmount:body.data.amount}});
    res.json({ok:true,asset:updated});
  }catch(e){next(e)}
});

export default router;
