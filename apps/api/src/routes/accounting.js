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

const accountSchema = z.object({
  parentId: z.string().cuid().optional().nullable(),
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(2).max(160),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  nature: z.enum(['DEBIT', 'CREDIT']),
  level: z.coerce.number().int().min(1).max(10).default(1),
  allowsPosting: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
});

const periodSchema = z.object({
  name: z.string().trim().min(3).max(80),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const lineSchema = z.object({
  accountId: z.string().cuid(),
  concept: z.string().trim().optional().nullable(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  reference: z.string().trim().optional().nullable(),
}).refine((line) => (line.debit > 0) !== (line.credit > 0), {
  message: 'Cada partida debe tener cargo o abono, pero no ambos',
});

const entrySchema = z.object({
  periodId: z.string().cuid(),
  entryDate: z.coerce.date(),
  concept: z.string().trim().min(3).max(220),
  notes: z.string().trim().optional().nullable(),
  lines: z.array(lineSchema).min(2),
});

const automaticSchema = z.object({
  sourceType: z.enum([
    'SALES_INVOICE',
    'ACCOUNTS_PAYABLE',
    'TREASURY_MOVEMENT',
    'SALES_CREDIT_NOTE',
  ]),
  sourceId: z.string().cuid(),
  periodId: z.string().cuid(),
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
  return nextSequenceFolio({companyId,scope:'journal-entry',prefix:'POL',digits:5,period:year,model:'journalEntry',where:{companyId,folio:{startsWith:`POL-${year}-`}}});
}

async function getDefaultAccounts(companyId) {
  const accounts = await prisma.accountingAccount.findMany({
    where: {companyId, active: true, allowsPosting: true},
  });
  return new Map(accounts.map((item) => [item.code, item]));
}

function totals(lines) {
  return lines.reduce(
    (result, line) => ({
      debit: result.debit + Number(line.debit),
      credit: result.credit + Number(line.credit),
    }),
    {debit: 0, credit: 0},
  );
}

async function validatePeriod(companyId, periodId, entryDate) {
  const period = await prisma.accountingPeriod.findFirst({
    where: {
      id: periodId,
      companyId,
      status: 'OPEN',
      startDate: {lte: entryDate},
      endDate: {gte: entryDate},
    },
  });
  return period;
}

router.get('/', requirePermission('accounting.read'), async (req, res, next) => {
  try {
    const [accounts, periods, entries, salesInvoices, payables, movements, creditNotes] =
      await Promise.all([
        prisma.accountingAccount.findMany({
          where: {companyId: req.auth.companyId},
          include: {parent: {select: {code: true, name: true}}},
          orderBy: {code: 'asc'},
        }),
        prisma.accountingPeriod.findMany({
          where: {companyId: req.auth.companyId},
          orderBy: {startDate: 'desc'},
        }),
        prisma.journalEntry.findMany({
          where: {companyId: req.auth.companyId},
          include: {
            period: true,
            createdBy: {select: {firstName: true, lastName: true}},
            postedBy: {select: {firstName: true, lastName: true}},
            lines: {include: {account: true}},
          },
          orderBy: [{entryDate: 'desc'}, {createdAt: 'desc'}],
          take: 150,
        }),
        prisma.salesInvoice.findMany({
          where: {companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
          select: {id: true, invoiceNumber: true, issueDate: true, subtotal: true, taxTotal: true, total: true},
          orderBy: {issueDate: 'desc'},
          take: 50,
        }),
        prisma.accountsPayable.findMany({
          where: {companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
          select: {id: true, invoiceNumber: true, issueDate: true, subtotal: true, taxAmount: true, total: true},
          orderBy: {issueDate: 'desc'},
          take: 50,
        }),
        prisma.treasuryMovement.findMany({
          where: {companyId: req.auth.companyId},
          select: {id: true, folio: true, movementDate: true, type: true, amount: true, concept: true},
          orderBy: {movementDate: 'desc'},
          take: 50,
        }),
        prisma.salesCreditNote.findMany({
          where: {companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
          select: {id: true, folio: true, issueDate: true, subtotal: true, taxTotal: true, total: true},
          orderBy: {issueDate: 'desc'},
          take: 50,
        }),
      ]);

    const posted = entries.filter((item) => item.status === 'POSTED');
    const trialMap = new Map();

    posted.flatMap((entry) => entry.lines).forEach((line) => {
      const current = trialMap.get(line.accountId) || {
        accountId: line.accountId,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        debit: 0,
        credit: 0,
      };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      current.balance = current.debit - current.credit;
      trialMap.set(line.accountId, current);
    });

    const sourcesWithEntries = new Set(
      entries
        .filter((item) => item.sourceType && item.sourceId)
        .map((item) => `${item.sourceType}:${item.sourceId}`),
    );

    res.json({
      ok: true,
      accounts,
      periods,
      entries,
      trialBalance: [...trialMap.values()].sort((a, b) => a.code.localeCompare(b.code)),
      sources: {
        salesInvoices: salesInvoices.map((item) => ({
          ...item,
          posted: sourcesWithEntries.has(`SALES_INVOICE:${item.id}`),
        })),
        payables: payables.map((item) => ({
          ...item,
          posted: sourcesWithEntries.has(`ACCOUNTS_PAYABLE:${item.id}`),
        })),
        movements: movements.map((item) => ({
          ...item,
          posted: sourcesWithEntries.has(`TREASURY_MOVEMENT:${item.id}`),
        })),
        creditNotes: creditNotes.map((item) => ({
          ...item,
          posted: sourcesWithEntries.has(`SALES_CREDIT_NOTE:${item.id}`),
        })),
      },
      stats: {
        accounts: accounts.filter((item) => item.active).length,
        openPeriods: periods.filter((item) => item.status === 'OPEN').length,
        draftEntries: entries.filter((item) => item.status === 'DRAFT').length,
        postedEntries: posted.length,
        totalDebit: posted.flatMap((item) => item.lines).reduce((sum, line) => sum + Number(line.debit), 0),
        totalCredit: posted.flatMap((item) => item.lines).reduce((sum, line) => sum + Number(line.credit), 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/accounts', requirePermission('accounting.manage'), async (req, res, next) => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    if (parsed.data.parentId) {
      const parent = await prisma.accountingAccount.findFirst({
        where: {id: parsed.data.parentId, companyId: req.auth.companyId},
      });
      if (!parent) return res.status(404).json({ok: false, message: 'Cuenta padre no encontrada'});
    }

    const account = await prisma.accountingAccount.create({
      data: {...parsed.data, companyId: req.auth.companyId},
    });
    await audit(req, 'CREATE', 'AccountingAccount', account.id, `Cuenta ${account.code} creada`);
    res.status(201).json({ok: true, account});
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ok: false, message: 'El código de cuenta ya existe'});
    }
    next(error);
  }
});

router.post('/periods', requirePermission('accounting.manage'), async (req, res, next) => {
  try {
    const parsed = periodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      return res.status(400).json({ok: false, message: 'La fecha final no puede ser anterior a la inicial'});
    }

    const overlap = await prisma.accountingPeriod.findFirst({
      where: {
        companyId: req.auth.companyId,
        startDate: {lte: parsed.data.endDate},
        endDate: {gte: parsed.data.startDate},
      },
    });
    if (overlap) {
      return res.status(409).json({ok: false, message: `El periodo se cruza con ${overlap.name}`});
    }

    const period = await prisma.accountingPeriod.create({
      data: {...parsed.data, companyId: req.auth.companyId},
    });
    res.status(201).json({ok: true, period});
  } catch (error) {
    next(error);
  }
});

router.patch('/periods/:id/close', requirePermission('accounting.approve'), async (req, res, next) => {
  try {
    const period = await prisma.accountingPeriod.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId, status: 'OPEN'},
      include: {entries: true},
    });
    if (!period) return res.status(404).json({ok: false, message: 'Periodo abierto no encontrado'});
    if (period.entries.some((item) => item.status === 'DRAFT')) {
      return res.status(409).json({ok: false, message: 'Existen pólizas en borrador dentro del periodo'});
    }
    const updated = await prisma.accountingPeriod.update({
      where: {id: period.id},
      data: {status: 'CLOSED'},
    });
    res.json({ok: true, period: updated});
  } catch (error) {
    next(error);
  }
});

router.post('/entries', requirePermission('accounting.manage'), async (req, res, next) => {
  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const period = await validatePeriod(req.auth.companyId, parsed.data.periodId, parsed.data.entryDate);
    if (!period) return res.status(409).json({ok: false, message: 'El periodo no está abierto o la fecha no pertenece al periodo'});

    const accountIds = [...new Set(parsed.data.lines.map((line) => line.accountId))];
    const accounts = await prisma.accountingAccount.findMany({
      where: {id: {in: accountIds}, companyId: req.auth.companyId, active: true, allowsPosting: true},
    });
    if (accounts.length !== accountIds.length) {
      return res.status(409).json({ok: false, message: 'Una cuenta no permite movimientos'});
    }

    const summary = totals(parsed.data.lines);
    if (Math.abs(summary.debit - summary.credit) > 0.01 || summary.debit <= 0) {
      return res.status(409).json({ok: false, message: 'La póliza debe estar cuadrada y tener movimientos'});
    }

    const entry = await prisma.journalEntry.create({
      data: {
        companyId: req.auth.companyId,
        periodId: parsed.data.periodId,
        createdById: req.auth.sub,
        folio: await nextFolio(req.auth.companyId),
        entryDate: parsed.data.entryDate,
        concept: parsed.data.concept,
        notes: parsed.data.notes,
        lines: {create: parsed.data.lines},
      },
      include: {lines: {include: {account: true}}},
    });
    await audit(req, 'CREATE', 'JournalEntry', entry.id, `Póliza ${entry.folio} creada`);
    res.status(201).json({ok: true, entry});
  } catch (error) {
    next(error);
  }
});

router.post('/entries/automatic', requirePermission('accounting.manage'), async (req, res, next) => {
  try {
    const parsed = automaticSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const accounts = await getDefaultAccounts(req.auth.companyId);
    const requireAccount = (code) => {
      const account = accounts.get(code);
      if (!account) throw new Error(`Falta configurar la cuenta contable ${code}`);
      return account.id;
    };

    let source;
    let entryDate;
    let concept;
    let sourceFolio;
    let lines;

    if (parsed.data.sourceType === 'SALES_INVOICE') {
      source = await prisma.salesInvoice.findFirst({
        where: {id: parsed.data.sourceId, companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
      });
      if (source) {
        entryDate = source.issueDate;
        concept = `Factura de venta ${source.invoiceNumber}`;
        sourceFolio = source.invoiceNumber;
        lines = [
          {accountId: requireAccount('1050'), debit: Number(source.total), credit: 0, concept},
          {accountId: requireAccount('4010'), debit: 0, credit: Number(source.subtotal), concept},
          {accountId: requireAccount('2080'), debit: 0, credit: Number(source.taxTotal), concept},
        ];
      }
    }

    if (parsed.data.sourceType === 'ACCOUNTS_PAYABLE') {
      source = await prisma.accountsPayable.findFirst({
        where: {id: parsed.data.sourceId, companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
      });
      if (source) {
        entryDate = source.issueDate;
        concept = `Factura de proveedor ${source.invoiceNumber}`;
        sourceFolio = source.invoiceNumber;
        lines = [
          {accountId: requireAccount('5010'), debit: Number(source.subtotal), credit: 0, concept},
          {accountId: requireAccount('1190'), debit: Number(source.taxAmount), credit: 0, concept},
          {accountId: requireAccount('2010'), debit: 0, credit: Number(source.total), concept},
        ];
      }
    }

    if (parsed.data.sourceType === 'TREASURY_MOVEMENT') {
      source = await prisma.treasuryMovement.findFirst({
        where: {id: parsed.data.sourceId, companyId: req.auth.companyId},
      });
      if (source) {
        entryDate = source.movementDate;
        concept = source.concept;
        sourceFolio = source.folio;
        const isIncome = ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(source.type);
        lines = isIncome
          ? [
              {accountId: requireAccount('1020'), debit: Number(source.amount), credit: 0, concept},
              {accountId: requireAccount('4090'), debit: 0, credit: Number(source.amount), concept},
            ]
          : [
              {accountId: requireAccount('5090'), debit: Number(source.amount), credit: 0, concept},
              {accountId: requireAccount('1020'), debit: 0, credit: Number(source.amount), concept},
            ];
      }
    }

    if (parsed.data.sourceType === 'SALES_CREDIT_NOTE') {
      source = await prisma.salesCreditNote.findFirst({
        where: {id: parsed.data.sourceId, companyId: req.auth.companyId, status: {not: 'CANCELLED'}},
      });
      if (source) {
        entryDate = source.issueDate;
        concept = `Nota de crédito ${source.folio}`;
        sourceFolio = source.folio;
        lines = [
          {accountId: requireAccount('4010'), debit: Number(source.subtotal), credit: 0, concept},
          {accountId: requireAccount('2080'), debit: Number(source.taxTotal), credit: 0, concept},
          {accountId: requireAccount('1050'), debit: 0, credit: Number(source.total), concept},
        ];
      }
    }

    if (!source || !lines) return res.status(404).json({ok: false, message: 'Documento origen no encontrado'});

    const period = await validatePeriod(req.auth.companyId, parsed.data.periodId, entryDate);
    if (!period) return res.status(409).json({ok: false, message: 'El documento no pertenece a un periodo contable abierto'});

    const entry = await prisma.journalEntry.create({
      data: {
        companyId: req.auth.companyId,
        periodId: period.id,
        createdById: req.auth.sub,
        folio: await nextFolio(req.auth.companyId),
        entryDate,
        concept,
        sourceType: parsed.data.sourceType,
        sourceId: source.id,
        sourceFolio,
        lines: {create: lines},
      },
      include: {lines: {include: {account: true}}},
    });

    res.status(201).json({ok: true, entry});
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ok: false, message: 'El documento ya tiene una póliza contable'});
    }
    if (error.message?.startsWith('Falta configurar')) {
      return res.status(409).json({ok: false, message: error.message});
    }
    next(error);
  }
});

router.patch('/entries/:id/post', requirePermission('accounting.approve'), async (req, res, next) => {
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId, status: 'DRAFT'},
      include: {period: true, lines: true},
    });
    if (!entry) return res.status(404).json({ok: false, message: 'Póliza en borrador no encontrada'});
    if (entry.period.status !== 'OPEN') return res.status(409).json({ok: false, message: 'El periodo está cerrado'});

    const summary = totals(entry.lines);
    if (Math.abs(summary.debit - summary.credit) > 0.01 || summary.debit <= 0) {
      return res.status(409).json({ok: false, message: 'La póliza no está cuadrada'});
    }

    const updated = await prisma.journalEntry.update({
      where: {id: entry.id},
      data: {status: 'POSTED', postedById: req.auth.sub, postedAt: new Date()},
    });
    await audit(req, 'POST', 'JournalEntry', updated.id, `Póliza ${updated.folio} contabilizada`);
    res.json({ok: true, entry: updated});
  } catch (error) {
    next(error);
  }
});

export default router;
