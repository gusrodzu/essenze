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

const invoiceSchema = z.object({
  supplierId: z.string().min(1),
  purchaseOrderId: z.string().optional().nullable(),
  invoiceNumber: z.string().trim().min(1).max(80),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().trim().length(3).default('MXN'),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  total: z.coerce.number().positive(),
  notes: z.string().trim().optional().nullable(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date(),
  method: z.string().trim().min(2).max(50),
  reference: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  treasuryAccountId: z.string().cuid().optional().nullable(),
});

function withComputedStatus(invoice) {
  const balance = Number(invoice.total) - Number(invoice.paidAmount);
  const overdue = balance > 0 && new Date(invoice.dueDate) < new Date() && invoice.status !== 'CANCELLED';
  return {...invoice, balance, displayStatus: overdue ? 'OVERDUE' : invoice.status};
}

async function nextPaymentFolio(companyId, tx = prisma) {const year=String(new Date().getFullYear());return nextSequenceFolio({companyId,scope:'supplier-payment',prefix:'PAG',digits:4,period:year,model:'supplierPayment',where:{companyId,folio:{startsWith:`PAG-${year}-`}},db:tx})}

router.get('/', requirePermission('accounts_payable.read'), async (req, res, next) => {
  try {
    const invoices = await prisma.accountsPayable.findMany({
      where: {companyId: req.auth.companyId},
      include: {
        supplier: true,
        purchaseOrder: {select: {id: true, folio: true}},
        payments: {orderBy: {paymentDate: 'desc'}},
      },
      orderBy: [{dueDate: 'asc'}, {createdAt: 'desc'}],
    });
    const rows = invoices.map(withComputedStatus);
    const metrics = rows.reduce((acc, row) => {
      if (row.status !== 'CANCELLED') {
        acc.total += Number(row.total);
        acc.paid += Number(row.paidAmount);
        acc.balance += row.balance;
        if (row.displayStatus === 'OVERDUE') acc.overdue += row.balance;
      }
      return acc;
    }, {total: 0, paid: 0, balance: 0, overdue: 0});
    res.json({ok: true, invoices: rows, metrics});
  } catch (error) { next(error); }
});

router.get('/catalogs', requirePermission('accounts_payable.read'), async (req, res, next) => {
  try {
    const [suppliers, purchaseOrders, treasuryAccounts] = await Promise.all([
      prisma.supplier.findMany({where: {companyId: req.auth.companyId, active: true}, orderBy: {legalName: 'asc'}}),
      prisma.purchaseOrder.findMany({where: {companyId: req.auth.companyId, status: {in: ['ISSUED','PARTIALLY_RECEIVED','RECEIVED']}}, select: {id: true, folio: true, total: true, supplierId: true}, orderBy: {createdAt: 'desc'}}),
      prisma.treasuryAccount.findMany({where:{companyId:req.auth.companyId,active:true},select:{id:true,code:true,name:true,type:true,currency:true,currentBalance:true},orderBy:{name:'asc'}}),
    ]);
    res.json({ok: true, suppliers, purchaseOrders, treasuryAccounts});
  } catch (error) { next(error); }
});

router.post('/', requirePermission('accounts_payable.manage'), async (req, res, next) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    if (parsed.data.dueDate < parsed.data.issueDate) return res.status(400).json({ok: false, message: 'La fecha de vencimiento no puede ser anterior a la fecha de emisión'});
    const supplier = await prisma.supplier.findFirst({where: {id: parsed.data.supplierId, companyId: req.auth.companyId}});
    if (!supplier) return res.status(404).json({ok: false, message: 'Proveedor no encontrado'});
    if (parsed.data.purchaseOrderId) {
      const order = await prisma.purchaseOrder.findFirst({where: {id: parsed.data.purchaseOrderId, companyId: req.auth.companyId, supplierId: supplier.id}});
      if (!order) return res.status(400).json({ok: false, message: 'La orden seleccionada no corresponde al proveedor'});
    }
    const invoice = await prisma.accountsPayable.create({data: {...parsed.data, currency: parsed.data.currency.toUpperCase(), companyId: req.auth.companyId, createdById: req.auth.sub}});
    await prisma.auditLog.create({data: {userId: req.auth.sub, action: 'CREATE', entity: 'AccountsPayable', entityId: invoice.id, description: `Factura ${invoice.invoiceNumber} registrada`, ipAddress: req.ip}});
    res.status(201).json({ok: true, invoice: withComputedStatus(invoice)});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Esta factura ya fue registrada para el proveedor'});
    next(error);
  }
});

router.post('/:id/payments', requirePermission('accounts_payable.pay'), async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const invoice = await prisma.accountsPayable.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}, include: {payments: true}});
    if (!invoice) return res.status(404).json({ok: false, message: 'Factura no encontrada'});
    if (invoice.status === 'CANCELLED') return res.status(400).json({ok: false, message: 'No se puede pagar una factura cancelada'});
    const balance = Number(invoice.total) - Number(invoice.paidAmount);
    if (parsed.data.amount > balance + 0.001) return res.status(400).json({ok: false, message: 'El pago supera el saldo pendiente'});
    const result = await runSerializable(prisma, async (tx) => {
      const folio = await nextPaymentFolio(req.auth.companyId, tx);
      const {treasuryAccountId,...paymentData}=parsed.data;

      let treasuryMovement=null;
      if(treasuryAccountId){
        const account=await tx.treasuryAccount.findFirst({
          where:{id:treasuryAccountId,companyId:req.auth.companyId,active:true}
        });
        if(!account)throw new Error('La cuenta de tesorería no existe o está inactiva');
        const nextBalance=Number(account.currentBalance)-Number(parsed.data.amount);
        if(nextBalance<-.001)throw new Error('La cuenta de tesorería no tiene saldo suficiente');
        const year=String(new Date().getFullYear());
        const treasuryFolio=await nextSequenceFolio({companyId:req.auth.companyId,scope:'treasury-mov',prefix:'MOV',digits:5,period:year,model:'treasuryMovement',where:{companyId:req.auth.companyId,folio:{startsWith:`MOV-${year}-`}},db:tx});
        treasuryMovement=await tx.treasuryMovement.create({
          data:{
            companyId:req.auth.companyId,
            accountId:account.id,
            createdById:req.auth.sub,
            folio:treasuryFolio,
            type:'EXPENSE',
            movementDate:parsed.data.paymentDate,
            amount:parsed.data.amount,
            balanceAfter:nextBalance,
            concept:`Pago proveedor ${folio}`,
            category:'Cuentas por pagar',
            reference:parsed.data.reference||folio,
            referenceType:'SupplierPayment',
            notes:parsed.data.notes
          }
        });
        await tx.treasuryAccount.update({where:{id:account.id},data:{currentBalance:nextBalance}});
      }

      const payment = await tx.supplierPayment.create({data: {...paymentData, companyId: req.auth.companyId, accountsPayableId: invoice.id, createdById: req.auth.sub, folio}});
      const paidAmount = Number(invoice.paidAmount) + parsed.data.amount;
      const status = paidAmount >= Number(invoice.total) - 0.001 ? 'PAID' : 'PARTIALLY_PAID';
      const updated = await tx.accountsPayable.update({where: {id: invoice.id}, data: {paidAmount, status}, include: {supplier: true, purchaseOrder: {select: {id: true, folio: true}}, payments: {orderBy: {paymentDate: 'desc'}}}});
      await tx.auditLog.create({data: {userId: req.auth.sub, action: 'PAYMENT', entity: 'AccountsPayable', entityId: invoice.id, description: `Pago ${folio} aplicado por ${parsed.data.amount}`, ipAddress: req.ip}});
      return {payment, treasuryMovement, invoice: withComputedStatus(updated)};
    });
    res.status(201).json({ok: true, ...result});
  } catch (error) {
    if(['La cuenta de tesorería no existe o está inactiva','La cuenta de tesorería no tiene saldo suficiente'].includes(error.message)){
      return res.status(409).json({ok:false,message:error.message});
    }
    next(error);
  }
});

router.patch('/:id/cancel', requirePermission('accounts_payable.manage'), async (req, res, next) => {
  try {
    const invoice = await prisma.accountsPayable.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!invoice) return res.status(404).json({ok: false, message: 'Factura no encontrada'});
    if (Number(invoice.paidAmount) > 0) return res.status(400).json({ok: false, message: 'No se puede cancelar una factura con pagos'});
    const updated = await prisma.accountsPayable.update({where: {id: invoice.id}, data: {status: 'CANCELLED'}});
    res.json({ok: true, invoice: withComputedStatus(updated)});
  } catch (error) { next(error); }
});

export default router;
