import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const accountSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(3).max(120),
  type: z.enum(['CASH', 'BANK']),
  bankName: z.string().trim().optional().nullable(),
  accountNumber: z.string().trim().optional().nullable(),
  currency: z.string().trim().min(3).max(3).default('MXN'),
  openingBalance: z.coerce.number().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

const movementSchema = z.object({
  accountId: z.string().cuid(),
  type: z.enum(['INCOME', 'EXPENSE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  movementDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  concept: z.string().trim().min(3).max(180),
  category: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  referenceType: z.string().trim().optional().nullable(),
  referenceId: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

const transferSchema = z.object({
  fromAccountId: z.string().cuid(),
  toAccountId: z.string().cuid(),
  movementDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  concept: z.string().trim().min(3).max(180),
  reference: z.string().trim().optional().nullable(),
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

async function nextFolio(companyId, prefix='MOV', db=prisma) {
  const year=String(new Date().getFullYear());
  return nextSequenceFolio({
    companyId,scope:`treasury-${prefix.toLowerCase()}`,prefix,digits:5,period:year,
    model:'treasuryMovement',
    where:{companyId,folio:{startsWith:`${prefix}-${year}-`}},
    db,
  });
}

function signedAmount(type, amount) {
  return ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(type)
    ? Number(amount)
    : -Number(amount);
}

router.get('/', requirePermission('treasury.read'), async (req, res, next) => {
  try {
    const [accounts, movements] = await Promise.all([
      prisma.treasuryAccount.findMany({
        where: {companyId: req.auth.companyId},
        orderBy: [{active: 'desc'}, {name: 'asc'}],
      }),
      prisma.treasuryMovement.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          account: true,
          createdBy: {
            select: {firstName: true, lastName: true},
          },
        },
        orderBy: [{movementDate: 'desc'}, {createdAt: 'desc'}],
        take: 250,
      }),
    ]);

    const stats = {
      accounts: accounts.length,
      activeAccounts: accounts.filter((item) => item.active).length,
      cashBalance: accounts
        .filter((item) => item.type === 'CASH')
        .reduce((sum, item) => sum + Number(item.currentBalance), 0),
      bankBalance: accounts
        .filter((item) => item.type === 'BANK')
        .reduce((sum, item) => sum + Number(item.currentBalance), 0),
      totalBalance: accounts.reduce(
        (sum, item) => sum + Number(item.currentBalance),
        0,
      ),
    };

    res.json({ok: true, accounts, movements, stats});
  } catch (error) {
    next(error);
  }
});

router.post(
  '/accounts',
  requirePermission('treasury.manage'),
  async (req, res, next) => {
    try {
      const parsed = accountSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const exists = await prisma.treasuryAccount.findFirst({
        where: {
          companyId: req.auth.companyId,
          code: parsed.data.code,
        },
      });

      if (exists) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe una cuenta con ese código',
        });
      }

      const account = await prisma.treasuryAccount.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
          currentBalance: parsed.data.openingBalance,
        },
      });

      if (parsed.data.openingBalance > 0) {
        await prisma.treasuryMovement.create({
          data: {
            companyId: req.auth.companyId,
            accountId: account.id,
            createdById: req.auth.sub,
            folio: await nextFolio(req.auth.companyId, 'SAL'),
            type: 'ADJUSTMENT_IN',
            movementDate: new Date(),
            amount: parsed.data.openingBalance,
            balanceAfter: parsed.data.openingBalance,
            concept: 'Saldo inicial',
            category: 'Apertura',
          },
        });
      }

      await audit(
        req,
        'CREATE',
        'TreasuryAccount',
        account.id,
        `Cuenta ${account.code} creada`,
      );

      res.status(201).json({ok: true, account});
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/accounts/:id',
  requirePermission('treasury.manage'),
  async (req, res, next) => {
    try {
      const parsed = accountSchema
        .omit({openingBalance: true})
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const account = await prisma.treasuryAccount.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!account) {
        return res.status(404).json({
          ok: false,
          message: 'Cuenta no encontrada',
        });
      }

      const duplicate = await prisma.treasuryAccount.findFirst({
        where: {
          companyId: req.auth.companyId,
          code: parsed.data.code,
          id: {not: account.id},
        },
      });

      if (duplicate) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe otra cuenta con ese código',
        });
      }

      const updated = await prisma.treasuryAccount.update({
        where: {id: account.id},
        data: parsed.data,
      });

      await audit(
        req,
        'UPDATE',
        'TreasuryAccount',
        account.id,
        `Cuenta ${updated.code} actualizada`,
      );

      res.json({ok: true, account: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/accounts/:id/status',
  requirePermission('treasury.manage'),
  async (req, res, next) => {
    try {
      const parsed = z.object({active: z.boolean()}).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ok: false, message: 'Estado inválido'});
      }

      const account = await prisma.treasuryAccount.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!account) {
        return res.status(404).json({
          ok: false,
          message: 'Cuenta no encontrada',
        });
      }

      const updated = await prisma.treasuryAccount.update({
        where: {id: account.id},
        data: {active: parsed.data.active},
      });

      res.json({ok: true, account: updated});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/movements',
  requirePermission('treasury.move'),
  async (req, res, next) => {
    try {
      const parsed = movementSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const result = await runSerializable(prisma, async (tx) => {
        const account = await tx.treasuryAccount.findFirst({
          where: {
            id: parsed.data.accountId,
            companyId: req.auth.companyId,
            active: true,
          },
        });

        if (!account) {
          throw new Error('La cuenta seleccionada no existe o está inactiva');
        }

        const delta = signedAmount(parsed.data.type, parsed.data.amount);
        const nextBalance = Number(account.currentBalance) + delta;

        if (nextBalance < 0) {
          throw new Error('El movimiento dejaría la cuenta con saldo negativo');
        }

        const movement = await tx.treasuryMovement.create({
          data: {
            ...parsed.data,
            companyId: req.auth.companyId,
            createdById: req.auth.sub,
            folio: await nextFolio(req.auth.companyId, 'MOV', tx),
            balanceAfter: nextBalance,
          },
        });

        await tx.treasuryAccount.update({
          where: {id: account.id},
          data: {currentBalance: nextBalance},
        });

        return movement;
      });

      await audit(
        req,
        'CREATE',
        'TreasuryMovement',
        result.id,
        `${result.type}: ${result.concept}`,
      );

      res.status(201).json({ok: true, movement: result});
    } catch (error) {
      if (
        error.message === 'La cuenta seleccionada no existe o está inactiva' ||
        error.message === 'El movimiento dejaría la cuenta con saldo negativo'
      ) {
        return res.status(409).json({ok: false, message: error.message});
      }

      next(error);
    }
  },
);

router.post(
  '/transfers',
  requirePermission('treasury.move'),
  async (req, res, next) => {
    try {
      const parsed = transferSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      if (parsed.data.fromAccountId === parsed.data.toAccountId) {
        return res.status(400).json({
          ok: false,
          message: 'La cuenta origen y destino deben ser diferentes',
        });
      }

      const transferGroup = crypto.randomUUID();

      const result = await runSerializable(prisma, async (tx) => {
        const [fromAccount, toAccount] = await Promise.all([
          tx.treasuryAccount.findFirst({
            where: {
              id: parsed.data.fromAccountId,
              companyId: req.auth.companyId,
              active: true,
            },
          }),
          tx.treasuryAccount.findFirst({
            where: {
              id: parsed.data.toAccountId,
              companyId: req.auth.companyId,
              active: true,
            },
          }),
        ]);

        if (!fromAccount || !toAccount) {
          throw new Error('Una de las cuentas no existe o está inactiva');
        }

        const fromBalance =
          Number(fromAccount.currentBalance) - parsed.data.amount;

        if (fromBalance < 0) {
          throw new Error('La cuenta origen no tiene saldo suficiente');
        }

        const toBalance =
          Number(toAccount.currentBalance) + parsed.data.amount;

        const outMovement = await tx.treasuryMovement.create({
          data: {
            companyId: req.auth.companyId,
            accountId: fromAccount.id,
            createdById: req.auth.sub,
            folio: await nextFolio(req.auth.companyId, 'TRS', tx),
            type: 'TRANSFER_OUT',
            movementDate: parsed.data.movementDate,
            amount: parsed.data.amount,
            balanceAfter: fromBalance,
            concept: parsed.data.concept,
            reference: parsed.data.reference,
            transferGroup,
            notes: parsed.data.notes,
          },
        });

        const inMovement = await tx.treasuryMovement.create({
          data: {
            companyId: req.auth.companyId,
            accountId: toAccount.id,
            createdById: req.auth.sub,
            folio: await nextFolio(req.auth.companyId, 'TRS', tx),
            type: 'TRANSFER_IN',
            movementDate: parsed.data.movementDate,
            amount: parsed.data.amount,
            balanceAfter: toBalance,
            concept: parsed.data.concept,
            reference: parsed.data.reference,
            transferGroup,
            notes: parsed.data.notes,
          },
        });

        await Promise.all([
          tx.treasuryAccount.update({
            where: {id: fromAccount.id},
            data: {currentBalance: fromBalance},
          }),
          tx.treasuryAccount.update({
            where: {id: toAccount.id},
            data: {currentBalance: toBalance},
          }),
        ]);

        return {outMovement, inMovement};
      });

      await audit(
        req,
        'TRANSFER',
        'TreasuryMovement',
        result.outMovement.id,
        `Transferencia: ${parsed.data.concept}`,
      );

      res.status(201).json({ok: true, ...result});
    } catch (error) {
      if (
        error.message === 'Una de las cuentas no existe o está inactiva' ||
        error.message === 'La cuenta origen no tiene saldo suficiente'
      ) {
        return res.status(409).json({ok: false, message: error.message});
      }

      next(error);
    }
  },
);

export default router;
