import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {assertTransition,STATE_MACHINES} from '../services/stateTransitions.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const periodSchema = z.object({
  name: z.string().trim().min(3).max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  notes: z.string().trim().optional().nullable(),
});

const itemSchema = z.object({
  employeeId: z.string().cuid(),
  baseSalary: z.coerce.number().min(0),
  bonuses: z.coerce.number().min(0).default(0),
  overtime: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
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

async function nextFolio(companyId) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({companyId,scope:'payroll-period',prefix:'NOM',digits:4,period:year,model:'payrollPeriod',where:{companyId,folio:{startsWith:`NOM-${year}-`}}});
}

async function refreshTotals(periodId) {
  const totals = await prisma.payrollItem.aggregate({
    where: {payrollPeriodId: periodId},
    _sum: {grossPay: true, deductions: true, netPay: true},
  });

  return prisma.payrollPeriod.update({
    where: {id: periodId},
    data: {
      totalGross: totals._sum.grossPay ?? 0,
      totalDeductions: totals._sum.deductions ?? 0,
      totalNet: totals._sum.netPay ?? 0,
    },
  });
}

router.get('/', requirePermission('payroll.read'), async (req, res, next) => {
  try {
    const [periods, employees] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          items: {
            include: {
              employee: {
                include: {department: true, position: true},
              },
            },
            orderBy: {employee: {lastName: 'asc'}},
          },
          createdBy: {select: {firstName: true, lastName: true}},
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.employee.findMany({
        where: {companyId: req.auth.companyId, status: 'ACTIVE'},
        include: {department: true, position: true},
        orderBy: [{lastName: 'asc'}, {firstName: 'asc'}],
      }),
    ]);

    const stats = {
      periods: periods.length,
      draft: periods.filter((item) => item.status === 'DRAFT').length,
      approved: periods.filter((item) => item.status === 'APPROVED').length,
      pendingNet: periods
        .filter((item) => !['PAID', 'CANCELLED'].includes(item.status))
        .reduce((sum, item) => sum + Number(item.totalNet), 0),
    };

    res.json({ok: true, periods, employees, stats});
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('payroll.manage'), async (req, res, next) => {
  try {
    const parsed = periodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      return res.status(400).json({ok: false, message: 'La fecha final no puede ser anterior a la inicial'});
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        ...parsed.data,
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
        folio: await nextFolio(req.auth.companyId),
      },
    });

    await audit(req, 'CREATE', 'PayrollPeriod', period.id, `Periodo ${period.folio} creado`);
    res.status(201).json({ok: true, period});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/calculate', requirePermission('payroll.manage'), async (req, res, next) => {
  try {
    const period = await prisma.payrollPeriod.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!period) return res.status(404).json({ok: false, message: 'Periodo no encontrado'});
    if (['PAID', 'CANCELLED'].includes(period.status)) {
      return res.status(409).json({ok: false, message: 'El periodo ya no puede recalcularse'});
    }

    const employees = await prisma.employee.findMany({
      where: {companyId: req.auth.companyId, status: 'ACTIVE'},
    });

    const daysInPeriod = Math.max(
      1,
      Math.round((period.endDate.getTime() - period.startDate.getTime()) / 86400000) + 1,
    );

    await runSerializable(prisma, async (tx) => {
      for (const employee of employees) {
        const incidents = await tx.hrIncident.findMany({
          where: {
            companyId: req.auth.companyId,
            employeeId: employee.id,
            date: {gte: period.startDate, lte: period.endDate},
          },
        });

        const baseSalary = Number(employee.salary) / 30 * daysInPeriod;
        const bonuses = incidents
          .filter((item) => item.type === 'BONUS')
          .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        const overtime = incidents
          .filter((item) => item.type === 'OVERTIME')
          .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        const deductions = incidents
          .filter((item) => ['DEDUCTION', 'ABSENCE', 'LATE_ARRIVAL'].includes(item.type))
          .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        const grossPay = baseSalary + bonuses + overtime;
        const netPay = Math.max(0, grossPay - deductions);

        await tx.payrollItem.upsert({
          where: {payrollPeriodId_employeeId: {payrollPeriodId: period.id, employeeId: employee.id}},
          update: {baseSalary, bonuses, overtime, deductions, grossPay, netPay},
          create: {
            companyId: req.auth.companyId,
            payrollPeriodId: period.id,
            employeeId: employee.id,
            baseSalary,
            bonuses,
            overtime,
            deductions,
            grossPay,
            netPay,
          },
        });
      }
      await tx.payrollPeriod.update({where: {id: period.id}, data: {status: 'CALCULATED'}});
    });

    await refreshTotals(period.id);
    await audit(req, 'CALCULATE', 'PayrollPeriod', period.id, `Periodo ${period.folio} calculado`);
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

router.put('/:periodId/items/:itemId', requirePermission('payroll.manage'), async (req, res, next) => {
  try {
    const parsed = itemSchema.partial({employeeId: true}).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const item = await prisma.payrollItem.findFirst({
      where: {
        id: req.params.itemId,
        payrollPeriodId: req.params.periodId,
        companyId: req.auth.companyId,
      },
    });
    if (!item) return res.status(404).json({ok: false, message: 'Partida no encontrada'});

    const current = {
      baseSalary: Number(item.baseSalary),
      bonuses: Number(item.bonuses),
      overtime: Number(item.overtime),
      deductions: Number(item.deductions),
      ...parsed.data,
    };
    const grossPay = current.baseSalary + current.bonuses + current.overtime;
    const netPay = Math.max(0, grossPay - current.deductions);

    const updated = await prisma.payrollItem.update({
      where: {id: item.id},
      data: {...parsed.data, grossPay, netPay},
    });
    await refreshTotals(req.params.periodId);
    res.json({ok: true, item: updated});
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requirePermission('payroll.approve'), async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.enum(['APPROVED', 'PAID', 'CANCELLED']),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Estado inválido'});

    const period = await prisma.payrollPeriod.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!period) return res.status(404).json({ok: false, message: 'Periodo no encontrado'});

    assertTransition({
      entity:'Periodo de nómina',
      from:period.status,
      to:parsed.data.status,
      map:STATE_MACHINES.PAYROLL
    });

    const updated = await prisma.payrollPeriod.update({
      where: {id: period.id},
      data: {status: parsed.data.status},
    });
    await audit(req, 'STATUS', 'PayrollPeriod', period.id, `Periodo ${period.folio}: ${updated.status}`);
    res.json({ok: true, period: updated});
  } catch (error) {
    next(error);
  }
});

export default router;
