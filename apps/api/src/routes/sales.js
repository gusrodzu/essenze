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

const itemSchema = z.object({
  productId: z.string().cuid(),
  description: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(16),
});

const quoteSchema = z.object({
  customerId: z.string().cuid(),
  quoteDate: z.coerce.date(),
  validUntil: z.coerce.date(),
  currency: z.string().trim().min(3).max(3).default('MXN'),
  notes: z.string().trim().optional().nullable(),
  terms: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

const orderSchema = z.object({
  customerId: z.string().cuid(),
  orderDate: z.coerce.date(),
  deliveryDate: z.coerce.date().optional().nullable(),
  currency: z.string().trim().min(3).max(3).default('MXN'),
  notes: z.string().trim().optional().nullable(),
  shippingAddress: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

function calculateItems(items) {
  let subtotal = 0;
  let taxTotal = 0;

  const calculated = items.map((item) => {
    const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
    const taxAmount = itemSubtotal * (Number(item.taxRate) / 100);
    const total = itemSubtotal + taxAmount;

    subtotal += itemSubtotal;
    taxTotal += taxAmount;

    return {
      ...item,
      subtotal: itemSubtotal,
      taxAmount,
      total,
    };
  });

  return {
    items: calculated,
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
  };
}

async function nextFolio(companyId, model, prefix, db=prisma) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({companyId,scope:`${model}-${prefix.toLowerCase()}`,prefix,digits:4,period:year,model,where:{companyId,folio:{startsWith:`${prefix}-${year}-`}},db});
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

router.get('/', requirePermission('sales.read'), async (req, res, next) => {
  try {
    const [quotes, orders, customers, products] = await Promise.all([
      prisma.salesQuote.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          customer: true,
          items: {include: {product: true}},
          order: true,
          createdBy: {select: {firstName: true, lastName: true}},
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.salesOrder.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          customer: true,
          items: {include: {product: true}},
          salesQuote: true,
          createdBy: {select: {firstName: true, lastName: true}},
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.customer.findMany({
        where: {companyId: req.auth.companyId, active: true},
        orderBy: {commercialName: 'asc'},
      }),
      prisma.product.findMany({
        where: {companyId: req.auth.companyId, active: true},
        orderBy: {name: 'asc'},
      }),
    ]);

    const stats = {
      quotes: quotes.length,
      openQuotes: quotes.filter((item) => ['DRAFT', 'SENT'].includes(item.status)).length,
      acceptedQuotes: quotes.filter((item) => item.status === 'ACCEPTED').length,
      orders: orders.length,
      confirmedOrders: orders.filter((item) => item.status === 'CONFIRMED').length,
      salesTotal: orders
        .filter((item) => !['CANCELLED', 'DRAFT'].includes(item.status))
        .reduce((sum, item) => sum + Number(item.total), 0),
    };

    res.json({ok: true, quotes, orders, customers, products, stats});
  } catch (error) {
    next(error);
  }
});

router.post('/quotes', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    if (parsed.data.validUntil < parsed.data.quoteDate) {
      return res.status(400).json({
        ok: false,
        message: 'La vigencia no puede ser anterior a la fecha de cotización',
      });
    }

    const [customer, validProducts] = await Promise.all([
      prisma.customer.findFirst({
        where: {id: parsed.data.customerId, companyId: req.auth.companyId, active: true},
      }),
      prisma.product.findMany({
        where: {
          companyId: req.auth.companyId,
          id: {in: parsed.data.items.map((item) => item.productId)},
          active: true,
        },
      }),
    ]);

    if (!customer || validProducts.length !== new Set(parsed.data.items.map((item) => item.productId)).size) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente o producto no encontrado',
      });
    }

    const calculated = calculateItems(parsed.data.items);

    const quote = await prisma.salesQuote.create({
      data: {
        companyId: req.auth.companyId,
        customerId: parsed.data.customerId,
        createdById: req.auth.sub,
        folio: await nextFolio(req.auth.companyId, 'salesQuote', 'COT'),
        quoteDate: parsed.data.quoteDate,
        validUntil: parsed.data.validUntil,
        currency: parsed.data.currency,
        notes: parsed.data.notes,
        terms: parsed.data.terms,
        subtotal: calculated.subtotal,
        taxTotal: calculated.taxTotal,
        total: calculated.total,
        items: {
          create: calculated.items,
        },
      },
      include: {customer: true, items: {include: {product: true}}},
    });

    await audit(req, 'CREATE', 'SalesQuote', quote.id, `Cotización ${quote.folio} creada`);
    res.status(201).json({ok: true, quote});
  } catch (error) {
    next(error);
  }
});

router.patch('/quotes/:id/status', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.enum(['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ok: false, message: 'Estado inválido'});
    }

    const quote = await prisma.salesQuote.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });

    if (!quote) {
      return res.status(404).json({ok: false, message: 'Cotización no encontrada'});
    }

    if (quote.status === 'CONVERTED') {
      return res.status(409).json({
        ok: false,
        message: 'La cotización ya fue convertida en pedido',
      });
    }

    const updated = await prisma.salesQuote.update({
      where: {id: quote.id},
      data: {status: parsed.data.status},
    });

    await audit(
      req,
      'STATUS',
      'SalesQuote',
      quote.id,
      `Cotización ${quote.folio}: ${updated.status}`,
    );

    res.json({ok: true, quote: updated});
  } catch (error) {
    next(error);
  }
});

router.post('/quotes/:id/convert', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      deliveryDate: z.coerce.date().optional().nullable(),
      shippingAddress: z.string().trim().optional().nullable(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ok: false, message: 'Datos inválidos'});
    }

    const quote = await prisma.salesQuote.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
      include: {items: true},
    });

    if (!quote) {
      return res.status(404).json({ok: false, message: 'Cotización no encontrada'});
    }

    if (!['ACCEPTED', 'SENT'].includes(quote.status)) {
      return res.status(409).json({
        ok: false,
        message: 'Solo una cotización enviada o aceptada puede convertirse',
      });
    }

    const order = await runSerializable(prisma, async (tx) => {
      const created = await tx.salesOrder.create({
        data: {
          companyId: req.auth.companyId,
          customerId: quote.customerId,
          salesQuoteId: quote.id,
          createdById: req.auth.sub,
          folio: await nextFolio(req.auth.companyId, 'salesOrder', 'PED'),
          orderDate: new Date(),
          deliveryDate: parsed.data.deliveryDate,
          currency: quote.currency,
          subtotal: quote.subtotal,
          taxTotal: quote.taxTotal,
          total: quote.total,
          notes: quote.notes,
          shippingAddress: parsed.data.shippingAddress,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              subtotal: item.subtotal,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
      });

      await tx.salesQuote.update({
        where: {id: quote.id},
        data: {status: 'CONVERTED'},
      });

      return created;
    });

    await audit(req, 'CONVERT', 'SalesQuote', quote.id, `Cotización ${quote.folio} convertida en ${order.folio}`);
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'sales.order.created',entityType:'SalesOrder',entityId:order.id,payload:{order}});
    res.status(201).json({ok: true, order});
  } catch (error) {
    next(error);
  }
});

router.post('/orders', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    const calculated = calculateItems(parsed.data.items);

    const order = await prisma.salesOrder.create({
      data: {
        companyId: req.auth.companyId,
        customerId: parsed.data.customerId,
        createdById: req.auth.sub,
        folio: await nextFolio(req.auth.companyId, 'salesOrder', 'PED'),
        orderDate: parsed.data.orderDate,
        deliveryDate: parsed.data.deliveryDate,
        currency: parsed.data.currency,
        notes: parsed.data.notes,
        shippingAddress: parsed.data.shippingAddress,
        subtotal: calculated.subtotal,
        taxTotal: calculated.taxTotal,
        total: calculated.total,
        items: {create: calculated.items},
      },
      include: {customer: true, items: {include: {product: true}}},
    });

    await audit(req, 'CREATE', 'SalesOrder', order.id, `Pedido ${order.folio} creado`);
    res.status(201).json({ok: true, order});
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', requirePermission('sales.approve'), async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.enum(['CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'INVOICED', 'CANCELLED']),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ok: false, message: 'Estado inválido'});
    }

    const order = await prisma.salesOrder.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });

    if (!order) {
      return res.status(404).json({ok: false, message: 'Pedido no encontrado'});
    }

    const updated = await prisma.salesOrder.update({
      where: {id: order.id},
      data: {status: parsed.data.status},
    });

    await audit(req, 'STATUS', 'SalesOrder', order.id, `Pedido ${order.folio}: ${updated.status}`);
    res.json({ok: true, order: updated});
  } catch (error) {
    next(error);
  }
});

export default router;
