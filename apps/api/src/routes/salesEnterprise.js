import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const prospectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  stage: z.enum(['LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).default('LEAD'),
  estimatedValue: z.coerce.number().min(0).default(0),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  source: z.string().trim().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});


const conversionSchema = z.object({
  code: z.string().trim().min(2).max(30),
  legalName: z.string().trim().min(2).max(180),
  commercialName: z.string().trim().optional().nullable(),
  taxId: z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  creditDays: z.coerce.number().int().min(0).max(365).default(0),
  creditLimit: z.coerce.number().min(0).default(0),
});

const activitySchema = z.object({
  prospectId: z.string().cuid().optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
  salesQuoteId: z.string().cuid().optional().nullable(),
  salesOrderId: z.string().cuid().optional().nullable(),
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK', 'STATUS_CHANGE']).default('NOTE'),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
});

async function writeAudit(req, action, entity, entityId, description) {
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

router.get('/dashboard', requirePermission('sales.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [
      prospects,
      quotes,
      orders,
      receivables,
      activities,
      customersCount,
    ] = await Promise.all([
      prisma.prospect.findMany({
        where: {companyId},
        include: {
          owner: {select: {id: true, firstName: true, lastName: true}},
          activities: {
            orderBy: {createdAt: 'desc'},
            take: 1,
          },
        },
        orderBy: [{updatedAt: 'desc'}],
      }),
      prisma.salesQuote.findMany({
        where: {companyId},
        include: {customer: true},
        orderBy: {createdAt: 'desc'},
      }),
      prisma.salesOrder.findMany({
        where: {companyId},
        include: {customer: true},
        orderBy: {createdAt: 'desc'},
      }),
      prisma.accountsReceivable.findMany({
        where: {companyId, status: {not: 'CANCELLED'}},
        include: {customer: true},
        orderBy: {dueDate: 'asc'},
      }),
      prisma.salesActivity.findMany({
        where: {companyId},
        include: {
          createdBy: {select: {firstName: true, lastName: true}},
          prospect: {select: {name: true, companyName: true}},
          customer: {select: {legalName: true, commercialName: true}},
        },
        orderBy: {createdAt: 'desc'},
        take: 30,
      }),
      prisma.customer.count({where: {companyId, active: true}}),
    ]);

    const monthSales = orders
      .filter((item) =>
        item.orderDate >= monthStart &&
        item.orderDate < nextMonth &&
        !['DRAFT', 'CANCELLED'].includes(item.status),
      )
      .reduce((sum, item) => sum + Number(item.total), 0);

    const openReceivables = receivables.reduce(
      (sum, item) => sum + Number(item.total) - Number(item.paidAmount),
      0,
    );

    const pipeline = ['LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].map(
      (stage) => {
        const rows = prospects.filter((item) => item.stage === stage);
        return {
          stage,
          count: rows.length,
          value: rows.reduce((sum, item) => sum + Number(item.estimatedValue), 0),
        };
      },
    );

    const quoteConversionBase = quotes.filter((item) =>
      ['SENT', 'ACCEPTED', 'CONVERTED', 'REJECTED'].includes(item.status),
    );
    const convertedQuotes = quotes.filter((item) =>
      ['ACCEPTED', 'CONVERTED'].includes(item.status),
    ).length;

    res.json({
      ok: true,
      summary: {
        monthSales,
        openQuotes: quotes.filter((item) => ['DRAFT', 'SENT'].includes(item.status)).length,
        activeOrders: orders.filter((item) =>
          ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(item.status),
        ).length,
        openReceivables,
        customers: customersCount,
        prospects: prospects.filter((item) => !['WON', 'LOST'].includes(item.stage)).length,
        conversionRate:
          quoteConversionBase.length > 0
            ? Math.round((convertedQuotes / quoteConversionBase.length) * 100)
            : 0,
      },
      pipeline,
      prospects,
      quotes: quotes.slice(0, 12),
      orders: orders.slice(0, 12),
      receivables: receivables.slice(0, 12),
      activities,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/prospects', requirePermission('sales.read'), async (req, res, next) => {
  try {
    const prospects = await prisma.prospect.findMany({
      where: {companyId: req.auth.companyId},
      include: {
        owner: {select: {id: true, firstName: true, lastName: true}},
        activities: {
          include: {
            createdBy: {select: {firstName: true, lastName: true}},
          },
          orderBy: {createdAt: 'desc'},
        },
      },
      orderBy: {updatedAt: 'desc'},
    });

    res.json({ok: true, prospects});
  } catch (error) {
    next(error);
  }
});

router.post('/prospects', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = prospectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    const prospect = await prisma.prospect.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        companyId: req.auth.companyId,
        ownerId: req.auth.sub,
      },
    });

    await prisma.salesActivity.create({
      data: {
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
        prospectId: prospect.id,
        type: 'STATUS_CHANGE',
        title: 'Prospecto creado',
        description: `Ingresó al pipeline en la etapa ${prospect.stage}`,
      },
    });

    await writeAudit(req, 'CREATE', 'Prospect', prospect.id, `Prospecto ${prospect.name} creado`);
    res.status(201).json({ok: true, prospect});
  } catch (error) {
    next(error);
  }
});

router.put('/prospects/:id', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = prospectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    const current = await prisma.prospect.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });

    if (!current) {
      return res.status(404).json({ok: false, message: 'Prospecto no encontrado'});
    }

    const prospect = await prisma.prospect.update({
      where: {id: current.id},
      data: {...parsed.data, email: parsed.data.email || null},
    });

    if (current.stage !== prospect.stage) {
      await prisma.salesActivity.create({
        data: {
          companyId: req.auth.companyId,
          createdById: req.auth.sub,
          prospectId: prospect.id,
          type: 'STATUS_CHANGE',
          title: 'Etapa actualizada',
          description: `${current.stage} → ${prospect.stage}`,
        },
      });
    }

    await writeAudit(req, 'UPDATE', 'Prospect', prospect.id, `Prospecto ${prospect.name} actualizado`);
    res.json({ok: true, prospect});
  } catch (error) {
    next(error);
  }
});

router.patch('/prospects/:id/stage', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      stage: z.enum(['LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ok: false, message: 'Etapa inválida'});
    }

    const current = await prisma.prospect.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });

    if (!current) {
      return res.status(404).json({ok: false, message: 'Prospecto no encontrado'});
    }

    const prospect = await prisma.prospect.update({
      where: {id: current.id},
      data: {stage: parsed.data.stage},
    });

    await prisma.salesActivity.create({
      data: {
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
        prospectId: prospect.id,
        type: 'STATUS_CHANGE',
        title: 'Etapa actualizada',
        description: `${current.stage} → ${prospect.stage}`,
      },
    });

    res.json({ok: true, prospect});
  } catch (error) {
    next(error);
  }
});

router.post('/activities', requirePermission('sales.manage'), async (req, res, next) => {
  try {
    const parsed = activitySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    if (!parsed.data.prospectId && !parsed.data.customerId &&
        !parsed.data.salesQuoteId && !parsed.data.salesOrderId) {
      return res.status(400).json({
        ok: false,
        message: 'La actividad debe vincularse con un registro comercial',
      });
    }

    const activity = await prisma.salesActivity.create({
      data: {
        ...parsed.data,
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
      },
    });

    await writeAudit(req, 'CREATE', 'SalesActivity', activity.id, `Actividad: ${activity.title}`);
    res.status(201).json({ok: true, activity});
  } catch (error) {
    next(error);
  }
});


router.patch(
  '/activities/:id/complete',
  requirePermission('sales.manage'),
  async (req, res, next) => {
    try {
      const activity = await prisma.salesActivity.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!activity) {
        return res.status(404).json({ok: false, message: 'Actividad no encontrada'});
      }

      const updated = await prisma.salesActivity.update({
        where: {id: activity.id},
        data: {completedAt: activity.completedAt ? null : new Date()},
      });

      await writeAudit(
        req,
        'UPDATE',
        'SalesActivity',
        updated.id,
        updated.completedAt ? `Actividad completada: ${updated.title}` : `Actividad reabierta: ${updated.title}`,
      );

      res.json({ok: true, activity: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/prospects/:id/convert',
  requirePermission('sales.manage'),
  requirePermission('customers.manage'),
  async (req, res, next) => {
    try {
      const parsed = conversionSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const prospect = await prisma.prospect.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!prospect) {
        return res.status(404).json({ok: false, message: 'Prospecto no encontrado'});
      }

      const previousConversion = await prisma.salesActivity.findFirst({
        where: {
          companyId: req.auth.companyId,
          prospectId: prospect.id,
          customerId: {not: null},
          title: 'Prospecto convertido a cliente',
        },
        include: {customer: true},
      });

      if (previousConversion?.customer) {
        return res.status(409).json({
          ok: false,
          message: `Este prospecto ya fue convertido en el cliente ${previousConversion.customer.code}`,
          customer: previousConversion.customer,
        });
      }

      const result = await runSerializable(prisma, async (tx) => {
        const customer = await tx.customer.create({
          data: {
            ...parsed.data,
            code: parsed.data.code.toUpperCase(),
            email: parsed.data.email || null,
            companyId: req.auth.companyId,
            active: true,
          },
        });

        const updatedProspect = await tx.prospect.update({
          where: {id: prospect.id},
          data: {
            stage: 'WON',
            probability: 100,
            nextActionAt: null,
          },
        });

        const activity = await tx.salesActivity.create({
          data: {
            companyId: req.auth.companyId,
            createdById: req.auth.sub,
            prospectId: prospect.id,
            customerId: customer.id,
            type: 'STATUS_CHANGE',
            title: 'Prospecto convertido a cliente',
            description: `${prospect.name} fue convertido al cliente ${customer.code} · ${customer.commercialName || customer.legalName}`,
            completedAt: new Date(),
          },
        });

        return {customer, prospect: updatedProspect, activity};
      });

      await writeAudit(
        req,
        'CREATE',
        'Customer',
        result.customer.id,
        `Cliente ${result.customer.code} creado desde CRM`,
      );

      res.status(201).json({ok: true, ...result});
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un cliente con ese código',
        });
      }
      next(error);
    }
  },
);

export default router;
