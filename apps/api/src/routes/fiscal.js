import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {runSerializable} from '../services/transactionalIntegrity.js';
import {requireAuth} from '../middleware/auth.js';
import {idempotency} from '../middleware/idempotency.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(idempotency());

const issuerSchema = z.object({
  rfc: z.string().trim().min(12).max(13),
  legalName: z.string().trim().min(2).max(250),
  fiscalRegime: z.string().trim().min(3).max(10),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  certificateNumber: z.string().trim().max(40).optional().nullable(),
  pacProvider: z.string().trim().max(120).optional().nullable(),
  active: z.boolean().default(true),
});

const customerProfileSchema = z.object({
  rfc: z.string().trim().min(12).max(13),
  legalName: z.string().trim().min(2).max(250),
  fiscalRegime: z.string().trim().min(3).max(10),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  defaultUseCfdi: z.string().trim().min(2).max(10).default('G03'),
  foreignTaxId: z.string().trim().max(80).optional().nullable(),
  countryCode: z.string().trim().min(3).max(3).default('MEX'),
});

const fromSalesInvoiceSchema = z.object({
  salesInvoiceId: z.string().cuid(),
  series: z.string().trim().max(20).optional().nullable(),
  folio: z.string().trim().min(1).max(50),
  paymentMethod: z.enum(['PUE','PPD']).default('PUE'),
  paymentForm: z.string().trim().max(3).optional().nullable(),
  placeOfIssue: z.string().trim().regex(/^\d{5}$/),
  exportCode: z.string().trim().max(3).default('01'),
  useCfdi: z.string().trim().min(2).max(10).default('G03'),
  satProductCode: z.string().trim().min(8).max(8).default('01010101'),
  unitCode: z.string().trim().min(2).max(5).default('ACT'),
  taxObject: z.string().trim().max(3).default('02'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const stampResultSchema = z.object({
  uuid: z.string().trim().min(16).max(64),
  stampedAt: z.coerce.date(),
  certificateNumber: z.string().trim().max(40).optional().nullable(),
  satCertificate: z.string().trim().max(40).optional().nullable(),
  pacProvider: z.string().trim().max(120).optional().nullable(),
  xmlUrl: z.string().trim().max(1000).optional().nullable(),
  pdfUrl: z.string().trim().max(1000).optional().nullable(),
  satStatus: z.string().trim().max(120).optional().nullable(),
});

const cancellationSchema = z.object({
  reasonCode: z.string().trim().min(2).max(3),
  replacementUuid: z.string().trim().max(64).optional().nullable(),
  status: z.enum(['REQUESTED','ACCEPTED','REJECTED','NOT_REQUIRED','ERROR']).default('REQUESTED'),
  satResponse: z.string().trim().max(4000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const paymentComplementSchema = z.object({
  collectionReceiptId: z.string().cuid(),
  series: z.string().trim().max(20).optional().nullable(),
  folio: z.string().trim().min(1).max(50),
  placeOfIssue: z.string().trim().regex(/^\d{5}$/),
  paymentForm: z.string().trim().min(2).max(3),
  fiscalInvoiceId: z.string().cuid(),
  documentUuid: z.string().trim().min(16).max(64),
  installment: z.coerce.number().int().min(1).default(1),
  previousBalance: z.coerce.number().positive(),
  paidAmount: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const fiscalInclude = {
  customer: {include: {fiscalProfile: true}},
  salesInvoice: {include: {salesOrder: true}},
  salesOrder: true,
  createdBy: {select: {id: true, firstName: true, lastName: true}},
  items: {include: {taxes: true}, orderBy: {lineNumber: 'asc'}},
  cancellations: {orderBy: {requestedAt: 'desc'}},
  paymentApplications: true,
};

const paymentInclude = {
  customer: {include: {fiscalProfile: true}},
  collectionReceipt: true,
  createdBy: {select: {firstName: true, lastName: true}},
  payments: {
    include: {
      relatedDocuments: {
        include: {fiscalInvoice: {select: {id: true, folio: true, uuid: true, total: true}}},
      },
    },
  },
};

const n = (value) => Number(value || 0);

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

router.get('/dashboard', requirePermission('fiscal.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const [issuer, invoices, customers, salesInvoices, receipts, paymentComplements] = await Promise.all([
      prisma.fiscalIssuerProfile.findUnique({where: {companyId}}),
      prisma.fiscalInvoice.findMany({
        where: {companyId},
        include: fiscalInclude,
        orderBy: {issueDate: 'desc'},
      }),
      prisma.customer.findMany({
        where: {companyId, active: true},
        include: {fiscalProfile: true},
        orderBy: [{commercialName: 'asc'}, {legalName: 'asc'}],
      }),
      prisma.salesInvoice.findMany({
        where: {companyId, status: {not: 'CANCELLED'}},
        include: {customer: {include: {fiscalProfile: true}}, salesOrder: {include: {items: {include: {product: true}}}}},
        orderBy: {issueDate: 'desc'},
        take: 150,
      }),
      prisma.collectionReceipt.findMany({
        where: {companyId, status: 'APPLIED'},
        include: {customer: {include: {fiscalProfile: true}}, fiscalPaymentComplement: true},
        orderBy: {paymentDate: 'desc'},
        take: 150,
      }),
      prisma.fiscalPaymentComplement.findMany({
        where: {companyId},
        include: paymentInclude,
        orderBy: {issueDate: 'desc'},
      }),
    ]);

    const stamped = invoices.filter((row) => row.status === 'STAMPED');
    const cancelled = invoices.filter((row) => row.status === 'CANCELLED');
    const pending = invoices.filter((row) => ['DRAFT','READY','ERROR'].includes(row.status));
    const stampedTotal = stamped.reduce((sum, row) => sum + n(row.total), 0);
    const taxes = stamped.reduce((sum, row) => sum + n(row.transferredTaxes) - n(row.withheldTaxes), 0);
    const missingFiscalCustomers = customers.filter((row) => !row.fiscalProfile).length;

    res.json({
      ok: true,
      issuer,
      invoices,
      customers,
      salesInvoices,
      receipts,
      paymentComplements,
      summary: {
        totalInvoices: invoices.length,
        stamped: stamped.length,
        pending: pending.length,
        cancelled: cancelled.length,
        stampedTotal,
        taxes,
        paymentComplements: paymentComplements.length,
        missingFiscalCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/issuer', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = issuerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos fiscales inválidos'});
    const issuer = await prisma.fiscalIssuerProfile.upsert({
      where: {companyId: req.auth.companyId},
      update: {
        ...parsed.data,
        certificateNumber: parsed.data.certificateNumber || null,
        pacProvider: parsed.data.pacProvider || null,
      },
      create: {
        ...parsed.data,
        companyId: req.auth.companyId,
        certificateNumber: parsed.data.certificateNumber || null,
        pacProvider: parsed.data.pacProvider || null,
      },
    });
    await audit(req, 'UPDATE', 'FiscalIssuerProfile', issuer.id, `Perfil fiscal del emisor actualizado: ${issuer.rfc}`);
    res.json({ok: true, issuer});
  } catch (error) {
    next(error);
  }
});

router.put('/customers/:customerId/profile', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = customerProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos fiscales inválidos'});
    const customer = await prisma.customer.findFirst({
      where: {id: req.params.customerId, companyId: req.auth.companyId},
    });
    if (!customer) return res.status(404).json({ok: false, message: 'Cliente no encontrado'});
    const profile = await prisma.fiscalCustomerProfile.upsert({
      where: {customerId: customer.id},
      update: {
        ...parsed.data,
        foreignTaxId: parsed.data.foreignTaxId || null,
      },
      create: {
        ...parsed.data,
        customerId: customer.id,
        foreignTaxId: parsed.data.foreignTaxId || null,
      },
    });
    await audit(req, 'UPDATE', 'FiscalCustomerProfile', profile.id, `Perfil fiscal actualizado: ${profile.rfc}`);
    res.json({ok: true, profile});
  } catch (error) {
    next(error);
  }
});

router.post('/invoices/from-sales-invoice', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = fromSalesInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});

    const [issuer, commercialInvoice] = await Promise.all([
      prisma.fiscalIssuerProfile.findUnique({where: {companyId: req.auth.companyId}}),
      prisma.salesInvoice.findFirst({
        where: {id: parsed.data.salesInvoiceId, companyId: req.auth.companyId},
        include: {
          customer: {include: {fiscalProfile: true}},
          salesOrder: {include: {items: {include: {product: true}}}},
          fiscalInvoice: true,
        },
      }),
    ]);

    if (!issuer) return res.status(400).json({ok: false, message: 'Configura primero los datos fiscales del emisor'});
    if (!commercialInvoice) return res.status(404).json({ok: false, message: 'Factura comercial no encontrada'});
    if (!commercialInvoice.customer.fiscalProfile) return res.status(400).json({ok: false, message: 'El cliente no tiene perfil fiscal completo'});
    if (commercialInvoice.fiscalInvoice) return res.status(409).json({ok: false, message: 'La factura comercial ya tiene CFDI fiscal asociado'});

    const orderItems = commercialInvoice.salesOrder.items;
    const result = await runSerializable(prisma, async (tx) => {
      const fiscalInvoice = await tx.fiscalInvoice.create({
        data: {
          companyId: req.auth.companyId,
          salesInvoiceId: commercialInvoice.id,
          salesOrderId: commercialInvoice.salesOrderId,
          customerId: commercialInvoice.customerId,
          createdById: req.auth.sub,
          series: parsed.data.series || null,
          folio: parsed.data.folio,
          issueDate: new Date(),
          currency: commercialInvoice.currency,
          paymentMethod: parsed.data.paymentMethod,
          paymentForm: parsed.data.paymentForm || null,
          placeOfIssue: parsed.data.placeOfIssue,
          exportCode: parsed.data.exportCode,
          useCfdi: parsed.data.useCfdi,
          status: 'READY',
          subtotal: commercialInvoice.subtotal,
          transferredTaxes: commercialInvoice.taxTotal,
          total: commercialInvoice.total,
          notes: parsed.data.notes || null,
        },
      });

      if (orderItems.length) {
        for (let i = 0; i < orderItems.length; i += 1) {
          const row = orderItems[i];
          const item = await tx.fiscalInvoiceItem.create({
            data: {
              fiscalInvoiceId: fiscalInvoice.id,
              lineNumber: i + 1,
              satProductCode: parsed.data.satProductCode,
              identification: row.product?.sku || null,
              description: row.description || row.product?.name || 'Concepto',
              quantity: row.quantity,
              unitCode: parsed.data.unitCode,
              unitName: row.product?.unit || null,
              unitValue: row.unitPrice,
              amount: row.subtotal,
              taxObject: parsed.data.taxObject,
            },
          });
          if (n(row.taxAmount) > 0) {
            await tx.fiscalInvoiceTax.create({
              data: {
                itemId: item.id,
                kind: 'TRANSFER',
                taxCode: '002',
                factorType: 'RATE',
                taxBase: row.subtotal,
                rateOrQuota: n(row.taxRate) / 100,
                amount: row.taxAmount,
              },
            });
          }
        }
      } else {
        const item = await tx.fiscalInvoiceItem.create({
          data: {
            fiscalInvoiceId: fiscalInvoice.id,
            lineNumber: 1,
            satProductCode: parsed.data.satProductCode,
            description: `Factura comercial ${commercialInvoice.invoiceNumber}`,
            quantity: 1,
            unitCode: parsed.data.unitCode,
            unitValue: commercialInvoice.subtotal,
            amount: commercialInvoice.subtotal,
            taxObject: parsed.data.taxObject,
          },
        });
        if (n(commercialInvoice.taxTotal) > 0) {
          await tx.fiscalInvoiceTax.create({
            data: {
              itemId: item.id,
              kind: 'TRANSFER',
              taxCode: '002',
              factorType: 'RATE',
              taxBase: commercialInvoice.subtotal,
              rateOrQuota: n(commercialInvoice.subtotal) > 0 ? n(commercialInvoice.taxTotal) / n(commercialInvoice.subtotal) : 0,
              amount: commercialInvoice.taxTotal,
            },
          });
        }
      }
      return fiscalInvoice;
    });

    const invoice = await prisma.fiscalInvoice.findUnique({where: {id: result.id}, include: fiscalInclude});
    await audit(req, 'CREATE', 'FiscalInvoice', invoice.id, `CFDI preparado: ${invoice.folio}`);
    res.status(201).json({ok: true, invoice});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ya existe ese folio fiscal'});
    next(error);
  }
});

router.post('/invoices/:id/stamp-result', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = stampResultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Resultado de timbrado inválido'});
    const exists = await prisma.fiscalInvoice.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!exists) return res.status(404).json({ok: false, message: 'CFDI no encontrado'});
    const invoice = await prisma.fiscalInvoice.update({
      where: {id: exists.id},
      data: {
        status: 'STAMPED',
        uuid: parsed.data.uuid,
        stampedAt: parsed.data.stampedAt,
        certificateNumber: parsed.data.certificateNumber || null,
        satCertificate: parsed.data.satCertificate || null,
        pacProvider: parsed.data.pacProvider || null,
        xmlUrl: parsed.data.xmlUrl || null,
        pdfUrl: parsed.data.pdfUrl || null,
        satStatus: parsed.data.satStatus || 'Vigente',
        lastError: null,
      },
      include: fiscalInclude,
    });
    await audit(req, 'UPDATE', 'FiscalInvoice', invoice.id, `CFDI timbrado registrado: ${invoice.uuid}`);
    res.json({ok: true, invoice});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ese UUID ya está registrado'});
    next(error);
  }
});

router.post('/invoices/:id/cancellations', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = cancellationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Solicitud inválida'});
    const invoice = await prisma.fiscalInvoice.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!invoice) return res.status(404).json({ok: false, message: 'CFDI no encontrado'});
    const cancellation = await prisma.fiscalCancellation.create({
      data: {
        companyId: req.auth.companyId,
        fiscalInvoiceId: invoice.id,
        requestedById: req.auth.sub,
        reasonCode: parsed.data.reasonCode,
        replacementUuid: parsed.data.replacementUuid || null,
        status: parsed.data.status,
        resolvedAt: ['ACCEPTED','REJECTED','NOT_REQUIRED','ERROR'].includes(parsed.data.status) ? new Date() : null,
        satResponse: parsed.data.satResponse || null,
        notes: parsed.data.notes || null,
      },
    });
    await prisma.fiscalInvoice.update({
      where: {id: invoice.id},
      data: {
        status: parsed.data.status === 'ACCEPTED' ? 'CANCELLED' : parsed.data.status === 'REQUESTED' ? 'CANCEL_PENDING' : invoice.status,
        satStatus: parsed.data.status === 'ACCEPTED' ? 'Cancelado' : invoice.satStatus,
      },
    });
    await audit(req, 'UPDATE', 'FiscalInvoice', invoice.id, `Cancelación fiscal ${parsed.data.status}: ${invoice.folio}`);
    res.status(201).json({ok: true, cancellation});
  } catch (error) {
    next(error);
  }
});

router.post('/payment-complements/from-receipt', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = paymentComplementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const [issuer, receipt, invoice] = await Promise.all([
      prisma.fiscalIssuerProfile.findUnique({where: {companyId: req.auth.companyId}}),
      prisma.collectionReceipt.findFirst({
        where: {id: parsed.data.collectionReceiptId, companyId: req.auth.companyId, status: 'APPLIED'},
        include: {fiscalPaymentComplement: true},
      }),
      prisma.fiscalInvoice.findFirst({
        where: {id: parsed.data.fiscalInvoiceId, companyId: req.auth.companyId, status: 'STAMPED'},
      }),
    ]);
    if (!issuer) return res.status(400).json({ok: false, message: 'Configura los datos fiscales del emisor'});
    if (!receipt) return res.status(404).json({ok: false, message: 'Cobro aplicado no encontrado'});
    if (receipt.fiscalPaymentComplement) return res.status(409).json({ok: false, message: 'Ese cobro ya tiene complemento de pago'});
    if (!invoice?.uuid) return res.status(400).json({ok: false, message: 'Selecciona un CFDI timbrado con UUID'});

    const remaining = Math.max(0, parsed.data.previousBalance - parsed.data.paidAmount);
    const complement = await runSerializable(prisma, async (tx) => {
      const doc = await tx.fiscalPaymentComplement.create({
        data: {
          companyId: req.auth.companyId,
          collectionReceiptId: receipt.id,
          customerId: receipt.customerId,
          createdById: req.auth.sub,
          series: parsed.data.series || null,
          folio: parsed.data.folio,
          issueDate: new Date(),
          placeOfIssue: parsed.data.placeOfIssue,
          notes: parsed.data.notes || null,
          status: 'READY',
        },
      });
      const payment = await tx.fiscalPayment.create({
        data: {
          paymentComplementId: doc.id,
          paymentDate: receipt.paymentDate,
          paymentForm: parsed.data.paymentForm,
          currency: 'MXN',
          amount: receipt.amount,
          operationNumber: receipt.reference || null,
        },
      });
      await tx.fiscalPaymentRelatedDocument.create({
        data: {
          paymentId: payment.id,
          fiscalInvoiceId: invoice.id,
          documentUuid: invoice.uuid,
          currency: invoice.currency,
          installment: parsed.data.installment,
          previousBalance: parsed.data.previousBalance,
          paidAmount: parsed.data.paidAmount,
          remainingBalance: remaining,
          taxObject: '02',
        },
      });
      return doc;
    });
    const full = await prisma.fiscalPaymentComplement.findUnique({where: {id: complement.id}, include: paymentInclude});
    await audit(req, 'CREATE', 'FiscalPaymentComplement', full.id, `Complemento de pago preparado: ${full.folio}`);
    res.status(201).json({ok: true, paymentComplement: full});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ya existe ese folio o el cobro ya está vinculado'});
    next(error);
  }
});

router.post('/payment-complements/:id/stamp-result', requirePermission('fiscal.manage'), async (req, res, next) => {
  try {
    const parsed = stampResultSchema.pick({
      uuid: true,
      stampedAt: true,
      pacProvider: true,
      xmlUrl: true,
      pdfUrl: true,
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Resultado de timbrado inválido'});
    const exists = await prisma.fiscalPaymentComplement.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!exists) return res.status(404).json({ok: false, message: 'Complemento no encontrado'});
    const paymentComplement = await prisma.fiscalPaymentComplement.update({
      where: {id: exists.id},
      data: {
        status: 'STAMPED',
        uuid: parsed.data.uuid,
        stampedAt: parsed.data.stampedAt,
        pacProvider: parsed.data.pacProvider || null,
        xmlUrl: parsed.data.xmlUrl || null,
        pdfUrl: parsed.data.pdfUrl || null,
        lastError: null,
      },
      include: paymentInclude,
    });
    await audit(req, 'UPDATE', 'FiscalPaymentComplement', paymentComplement.id, `Complemento timbrado registrado: ${paymentComplement.uuid}`);
    res.json({ok: true, paymentComplement});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ese UUID ya está registrado'});
    next(error);
  }
});

export default router;
