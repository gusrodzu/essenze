import {Router} from 'express';
import {idempotency} from '../middleware/idempotency.js';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireApiKeyScope} from '../middleware/apiKey.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';
import {paginationFromQuery,pageMeta} from '../lib/pagination.js';

const router=Router();

router.get('/health',(_req,res)=>res.json({
  ok:true,
  service:'buzzbee-public-api',
  version:'v1'
}));

router.get('/customers',requireApiKeyScope('customers.read'),async(req,res,next)=>{
  try{
    const pg=paginationFromQuery(req.query);
    const where={companyId:req.apiAuth.companyId,active:true};
    const [customers,total]=await Promise.all([
      prisma.customer.findMany({where,orderBy:{updatedAt:'desc'},skip:pg.skip,take:pg.take}),
      prisma.customer.count({where})
    ]);
    res.json({ok:true,data:customers,meta:pageMeta({...pg,total})});
  }catch(e){next(e)}
});

router.post('/customers',requireApiKeyScope('customers.write'),idempotency(),async(req,res,next)=>{
  try{
    const parsed=z.object({
      code:z.string().trim().min(2).max(30),
      legalName:z.string().trim().min(2).max(180),
      commercialName:z.string().trim().optional().nullable(),
      taxId:z.string().trim().optional().nullable(),
      contactName:z.string().trim().optional().nullable(),
      email:z.string().trim().email().optional().or(z.literal('')).nullable(),
      phone:z.string().trim().optional().nullable(),
      address:z.string().trim().optional().nullable(),
      creditDays:z.coerce.number().int().min(0).max(365).default(0),
      creditLimit:z.coerce.number().min(0).default(0)
    }).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Datos inválidos'});

    const customer=await prisma.customer.create({
      data:{
        ...parsed.data,
        code:parsed.data.code.toUpperCase(),
        email:parsed.data.email||null,
        companyId:req.apiAuth.companyId
      }
    });

    emitIntegrationEventAsync({
      companyId:req.apiAuth.companyId,
      event:'customer.created',
      entityType:'Customer',
      entityId:customer.id,
      payload:{customer},
      dedupKey:req.headers['idempotency-key']?`public:customer.created:${req.headers['idempotency-key']}`:null,
      sourceRequestId:req.id||null
    });

    res.status(201).json({ok:true,data:customer});
  }catch(e){
    if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe un cliente con ese código'});
    next(e)
  }
});

router.get('/products',requireApiKeyScope('products.read'),async(req,res,next)=>{
  try{
    const pg=paginationFromQuery(req.query);
    const where={companyId:req.apiAuth.companyId,active:true};
    const [products,total]=await Promise.all([
      prisma.product.findMany({where,include:{category:{select:{id:true,code:true,name:true}}},orderBy:{updatedAt:'desc'},skip:pg.skip,take:pg.take}),
      prisma.product.count({where})
    ]);
    res.json({ok:true,data:products,meta:pageMeta({...pg,total})});
  }catch(e){next(e)}
});

router.post('/products',requireApiKeyScope('products.write'),idempotency(),async(req,res,next)=>{
  try{
    const parsed=z.object({
      sku:z.string().trim().min(2).max(40),
      name:z.string().trim().min(2),
      description:z.string().trim().optional().nullable(),
      unit:z.string().trim().min(1).max(10).default('PZA'),
      cost:z.coerce.number().min(0).default(0),
      price:z.coerce.number().min(0).default(0),
      minStock:z.coerce.number().min(0).default(0),
      categoryId:z.string().optional().nullable()
    }).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Datos inválidos'});

    if(parsed.data.categoryId){
      const category=await prisma.productCategory.findFirst({
        where:{id:parsed.data.categoryId,companyId:req.apiAuth.companyId}
      });
      if(!category)return res.status(404).json({ok:false,message:'Categoría no encontrada'});
    }

    const product=await prisma.product.create({
      data:{
        ...parsed.data,
        sku:parsed.data.sku.toUpperCase(),
        unit:parsed.data.unit.toUpperCase(),
        categoryId:parsed.data.categoryId||null,
        companyId:req.apiAuth.companyId
      }
    });

    emitIntegrationEventAsync({
      companyId:req.apiAuth.companyId,
      event:'product.created',
      entityType:'Product',
      entityId:product.id,
      payload:{product},
      dedupKey:req.headers['idempotency-key']?`public:product.created:${req.headers['idempotency-key']}`:null,
      sourceRequestId:req.id||null
    });

    res.status(201).json({ok:true,data:product});
  }catch(e){
    if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe un producto con ese SKU'});
    next(e)
  }
});

router.get('/suppliers',requireApiKeyScope('purchases.read'),async(req,res,next)=>{
  try{
    const pg=paginationFromQuery(req.query);
    const where={companyId:req.apiAuth.companyId,active:true};
    const [suppliers,total]=await Promise.all([
      prisma.supplier.findMany({where,orderBy:{updatedAt:'desc'},skip:pg.skip,take:pg.take}),
      prisma.supplier.count({where})
    ]);
    res.json({ok:true,data:suppliers,meta:pageMeta({...pg,total})});
  }catch(e){next(e)}
});

router.get('/sales/orders',requireApiKeyScope('sales.read'),async(req,res,next)=>{
  try{
    const pg=paginationFromQuery(req.query);
    const where={companyId:req.apiAuth.companyId};
    const [orders,total]=await Promise.all([
      prisma.salesOrder.findMany({where,include:{customer:true,items:{include:{product:true}}},orderBy:{createdAt:'desc'},skip:pg.skip,take:pg.take}),
      prisma.salesOrder.count({where})
    ]);
    res.json({ok:true,data:orders,meta:pageMeta({...pg,total})});
  }catch(e){next(e)}
});

router.get('/inventory/stock',requireApiKeyScope('inventory.read'),async(req,res,next)=>{
  try{
    const balances=await prisma.inventoryBalance.findMany({
      where:{warehouse:{branch:{companyId:req.apiAuth.companyId}}},
      include:{product:{select:{id:true,sku:true,name:true,unit:true,minStock:true}},warehouse:{select:{id:true,code:true,name:true}}},
      take:1000
    });
    res.json({ok:true,data:balances});
  }catch(e){next(e)}
});

export default router;
