import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const statementSchema = z.object({
  treasuryAccountId: z.string().cuid(),
  statementDate: z.coerce.date(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  openingBalance: z.coerce.number(),
  closingBalance: z.coerce.number(),
  notes: z.string().trim().optional().nullable(),
});

const lineSchema = z.object({
  transactionDate: z.coerce.date(),
  description: z.string().trim().min(2).max(220),
  reference: z.string().trim().optional().nullable(),
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.coerce.number().positive(),
  bankBalance: z.coerce.number().optional().nullable(),
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
  return nextSequenceFolio({companyId,scope:'bank-statement',prefix:'CON',digits:4,period:year,model:'bankStatement',where:{companyId,folio:{startsWith:`CON-${year}-`}}});
}

function signedBankAmount(line) {
  return line.type === 'CREDIT'
    ? Number(line.amount)
    : -Number(line.amount);
}

function signedTreasuryAmount(movement) {
  return ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(movement.type)
    ? Number(movement.amount)
    : -Number(movement.amount);
}

router.get(
  '/',
  requirePermission('reconciliation.read'),
  async (req, res, next) => {
    try {
      const [accounts, statements] = await Promise.all([
        prisma.treasuryAccount.findMany({
          where: {
            companyId: req.auth.companyId,
            type: 'BANK',
            active: true,
          },
          orderBy: {name: 'asc'},
        }),
        prisma.bankStatement.findMany({
          where: {companyId: req.auth.companyId},
          include: {
            treasuryAccount: true,
            createdBy: {
              select: {firstName: true, lastName: true},
            },
            lines: {
              include: {
                treasuryMovement: true,
                reconciledBy: {
                  select: {firstName: true, lastName: true},
                },
              },
              orderBy: [{transactionDate: 'asc'}, {createdAt: 'asc'}],
            },
          },
          orderBy: {statementDate: 'desc'},
        }),
      ]);

      const allLines = statements.flatMap((item) => item.lines);

      const stats = {
        statements: statements.length,
        pendingLines: allLines.filter((item) => item.status === 'PENDING').length,
        matchedLines: allLines.filter((item) => item.status === 'MATCHED').length,
        pendingAmount: allLines
          .filter((item) => item.status === 'PENDING')
          .reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0),
        reconciledStatements: statements.filter(
          (item) => item.status === 'RECONCILED' || item.status === 'CLOSED',
        ).length,
      };

      res.json({ok: true, accounts, statements, stats});
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/statements/:id/candidates',
  requirePermission('reconciliation.read'),
  async (req, res, next) => {
    try {
      const statement = await prisma.bankStatement.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!statement) {
        return res.status(404).json({
          ok: false,
          message: 'Estado de cuenta no encontrado',
        });
      }

      const movements = await prisma.treasuryMovement.findMany({
        where: {
          companyId: req.auth.companyId,
          accountId: statement.treasuryAccountId,
          movementDate: {
            gte: new Date(
              statement.periodStart.getTime() - 7 * 24 * 60 * 60 * 1000,
            ),
            lte: new Date(
              statement.periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
            ),
          },
          bankStatementLines: {
            none: {
              status: 'MATCHED',
            },
          },
        },
        orderBy: {movementDate: 'asc'},
      });

      res.json({ok: true, movements});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/statements',
  requirePermission('reconciliation.manage'),
  async (req, res, next) => {
    try {
      const parsed = statementSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      if (parsed.data.periodEnd < parsed.data.periodStart) {
        return res.status(400).json({
          ok: false,
          message: 'La fecha final no puede ser anterior a la inicial',
        });
      }

      const account = await prisma.treasuryAccount.findFirst({
        where: {
          id: parsed.data.treasuryAccountId,
          companyId: req.auth.companyId,
          type: 'BANK',
          active: true,
        },
      });

      if (!account) {
        return res.status(404).json({
          ok: false,
          message: 'Cuenta bancaria no encontrada',
        });
      }

      const statement = await prisma.bankStatement.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          createdById: req.auth.sub,
          folio: await nextFolio(req.auth.companyId),
          status: 'IN_PROGRESS',
        },
      });

      await audit(
        req,
        'CREATE',
        'BankStatement',
        statement.id,
        `Conciliación ${statement.folio} creada`,
      );

      res.status(201).json({ok: true, statement});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/statements/:id/lines',
  requirePermission('reconciliation.manage'),
  async (req, res, next) => {
    try {
      const parsed = lineSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const statement = await prisma.bankStatement.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: {in: ['DRAFT', 'IN_PROGRESS']},
        },
      });

      if (!statement) {
        return res.status(404).json({
          ok: false,
          message: 'Conciliación no disponible',
        });
      }

      const line = await prisma.bankStatementLine.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          bankStatementId: statement.id,
        },
      });

      res.status(201).json({ok: true, line});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/lines/:id/match',
  requirePermission('reconciliation.manage'),
  async (req, res, next) => {
    try {
      const parsed = z
        .object({
          treasuryMovementId: z.string().cuid(),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: 'Movimiento inválido',
        });
      }

      const line = await prisma.bankStatementLine.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: 'PENDING',
        },
        include: {bankStatement: true},
      });

      if (!line) {
        return res.status(404).json({
          ok: false,
          message: 'Movimiento bancario no disponible',
        });
      }

      const movement = await prisma.treasuryMovement.findFirst({
        where: {
          id: parsed.data.treasuryMovementId,
          companyId: req.auth.companyId,
          accountId: line.bankStatement.treasuryAccountId,
          bankStatementLines: {
            none: {
              status: 'MATCHED',
            },
          },
        },
      });

      if (!movement) {
        return res.status(404).json({
          ok: false,
          message: 'Movimiento de Tesorería no disponible',
        });
      }

      const bankAmount = signedBankAmount(line);
      const treasuryAmount = signedTreasuryAmount(movement);

      if (Math.abs(bankAmount - treasuryAmount) > 0.01) {
        return res.status(409).json({
          ok: false,
          message: 'Los importes no coinciden',
        });
      }

      const updated = await prisma.bankStatementLine.update({
        where: {id: line.id},
        data: {
          treasuryMovementId: movement.id,
          reconciledById: req.auth.sub,
          reconciledAt: new Date(),
          status: 'MATCHED',
        },
      });

      await audit(
        req,
        'MATCH',
        'BankStatementLine',
        updated.id,
        `Movimiento bancario conciliado con ${movement.folio}`,
      );

      res.json({ok: true, line: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/lines/:id/ignore',
  requirePermission('reconciliation.manage'),
  async (req, res, next) => {
    try {
      const parsed = z
        .object({
          notes: z.string().trim().min(3).max(300),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: 'Indica el motivo para ignorar el movimiento',
        });
      }

      const line = await prisma.bankStatementLine.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: 'PENDING',
        },
      });

      if (!line) {
        return res.status(404).json({
          ok: false,
          message: 'Movimiento bancario no disponible',
        });
      }

      const updated = await prisma.bankStatementLine.update({
        where: {id: line.id},
        data: {
          status: 'IGNORED',
          reconciledById: req.auth.sub,
          reconciledAt: new Date(),
          notes: parsed.data.notes,
        },
      });

      res.json({ok: true, line: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/statements/:id/close',
  requirePermission('reconciliation.approve'),
  async (req, res, next) => {
    try {
      const statement = await prisma.bankStatement.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: {in: ['DRAFT', 'IN_PROGRESS', 'RECONCILED']},
        },
        include: {lines: true},
      });

      if (!statement) {
        return res.status(404).json({
          ok: false,
          message: 'Conciliación no encontrada',
        });
      }

      const pending = statement.lines.filter(
        (item) => item.status === 'PENDING',
      );

      if (pending.length) {
        return res.status(409).json({
          ok: false,
          message: `Todavía existen ${pending.length} movimientos pendientes`,
        });
      }

      const credits = statement.lines
        .filter((item) => item.type === 'CREDIT')
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const debits = statement.lines
        .filter((item) => item.type === 'DEBIT')
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const calculatedClosing =
        Number(statement.openingBalance) + credits - debits;
      const difference =
        Number(statement.closingBalance) - calculatedClosing;

      if (Math.abs(difference) > 0.01) {
        return res.status(409).json({
          ok: false,
          message: `El estado de cuenta tiene una diferencia de ${difference.toFixed(2)}`,
        });
      }

      const updated = await prisma.bankStatement.update({
        where: {id: statement.id},
        data: {status: 'CLOSED'},
      });

      await audit(
        req,
        'CLOSE',
        'BankStatement',
        updated.id,
        `Conciliación ${updated.folio} cerrada`,
      );

      res.json({ok: true, statement: updated});
    } catch (error) {
      next(error);
    }
  },
);

export default router;
