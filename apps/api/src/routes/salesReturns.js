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

const returnSchema = z.object({
  salesDeliveryId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  returnDate: z.coerce.date(),
  reason: z.string().trim().min(3).max(180),
  reference: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(
    z.object({
      salesDeliveryItemId: z.string().cuid(),
      quantity: z.coerce.number().positive(),
    }),
  ).min(1),
});

const creditNoteSchema = z.object({
  salesInvoiceId: z.string().cuid(),
  salesReturnId: z.string().cuid().optional().nullable(),
  issueDate: z.coerce.date(),
  subtotal: z.coerce.number().min(0),
  taxTotal: z.coerce.number().min(0),
  reason: z.string().trim().min(3).max(180),
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
    const [deliveries, returns, invoices, creditNotes, warehouses] =
      await Promise.all([
        prisma.salesDelivery.findMany({
          where: {
            companyId: req.auth.companyId,
            status: 'POSTED',
          },
          include: {
            salesOrder: {
              include: {
                customer: true,
                invoice: true,
              },
            },
            items: {
              include: {
                product: true,
                returnItems: true,
              },
            },
          },
          orderBy: {deliveryDate: 'desc'},
        }),
        prisma.salesReturn.findMany({
          where: {companyId: req.auth.companyId},
          include: {
            salesDelivery: {
              include: {
                salesOrder: {
                  include: {customer: true},
                },
              },
            },
            warehouse: true,
            items: {include: {product: true}},
            creditNote: true,
            createdBy: {
              select: {firstName: true, lastName: true},
            },
          },
          orderBy: {createdAt: 'desc'},
        }),
        prisma.salesInvoice.findMany({
          where: {
            companyId: req.auth.companyId,
            status: {not: 'CANCELLED'},
          },
          include: {
            customer: true,
            salesOrder: true,
            creditNotes: true,
          },
          orderBy: {issueDate: 'desc'},
        }),
        prisma.salesCreditNote.findMany({
          where: {companyId: req.auth.companyId},
          include: {
            salesInvoice: {
              include: {customer: true},
            },
            salesReturn: true,
            createdBy: {
              select: {firstName: true, lastName: true},
            },
          },
          orderBy: {createdAt: 'desc'},
        }),
        prisma.warehouse.findMany({
          where: {
            branch: {companyId: req.auth.companyId},
            active: true,
          },
          include: {branch: true},
          orderBy: {name: 'asc'},
        }),
      ]);

    const stats = {
      returns: returns.filter((item) => item.status === 'POSTED').length,
      returnedUnits: returns
        .filter((item) => item.status === 'POSTED')
        .flatMap((item) => item.items)
        .reduce((sum, item) => sum + Number(item.quantity), 0),
      creditNotes: creditNotes.filter((item) => item.status !== 'CANCELLED').length,
      creditedTotal: creditNotes
        .filter((item) => item.status !== 'CANCELLED')
        .reduce((sum, item) => sum + Number(item.total), 0),
      pendingCreditNotes: returns.filter(
        (item) => item.status === 'POSTED' && !item.creditNote,
      ).length,
    };

    res.json({
      ok: true,
      deliveries,
      returns,
      invoices,
      creditNotes,
      warehouses,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/returns',
  requirePermission('sales.fulfillment'),
  async (req, res, next) => {
    try {
      const parsed = returnSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const delivery = await prisma.salesDelivery.findFirst({
        where: {
          id: parsed.data.salesDeliveryId,
          companyId: req.auth.companyId,
          status: 'POSTED',
        },
        include: {
          items: {
            include: {returnItems: true},
          },
        },
      });

      if (!delivery) {
        return res.status(404).json({
          ok: false,
          message: 'Remisión no encontrada',
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
        return res.status(404).json({
          ok: false,
          message: 'Almacén no encontrado',
        });
      }

      const deliveryItems = new Map(
        delivery.items.map((item) => [item.id, item]),
      );

      for (const item of parsed.data.items) {
        const deliveryItem = deliveryItems.get(item.salesDeliveryItemId);

        if (!deliveryItem) {
          return res.status(400).json({
            ok: false,
            message: 'Una partida no pertenece a la remisión',
          });
        }

        const alreadyReturned = deliveryItem.returnItems.reduce(
          (sum, row) => sum + Number(row.quantity),
          0,
        );
        const available =
          Number(deliveryItem.quantity) - alreadyReturned;

        if (item.quantity > available) {
          return res.status(409).json({
            ok: false,
            message: 'La devolución excede la cantidad disponible',
          });
        }
      }

      const salesReturn = await runSerializable(prisma, async (tx) => {
        const folio = await nextFolio(
          req.auth.companyId,
          'salesReturn',
          'DEV',
          tx,
        );

        const created = await tx.salesReturn.create({
          data: {
            companyId: req.auth.companyId,
            salesDeliveryId: delivery.id,
            warehouseId: warehouse.id,
            createdById: req.auth.sub,
            folio,
            returnDate: parsed.data.returnDate,
            status: 'POSTED',
            reason: parsed.data.reason,
            reference: parsed.data.reference,
            notes: parsed.data.notes,
            items: {
              create: parsed.data.items.map((item) => {
                const deliveryItem = deliveryItems.get(
                  item.salesDeliveryItemId,
                );

                return {
                  salesDeliveryItemId: deliveryItem.id,
                  productId: deliveryItem.productId,
                  quantity: item.quantity,
                  unitCost: deliveryItem.unitCost,
                };
              }),
            },
          },
          include: {items: true},
        });

        for (const item of created.items) {
          const balance = await tx.inventoryBalance.findFirst({
            where: {
              warehouseId: warehouse.id,
              productId: item.productId,
            },
          });

          const nextQty =
            Number(balance?.quantity ?? 0) + Number(item.quantity);

          if (balance) {
            await tx.inventoryBalance.update({
              where: {id: balance.id},
              data: {quantity: nextQty},
            });
          } else {
            await tx.inventoryBalance.create({
              data: {
                warehouseId: warehouse.id,
                productId: item.productId,
                quantity: nextQty,
                averageCost: item.unitCost,
              },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              companyId: req.auth.companyId,
              warehouseId: warehouse.id,
              productId: item.productId,
              userId: req.auth.sub,
              type: 'SALE_RETURN_IN',
              quantity: Number(item.quantity),
              unitCost: item.unitCost,
              balanceAfter: nextQty,
              referenceType: 'SalesReturn',
              referenceId: created.id,
              referenceFolio: folio,
              notes: parsed.data.reason,
            },
          });
        }

        return created;
      });

      await audit(
        req,
        'CREATE',
        'SalesReturn',
        salesReturn.id,
        `Devolución ${salesReturn.folio} registrada`,
      );

      res.status(201).json({ok: true, salesReturn});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/credit-notes',
  requirePermission('sales.approve'),
  async (req, res, next) => {
    try {
      const parsed = creditNoteSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      const invoice = await prisma.salesInvoice.findFirst({
        where: {
          id: parsed.data.salesInvoiceId,
          companyId: req.auth.companyId,
          status: {not: 'CANCELLED'},
        },
        include: {
          creditNotes: {
            where: {status: {not: 'CANCELLED'}},
          },
          customer: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          ok: false,
          message: 'Factura no encontrada',
        });
      }

      let salesReturn = null;

      if (parsed.data.salesReturnId) {
        salesReturn = await prisma.salesReturn.findFirst({
          where: {
            id: parsed.data.salesReturnId,
            companyId: req.auth.companyId,
            status: 'POSTED',
            creditNote: null,
          },
          include: {
            salesDelivery: {
              include: {salesOrder: true},
            },
          },
        });

        if (!salesReturn) {
          return res.status(404).json({
            ok: false,
            message: 'Devolución no disponible',
          });
        }

        if (
          salesReturn.salesDelivery.salesOrderId !== invoice.salesOrderId
        ) {
          return res.status(409).json({
            ok: false,
            message: 'La devolución no corresponde a la factura',
          });
        }
      }

      const total = parsed.data.subtotal + parsed.data.taxTotal;
      const alreadyCredited = invoice.creditNotes.reduce(
        (sum, item) => sum + Number(item.total),
        0,
      );

      if (alreadyCredited + total > Number(invoice.total)) {
        return res.status(409).json({
          ok: false,
          message: 'La nota excede el total disponible de la factura',
        });
      }

      const creditNote = await runSerializable(prisma, async (tx) => {
        const folio = await nextFolio(
          req.auth.companyId,
          'salesCreditNote',
          'NC',
          tx,
        );

        const created = await tx.salesCreditNote.create({
          data: {
            companyId: req.auth.companyId,
            salesInvoiceId: invoice.id,
            salesReturnId: salesReturn?.id ?? null,
            createdById: req.auth.sub,
            folio,
            issueDate: parsed.data.issueDate,
            status: 'APPLIED',
            subtotal: parsed.data.subtotal,
            taxTotal: parsed.data.taxTotal,
            total,
            reason: parsed.data.reason,
            notes: parsed.data.notes,
          },
        });

        const receivable = await tx.accountsReceivable.findFirst({
          where: {
            companyId: req.auth.companyId,
            invoiceNumber: invoice.invoiceNumber,
          },
        });

        if (receivable) {
          const adjustedTotal = Math.max(
            Number(receivable.paidAmount),
            Number(receivable.total) - total,
          );
          const nextStatus =
            Number(receivable.paidAmount) >= adjustedTotal
              ? 'PAID'
              : Number(receivable.paidAmount) > 0
                ? 'PARTIALLY_PAID'
                : 'PENDING';

          await tx.accountsReceivable.update({
            where: {id: receivable.id},
            data: {
              total: adjustedTotal,
              status: nextStatus,
              notes: `${receivable.notes ?? ''}\nNota de crédito ${folio}`.trim(),
            },
          });
        }

        const totalCredits = alreadyCredited + total;
        const invoiceStatus =
          totalCredits >= Number(invoice.total)
            ? 'CANCELLED'
            : invoice.status;

        await tx.salesInvoice.update({
          where: {id: invoice.id},
          data: {status: invoiceStatus},
        });

        return created;
      });

      await audit(
        req,
        'CREATE',
        'SalesCreditNote',
        creditNote.id,
        `Nota de crédito ${creditNote.folio} aplicada`,
      );

      res.status(201).json({ok: true, creditNote});
    } catch (error) {
      next(error);
    }
  },
);

export default router;
