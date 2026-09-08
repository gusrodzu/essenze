import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitLowStockEvents} from '../services/integrationEvents.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const terminalSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  warehouseId: z.string().cuid().optional().nullable(),
  active: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const openSessionSchema = z.object({
  terminalId: z.string().cuid(),
  openingAmount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const closeSessionSchema = z.object({
  countedAmount: z.coerce.number().min(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN','CASH_OUT','ADJUSTMENT']),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

const saleSchema = z.object({
  sessionId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  folio: z.string().trim().min(2).max(50),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    discount: z.coerce.number().min(0).default(0),
    taxRate: z.coerce.number().min(0).max(100).default(16),
  })).min(1),
  payments: z.array(z.object({
    method: z.enum(['CASH','CARD','TRANSFER','WALLET','CREDIT','OTHER']),
    amount: z.coerce.number().positive(),
    reference: z.string().trim().max(120).optional().nullable(),
    authorization: z.string().trim().max(120).optional().nullable(),
  })).min(1),
  discount: z.object({
    code: z.string().trim().max(60).optional().nullable(),
    description: z.string().trim().max(180).default('Descuento POS'),
    amount: z.coerce.number().min(0).default(0),
    percent: z.coerce.number().min(0).max(100).optional().nullable(),
  }).optional().nullable(),
});

const saleInclude = {
  terminal: true,
  session: true,
  customer: true,
  createdBy: {select: {id:true,firstName:true,lastName:true}},
  items: {include: {product:true}, orderBy: {lineNumber:'asc'}},
  payments: true,
  discounts: true,
  salesOrder: true,
};

const n = v => Number(v || 0);

async function audit(req, action, entity, entityId, description) {
  await prisma.auditLog.create({
    data: {
      userId: req.auth.sub,
      action,
      entity,
      entityId,
      description,
      ipAddress: req.ip,
    },
  });
}

router.get('/dashboard', requirePermission('pos.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const [terminals, sessions, sales, products, customers, warehouses] = await Promise.all([
      prisma.posTerminal.findMany({where:{companyId},include:{warehouse:true},orderBy:{name:'asc'}}),
      prisma.posSession.findMany({
        where:{companyId},
        include:{
          terminal:true,
          openedBy:{select:{firstName:true,lastName:true}},
          closedBy:{select:{firstName:true,lastName:true}},
          movements:true,
          sales:{include:{payments:true}},
        },
        orderBy:{openedAt:'desc'},
        take:100,
      }),
      prisma.posSale.findMany({
        where:{companyId},
        include:saleInclude,
        orderBy:{saleDate:'desc'},
        take:200,
      }),
      prisma.product.findMany({where:{companyId,active:true},include:{category:true,inventoryBalances:true},orderBy:{name:'asc'}}),
      prisma.customer.findMany({where:{companyId,active:true},orderBy:{commercialName:'asc'}}),
      prisma.warehouse.findMany({where:{branch:{companyId},active:true},include:{branch:true},orderBy:{name:'asc'}}),
    ]);

    const today = new Date();
    today.setHours(0,0,0,0);
    const todaySales = sales.filter(s=>new Date(s.saleDate)>=today && s.status==='PAID');
    const totalToday = todaySales.reduce((s,r)=>s+n(r.total),0);
    const tickets = todaySales.length;
    const avgTicket = tickets ? totalToday/tickets : 0;
    const cashToday = todaySales.flatMap(s=>s.payments).filter(p=>p.method==='CASH').reduce((s,p)=>s+n(p.amount),0);
    const cardToday = todaySales.flatMap(s=>s.payments).filter(p=>p.method==='CARD').reduce((s,p)=>s+n(p.amount),0);

    res.json({
      ok:true,
      terminals,
      sessions,
      sales,
      products,
      customers,
      warehouses,
      summary:{
        openSessions:sessions.filter(s=>s.status==='OPEN').length,
        totalToday,
        tickets,
        avgTicket,
        cashToday,
        cardToday,
      },
    });
  } catch(error){next(error)}
});

router.post('/terminals', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const parsed=terminalSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    if(parsed.data.warehouseId){
      const wh=await prisma.warehouse.findFirst({where:{id:parsed.data.warehouseId,branch:{companyId:req.auth.companyId}}});
      if(!wh)return res.status(404).json({ok:false,message:'Almacén no encontrado'});
    }
    const terminal=await prisma.posTerminal.create({
      data:{...parsed.data,companyId:req.auth.companyId,code:parsed.data.code.toUpperCase(),warehouseId:parsed.data.warehouseId||null,notes:parsed.data.notes||null},
    });
    await audit(req,'CREATE','PosTerminal',terminal.id,`Terminal POS creada: ${terminal.code}`);
    res.status(201).json({ok:true,terminal});
  }catch(error){
    if(error.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe esa terminal'});
    next(error)
  }
});

router.post('/sessions/open', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const parsed=openSessionSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const terminal=await prisma.posTerminal.findFirst({where:{id:parsed.data.terminalId,companyId:req.auth.companyId,active:true}});
    if(!terminal)return res.status(404).json({ok:false,message:'Terminal no encontrada'});
    const open=await prisma.posSession.findFirst({where:{terminalId:terminal.id,status:'OPEN'}});
    if(open)return res.status(409).json({ok:false,message:'La terminal ya tiene una sesión abierta'});
    const session=await prisma.$transaction(async tx=>{
      const s=await tx.posSession.create({
        data:{companyId:req.auth.companyId,terminalId:terminal.id,openedById:req.auth.sub,openingAmount:parsed.data.openingAmount,expectedAmount:parsed.data.openingAmount,notes:parsed.data.notes||null},
      });
      if(parsed.data.openingAmount>0){
        await tx.posCashMovement.create({
          data:{companyId:req.auth.companyId,sessionId:s.id,createdById:req.auth.sub,type:'OPENING',amount:parsed.data.openingAmount,description:'Fondo inicial de caja'},
        });
      }
      return s;
    });
    await audit(req,'CREATE','PosSession',session.id,`Sesión POS abierta en ${terminal.code}`);
    res.status(201).json({ok:true,session});
  }catch(error){next(error)}
});

router.post('/sessions/:id/close', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const parsed=closeSessionSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const session=await prisma.posSession.findFirst({where:{id:req.params.id,companyId:req.auth.companyId,status:'OPEN'},include:{movements:true,sales:{include:{payments:true}}}});
    if(!session)return res.status(404).json({ok:false,message:'Sesión abierta no encontrada'});
    const movementNet=session.movements.reduce((sum,m)=>{
      if(['OPENING','SALE','CASH_IN','ADJUSTMENT'].includes(m.type))return sum+n(m.amount);
      if(['CASH_OUT','REFUND','CLOSING'].includes(m.type))return sum-n(m.amount);
      return sum;
    },0);
    // Las ventas en efectivo ya generan un PosCashMovement SALE.
    // No se vuelven a sumar desde PosPayment para evitar duplicar el efectivo esperado.
    const expected=Math.max(0,movementNet);
    const diff=parsed.data.countedAmount-expected;
    const closed=await prisma.posSession.update({
      where:{id:session.id},
      data:{status:'CLOSED',closedById:req.auth.sub,closedAt:new Date(),expectedAmount:expected,countedAmount:parsed.data.countedAmount,difference:diff,notes:parsed.data.notes||session.notes},
    });
    await prisma.posCashMovement.create({
      data:{companyId:req.auth.companyId,sessionId:session.id,createdById:req.auth.sub,type:'CLOSING',amount:parsed.data.countedAmount,description:`Cierre de caja. Diferencia: ${diff.toFixed(2)}`},
    });
    await audit(req,'UPDATE','PosSession',closed.id,`Sesión POS cerrada con diferencia ${diff.toFixed(2)}`);
    res.json({ok:true,session:closed});
  }catch(error){next(error)}
});

router.post('/sessions/:id/movements', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const parsed=cashMovementSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const session=await prisma.posSession.findFirst({where:{id:req.params.id,companyId:req.auth.companyId,status:'OPEN'}});
    if(!session)return res.status(404).json({ok:false,message:'Sesión abierta no encontrada'});
    const movement=await prisma.posCashMovement.create({
      data:{companyId:req.auth.companyId,sessionId:session.id,createdById:req.auth.sub,...parsed.data,reference:parsed.data.reference||null,description:parsed.data.description||null},
    });
    res.status(201).json({ok:true,movement});
  }catch(error){next(error)}
});

router.post('/sales', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const parsed=saleSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Venta inválida'});
    const session=await prisma.posSession.findFirst({where:{id:parsed.data.sessionId,companyId:req.auth.companyId,status:'OPEN'},include:{terminal:true}});
    if(!session)return res.status(404).json({ok:false,message:'No hay sesión POS abierta'});
    if(parsed.data.customerId){
      const customer=await prisma.customer.findFirst({where:{id:parsed.data.customerId,companyId:req.auth.companyId}});
      if(!customer)return res.status(404).json({ok:false,message:'Cliente no encontrado'});
    }

    const productIds=[...new Set(parsed.data.items.map(i=>i.productId))];
    if(productIds.length!==parsed.data.items.length){
      return res.status(400).json({ok:false,message:'No repitas productos en el mismo ticket'});
    }
    const products=await prisma.product.findMany({where:{id:{in:productIds},companyId:req.auth.companyId,active:true}});
    if(products.length!==productIds.length)return res.status(404).json({ok:false,message:'Uno o más productos no existen'});
    const productMap=new Map(products.map(p=>[p.id,p]));

    const items=parsed.data.items.map((row,index)=>{
      const product=productMap.get(row.productId);
      const gross=row.quantity*row.unitPrice;
      const discount=Math.min(gross,row.discount||0);
      const taxable=gross-discount;
      const taxAmount=taxable*(row.taxRate/100);
      return {
        productId:row.productId,
        lineNumber:index+1,
        sku:product.sku,
        description:product.name,
        quantity:row.quantity,
        unitPrice:row.unitPrice,
        discount,
        taxRate:row.taxRate,
        taxAmount,
        subtotal:taxable,
        total:taxable+taxAmount,
      };
    });

    const subtotal=items.reduce((s,i)=>s+i.subtotal,0);
    const lineDiscount=items.reduce((s,i)=>s+i.discount,0);
    const saleDiscount=Math.min(subtotal,parsed.data.discount?.amount||0);
    const taxTotal=items.reduce((s,i)=>s+i.taxAmount,0);
    const total=Math.max(0,subtotal+taxTotal-saleDiscount);
    const paid=parsed.data.payments.reduce((s,p)=>s+p.amount,0);
    if(Math.abs(paid-total)>0.01)return res.status(400).json({ok:false,message:`Los pagos (${paid.toFixed(2)}) deben coincidir con el total (${total.toFixed(2)})`});

    const result=await prisma.$transaction(async tx=>{
      let stockByProduct=new Map();

      if(session.terminal.warehouseId){
        const balances=await tx.inventoryBalance.findMany({
          where:{
            warehouseId:session.terminal.warehouseId,
            productId:{in:productIds}
          }
        });
        stockByProduct=new Map(balances.map(row=>[row.productId,row]));

        for(const item of items){
          const balance=stockByProduct.get(item.productId);
          if(!balance || n(balance.quantity)+0.000001<n(item.quantity)){
            throw new Error(`Stock insuficiente para ${item.description}`);
          }
        }
      }

      const sale=await tx.posSale.create({
        data:{
          companyId:req.auth.companyId,
          terminalId:session.terminalId,
          sessionId:session.id,
          customerId:parsed.data.customerId||null,
          createdById:req.auth.sub,
          folio:parsed.data.folio.toUpperCase(),
          status:'PAID',
          subtotal,
          discountTotal:lineDiscount+saleDiscount,
          taxTotal,
          total,
          notes:parsed.data.notes||null,
          items:{create:items},
          payments:{create:parsed.data.payments.map(p=>({...p,reference:p.reference||null,authorization:p.authorization||null}))},
          discounts:parsed.data.discount&&saleDiscount>0?{create:[{code:parsed.data.discount.code||null,description:parsed.data.discount.description,amount:saleDiscount,percent:parsed.data.discount.percent||null}]}:undefined,
        },
      });

      if(session.terminal.warehouseId){
        for(const item of items){
          const balance=stockByProduct.get(item.productId);
          const nextQty=n(balance.quantity)-n(item.quantity);

          await tx.inventoryBalance.update({
            where:{id:balance.id},
            data:{quantity:nextQty}
          });

          await tx.inventoryMovement.create({
            data:{
              companyId:req.auth.companyId,
              warehouseId:session.terminal.warehouseId,
              productId:item.productId,
              createdById:req.auth.sub,
              type:'SALE_OUT',
              reference:sale.folio,
              quantity:-n(item.quantity),
              unitCost:n(balance.averageCost),
              balanceAfter:nextQty,
              notes:'Salida por venta POS',
              occurredAt:new Date()
            }
          });
        }
      }

      const cashPaid=parsed.data.payments.filter(p=>p.method==='CASH').reduce((s,p)=>s+p.amount,0);
      if(cashPaid>0){
        await tx.posCashMovement.create({
          data:{companyId:req.auth.companyId,sessionId:session.id,createdById:req.auth.sub,type:'SALE',amount:cashPaid,reference:sale.folio,description:'Venta de contado POS'},
        });
      }
      return sale;
    });

    const sale=await prisma.posSale.findUnique({where:{id:result.id},include:saleInclude});
    await audit(req,'CREATE','PosSale',sale.id,`Venta POS ${sale.folio} por ${n(sale.total).toFixed(2)}`);
    if(session.terminal.warehouseId){
      await emitLowStockEvents({
        companyId:req.auth.companyId,
        productIds:sale.items.map(item=>item.productId),
        warehouseIds:[session.terminal.warehouseId]
      });
    }
    res.status(201).json({ok:true,sale});
  }catch(error){
    if(error.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese folio POS'});
    if(error.message?.startsWith('Stock insuficiente')){
      return res.status(409).json({ok:false,message:error.message});
    }
    next(error)
  }
});

router.post('/sales/:id/void', requirePermission('pos.manage'), async (req,res,next)=>{
  try{
    const sale=await prisma.posSale.findFirst({where:{id:req.params.id,companyId:req.auth.companyId},include:{payments:true}});
    if(!sale)return res.status(404).json({ok:false,message:'Venta no encontrada'});
    if(sale.status!=='PAID')return res.status(400).json({ok:false,message:'Solo se pueden anular ventas pagadas'});
    const updated=await prisma.$transaction(async tx=>{
      const fullSale=await tx.posSale.findUnique({
        where:{id:sale.id},
        include:{terminal:true,items:true,payments:true}
      });
      const s=await tx.posSale.update({where:{id:sale.id},data:{status:'VOID'}});

      if(fullSale.terminal?.warehouseId){
        for(const item of fullSale.items){
          const current=await tx.inventoryBalance.findUnique({
            where:{warehouseId_productId:{warehouseId:fullSale.terminal.warehouseId,productId:item.productId}}
          });
          const currentQty=n(current?.quantity);
          const nextQty=currentQty+n(item.quantity);
          const unitCost=n(current?.averageCost);

          await tx.inventoryBalance.upsert({
            where:{warehouseId_productId:{warehouseId:fullSale.terminal.warehouseId,productId:item.productId}},
            create:{
              warehouseId:fullSale.terminal.warehouseId,
              productId:item.productId,
              quantity:nextQty,
              averageCost:unitCost
            },
            update:{quantity:nextQty}
          });

          await tx.inventoryMovement.create({
            data:{
              companyId:req.auth.companyId,
              warehouseId:fullSale.terminal.warehouseId,
              productId:item.productId,
              createdById:req.auth.sub,
              type:'SALE_RETURN_IN',
              reference:sale.folio,
              quantity:n(item.quantity),
              unitCost,
              balanceAfter:nextQty,
              notes:'Reentrada por anulación POS',
              occurredAt:new Date()
            }
          });
        }
      }

      const cash=fullSale.payments.filter(p=>p.method==='CASH').reduce((sum,p)=>sum+n(p.amount),0);
      if(cash>0){
        await tx.posCashMovement.create({
          data:{companyId:req.auth.companyId,sessionId:sale.sessionId,createdById:req.auth.sub,type:'REFUND',amount:cash,reference:sale.folio,description:'Anulación / devolución POS'},
        });
      }
      return s;
    });
    await audit(req,'UPDATE','PosSale',updated.id,`Venta POS anulada: ${updated.folio}`);
    res.json({ok:true,sale:updated});
  }catch(error){next(error)}
});

export default router;
