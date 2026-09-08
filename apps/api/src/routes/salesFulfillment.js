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

const deliverySchema = z.object({
  salesOrderId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  deliveryDate: z.coerce.date(),
  recipientName: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  shippingAddress: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    salesOrderItemId: z.string().cuid(),
    quantity: z.coerce.number().positive(),
  })).min(1),
});

const invoiceSchema = z.object({
  salesOrderId: z.string().cuid(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().trim().optional().nullable(),
});

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

async function nextFolio(companyId, model, prefix, db=prisma) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({companyId,scope:`${model}-${prefix.toLowerCase()}`,prefix,digits:4,period:year,model,where:{companyId,folio:{startsWith:`${prefix}-${year}-`}},db});
}

router.get('/', requirePermission('sales.read'), async (req, res, next) => {
  try {
    const [orders, warehouses, deliveries, invoices] = await Promise.all([
      prisma.salesOrder.findMany({
        where: {
          companyId: req.auth.companyId,
          status: {in: ['CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED']},
        },
        include: {
          customer: true,
          items: {
            include: {product: true},
          },
          deliveries: {
            include: {items: true},
          },
          invoice: true,
        },
        orderBy: {orderDate: 'desc'},
      }),
      prisma.warehouse.findMany({
        where: {
          branch: {companyId: req.auth.companyId},
          active: true,
        },
        include: {branch: true},
        orderBy: {name: 'asc'},
      }),
      prisma.salesDelivery.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          salesOrder: {include: {customer: true}},
          warehouse: true,
          createdBy: {select: {firstName: true, lastName: true}},
          items: {include: {product: true}},
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.salesInvoice.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          salesOrder: true,
          customer: true,
          createdBy: {select: {firstName: true, lastName: true}},
        },
        orderBy: {createdAt: 'desc'},
      }),
    ]);

    const stats = {
      pendingOrders: orders.filter((item) => item.status !== 'DELIVERED').length,
      deliveries: deliveries.filter((item) => item.status === 'POSTED').length,
      invoices: invoices.filter((item) => item.status !== 'CANCELLED').length,
      billedTotal: invoices
        .filter((item) => item.status !== 'CANCELLED')
        .reduce((sum, item) => sum + Number(item.total), 0),
      pendingBalance: invoices
        .filter((item) => item.status !== 'CANCELLED')
        .reduce((sum, item) => sum + Number(item.total) - Number(item.paidAmount), 0),
    };

    res.json({ok: true, orders, warehouses, deliveries, invoices, stats});
  } catch (error) {
    next(error);
  }
});

router.post('/deliveries', requirePermission('sales.approve'), async (req, res, next) => {
  try {
    const parsed = deliverySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    const order = await prisma.salesOrder.findFirst({
      where: {
        id: parsed.data.salesOrderId,
        companyId: req.auth.companyId,
        status: {in: ['CONFIRMED', 'PARTIALLY_DELIVERED']},
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: 'Pedido no encontrado o no disponible para entrega',
      });
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: parsed.data.warehouseId,
        branch: {companyId: req.auth.companyId},
        active: true,
      },
    });

    if (!warehouse) {
      return res.status(404).json({ok: false, message: 'Almacén no encontrado'});
    }

    const orderItems = new Map(order.items.map((item) => [item.id, item]));

    for (const item of parsed.data.items) {
      const orderItem = orderItems.get(item.salesOrderItemId);

      if (!orderItem) {
        return res.status(400).json({
          ok: false,
          message: 'Una partida no pertenece al pedido',
        });
      }

      const remaining = Number(orderItem.quantity) - Number(orderItem.deliveredQty);

      if (item.quantity > remaining) {
        return res.status(409).json({
          ok: false,
          message: `La cantidad excede lo pendiente para una partida`,
        });
      }
    }

    const delivery = await runSerializable(prisma, async (tx) => {
      const folio = await nextFolio(req.auth.companyId, 'salesDelivery', 'REM', tx);

      const balances = await tx.inventoryBalance.findMany({
        where: {
          warehouseId: warehouse.id,
          productId: {
            in: parsed.data.items.map((item) => orderItems.get(item.salesOrderItemId).productId),
          },
        },
      });

      const balanceMap = new Map(
        balances.map((item) => [`${item.productId}`, item]),
      );

      for (const item of parsed.data.items) {
        const orderItem = orderItems.get(item.salesOrderItemId);
        const balance = balanceMap.get(orderItem.productId);

        if (!balance || Number(balance.quantity) < item.quantity) {
          throw new Error(`Stock insuficiente para el producto ${orderItem.productId}`);
        }
      }

      const created = await tx.salesDelivery.create({
        data: {
          companyId: req.auth.companyId,
          salesOrderId: order.id,
          warehouseId: warehouse.id,
          createdById: req.auth.sub,
          folio,
          deliveryDate: parsed.data.deliveryDate,
          status: 'POSTED',
          recipientName: parsed.data.recipientName,
          reference: parsed.data.reference,
          shippingAddress: parsed.data.shippingAddress,
          notes: parsed.data.notes,
          items: {
            create: parsed.data.items.map((item) => {
              const orderItem = orderItems.get(item.salesOrderItemId);
              const balance = balanceMap.get(orderItem.productId);

              return {
                salesOrderItemId: orderItem.id,
                productId: orderItem.productId,
                quantity: item.quantity,
                unitCost: balance.averageCost,
              };
            }),
          },
        },
        include: {items: true},
      });

      for (const item of created.items) {
        const balance = balanceMap.get(item.productId);
        const nextQty = Number(balance.quantity) - Number(item.quantity);

        await tx.inventoryBalance.update({
          where: {id: balance.id},
          data: {quantity: nextQty},
        });

        await tx.inventoryMovement.create({
          data: {
            companyId: req.auth.companyId,
            warehouseId: warehouse.id,
            productId: item.productId,
            createdById: req.auth.sub,
            type: 'SALE_OUT',
            reference: folio,
            quantity: -Number(item.quantity),
            unitCost: item.unitCost,
            balanceAfter: nextQty,
            notes: parsed.data.notes,
            occurredAt: parsed.data.deliveryDate,
          },
        });

        const orderItem = orderItems.get(item.salesOrderItemId);

        await tx.salesOrderItem.update({
          where: {id: orderItem.id},
          data: {
            deliveredQty: Number(orderItem.deliveredQty) + Number(item.quantity),
          },
        });
      }

      const refreshedItems = await tx.salesOrderItem.findMany({
        where: {salesOrderId: order.id},
      });

      const fullyDelivered = refreshedItems.every(
        (item) => Number(item.deliveredQty) >= Number(item.quantity),
      );

      await tx.salesOrder.update({
        where: {id: order.id},
        data: {
          status: fullyDelivered ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
        },
      });

      return created;
    });

    await audit(req, 'CREATE', 'SalesDelivery', delivery.id, `Remisión ${delivery.folio} registrada`);
    await emitLowStockEvents({
      companyId:req.auth.companyId,
      productIds:delivery.items?.map(item=>item.productId)||[],
      warehouseIds:[delivery.warehouseId].filter(Boolean)
    });
    res.status(201).json({ok: true, delivery});
  } catch (error) {
    if (error.message?.startsWith('Stock insuficiente')) {
      return res.status(409).json({ok: false, message: error.message});
    }

    next(error);
  }
});

router.post('/invoices', requirePermission('sales.approve'), async (req, res, next) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    if (parsed.data.dueDate < parsed.data.issueDate) {
      return res.status(400).json({
        ok: false,
        message: 'La fecha de vencimiento no puede ser anterior a la emisión',
      });
    }

    const order = await prisma.salesOrder.findFirst({
      where: {
        id: parsed.data.salesOrderId,
        companyId: req.auth.companyId,
        status: {in: ['DELIVERED', 'PARTIALLY_DELIVERED']},
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: 'Pedido no disponible para facturación',
      });
    }

    if (order.invoice) {
      return res.status(409).json({
        ok: false,
        message: 'El pedido ya tiene una factura asociada',
      });
    }

    const invoice = await runSerializable(prisma, async (tx) => {
      const invoiceNumber = await nextFolio(
        req.auth.companyId,
        'salesInvoice',
        'FAC',
        tx,
      );

      const created = await tx.salesInvoice.create({
        data: {
          companyId: req.auth.companyId,
          salesOrderId: order.id,
          customerId: order.customerId,
          createdById: req.auth.sub,
          invoiceNumber,
          issueDate: parsed.data.issueDate,
          dueDate: parsed.data.dueDate,
          status: 'ISSUED',
          currency: order.currency,
          subtotal: order.subtotal,
          taxTotal: order.taxTotal,
          total: order.total,
          notes: parsed.data.notes,
        },
      });

      await tx.accountsReceivable.create({
        data: {
          companyId: req.auth.companyId,
          customerId: order.customerId,
          createdById: req.auth.sub,
          invoiceNumber,
          issueDate: parsed.data.issueDate,
          dueDate: parsed.data.dueDate,
          subtotal: order.subtotal,
          taxAmount: order.taxTotal,
          total: order.total,
          paidAmount: 0,
          currency: order.currency,
          status: 'PENDING',
          notes: `Generada desde pedido ${order.folio}`,
        },
      });

      await tx.salesOrder.update({
        where: {id: order.id},
        data: {status: 'INVOICED'},
      });

      return created;
    });

    await audit(req, 'CREATE', 'SalesInvoice', invoice.id, `Factura ${invoice.invoiceNumber} emitida`);
    res.status(201).json({ok: true, invoice});
  } catch (error) {
    next(error);
  }
});

export default router;
