import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {nextFolio as nextSequenceFolio} from '../services/sequence.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const paymentSchema = z.object({
  customerId: z.string().cuid(),
  treasuryAccountId: z.string().cuid(),
  paymentDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'TRANSFER', 'CARD', 'CHECK', 'OTHER']),
  reference: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  applications: z.array(
    z.object({
      accountsReceivableId: z.string().cuid(),
      amount: z.coerce.number().positive(),
    }),
  ).default([]),
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
  return nextSequenceFolio({companyId,scope:model==='treasuryMovement'&&prefix==='MOV'?'treasury-mov':`${model}-${prefix.toLowerCase()}`,prefix,digits:4,period:year,model,where:{companyId,folio:{startsWith:`${prefix}-${year}-`}},db});
}

router.get('/', requirePermission('collections.read'), async (req, res, next) => {
  try {
    const [customers, receivables, accounts, payments] = await Promise.all([
      prisma.customer.findMany({
        where: {companyId: req.auth.companyId, active: true},
        orderBy: {commercialName: 'asc'},
      }),
      prisma.accountsReceivable.findMany({
        where: {
          companyId: req.auth.companyId,
          status: {in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']},
        },
        include: {customer: true},
        orderBy: {dueDate: 'asc'},
      }),
      prisma.treasuryAccount.findMany({
        where: {companyId: req.auth.companyId, active: true},
        orderBy: {name: 'asc'},
      }),
      prisma.collectionReceipt.findMany({
        where: {companyId: req.auth.companyId},
        include: {
          customer: true,
          treasuryAccount: true,
          createdBy: {select: {firstName: true, lastName: true}},
          applications: {
            include: {
              accountsReceivable: true,
            },
          },
        },
        orderBy: {paymentDate: 'desc'},
      }),
    ]);

    const outstanding = receivables.reduce(
      (sum, item) => sum + Number(item.total) - Number(item.paidAmount),
      0,
    );
    const overdue = receivables
      .filter((item) => new Date(item.dueDate) < new Date())
      .reduce(
        (sum, item) => sum + Number(item.total) - Number(item.paidAmount),
        0,
      );
    const collected = payments
      .filter((item) => item.status === 'APPLIED')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const unapplied = payments
      .filter((item) => item.status === 'APPLIED')
      .reduce((sum, item) => sum + Number(item.unappliedAmount), 0);

    res.json({
      ok: true,
      customers,
      receivables,
      accounts,
      payments,
      stats: {
        outstanding,
        overdue,
        collected,
        unapplied,
        openInvoices: receivables.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/payments',
  requirePermission('collections.manage'),
  async (req, res, next) => {
    try {
      const parsed = paymentSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const applicationTotal = parsed.data.applications.reduce(
        (sum, item) => sum + item.amount,
        0,
      );

      if (applicationTotal > parsed.data.amount) {
        return res.status(409).json({
          ok: false,
          message: 'El total aplicado no puede superar el pago',
        });
      }

      const [customer, account, receivables] = await Promise.all([
        prisma.customer.findFirst({
          where: {
            id: parsed.data.customerId,
            companyId: req.auth.companyId,
            active: true,
          },
        }),
        prisma.treasuryAccount.findFirst({
          where: {
            id: parsed.data.treasuryAccountId,
            companyId: req.auth.companyId,
            active: true,
          },
        }),
        prisma.accountsReceivable.findMany({
          where: {
            id: {
              in: parsed.data.applications.map(
                (item) => item.accountsReceivableId,
              ),
            },
            companyId: req.auth.companyId,
            customerId: parsed.data.customerId,
            status: {in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']},
          },
        }),
      ]);

      if (!customer || !account) {
        return res.status(404).json({
          ok: false,
          message: 'Cliente o cuenta de tesorería no encontrada',
        });
      }

      if (
        receivables.length !==
        new Set(
          parsed.data.applications.map(
            (item) => item.accountsReceivableId,
          ),
        ).size
      ) {
        return res.status(409).json({
          ok: false,
          message: 'Una factura no corresponde al cliente o ya está cerrada',
        });
      }

      const receivableMap = new Map(
        receivables.map((item) => [item.id, item]),
      );

      for (const application of parsed.data.applications) {
        const receivable = receivableMap.get(
          application.accountsReceivableId,
        );
        const balance =
          Number(receivable.total) - Number(receivable.paidAmount);

        if (application.amount > balance) {
          return res.status(409).json({
            ok: false,
            message: `La aplicación excede el saldo de ${receivable.invoiceNumber}`,
          });
        }
      }

      const payment = await runSerializable(prisma, async (tx) => {
        const folio = await nextFolio(
          req.auth.companyId,
          'collectionReceipt',
          'COB',
          tx,
        );
        const nextBalance =
          Number(account.currentBalance) + parsed.data.amount;

        const treasuryMovement = await tx.treasuryMovement.create({
          data: {
            companyId: req.auth.companyId,
            accountId: account.id,
            createdById: req.auth.sub,
            folio: await nextFolio(
              req.auth.companyId,
              'treasuryMovement',
              'MOV',
              tx,
            ),
            type: 'INCOME',
            movementDate: parsed.data.paymentDate,
            amount: parsed.data.amount,
            balanceAfter: nextBalance,
            concept: `Cobro ${folio}`,
            category: 'Cobranza',
            reference: parsed.data.reference,
            referenceType: 'CollectionReceipt',
            notes: parsed.data.notes,
          },
        });

        await tx.treasuryAccount.update({
          where: {id: account.id},
          data: {currentBalance: nextBalance},
        });

        const created = await tx.collectionReceipt.create({
          data: {
            companyId: req.auth.companyId,
            customerId: customer.id,
            treasuryAccountId: account.id,
            createdById: req.auth.sub,
            folio,
            paymentDate: parsed.data.paymentDate,
            amount: parsed.data.amount,
            unappliedAmount: parsed.data.amount - applicationTotal,
            method: parsed.data.method,
            reference: parsed.data.reference,
            notes: parsed.data.notes,
            status: 'APPLIED',
            treasuryMovementId: treasuryMovement.id,
            applications: {
              create: parsed.data.applications.map((item) => ({
                companyId: req.auth.companyId,
                accountsReceivableId: item.accountsReceivableId,
                amount: item.amount,
              })),
            },
          },
          include: {
            applications: true,
          },
        });

        for (const application of parsed.data.applications) {
          const receivable = receivableMap.get(
            application.accountsReceivableId,
          );
          const nextPaid =
            Number(receivable.paidAmount) + application.amount;
          const nextStatus =
            nextPaid >= Number(receivable.total)
              ? 'PAID'
              : nextPaid > 0
                ? 'PARTIALLY_PAID'
                : receivable.status;

          await tx.accountsReceivable.update({
            where: {id: receivable.id},
            data: {
              paidAmount: nextPaid,
              status: nextStatus,
            },
          });

          const invoice = await tx.salesInvoice.findFirst({
            where: {
              companyId: req.auth.companyId,
              invoiceNumber: receivable.invoiceNumber,
            },
          });

          if (invoice) {
            await tx.salesInvoice.update({
              where: {id: invoice.id},
              data: {
                paidAmount:
                  Number(invoice.paidAmount) + application.amount,
                status:
                  nextStatus === 'PAID'
                    ? 'PAID'
                    : nextStatus === 'PARTIALLY_PAID'
                      ? 'PARTIALLY_PAID'
                      : invoice.status,
              },
            });
          }
        }

        return created;
      });

      await audit(
        req,
        'CREATE',
        'CollectionReceipt',
        payment.id,
        `Cobro ${payment.folio} registrado`,
      );

      res.status(201).json({ok: true, payment});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/payments/:id/apply',
  requirePermission('collections.manage'),
  async (req, res, next) => {
    try {
      const parsed = z
        .object({
          applications: z
            .array(
              z.object({
                accountsReceivableId: z.string().cuid(),
                amount: z.coerce.number().positive(),
              }),
            )
            .min(1),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: 'Aplicaciones inválidas',
        });
      }

      const payment = await prisma.collectionReceipt.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
          status: 'APPLIED',
        },
      });

      if (!payment) {
        return res.status(404).json({
          ok: false,
          message: 'Pago no encontrado',
        });
      }

      const total = parsed.data.applications.reduce(
        (sum, item) => sum + item.amount,
        0,
      );

      if (total > Number(payment.unappliedAmount)) {
        return res.status(409).json({
          ok: false,
          message: 'La aplicación excede el saldo no aplicado',
        });
      }

      const receivables = await prisma.accountsReceivable.findMany({
        where: {
          id: {
            in: parsed.data.applications.map(
              (item) => item.accountsReceivableId,
            ),
          },
          companyId: req.auth.companyId,
          customerId: payment.customerId,
          status: {in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']},
        },
      });

      const receivableMap = new Map(
        receivables.map((item) => [item.id, item]),
      );

      if (
        receivables.length !==
        new Set(
          parsed.data.applications.map(
            (item) => item.accountsReceivableId,
          ),
        ).size
      ) {
        return res.status(409).json({
          ok: false,
          message: 'Una factura no está disponible para aplicación',
        });
      }

      await runSerializable(prisma, async (tx) => {
        for (const application of parsed.data.applications) {
          const receivable = receivableMap.get(
            application.accountsReceivableId,
          );
          const balance =
            Number(receivable.total) - Number(receivable.paidAmount);

          if (application.amount > balance) {
            throw new Error(
              `La aplicación excede el saldo de ${receivable.invoiceNumber}`,
            );
          }

          await tx.customerPaymentApplication.upsert({
            where: {
              collectionReceiptId_accountsReceivableId: {
                collectionReceiptId: payment.id,
                accountsReceivableId: receivable.id,
              },
            },
            create: {
              companyId: req.auth.companyId,
              collectionReceiptId: payment.id,
              accountsReceivableId: receivable.id,
              amount: application.amount,
            },
            update: {
              amount: {
                increment: application.amount,
              },
            },
          });

          const nextPaid =
            Number(receivable.paidAmount) + application.amount;
          const nextStatus =
            nextPaid >= Number(receivable.total)
              ? 'PAID'
              : 'PARTIALLY_PAID';

          await tx.accountsReceivable.update({
            where: {id: receivable.id},
            data: {
              paidAmount: nextPaid,
              status: nextStatus,
            },
          });
        }

        await tx.collectionReceipt.update({
          where: {id: payment.id},
          data: {
            unappliedAmount:
              Number(payment.unappliedAmount) - total,
          },
        });
      });

      res.json({ok: true});
    } catch (error) {
      if (error.message?.startsWith('La aplicación excede')) {
        return res.status(409).json({
          ok: false,
          message: error.message,
        });
      }

      next(error);
    }
  },
);

export default router;
