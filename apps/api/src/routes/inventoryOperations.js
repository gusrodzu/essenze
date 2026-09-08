import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitLowStockEvents} from '../services/integrationEvents.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const adjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  reason: z.string().trim().min(3).max(180),
  notes: z.string().trim().max(1000).optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    direction: z.enum(['IN', 'OUT']),
    quantity: z.coerce.number().positive(),
    unitCost: z.coerce.number().min(0).optional().default(0),
    notes: z.string().trim().max(300).optional().nullable(),
  })).min(1),
});

const transferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  notes: z.string().trim().max(1000).optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    notes: z.string().trim().max(300).optional().nullable(),
  })).min(1),
});

const adjustmentInclude = {
  warehouse: {include: {branch: true}},
  createdBy: {select: {firstName: true, lastName: true}},
  items: {include: {product: {select: {id: true, sku: true, name: true, unit: true}}}},
};

const transferInclude = {
  fromWarehouse: {include: {branch: true}},
  toWarehouse: {include: {branch: true}},
  createdBy: {select: {firstName: true, lastName: true}},
  items: {include: {product: {select: {id: true, sku: true, name: true, unit: true}}}},
};

async function nextFolio(tx, model, companyId, prefix) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({companyId,scope:`inventory-${prefix.toLowerCase()}`,prefix,digits:4,period:year,model,where:{companyId,folio:{startsWith:`${prefix}-${year}-`}},db:tx});
}

router.get('/', requirePermission('inventory.read'), async (req, res, next) => {
  try {
    const [adjustments, transfers, warehouses, products, balances] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where: {companyId: req.auth.companyId},
        include: adjustmentInclude,
        orderBy: {occurredAt: 'desc'},
        take: 250,
      }),
      prisma.inventoryTransfer.findMany({
        where: {companyId: req.auth.companyId},
        include: transferInclude,
        orderBy: {occurredAt: 'desc'},
        take: 250,
      }),
      prisma.warehouse.findMany({
        where: {branch: {companyId: req.auth.companyId}, active: true},
        include: {branch: true},
        orderBy: [{branch: {name: 'asc'}}, {name: 'asc'}],
      }),
      prisma.product.findMany({
        where: {companyId: req.auth.companyId, active: true},
        select: {id: true, sku: true, name: true, unit: true, cost: true},
        orderBy: {name: 'asc'},
      }),
      prisma.inventoryBalance.findMany({
        where: {warehouse: {branch: {companyId: req.auth.companyId}}},
        select: {warehouseId: true, productId: true, quantity: true, averageCost: true},
      }),
    ]);

    res.json({ok: true, adjustments, transfers, warehouses, products, balances});
  } catch (error) {
    next(error);
  }
});

router.post('/adjustments', requirePermission('inventory_adjustments.manage'), async (req, res, next) => {
  try {
    const parsed = adjustmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Ajuste inválido'});
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {id: parsed.data.warehouseId, branch: {companyId: req.auth.companyId}, active: true},
    });
    if (!warehouse) return res.status(404).json({ok: false, message: 'Almacén no disponible'});

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    if (productIds.length !== parsed.data.items.length) {
      return res.status(400).json({ok: false, message: 'No repitas productos en el ajuste'});
    }

    const products = await prisma.product.findMany({
      where: {id: {in: productIds}, companyId: req.auth.companyId, active: true},
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({ok: false, message: 'Uno o más productos no son válidos'});
    }

    const result = await runSerializable(prisma, async (tx) => {
      const folio = await nextFolio(tx, 'inventoryAdjustment', req.auth.companyId, 'AJU');
      const occurredAt = parsed.data.occurredAt ? new Date(`${parsed.data.occurredAt}T12:00:00.000Z`) : new Date();
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          companyId: req.auth.companyId,
          warehouseId: warehouse.id,
          createdById: req.auth.sub,
          folio,
          reason: parsed.data.reason,
          notes: parsed.data.notes || null,
          occurredAt,
        },
      });

      for (const input of parsed.data.items) {
        const current = await tx.inventoryBalance.findUnique({
          where: {warehouseId_productId: {warehouseId: warehouse.id, productId: input.productId}},
        });
        const previousQty = Number(current?.quantity ?? 0);
        const previousCost = Number(current?.averageCost ?? 0);
        const signedQty = input.direction === 'IN' ? Number(input.quantity) : -Number(input.quantity);
        const nextQty = previousQty + signedQty;
        if (nextQty < -0.000001) throw new Error('El ajuste de salida supera la existencia disponible');

        const inputCost = Number(input.unitCost || previousCost || 0);
        const nextAverage = input.direction === 'IN' && nextQty > 0
          ? ((previousQty * previousCost) + (Number(input.quantity) * inputCost)) / nextQty
          : previousCost;

        await tx.inventoryBalance.upsert({
          where: {warehouseId_productId: {warehouseId: warehouse.id, productId: input.productId}},
          create: {warehouseId: warehouse.id, productId: input.productId, quantity: nextQty, averageCost: nextAverage},
          update: {quantity: nextQty, averageCost: nextAverage},
        });

        await tx.inventoryAdjustmentItem.create({
          data: {
            adjustmentId: adjustment.id,
            productId: input.productId,
            direction: input.direction,
            quantity: input.quantity,
            unitCost: inputCost,
            notes: input.notes || null,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            companyId: req.auth.companyId,
            warehouseId: warehouse.id,
            productId: input.productId,
            createdById: req.auth.sub,
            type: input.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            reference: folio,
            quantity: signedQty,
            unitCost: inputCost,
            balanceAfter: nextQty,
            notes: input.notes || parsed.data.reason,
            occurredAt,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.auth.sub,
          action: 'CREATE',
          entity: 'InventoryAdjustment',
          entityId: adjustment.id,
          description: `Ajuste ${folio} registrado`,
          ipAddress: req.ip,
        },
      });

      return tx.inventoryAdjustment.findUnique({where: {id: adjustment.id}, include: adjustmentInclude});
    });

    await emitLowStockEvents({
      companyId:req.auth.companyId,
      productIds:parsed.data.items.map(item=>item.productId),
      warehouseIds:[parsed.data.warehouseId]
    });
    res.status(201).json({ok: true, adjustment: result});
  } catch (error) {
    if (error.message?.includes('existencia disponible')) {
      return res.status(400).json({ok: false, message: error.message});
    }
    next(error);
  }
});

router.post('/transfers', requirePermission('inventory_transfers.manage'), async (req, res, next) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Transferencia inválida'});
    }
    if (parsed.data.fromWarehouseId === parsed.data.toWarehouseId) {
      return res.status(400).json({ok: false, message: 'El almacén origen y destino deben ser diferentes'});
    }

    const warehouses = await prisma.warehouse.findMany({
      where: {
        id: {in: [parsed.data.fromWarehouseId, parsed.data.toWarehouseId]},
        branch: {companyId: req.auth.companyId},
        active: true,
      },
    });
    if (warehouses.length !== 2) return res.status(404).json({ok: false, message: 'Almacén origen o destino no disponible'});

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    if (productIds.length !== parsed.data.items.length) {
      return res.status(400).json({ok: false, message: 'No repitas productos en la transferencia'});
    }

    const products = await prisma.product.count({
      where: {id: {in: productIds}, companyId: req.auth.companyId, active: true},
    });
    if (products !== productIds.length) return res.status(400).json({ok: false, message: 'Uno o más productos no son válidos'});

    const result = await runSerializable(prisma, async (tx) => {
      const folio = await nextFolio(tx, 'inventoryTransfer', req.auth.companyId, 'TRF');
      const occurredAt = parsed.data.occurredAt ? new Date(`${parsed.data.occurredAt}T12:00:00.000Z`) : new Date();
      const transfer = await tx.inventoryTransfer.create({
        data: {
          companyId: req.auth.companyId,
          fromWarehouseId: parsed.data.fromWarehouseId,
          toWarehouseId: parsed.data.toWarehouseId,
          createdById: req.auth.sub,
          folio,
          notes: parsed.data.notes || null,
          occurredAt,
        },
      });

      for (const input of parsed.data.items) {
        const source = await tx.inventoryBalance.findUnique({
          where: {warehouseId_productId: {warehouseId: parsed.data.fromWarehouseId, productId: input.productId}},
        });
        const sourceQty = Number(source?.quantity ?? 0);
        const qty = Number(input.quantity);
        if (sourceQty + 0.000001 < qty) throw new Error('La transferencia supera la existencia disponible en origen');
        const unitCost = Number(source?.averageCost ?? 0);
        const sourceAfter = sourceQty - qty;

        const destination = await tx.inventoryBalance.findUnique({
          where: {warehouseId_productId: {warehouseId: parsed.data.toWarehouseId, productId: input.productId}},
        });
        const destinationQty = Number(destination?.quantity ?? 0);
        const destinationCost = Number(destination?.averageCost ?? 0);
        const destinationAfter = destinationQty + qty;
        const destinationAverage = destinationAfter > 0
          ? ((destinationQty * destinationCost) + (qty * unitCost)) / destinationAfter
          : unitCost;

        await tx.inventoryBalance.update({
          where: {warehouseId_productId: {warehouseId: parsed.data.fromWarehouseId, productId: input.productId}},
          data: {quantity: sourceAfter},
        });
        await tx.inventoryBalance.upsert({
          where: {warehouseId_productId: {warehouseId: parsed.data.toWarehouseId, productId: input.productId}},
          create: {warehouseId: parsed.data.toWarehouseId, productId: input.productId, quantity: destinationAfter, averageCost: destinationAverage},
          update: {quantity: destinationAfter, averageCost: destinationAverage},
        });

        await tx.inventoryTransferItem.create({
          data: {transferId: transfer.id, productId: input.productId, quantity: qty, unitCost, notes: input.notes || null},
        });

        await tx.inventoryMovement.createMany({
          data: [
            {
              companyId: req.auth.companyId,
              warehouseId: parsed.data.fromWarehouseId,
              productId: input.productId,
              createdById: req.auth.sub,
              type: 'TRANSFER_OUT',
              reference: folio,
              quantity: -qty,
              unitCost,
              balanceAfter: sourceAfter,
              notes: input.notes || parsed.data.notes || null,
              occurredAt,
            },
            {
              companyId: req.auth.companyId,
              warehouseId: parsed.data.toWarehouseId,
              productId: input.productId,
              createdById: req.auth.sub,
              type: 'TRANSFER_IN',
              reference: folio,
              quantity: qty,
              unitCost,
              balanceAfter: destinationAfter,
              notes: input.notes || parsed.data.notes || null,
              occurredAt,
            },
          ],
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.auth.sub,
          action: 'CREATE',
          entity: 'InventoryTransfer',
          entityId: transfer.id,
          description: `Transferencia ${folio} registrada`,
          ipAddress: req.ip,
        },
      });

      return tx.inventoryTransfer.findUnique({where: {id: transfer.id}, include: transferInclude});
    });

    await emitLowStockEvents({
      companyId:req.auth.companyId,
      productIds:parsed.data.items.map(item=>item.productId),
      warehouseIds:[parsed.data.fromWarehouseId]
    });
    res.status(201).json({ok: true, transfer: result});
  } catch (error) {
    if (error.message?.includes('existencia disponible')) {
      return res.status(400).json({ok: false, message: error.message});
    }
    next(error);
  }
});

export default router;
