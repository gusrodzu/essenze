import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requirePermission} from '../middleware/permissions.js';
import {createApprovalForEntity} from '../services/procurementFlow.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  estimatedUnitCost: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(300).optional().nullable(),
});

const requestSchema = z.object({
  warehouseId: z.string().min(1, 'Selecciona un almacén'),
  title: z.string().trim().min(3, 'El título es obligatorio').max(120),
  justification: z.string().trim().max(1000).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  requiredDate: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Agrega al menos una partida'),
});

const includeRequest = {
  warehouse: {include: {branch: {select: {id: true, name: true, code: true}}}},
  requestedBy: {select: {id: true, firstName: true, lastName: true, email: true}},
  items: {include: {product: {select: {id: true, sku: true, name: true, unit: true, cost: true}}}},
};

async function nextFolio(companyId) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({
    companyId,scope:'purchase-request',prefix:'SC',digits:4,period:year,
    model:'purchaseRequest',
    where:{companyId,folio:{startsWith:`SC-${year}-`}}
  });
}

router.get('/', requirePermission('purchase_requests.read'), async (req, res, next) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      where: {companyId: req.auth.companyId},
      include: includeRequest,
      orderBy: {createdAt: 'desc'},
    });
    const [warehouses, products] = await Promise.all([
      prisma.warehouse.findMany({where: {branch: {companyId: req.auth.companyId}, active: true}, include: {branch: true}, orderBy: {name: 'asc'}}),
      prisma.product.findMany({where: {companyId: req.auth.companyId, active: true}, orderBy: {name: 'asc'}}),
    ]);
    res.json({ok: true, requests, warehouses, products});
  } catch (error) { next(error); }
});

router.get('/:id', requirePermission('purchase_requests.read'), async (req, res, next) => {
  try {
    const request = await prisma.purchaseRequest.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}, include: includeRequest});
    if (!request) return res.status(404).json({ok: false, message: 'Solicitud no encontrada'});
    res.json({ok: true, request});
  } catch (error) { next(error); }
});

router.post('/', requirePermission('purchase_requests.create'), async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const warehouse = await prisma.warehouse.findFirst({where: {id: parsed.data.warehouseId, branch: {companyId: req.auth.companyId}}});
    if (!warehouse) return res.status(404).json({ok: false, message: 'Almacén no encontrado'});
    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    if (productIds.length !== parsed.data.items.length) return res.status(400).json({ok: false, message: 'No repitas productos en la solicitud'});
    const productCount = await prisma.product.count({where: {id: {in: productIds}, companyId: req.auth.companyId, active: true}});
    if (productCount !== productIds.length) return res.status(400).json({ok: false, message: 'Uno o más productos no son válidos'});
    const folio = await nextFolio(req.auth.companyId);
    const request = await prisma.purchaseRequest.create({
      data: {
        companyId: req.auth.companyId,
        requestedById: req.auth.sub,
        warehouseId: parsed.data.warehouseId,
        folio,
        title: parsed.data.title,
        justification: parsed.data.justification || null,
        priority: parsed.data.priority,
        requiredDate: parsed.data.requiredDate ? new Date(`${parsed.data.requiredDate}T12:00:00.000Z`) : null,
        items: {create: parsed.data.items.map((item) => ({...item, notes: item.notes || null}))},
      },
      include: includeRequest,
    });
    await prisma.auditLog.create({data: {userId: req.auth.sub, action: 'CREATE', entity: 'PurchaseRequest', entityId: request.id, description: `Solicitud ${folio} creada`, ipAddress: req.ip}});
    res.status(201).json({ok: true, request});
  } catch (error) { next(error); }
});

router.put('/:id', requirePermission('purchase_requests.create'), async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const existing = await prisma.purchaseRequest.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!existing) return res.status(404).json({ok: false, message: 'Solicitud no encontrada'});
    if (existing.status !== 'DRAFT') return res.status(409).json({ok: false, message: 'Solo se pueden editar solicitudes en borrador'});
    const request = await runSerializable(prisma, async (tx) => {
      await tx.purchaseRequestItem.deleteMany({where: {purchaseRequestId: existing.id}});
      return tx.purchaseRequest.update({where: {id: existing.id}, data: {
        warehouseId: parsed.data.warehouseId,
        title: parsed.data.title,
        justification: parsed.data.justification || null,
        priority: parsed.data.priority,
        requiredDate: parsed.data.requiredDate ? new Date(`${parsed.data.requiredDate}T12:00:00.000Z`) : null,
        items: {create: parsed.data.items.map((item) => ({...item, notes: item.notes || null}))},
      }, include: includeRequest});
    });
    res.json({ok: true, request});
  } catch (error) { next(error); }
});

router.post('/:id/submit', requirePermission('purchase_requests.create'), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseRequest.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}, include: {items: true}});
    if (!existing) return res.status(404).json({ok: false, message: 'Solicitud no encontrada'});
    if (existing.status !== 'DRAFT') return res.status(409).json({ok: false, message: 'La solicitud ya fue enviada'});
    if (!existing.items.length) return res.status(400).json({ok: false, message: 'La solicitud no tiene partidas'});
    const request = await prisma.purchaseRequest.update({
      where:{id:existing.id},
      data:{status:'PENDING',submittedAt:new Date()},
      include:includeRequest
    });

    const estimatedAmount=request.items.reduce(
      (sum,item)=>sum+Number(item.quantity)*Number(item.estimatedUnitCost),0
    );

    const approval=await createApprovalForEntity({
      companyId:req.auth.companyId,
      userId:req.auth.sub,
      entityType:'PURCHASE_REQUEST',
      entityId:request.id,
      entityFolio:request.folio,
      title:`Autorizar solicitud ${request.folio}`,
      description:request.justification||request.title,
      amount:estimatedAmount,
      currency:'MXN',
      metadata:{warehouseId:request.warehouseId,priority:request.priority}
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'purchase.request.submitted',
      entityType:'PurchaseRequest',
      entityId:request.id,
      payload:{purchaseRequest:request,approvalRequired:Boolean(approval)}
    });

    res.json({ok:true,request,approval,approvalRequired:Boolean(approval)});
  } catch (error) { next(error); }
});

router.post('/:id/resolve', requirePermission('purchase_requests.approve'), async (req, res, next) => {
  try {
    const parsed = z.object({decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(500).optional().nullable()}).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Resolución inválida'});
    const existing = await prisma.purchaseRequest.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!existing) return res.status(404).json({ok: false, message: 'Solicitud no encontrada'});
    if (existing.status !== 'PENDING') return res.status(409).json({ok: false, message: 'Solo se pueden resolver solicitudes pendientes'});

    const workflowApproval=await prisma.approvalRequest.findFirst({
      where:{
        companyId:req.auth.companyId,
        entityType:'PURCHASE_REQUEST',
        entityId:existing.id
      },
      orderBy:{requestedAt:'desc'}
    });

    if(workflowApproval){
      return res.status(409).json({
        ok:false,
        code:'WORKFLOW_APPROVAL_ACTIVE',
        message:'Esta solicitud usa BuzzBee Aprobaciones. Resuélvela desde Tareas → Aprobaciones.',
        approvalRequestId:workflowApproval.id
      });
    }

    if (parsed.data.decision === 'REJECTED' && !parsed.data.note) return res.status(400).json({ok: false, message: 'Indica el motivo del rechazo'});
    const request = await prisma.purchaseRequest.update({where: {id: existing.id}, data: {status: parsed.data.decision, resolutionNote: parsed.data.note || null, resolvedAt: new Date(), resolvedById: req.auth.sub}, include: includeRequest});
    await prisma.auditLog.create({data: {userId: req.auth.sub, action: parsed.data.decision, entity: 'PurchaseRequest', entityId: request.id, description: `${request.folio} ${parsed.data.decision === 'APPROVED' ? 'aprobada' : 'rechazada'}`, ipAddress: req.ip}});
    res.json({ok: true, request});
  } catch (error) { next(error); }
});

export default router;
