import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';

const router=Router();
router.use(requireAuth);

const productSchema=z.object({
  categoryId:z.string().optional().nullable(),
  sku:z.string().trim().min(2).max(40).transform(v=>v.toUpperCase()),
  name:z.string().trim().min(2,'El nombre es obligatorio'),
  description:z.string().trim().optional().nullable(),
  unit:z.string().trim().min(1).max(10).transform(v=>v.toUpperCase()),
  cost:z.coerce.number().min(0).default(0),
  price:z.coerce.number().min(0).default(0),
  minStock:z.coerce.number().min(0).default(0),
  active:z.boolean().default(true),
});

router.get('/',requirePermission('products.read'),async(req,res,next)=>{
  try{
    const [products,categories]=await Promise.all([
      prisma.product.findMany({where:{companyId:req.auth.companyId},include:{category:{select:{id:true,name:true,code:true}}},orderBy:[{active:'desc'},{name:'asc'}]}),
      prisma.productCategory.findMany({where:{companyId:req.auth.companyId,active:true},orderBy:{name:'asc'}}),
    ]);
    res.json({ok:true,products,categories});
  }catch(error){next(error);}
});

router.post('/',requirePermission('products.manage'),async(req,res,next)=>{
  try{
    const parsed=productSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    if(parsed.data.categoryId){
      const category=await prisma.productCategory.findFirst({where:{id:parsed.data.categoryId,companyId:req.auth.companyId}});
      if(!category) return res.status(404).json({ok:false,message:'Categoría no encontrada'});
    }
    const product=await prisma.product.create({data:{...parsed.data,categoryId:parsed.data.categoryId||null,companyId:req.auth.companyId}});
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'product.created',entityType:'Product',entityId:product.id,payload:{product}});res.status(201).json({ok:true,product});
  }catch(error){if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe un producto con ese SKU'});next(error);}
});

router.put('/:id',requirePermission('products.manage'),async(req,res,next)=>{
  try{
    const parsed=productSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const existing=await prisma.product.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Producto no encontrado'});
    const product=await prisma.product.update({where:{id:existing.id},data:{...parsed.data,categoryId:parsed.data.categoryId||null}});
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'product.updated',entityType:'Product',entityId:product.id,payload:{product}});
    res.json({ok:true,product});
  }catch(error){if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe un producto con ese SKU'});next(error);}
});

router.patch('/:id/status',requirePermission('products.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({active:z.boolean()}).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:'Estado inválido'});
    const existing=await prisma.product.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Producto no encontrado'});
    const product=await prisma.product.update({where:{id:existing.id},data:parsed.data});
    res.json({ok:true,product});
  }catch(error){next(error);}
});

router.delete('/:id',requirePermission('products.manage'),async(req,res,next)=>{
  try{
    const existing=await prisma.product.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Producto no encontrado'});
    await prisma.product.delete({where:{id:existing.id}});
    res.json({ok:true});
  }catch(error){next(error);}
});

export default router;
