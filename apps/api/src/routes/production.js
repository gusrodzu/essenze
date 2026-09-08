import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const workCenterSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  capacityPerDay: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
});

const bomSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(180),
  finishedProductId: z.string().cuid(),
  version: z.coerce.number().int().min(1).default(1),
  baseQuantity: z.coerce.number().positive().default(1),
  notes: z.string().trim().max(2000).optional().nullable(),
  active: z.boolean().default(true),
  items: z.array(z.object({
    componentId: z.string().cuid(),
    quantity: z.coerce.number().positive(),
    wastePercent: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })).min(1),
});

const orderSchema = z.object({
  bomId: z.string().cuid().optional().nullable(),
  salesOrderId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  issueWarehouseId: z.string().cuid().optional().nullable(),
  receiptWarehouseId: z.string().cuid().optional().nullable(),
  folio: z.string().trim().min(2).max(40),
  productId: z.string().cuid(),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  plannedQuantity: z.coerce.number().positive(),
  plannedStartAt: z.coerce.date().optional().nullable(),
  plannedEndAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(3000).optional().nullable(),
});

const operationSchema = z.object({
  workCenterId: z.string().cuid().optional().nullable(),
  employeeId: z.string().cuid().optional().nullable(),
  sequence: z.coerce.number().int().min(1),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  plannedMinutes: z.coerce.number().int().min(0).default(0),
  plannedStartAt: z.coerce.date().optional().nullable(),
  plannedEndAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const consumptionSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).default(0),
  reference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const outputSchema = z.object({
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).default(0),
  lotNumber: z.string().trim().min(2).max(100).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  qualityStatus: z.string().trim().max(40).default('PENDING'),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const wasteSchema = z.object({
  productId: z.string().cuid().optional().nullable(),
  quantity: z.coerce.number().positive(),
  reason: z.string().trim().min(2).max(180),
  cost: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const costSchema = z.object({
  type: z.enum(['MATERIAL','LABOR','OVERHEAD','OUTSOURCED','OTHER']),
  description: z.string().trim().min(2).max(250),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(120).optional().nullable(),
});

const orderInclude = {
  product: true,
  bom: {include: {items: {include: {component: true}, orderBy: {sortOrder: 'asc'}}}},
  salesOrder: {include: {customer: true}},
  project: {select: {id: true, code: true, name: true}},
  issueWarehouse: true,
  receiptWarehouse: true,
  materials: {include: {product: true}},
  outputs: {include: {product: true}, orderBy: {completedAt: 'desc'}},
  operations: {
    include: {workCenter: true, employee: {include: {position: true}}},
    orderBy: {sequence: 'asc'},
  },
  consumptions: {include: {product: true}, orderBy: {consumedAt: 'desc'}},
  wasteRecords: {include: {product: true}, orderBy: {recordedAt: 'desc'}},
  costs: {orderBy: {recordedAt: 'desc'}},
  batches: {include: {product: true}, orderBy: {manufacturedAt: 'desc'}},
};

const num = (v) => Number(v || 0);

function normalizeOrder(order) {
  const materialCost = order.consumptions.reduce((s, r) => s + num(r.quantity) * num(r.unitCost), 0);
  const operationLabor = order.operations.reduce((s, r) => s + num(r.laborCost), 0);
  const operationOverhead = order.operations.reduce((s, r) => s + num(r.overheadCost), 0);
  const additionalCosts = order.costs.reduce((s, r) => s + num(r.amount), 0);
  const wasteCost = order.wasteRecords.reduce((s, r) => s + num(r.cost), 0);
  const totalCost = materialCost + operationLabor + operationOverhead + additionalCosts + wasteCost;
  const produced = num(order.producedQuantity);
  const planned = num(order.plannedQuantity);
  const progress = planned > 0 ? Math.min(100, (produced / planned) * 100) : 0;
  const unitCost = produced > 0 ? totalCost / produced : 0;
  const completedOps = order.operations.filter(r => r.status === 'DONE').length;
  const opProgress = order.operations.length ? (completedOps / order.operations.length) * 100 : 0;
  return {
    ...order,
    metrics: {
      materialCost,
      operationLabor,
      operationOverhead,
      additionalCosts,
      wasteCost,
      totalCost,
      progress,
      unitCost,
      opProgress,
      completedOps,
      operations: order.operations.length,
    },
  };
}

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

async function findOrder(req, id) {
  return prisma.productionOrder.findFirst({
    where: {id, companyId: req.auth.companyId},
    include: orderInclude,
  });
}

router.get('/dashboard', requirePermission('production.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const [ordersRaw, boms, workCenters, products, warehouses, employees, salesOrders, projects] = await Promise.all([
      prisma.productionOrder.findMany({
        where: {companyId},
        include: orderInclude,
        orderBy: [{status: 'asc'}, {plannedStartAt: 'asc'}, {createdAt: 'desc'}],
      }),
      prisma.billOfMaterials.findMany({
        where: {companyId, active: true},
        include: {finishedProduct: true, items: {include: {component: true}, orderBy: {sortOrder: 'asc'}}},
        orderBy: [{name: 'asc'}, {version: 'desc'}],
      }),
      prisma.productionWorkCenter.findMany({where: {companyId, active: true}, orderBy: {name: 'asc'}}),
      prisma.product.findMany({where: {companyId, active: true}, orderBy: {name: 'asc'}}),
      prisma.warehouse.findMany({where: {branch: {companyId}, active: true}, include: {branch: true}, orderBy: {name: 'asc'}}),
      prisma.employee.findMany({where: {companyId, status: 'ACTIVE'}, include: {position: true}, orderBy: [{lastName: 'asc'}, {firstName: 'asc'}]}),
      prisma.salesOrder.findMany({where: {companyId, status: {not: 'CANCELLED'}}, include: {customer: true}, orderBy: {orderDate: 'desc'}, take: 100}),
      prisma.project.findMany({where: {companyId, status: {notIn: ['COMPLETED','CANCELLED']}}, orderBy: {updatedAt: 'desc'}, take: 100}),
    ]);
    const orders = ordersRaw.map(normalizeOrder);
    const active = orders.filter(o => ['PLANNED','RELEASED','IN_PROGRESS','PAUSED'].includes(o.status));
    const totalPlanned = active.reduce((s,o)=>s+num(o.plannedQuantity),0);
    const totalProduced = active.reduce((s,o)=>s+num(o.producedQuantity),0);
    const totalCost = orders.reduce((s,o)=>s+o.metrics.totalCost,0);
    const wasteCost = orders.reduce((s,o)=>s+o.metrics.wasteCost,0);
    const late = active.filter(o=>o.plannedEndAt && new Date(o.plannedEndAt)<new Date() && o.status!=='COMPLETED').length;

    res.json({
      ok: true,
      orders,
      boms,
      workCenters,
      products,
      warehouses,
      employees,
      salesOrders,
      projects,
      summary: {
        totalOrders: orders.length,
        activeOrders: active.length,
        inProgress: orders.filter(o=>o.status==='IN_PROGRESS').length,
        completed: orders.filter(o=>o.status==='COMPLETED').length,
        late,
        totalPlanned,
        totalProduced,
        totalCost,
        wasteCost,
        efficiency: totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/work-centers', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed = workCenterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const workCenter = await prisma.productionWorkCenter.create({
      data: {...parsed.data, companyId:req.auth.companyId, code:parsed.data.code.toUpperCase(), description:parsed.data.description||null},
    });
    await audit(req,'CREATE','ProductionWorkCenter',workCenter.id,`Centro de trabajo creado: ${workCenter.code}`);
    res.status(201).json({ok:true,workCenter});
  } catch(error) {
    if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe ese centro de trabajo'});
    next(error);
  }
});

router.post('/boms', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed = bomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const productIds = [parsed.data.finishedProductId, ...parsed.data.items.map(i=>i.componentId)];
    const productCount = await prisma.product.count({where:{id:{in:productIds}, companyId:req.auth.companyId}});
    if(productCount !== new Set(productIds).size) return res.status(404).json({ok:false,message:'Uno o más productos no existen'});
    const bom = await prisma.billOfMaterials.create({
      data:{
        companyId:req.auth.companyId,
        finishedProductId:parsed.data.finishedProductId,
        code:parsed.data.code.toUpperCase(),
        name:parsed.data.name,
        version:parsed.data.version,
        baseQuantity:parsed.data.baseQuantity,
        notes:parsed.data.notes||null,
        active:parsed.data.active,
        items:{create:parsed.data.items.map(i=>({...i,notes:i.notes||null}))},
      },
      include:{finishedProduct:true,items:{include:{component:true},orderBy:{sortOrder:'asc'}}},
    });
    await audit(req,'CREATE','BillOfMaterials',bom.id,`BOM creada: ${bom.code} v${bom.version}`);
    res.status(201).json({ok:true,bom});
  } catch(error) {
    if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe esa versión de la BOM'});
    next(error);
  }
});

router.post('/orders', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const product = await prisma.product.findFirst({where:{id:parsed.data.productId,companyId:req.auth.companyId}});
    if(!product) return res.status(404).json({ok:false,message:'Producto no encontrado'});
    let bom = null;
    if(parsed.data.bomId){
      bom = await prisma.billOfMaterials.findFirst({where:{id:parsed.data.bomId,companyId:req.auth.companyId},include:{items:true}});
      if(!bom) return res.status(404).json({ok:false,message:'BOM no encontrada'});
    }
    const order = await prisma.$transaction(async tx=>{
      const created = await tx.productionOrder.create({
        data:{
          companyId:req.auth.companyId,
          createdById:req.auth.sub,
          folio:parsed.data.folio.toUpperCase(),
          productId:parsed.data.productId,
          bomId:parsed.data.bomId||null,
          salesOrderId:parsed.data.salesOrderId||null,
          projectId:parsed.data.projectId||null,
          issueWarehouseId:parsed.data.issueWarehouseId||null,
          receiptWarehouseId:parsed.data.receiptWarehouseId||null,
          priority:parsed.data.priority,
          plannedQuantity:parsed.data.plannedQuantity,
          plannedStartAt:parsed.data.plannedStartAt||null,
          plannedEndAt:parsed.data.plannedEndAt||null,
          notes:parsed.data.notes||null,
          status:'PLANNED',
        },
      });
      if(bom){
        const factor = parsed.data.plannedQuantity / Number(bom.baseQuantity);
        await tx.productionOrderMaterial.createMany({
          data:bom.items.map(i=>({
            productionOrderId:created.id,
            productId:i.componentId,
            plannedQuantity:Number(i.quantity)*factor*(1+Number(i.wastePercent)/100),
          })),
        });
      }
      return created;
    });
    const full=await prisma.productionOrder.findUnique({where:{id:order.id},include:orderInclude});
    await audit(req,'CREATE','ProductionOrder',full.id,`Orden de producción creada: ${full.folio}`);
    res.status(201).json({ok:true,order:normalizeOrder(full)});
  } catch(error) {
    if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe ese folio de producción'});
    next(error);
  }
});

router.patch('/orders/:id/status', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=z.object({status:z.enum(['DRAFT','PLANNED','RELEASED','IN_PROGRESS','PAUSED','COMPLETED','CANCELLED'])}).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:'Estado inválido'});
    const exists=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!exists) return res.status(404).json({ok:false,message:'Orden no encontrada'});
    const status=parsed.data.status;
    const order=await prisma.productionOrder.update({
      where:{id:exists.id},
      data:{
        status,
        actualStartAt:status==='IN_PROGRESS' ? (exists.actualStartAt || new Date()) : exists.actualStartAt,
        completedAt:status==='COMPLETED' ? new Date() : status==='CANCELLED' ? exists.completedAt : null,
      },
      include:orderInclude,
    });
    await audit(req,'UPDATE','ProductionOrder',order.id,`Orden ${order.folio}: ${status}`);
    res.json({ok:true,order:normalizeOrder(order)});
  } catch(error){next(error)}
});

router.post('/orders/:id/operations', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=operationSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const order=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!order) return res.status(404).json({ok:false,message:'Orden no encontrada'});
    const operation=await prisma.productionOperation.create({
      data:{
        ...parsed.data,
        productionOrderId:order.id,
        workCenterId:parsed.data.workCenterId||null,
        employeeId:parsed.data.employeeId||null,
        description:parsed.data.description||null,
        plannedStartAt:parsed.data.plannedStartAt||null,
        plannedEndAt:parsed.data.plannedEndAt||null,
        notes:parsed.data.notes||null,
        status:'READY',
      },
      include:{workCenter:true,employee:true},
    });
    await audit(req,'CREATE','ProductionOperation',operation.id,`Operación agregada a ${order.folio}: ${operation.name}`);
    res.status(201).json({ok:true,operation});
  } catch(error) {
    if(error.code==='P2002') return res.status(409).json({ok:false,message:'La secuencia ya existe'});
    next(error);
  }
});

router.patch('/orders/:id/operations/:operationId/status', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=z.object({
      status:z.enum(['PENDING','READY','IN_PROGRESS','PAUSED','DONE','CANCELLED']),
      actualMinutes:z.coerce.number().int().min(0).optional(),
      laborCost:z.coerce.number().min(0).optional(),
      overheadCost:z.coerce.number().min(0).optional(),
    }).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:'Datos de operación inválidos'});
    const operation=await prisma.productionOperation.findFirst({
      where:{id:req.params.operationId,productionOrderId:req.params.id,productionOrder:{companyId:req.auth.companyId}},
    });
    if(!operation) return res.status(404).json({ok:false,message:'Operación no encontrada'});
    const updated=await prisma.productionOperation.update({
      where:{id:operation.id},
      data:{
        status:parsed.data.status,
        actualMinutes:parsed.data.actualMinutes ?? operation.actualMinutes,
        laborCost:parsed.data.laborCost ?? operation.laborCost,
        overheadCost:parsed.data.overheadCost ?? operation.overheadCost,
        actualStartAt:parsed.data.status==='IN_PROGRESS' ? (operation.actualStartAt||new Date()) : operation.actualStartAt,
        completedAt:parsed.data.status==='DONE' ? new Date() : null,
        completedById:parsed.data.status==='DONE' ? req.auth.sub : null,
      },
    });
    res.json({ok:true,operation:updated});
  } catch(error){next(error)}
});

router.post('/orders/:id/consumptions', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=consumptionSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const order=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!order) return res.status(404).json({ok:false,message:'Orden no encontrada'});
    const product=await prisma.product.findFirst({where:{id:parsed.data.productId,companyId:req.auth.companyId}});
    if(!product) return res.status(404).json({ok:false,message:'Producto no encontrado'});

    const consumption=await prisma.$transaction(async tx=>{
      const row=await tx.productionConsumption.create({
        data:{
          productionOrderId:order.id,
          productId:parsed.data.productId,
          quantity:parsed.data.quantity,
          unitCost:parsed.data.unitCost,
          reference:parsed.data.reference||null,
          notes:parsed.data.notes||null,
        },
      });
      const material=await tx.productionOrderMaterial.findFirst({where:{productionOrderId:order.id,productId:parsed.data.productId}});
      if(material){
        await tx.productionOrderMaterial.update({
          where:{id:material.id},
          data:{issuedQuantity:{increment:parsed.data.quantity},unitCost:parsed.data.unitCost},
        });
      }
      return row;
    });
    await audit(req,'CREATE','ProductionConsumption',consumption.id,`Consumo en ${order.folio}: ${parsed.data.quantity} ${product.name}`);
    res.status(201).json({ok:true,consumption});
  } catch(error){next(error)}
});

router.post('/orders/:id/outputs', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=outputSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const order=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!order) return res.status(404).json({ok:false,message:'Orden no encontrada'});

    const result=await prisma.$transaction(async tx=>{
      const output=await tx.productionOrderOutput.create({
        data:{
          productionOrderId:order.id,
          productId:order.productId,
          quantity:parsed.data.quantity,
          unitCost:parsed.data.unitCost,
          notes:parsed.data.notes||null,
        },
      });
      await tx.productionOrder.update({
        where:{id:order.id},
        data:{
          producedQuantity:{increment:parsed.data.quantity},
          status:'IN_PROGRESS',
          actualStartAt:order.actualStartAt || new Date(),
        },
      });
      let batch=null;
      if(parsed.data.lotNumber){
        batch=await tx.productionBatch.create({
          data:{
            companyId:req.auth.companyId,
            productionOrderId:order.id,
            productId:order.productId,
            lotNumber:parsed.data.lotNumber,
            quantity:parsed.data.quantity,
            expiresAt:parsed.data.expiresAt||null,
            qualityStatus:parsed.data.qualityStatus,
            notes:parsed.data.notes||null,
          },
        });
      }
      return {output,batch};
    });
    await audit(req,'CREATE','ProductionOrderOutput',result.output.id,`Producción registrada en ${order.folio}: ${parsed.data.quantity}`);
    res.status(201).json({ok:true,...result});
  } catch(error) {
    if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ese lote ya existe'});
    next(error);
  }
});

router.post('/orders/:id/waste', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=wasteSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const order=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!order) return res.status(404).json({ok:false,message:'Orden no encontrada'});
    const waste=await prisma.productionWaste.create({
      data:{
        productionOrderId:order.id,
        productId:parsed.data.productId||null,
        quantity:parsed.data.quantity,
        reason:parsed.data.reason,
        cost:parsed.data.cost,
        notes:parsed.data.notes||null,
      },
    });
    await prisma.productionOrder.update({where:{id:order.id},data:{rejectedQuantity:{increment:parsed.data.quantity}}});
    res.status(201).json({ok:true,waste});
  } catch(error){next(error)}
});

router.post('/orders/:id/costs', requirePermission('production.manage'), async (req, res, next) => {
  try {
    const parsed=costSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const order=await prisma.productionOrder.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!order) return res.status(404).json({ok:false,message:'Orden no encontrada'});
    const cost=await prisma.productionCost.create({
      data:{
        companyId:req.auth.companyId,
        productionOrderId:order.id,
        type:parsed.data.type,
        description:parsed.data.description,
        amount:parsed.data.amount,
        reference:parsed.data.reference||null,
      },
    });
    res.status(201).json({ok:true,cost});
  } catch(error){next(error)}
});

export default router;
