import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const scenarioSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
});

const adjustmentSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(['INFLOW', 'OUTFLOW']),
  category: z.string().trim().min(2).max(100),
  concept: z.string().trim().min(2).max(180),
  amount: z.coerce.number().positive(),
  probability: z.coerce.number().int().min(0).max(100).default(100),
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

function startOfDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function classifyTreasuryMovement(movement) {
  return ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(movement.type)
    ? 'INFLOW'
    : 'OUTFLOW';
}

function movementSignedAmount(movement) {
  return classifyTreasuryMovement(movement) === 'INFLOW'
    ? Number(movement.amount)
    : -Number(movement.amount);
}

function receivableBalance(item) {
  return Math.max(0, Number(item.total) - Number(item.paidAmount));
}

function payableBalance(item) {
  return Math.max(0, Number(item.total) - Number(item.paidAmount));
}

function buildTimeline({
  startDate,
  endDate,
  openingBalance,
  movements,
  receivables,
  payables,
  adjustments,
}) {
  const days = [];
  const byDate = new Map();

  for (
    let cursor = startOfDay(startDate);
    cursor <= startOfDay(endDate);
    cursor = addDays(cursor, 1)
  ) {
    const key = dateKey(cursor);
    const row = {
      date: key,
      actualInflow: 0,
      actualOutflow: 0,
      projectedInflow: 0,
      projectedOutflow: 0,
      manualInflow: 0,
      manualOutflow: 0,
      net: 0,
      closingBalance: 0,
    };

    days.push(row);
    byDate.set(key, row);
  }

  movements.forEach((movement) => {
    const row = byDate.get(dateKey(movement.movementDate));
    if (!row) return;

    if (classifyTreasuryMovement(movement) === 'INFLOW') {
      row.actualInflow += Number(movement.amount);
    } else {
      row.actualOutflow += Number(movement.amount);
    }
  });

  receivables.forEach((item) => {
    const row = byDate.get(dateKey(item.dueDate));
    if (!row) return;
    row.projectedInflow += receivableBalance(item);
  });

  payables.forEach((item) => {
    const row = byDate.get(dateKey(item.dueDate));
    if (!row) return;
    row.projectedOutflow += payableBalance(item);
  });

  adjustments.forEach((item) => {
    const row = byDate.get(dateKey(item.date));
    if (!row) return;

    const weightedAmount =
      Number(item.amount) * (Number(item.probability) / 100);

    if (item.type === 'INFLOW') {
      row.manualInflow += weightedAmount;
    } else {
      row.manualOutflow += weightedAmount;
    }
  });

  let runningBalance = Number(openingBalance);

  days.forEach((row) => {
    row.net =
      row.actualInflow -
      row.actualOutflow +
      row.projectedInflow -
      row.projectedOutflow +
      row.manualInflow -
      row.manualOutflow;

    runningBalance += row.net;
    row.closingBalance = runningBalance;
  });

  return days;
}

router.get(
  '/',
  requirePermission('cashflow.read'),
  async (req, res, next) => {
    try {
      const today = startOfDay(new Date());
      const startDate = req.query.startDate
        ? startOfDay(req.query.startDate)
        : today;
      const endDate = req.query.endDate
        ? startOfDay(req.query.endDate)
        : addDays(today, 89);
      const scenarioId = req.query.scenarioId || null;

      if (endDate < startDate) {
        return res.status(400).json({
          ok: false,
          message: 'La fecha final no puede ser anterior a la inicial',
        });
      }

      const scenarioWhere = {
        companyId: req.auth.companyId,
      };

      const [
        accounts,
        movements,
        receivables,
        payables,
        scenarios,
      ] = await Promise.all([
        prisma.treasuryAccount.findMany({
          where: {
            companyId: req.auth.companyId,
            active: true,
          },
          orderBy: [{type: 'asc'}, {name: 'asc'}],
        }),
        prisma.treasuryMovement.findMany({
          where: {
            companyId: req.auth.companyId,
            movementDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            account: {
              select: {
                name: true,
                type: true,
              },
            },
          },
          orderBy: {movementDate: 'asc'},
        }),
        prisma.accountsReceivable.findMany({
          where: {
            companyId: req.auth.companyId,
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'],
            },
          },
          include: {
            customer: true,
          },
          orderBy: {dueDate: 'asc'},
        }),
        prisma.accountsPayable.findMany({
          where: {
            companyId: req.auth.companyId,
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'],
            },
          },
          include: {
            supplier: true,
          },
          orderBy: {dueDate: 'asc'},
        }),
        prisma.cashFlowScenario.findMany({
          where: scenarioWhere,
          include: {
            adjustments: {
              orderBy: {date: 'asc'},
            },
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{status: 'asc'}, {updatedAt: 'desc'}],
        }),
      ]);

      const selectedScenario =
        scenarios.find((item) => item.id === scenarioId) ||
        scenarios.find((item) => item.status === 'ACTIVE') ||
        null;

      const openingBalance = accounts.reduce(
        (sum, account) => sum + Number(account.currentBalance),
        0,
      );

      const timeline = buildTimeline({
        startDate,
        endDate,
        openingBalance,
        movements,
        receivables,
        payables,
        adjustments: selectedScenario?.adjustments || [],
      });

      const totalActualInflow = movements
        .filter((item) => classifyTreasuryMovement(item) === 'INFLOW')
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const totalActualOutflow = movements
        .filter((item) => classifyTreasuryMovement(item) === 'OUTFLOW')
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const totalReceivables = receivables.reduce(
        (sum, item) => sum + receivableBalance(item),
        0,
      );
      const totalPayables = payables.reduce(
        (sum, item) => sum + payableBalance(item),
        0,
      );
      const projectedClosingBalance =
        timeline.at(-1)?.closingBalance ?? openingBalance;
      const minimumBalance = timeline.length
        ? Math.min(...timeline.map((item) => item.closingBalance))
        : openingBalance;

      const monthlyMap = new Map();

      timeline.forEach((item) => {
        const month = item.date.slice(0, 7);
        const current = monthlyMap.get(month) || {
          month,
          inflow: 0,
          outflow: 0,
          net: 0,
          closingBalance: 0,
        };

        current.inflow +=
          item.actualInflow +
          item.projectedInflow +
          item.manualInflow;
        current.outflow +=
          item.actualOutflow +
          item.projectedOutflow +
          item.manualOutflow;
        current.net += item.net;
        current.closingBalance = item.closingBalance;

        monthlyMap.set(month, current);
      });

      const risks = [];

      if (minimumBalance < 0) {
        const firstNegative = timeline.find(
          (item) => item.closingBalance < 0,
        );

        risks.push({
          level: 'HIGH',
          title: 'Déficit de liquidez proyectado',
          description: `El flujo cae por debajo de cero el ${firstNegative?.date}.`,
          amount: Math.abs(minimumBalance),
        });
      }

      const overdueReceivables = receivables.filter(
        (item) => item.status === 'OVERDUE' || new Date(item.dueDate) < today,
      );
      const overdueTotal = overdueReceivables.reduce(
        (sum, item) => sum + receivableBalance(item),
        0,
      );

      if (overdueTotal > 0) {
        risks.push({
          level: 'MEDIUM',
          title: 'Cobranza vencida',
          description: `${overdueReceivables.length} documentos vencidos afectan la proyección.`,
          amount: overdueTotal,
        });
      }

      const dueSoonPayables = payables.filter(
        (item) => new Date(item.dueDate) <= addDays(today, 7),
      );
      const dueSoonTotal = dueSoonPayables.reduce(
        (sum, item) => sum + payableBalance(item),
        0,
      );

      if (dueSoonTotal > openingBalance) {
        risks.push({
          level: 'MEDIUM',
          title: 'Pagos próximos superiores a la liquidez actual',
          description: `${dueSoonPayables.length} obligaciones vencen dentro de siete días.`,
          amount: dueSoonTotal,
        });
      }

      res.json({
        ok: true,
        filters: {
          startDate: dateKey(startDate),
          endDate: dateKey(endDate),
          scenarioId: selectedScenario?.id || null,
        },
        accounts,
        scenarios,
        selectedScenario,
        timeline,
        monthly: [...monthlyMap.values()],
        receivables,
        payables,
        recentMovements: movements.slice(-20).reverse(),
        risks,
        summary: {
          openingBalance,
          totalActualInflow,
          totalActualOutflow,
          totalReceivables,
          totalPayables,
          projectedClosingBalance,
          minimumBalance,
          netProjection:
            projectedClosingBalance - openingBalance,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/scenarios',
  requirePermission('cashflow.manage'),
  async (req, res, next) => {
    try {
      const parsed = scenarioSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      if (parsed.data.endDate < parsed.data.startDate) {
        return res.status(400).json({
          ok: false,
          message: 'La fecha final no puede ser anterior a la inicial',
        });
      }

      const scenario = await prisma.cashFlowScenario.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          createdById: req.auth.sub,
        },
      });

      await audit(
        req,
        'CREATE',
        'CashFlowScenario',
        scenario.id,
        `Escenario ${scenario.name} creado`,
      );

      res.status(201).json({ok: true, scenario});
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un escenario con ese nombre',
        });
      }

      next(error);
    }
  },
);

router.patch(
  '/scenarios/:id/status',
  requirePermission('cashflow.approve'),
  async (req, res, next) => {
    try {
      const parsed = z.object({
        status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: 'Estado inválido',
        });
      }

      const scenario = await prisma.cashFlowScenario.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!scenario) {
        return res.status(404).json({
          ok: false,
          message: 'Escenario no encontrado',
        });
      }

      const updated = await runSerializable(prisma, async (tx) => {
        if (parsed.data.status === 'ACTIVE') {
          await tx.cashFlowScenario.updateMany({
            where: {
              companyId: req.auth.companyId,
              status: 'ACTIVE',
              id: {not: scenario.id},
            },
            data: {status: 'DRAFT'},
          });
        }

        return tx.cashFlowScenario.update({
          where: {id: scenario.id},
          data: {status: parsed.data.status},
        });
      });

      await audit(
        req,
        'STATUS',
        'CashFlowScenario',
        updated.id,
        `Escenario ${updated.name}: ${updated.status}`,
      );

      res.json({ok: true, scenario: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/scenarios/:id/adjustments',
  requirePermission('cashflow.manage'),
  async (req, res, next) => {
    try {
      const parsed = adjustmentSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const scenario = await prisma.cashFlowScenario.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: {in: ['DRAFT', 'ACTIVE']},
        },
      });

      if (!scenario) {
        return res.status(404).json({
          ok: false,
          message: 'Escenario no disponible',
        });
      }

      if (
        parsed.data.date < scenario.startDate ||
        parsed.data.date > scenario.endDate
      ) {
        return res.status(409).json({
          ok: false,
          message: 'La fecha debe estar dentro del periodo del escenario',
        });
      }

      const adjustment = await prisma.cashFlowAdjustment.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          scenarioId: scenario.id,
        },
      });

      await audit(
        req,
        'CREATE',
        'CashFlowAdjustment',
        adjustment.id,
        `Ajuste de flujo ${adjustment.concept} agregado`,
      );

      res.status(201).json({ok: true, adjustment});
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/scenarios/:scenarioId/adjustments/:adjustmentId',
  requirePermission('cashflow.manage'),
  async (req, res, next) => {
    try {
      const adjustment = await prisma.cashFlowAdjustment.findFirst({
        where: {
          id: req.params.adjustmentId,
          scenarioId: req.params.scenarioId,
          companyId: req.auth.companyId,
        },
      });

      if (!adjustment) {
        return res.status(404).json({
          ok: false,
          message: 'Ajuste no encontrado',
        });
      }

      await prisma.cashFlowAdjustment.delete({
        where: {id: adjustment.id},
      });

      res.json({ok: true});
    } catch (error) {
      next(error);
    }
  },
);

export default router;
