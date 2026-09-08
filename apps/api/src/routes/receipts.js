import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const receiptSchema = z.object({
  purchaseOrderId: z.string().min(1),
  supplierDocument: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  receivedAt: z.string().optional().nullable(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    notes: z.string().trim().max(300).optional().nullable(),
  })).min(1),
});

const receiptInclude = {
  purchaseOrder: {include: {supplier: true}},
  warehouse: {include: {branch: true}},
  createdBy: {select: {id: true, firstName: true, lastName: true, email: true}},
  items: {include: {product: {select: {id: true, sku: true, name: true, unit: true}}}},
};

async function nextFolio(tx, companyId) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({companyId,scope:'goods-receipt',prefix:'REC',digits:4,period:year,model:'goodsReceipt',where:{companyId,folio:{startsWith:`REC-${year}-`}},db:tx});
}

router.get('/', requirePermission('goods_receipts.read'), async (req, res, next) => {
  try {
    const [receipts, orders] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where: {companyId: req.auth.companyId},
        include: receiptInclude,
        orderBy: {receivedAt: 'desc'},
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId: req.auth.companyId,
          status: {in: ['ISSUED', 'PARTIALLY_RECEIVED']},
        },
        include: {
          supplier: true,
          warehouse: {include: {branch: true}},
          items: {include: {product: true}},
        },
        orderBy: {issuedAt: 'desc'},
      }),
    ]);

    res.json({ok: true, receipts, orders});
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('goods_receipts.create'), async (req, res, next) => {
  try {
    const parsed = receiptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Recepción inválida'});
    }

    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id: parsed.data.purchaseOrderId,
        companyId: req.auth.companyId,
        status: {in: ['ISSUED', 'PARTIALLY_RECEIVED']},
      },
      include: {items: true, supplier: true},
    });

    if (!order) return res.status(404).json({ok: false, message: 'Orden no disponible para recepción'});

    const itemMap = new Map(order.items.map((item) => [item.id, item]));
    const seen = new Set();
    for (const input of parsed.data.items) {
      const item = itemMap.get(input.purchaseOrderItemId);
      if (!item) return res.status(400).json({ok: false, message: 'Una partida no pertenece a la orden'});
      if (seen.has(item.id)) return res.status(400).json({ok: false, message: 'No repitas partidas'});
      seen.add(item.id);
      const pending = Number(item.quantity) - Number(item.receivedQuantity);
      if (input.quantity > pending + 0.000001) {
        return res.status(400).json({ok: false, message: `La cantidad supera lo pendiente para una partida`});
      }
    }

    const receipt = await runSerializable(prisma, async (tx) => {
      const folio = await nextFolio(tx, req.auth.companyId);
      const created = await tx.goodsReceipt.create({
        data: {
          companyId: req.auth.companyId,
          purchaseOrderId: order.id,
          warehouseId: order.warehouseId,
          createdById: req.auth.sub,
          folio,
          receivedAt: parsed.data.receivedAt ? new Date(`${parsed.data.receivedAt}T12:00:00.000Z`) : new Date(),
          supplierDocument: parsed.data.supplierDocument || null,
          notes: parsed.data.notes || null,
          items: {
            create: parsed.data.items.map((input) => {
              const item = itemMap.get(input.purchaseOrderItemId);
              return {
                purchaseOrderItemId: item.id,
                productId: item.productId,
                quantity: input.quantity,
                unitCost: item.unitCost,
                notes: input.notes || null,
              };
            }),
          },
        },
      });

      for (const input of parsed.data.items) {
        const orderItem = itemMap.get(input.purchaseOrderItemId);
        const current = await tx.inventoryBalance.findUnique({
          where: {warehouseId_productId: {warehouseId: order.warehouseId, productId: orderItem.productId}},
        });
        const previousQty = Number(current?.quantity ?? 0);
        const previousCost = Number(current?.averageCost ?? 0);
        const receivedQty = Number(input.quantity);
        const unitCost = Number(orderItem.unitCost);
        const nextQty = previousQty + receivedQty;
        const nextAverage = nextQty > 0
          ? ((previousQty * previousCost) + (receivedQty * unitCost)) / nextQty
          : unitCost;

        await tx.inventoryBalance.upsert({
          where: {warehouseId_productId: {warehouseId: order.warehouseId, productId: orderItem.productId}},
          create: {warehouseId: order.warehouseId, productId: orderItem.productId, quantity: nextQty, averageCost: nextAverage},
          update: {quantity: nextQty, averageCost: nextAverage},
        });

        await tx.inventoryMovement.create({
          data: {
            companyId: req.auth.companyId,
            warehouseId: order.warehouseId,
            productId: orderItem.productId,
            goodsReceiptId: created.id,
            createdById: req.auth.sub,
            type: 'PURCHASE_RECEIPT',
            reference: folio,
            quantity: receivedQty,
            unitCost,
            balanceAfter: nextQty,
            notes: input.notes || parsed.data.notes || null,
            occurredAt: parsed.data.receivedAt ? new Date(`${parsed.data.receivedAt}T12:00:00.000Z`) : new Date(),
          },
        });

        await tx.purchaseOrderItem.update({
          where: {id: orderItem.id},
          data: {receivedQuantity: Number(orderItem.receivedQuantity) + receivedQty},
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({where: {purchaseOrderId: order.id}});
      const complete = updatedItems.every((item) => Number(item.receivedQuantity) >= Number(item.quantity));
      await tx.purchaseOrder.update({
        where: {id: order.id},
        data: {status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED', receivedAt: complete ? new Date() : null},
      });

      let financeHandoff=null;

      if(parsed.data.supplierDocument){
        const existingPayable=await tx.accountsPayable.findFirst({
          where:{
            companyId:req.auth.companyId,
            supplierId:order.supplierId,
            invoiceNumber:parsed.data.supplierDocument
          }
        });

        if(existingPayable){
          financeHandoff={created:false,payableId:existingPayable.id,reason:'ALREADY_EXISTS'};
        }else{
          const receivedAt=parsed.data.receivedAt
            ?new Date(`${parsed.data.receivedAt}T12:00:00.000Z`)
            :new Date();

          const dueDate=new Date(receivedAt);
          dueDate.setDate(dueDate.getDate()+Number(order.paymentTerms||0));

          let subtotal=0;
          let taxAmount=0;
          for(const input of parsed.data.items){
            const orderItem=itemMap.get(input.purchaseOrderItemId);
            const lineSubtotal=Number(input.quantity)*Number(orderItem.unitCost);
            subtotal+=lineSubtotal;
            taxAmount+=lineSubtotal*(Number(orderItem.taxRate||0)/100);
          }

          const payable=await tx.accountsPayable.create({
            data:{
              companyId:req.auth.companyId,
              supplierId:order.supplierId,
              purchaseOrderId:order.id,
              createdById:req.auth.sub,
              invoiceNumber:parsed.data.supplierDocument,
              issueDate:receivedAt,
              dueDate,
              currency:order.currency,
              subtotal,
              taxAmount,
              total:subtotal+taxAmount,
              notes:`Generada automáticamente desde recepción ${folio}.`
            }
          });

          financeHandoff={
            created:true,
            payableId:payable.id,
            invoiceNumber:payable.invoiceNumber,
            total:Number(payable.total),
            dueDate:payable.dueDate
          };

          await tx.auditLog.create({
            data:{
              userId:req.auth.sub,
              action:'CREATE',
              entity:'AccountsPayable',
              entityId:payable.id,
              description:`CxP ${payable.invoiceNumber} generada desde recepción ${folio}`,
              ipAddress:req.ip
            }
          });
        }
      }

      const receipt=await tx.goodsReceipt.findUnique({
        where:{id:created.id},
        include:receiptInclude
      });

      return {receipt,financeHandoff,folio};
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'goods.receipt.posted',
      entityType:'GoodsReceipt',
      entityId:receipt.receipt.id,
      payload:{receipt:receipt.receipt}
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'inventory.received',
      entityType:'GoodsReceipt',
      entityId:receipt.receipt.id,
      payload:{
        warehouseId:order.warehouseId,
        purchaseOrderId:order.id,
        items:parsed.data.items
      }
    });

    if(receipt.financeHandoff?.created){
      emitIntegrationEventAsync({
        companyId:req.auth.companyId,
        event:'accounts_payable.created',
        entityType:'AccountsPayable',
        entityId:receipt.financeHandoff.payableId,
        payload:receipt.financeHandoff
      });
    }

    res.status(201).json({
      ok:true,
      receipt:receipt.receipt,
      financeHandoff:receipt.financeHandoff
    });
  } catch (error) {
    next(error);
  }
});

export default router;
