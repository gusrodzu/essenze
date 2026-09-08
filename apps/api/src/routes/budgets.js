import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const costCenterSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().default(true),
});

const budgetSchema = z.object({
  name: z.string().trim().min(3).max(120),
  year: z.coerce.number().int().min(2020).max(2100),
  notes: z.string().trim().optional().nullable(),
});

const lineSchema = z.object({
  costCenterId: z.string().cuid(),
  category: z.string().trim().min(2).max(100),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().min(0),
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

async function refreshBudgetTotal(budgetId) {
  const aggregate = await prisma.budgetLine.aggregate({
    where: {budgetId},
    _sum: {amount: true},
  });

  return prisma.budget.update({
    where: {id: budgetId},
    data: {totalAmount: aggregate._sum.amount ?? 0},
  });
}

function dateRangeForYear(year) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

router.get('/', requirePermission('budgets.read'), async (req, res, next) => {
  try {
    const selectedYear = Number(req.query.year || new Date().getFullYear());

    const [costCenters, budgets, treasuryExpenses, payableExpenses] =
      await Promise.all([
        prisma.costCenter.findMany({
          where: {companyId: req.auth.companyId},
          orderBy: [{active: 'desc'}, {name: 'asc'}],
        }),
        prisma.budget.findMany({
          where: {
            companyId: req.auth.companyId,
            year: selectedYear,
          },
          include: {
            lines: {
              include: {costCenter: true},
              orderBy: [{month: 'asc'}, {category: 'asc'}],
            },
            createdBy: {
              select: {firstName: true, lastName: true},
            },
          },
          orderBy: {createdAt: 'desc'},
        }),
        prisma.treasuryMovement.findMany({
          where: {
            companyId: req.auth.companyId,
            movementDate: dateRangeForYear(selectedYear),
            type: {in: ['EXPENSE', 'ADJUSTMENT_OUT']},
          },
          select: {
            movementDate: true,
            amount: true,
            category: true,
          },
        }),
        prisma.accountsPayable.findMany({
          where: {
            companyId: req.auth.companyId,
            issueDate: dateRangeForYear(selectedYear),
            status: {not: 'CANCELLED'},
          },
          select: {
            issueDate: true,
            total: true,
            supplier: {
              select: {commercialName: true, legalName: true},
            },
          },
        }),
      ]);

    const actualByMonth = Array.from({length: 12}, (_, index) => ({
      month: index + 1,
      treasury: 0,
      payables: 0,
      total: 0,
    }));

    treasuryExpenses.forEach((row) => {
      const month = new Date(row.movementDate).getUTCMonth();
      actualByMonth[month].treasury += Number(row.amount);
      actualByMonth[month].total += Number(row.amount);
    });

    payableExpenses.forEach((row) => {
      const month = new Date(row.issueDate).getUTCMonth();
      actualByMonth[month].payables += Number(row.total);
      actualByMonth[month].total += Number(row.total);
    });

    const plannedTotal = budgets.reduce(
      (sum, budget) => sum + Number(budget.totalAmount),
      0,
    );
    const actualTotal = actualByMonth.reduce((sum, row) => sum + row.total, 0);

    const plannedByMonth = Array.from({length: 12}, (_, index) => ({
      month: index + 1,
      amount: 0,
    }));

    budgets.forEach((budget) => {
      budget.lines.forEach((line) => {
        plannedByMonth[line.month - 1].amount += Number(line.amount);
      });
    });

    const monthly = plannedByMonth.map((planned, index) => ({
      month: planned.month,
      planned: planned.amount,
      actual: actualByMonth[index].total,
      variance: planned.amount - actualByMonth[index].total,
      utilization:
        planned.amount > 0
          ? Math.round((actualByMonth[index].total / planned.amount) * 100)
          : 0,
    }));

    res.json({
      ok: true,
      year: selectedYear,
      costCenters,
      budgets,
      monthly,
      summary: {
        plannedTotal,
        actualTotal,
        variance: plannedTotal - actualTotal,
        utilization:
          plannedTotal > 0
            ? Math.round((actualTotal / plannedTotal) * 100)
            : 0,
        activeCostCenters: costCenters.filter((item) => item.active).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/cost-centers',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const parsed = costCenterSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const duplicate = await prisma.costCenter.findFirst({
        where: {
          companyId: req.auth.companyId,
          code: parsed.data.code,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un centro de costo con ese código',
        });
      }

      const costCenter = await prisma.costCenter.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
        },
      });

      await audit(
        req,
        'CREATE',
        'CostCenter',
        costCenter.id,
        `Centro de costo ${costCenter.code} creado`,
      );

      res.status(201).json({ok: true, costCenter});
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/cost-centers/:id',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const parsed = costCenterSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const costCenter = await prisma.costCenter.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!costCenter) {
        return res.status(404).json({
          ok: false,
          message: 'Centro de costo no encontrado',
        });
      }

      const duplicate = await prisma.costCenter.findFirst({
        where: {
          companyId: req.auth.companyId,
          code: parsed.data.code,
          id: {not: costCenter.id},
        },
      });

      if (duplicate) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe otro centro de costo con ese código',
        });
      }

      const updated = await prisma.costCenter.update({
        where: {id: costCenter.id},
        data: parsed.data,
      });

      await audit(
        req,
        'UPDATE',
        'CostCenter',
        updated.id,
        `Centro de costo ${updated.code} actualizado`,
      );

      res.json({ok: true, costCenter: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/budgets',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const parsed = budgetSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const budget = await prisma.budget.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          createdById: req.auth.sub,
        },
      });

      await audit(
        req,
        'CREATE',
        'Budget',
        budget.id,
        `Presupuesto ${budget.name} creado`,
      );

      res.status(201).json({ok: true, budget});
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un presupuesto con ese nombre para el año',
        });
      }
      next(error);
    }
  },
);

router.put(
  '/budgets/:id',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const parsed = budgetSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const budget = await prisma.budget.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!budget) {
        return res.status(404).json({
          ok: false,
          message: 'Presupuesto no encontrado',
        });
      }

      const updated = await prisma.budget.update({
        where: {id: budget.id},
        data: parsed.data,
      });

      res.json({ok: true, budget: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/budgets/:id/status',
  requirePermission('budgets.approve'),
  async (req, res, next) => {
    try {
      const parsed = z
        .object({
          status: z.enum(['ACTIVE', 'CLOSED', 'CANCELLED']),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: 'Estado inválido',
        });
      }

      const budget = await prisma.budget.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!budget) {
        return res.status(404).json({
          ok: false,
          message: 'Presupuesto no encontrado',
        });
      }

      const updated = await prisma.budget.update({
        where: {id: budget.id},
        data: {status: parsed.data.status},
      });

      await audit(
        req,
        'STATUS',
        'Budget',
        budget.id,
        `Presupuesto ${budget.name}: ${updated.status}`,
      );

      res.json({ok: true, budget: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/budgets/:id/lines',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const parsed = lineSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const [budget, costCenter] = await Promise.all([
        prisma.budget.findFirst({
          where: {
            id: req.params.id,
            companyId: req.auth.companyId,
          },
        }),
        prisma.costCenter.findFirst({
          where: {
            id: parsed.data.costCenterId,
            companyId: req.auth.companyId,
            active: true,
          },
        }),
      ]);

      if (!budget || !costCenter) {
        return res.status(404).json({
          ok: false,
          message: 'Presupuesto o centro de costo no encontrado',
        });
      }

      const line = await prisma.budgetLine.upsert({
        where: {
          budgetId_costCenterId_category_month: {
            budgetId: budget.id,
            costCenterId: costCenter.id,
            category: parsed.data.category,
            month: parsed.data.month,
          },
        },
        update: {
          amount: parsed.data.amount,
          notes: parsed.data.notes,
        },
        create: {
          ...parsed.data,
          budgetId: budget.id,
          companyId: req.auth.companyId,
        },
      });

      await refreshBudgetTotal(budget.id);

      res.status(201).json({ok: true, line});
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/budgets/:budgetId/lines/:lineId',
  requirePermission('budgets.manage'),
  async (req, res, next) => {
    try {
      const line = await prisma.budgetLine.findFirst({
        where: {
          id: req.params.lineId,
          budgetId: req.params.budgetId,
          companyId: req.auth.companyId,
        },
      });

      if (!line) {
        return res.status(404).json({
          ok: false,
          message: 'Partida presupuestal no encontrada',
        });
      }

      await prisma.budgetLine.delete({where: {id: line.id}});
      await refreshBudgetTotal(req.params.budgetId);

      res.json({ok: true});
    } catch (error) {
      next(error);
    }
  },
);

export default router;
