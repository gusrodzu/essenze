import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';
import {createApprovalForEntity} from '../services/procurementFlow.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().trim().max(300).optional().nullable(),
});

const orderSchema = z.object({
  supplierId: z.string().min(1, 'Selecciona un proveedor'),
  warehouseId: z.string().min(1, 'Selecciona un almacén'),
  purchaseRequestId: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  paymentTerms: z.coerce.number().int().min(0).max(365).default(0),
  currency: z.string().trim().min(3).max(3).default('MXN'),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(itemSchema).min(1, 'Agrega al menos una partida'),
});

const includeOrder = {
  supplier: true,
  warehouse: {include: {branch: {select: {id: true, name: true, code: true}}}},
  purchaseRequest: {select: {id: true, folio: true, title: true}},
  createdBy: {select: {id: true, firstName: true, lastName: true, email: true}},
  items: {include: {product: {select: {id: true, sku: true, name: true, unit: true}}}},
};


async function getPurchaseOrderApproval(companyId, orderId) {
  return prisma.approvalRequest.findFirst({
    where: {companyId, entityType: 'PURCHASE_ORDER', entityId: orderId},
    orderBy: {requestedAt: 'desc'},
    include: {workflow: true, steps: {orderBy: {sequence: 'asc'}}},
  });
}

async function createPurchaseOrderApproval({companyId,userId,order}){
  return createApprovalForEntity({
    companyId,
    userId,
    entityType:'PURCHASE_ORDER',
    entityId:order.id,
    entityFolio:order.folio,
    title:`Autorizar orden ${order.folio}`,
    description:`Orden de compra por ${order.currency} ${Number(order.total||0).toFixed(2)}.`,
    amount:Number(order.total||0),
    currency:order.currency,
    metadata:{supplierId:order.supplierId,warehouseId:order.warehouseId}
  });
}

async function nextFolio(companyId) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({
    companyId,scope:'purchase-order',prefix:'OC',digits:4,period:year,
    model:'purchaseOrder',
    where:{companyId,folio:{startsWith:`OC-${year}-`}}
  });
}

function calculateItems(items) {
  let subtotal = 0;
  let taxAmount = 0;
  const calculated = items.map((item) => {
    const lineSubtotal = Number(item.quantity) * Number(item.unitCost);
    const lineTax = lineSubtotal * (Number(item.taxRate) / 100);
    subtotal += lineSubtotal;
    taxAmount += lineTax;
    return {...item, subtotal: lineSubtotal, taxAmount: lineTax, total: lineSubtotal + lineTax, notes: item.notes || null};
  });
  return {items: calculated, subtotal, taxAmount, total: subtotal + taxAmount};
}

router.get('/', requirePermission('purchase_orders.read'), async (req, res, next) => {
  try {
    const [orders, suppliers, warehouses, approvedRequests, products] = await Promise.all([
      prisma.purchaseOrder.findMany({where: {companyId: req.auth.companyId}, include: includeOrder, orderBy: {createdAt: 'desc'}}),
      prisma.supplier.findMany({where: {companyId: req.auth.companyId, active: true}, orderBy: {legalName: 'asc'}}),
      prisma.warehouse.findMany({where: {branch: {companyId: req.auth.companyId}, active: true}, include: {branch: true}, orderBy: {name: 'asc'}}),
      prisma.purchaseRequest.findMany({where: {companyId: req.auth.companyId, status: 'APPROVED', purchaseOrder: null}, include: {warehouse: true, items: {include: {product: true}}}, orderBy: {resolvedAt: 'desc'}}),
      prisma.product.findMany({where: {companyId: req.auth.companyId, active: true}, orderBy: {name: 'asc'}}),
    ]);
    const approvalRows = await prisma.approvalRequest.findMany({
      where: {companyId: req.auth.companyId, entityType: 'PURCHASE_ORDER', entityId: {in: orders.map((row) => row.id)}},
      orderBy: {requestedAt: 'desc'},
      include: {workflow: true, steps: {orderBy: {sequence: 'asc'}}},
    });
    const approvalByOrder = new Map();
    for (const approval of approvalRows) if (!approvalByOrder.has(approval.entityId)) approvalByOrder.set(approval.entityId, approval);
    const ordersWithApproval = orders.map((order) => ({...order, approval: approvalByOrder.get(order.id) || null}));
    res.json({ok: true, orders: ordersWithApproval, suppliers, warehouses, approvedRequests, products});
  } catch (error) { next(error); }
});

router.post('/', requirePermission('purchase_orders.create'), async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const {supplierId, warehouseId, purchaseRequestId, expectedDate, paymentTerms, currency, notes} = parsed.data;
    const [supplier, warehouse] = await Promise.all([
      prisma.supplier.findFirst({where: {id: supplierId, companyId: req.auth.companyId, active: true}}),
      prisma.warehouse.findFirst({where: {id: warehouseId, branch: {companyId: req.auth.companyId}, active: true}}),
    ]);
    if (!supplier) return res.status(404).json({ok: false, message: 'Proveedor no encontrado'});
    if (!warehouse) return res.status(404).json({ok: false, message: 'Almacén no encontrado'});
    let request = null;
    if (purchaseRequestId) {
      request = await prisma.purchaseRequest.findFirst({where: {id: purchaseRequestId, companyId: req.auth.companyId, status: 'APPROVED', purchaseOrder: null}});
      if (!request) return res.status(409).json({ok: false, message: 'La solicitud no está disponible para convertir'});
    }
    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    if (productIds.length !== parsed.data.items.length) return res.status(400).json({ok: false, message: 'No repitas productos en la orden'});
    const productCount = await prisma.product.count({where: {id: {in: productIds}, companyId: req.auth.companyId, active: true}});
    if (productCount !== productIds.length) return res.status(400).json({ok: false, message: 'Uno o más productos no son válidos'});
    const values = calculateItems(parsed.data.items);
    const folio = await nextFolio(req.auth.companyId);
    const order = await runSerializable(prisma, async (tx) => {
      const created = await tx.purchaseOrder.create({data: {
        companyId: req.auth.companyId, supplierId, warehouseId, purchaseRequestId: purchaseRequestId || null,
        createdById: req.auth.sub, folio, expectedDate: expectedDate ? new Date(`${expectedDate}T12:00:00.000Z`) : null,
        paymentTerms, currency: currency.toUpperCase(), notes: notes || null,
        subtotal: values.subtotal, taxAmount: values.taxAmount, total: values.total,
        items: {create: values.items},
      }, include: includeOrder});
      if (purchaseRequestId) await tx.purchaseRequest.update({where: {id: purchaseRequestId}, data: {status: 'ORDERED'}});
      return created;
    });
    const approval = await createPurchaseOrderApproval({companyId: req.auth.companyId, userId: req.auth.sub, order});
    await prisma.auditLog.create({data: {userId: req.auth.sub, action: 'CREATE', entity: 'PurchaseOrder', entityId: order.id, description: approval ? `Orden ${folio} creada y enviada a aprobación` : `Orden ${folio} creada`, ipAddress: req.ip}});
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'purchase.order.created',entityType:'PurchaseOrder',entityId:order.id,payload:{order:order}});
    if(approval){
      emitIntegrationEventAsync({
        companyId:req.auth.companyId,
        event:'approval.required',
        entityType:'ApprovalRequest',
        entityId:approval.id,
        payload:{approvalRequest:approval,source:{entityType:'PURCHASE_ORDER',entityId:order.id,folio:order.folio}}
      });
    }
    res.status(201).json({ok: true, order: {...order, approval}, approvalRequired: Boolean(approval)});
  } catch (error) { next(error); }
});

router.post('/:id/issue', requirePermission('purchase_orders.issue'), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!existing) return res.status(404).json({ok: false, message: 'Orden no encontrada'});
    if (existing.status !== 'DRAFT') return res.status(409).json({ok: false, message: 'Solo se pueden emitir órdenes en borrador'});

    let approval = await getPurchaseOrderApproval(req.auth.companyId, existing.id);
    if (!approval) approval = await createPurchaseOrderApproval({companyId: req.auth.companyId, userId: req.auth.sub, order: existing});
    if (approval && approval.status !== 'APPROVED') {
      return res.status(409).json({
        ok: false,
        code: 'APPROVAL_REQUIRED',
        message: approval.status === 'REJECTED'
          ? `La orden ${existing.folio} fue rechazada y no puede emitirse.`
          : `La orden ${existing.folio} requiere aprobación antes de emitirse.`,
        approval,
      });
    }

    const order = await prisma.purchaseOrder.update({where: {id: existing.id}, data: {status: 'ISSUED', issuedAt: new Date()}, include: includeOrder});
    res.json({ok: true, order});
  } catch (error) { next(error); }
});

router.post('/:id/receive', requirePermission('purchase_orders.receive'), async (_req, res) => {
  res.status(409).json({ok: false, message: 'Registra la entrada desde Compras → Recepciones para actualizar existencias y Kardex.'});
});

export default router;
