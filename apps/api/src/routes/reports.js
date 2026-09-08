import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {executiveDemoDashboard} from '../services/executiveDemo.js';
import {demoReadiness} from '../services/demoReadiness.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('reports.read'));

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function startOfYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

function endOfToday() {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999,
  ));
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

router.get('/demo-readiness', async (req, res, next) => {
  try {
    res.json(await demoReadiness(req.auth.companyId));
  } catch (error) {
    next(error);
  }
});

router.get('/demo', async (req, res, next) => {
  try {
    res.json(await executiveDemoDashboard(req.auth.companyId));
  } catch (error) {
    next(error);
  }
});

router.get('/executive', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: 'Rango de fechas inválido'});
    }

    const from = parsed.data.from ?? startOfYear();
    const to = parsed.data.to ?? endOfToday();

    if (to < from) {
      return res.status(400).json({
        ok: false,
        message: 'La fecha final no puede ser anterior a la inicial',
      });
    }

    const companyId = req.auth.companyId;
    const dateRange = {gte: from, lte: to};

    const company = await prisma.company.findUnique({
      where: {id: companyId},
      select: {id: true, name: true, currency: true, timezone: true},
    });


    const [
      purchaseOrders,
      accountsPayable,
      accountsReceivable,
      inventoryBalances,
      employees,
      payrollPeriods,
      suppliers,
      customers,
      purchaseRequests,
    ] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: {companyId, orderDate: dateRange},
        include: {supplier: true},
        orderBy: {orderDate: 'asc'},
      }),
      prisma.accountsPayable.findMany({
        where: {companyId, issueDate: dateRange, status: {not: 'CANCELLED'}},
        include: {supplier: true},
      }),
      prisma.accountsReceivable.findMany({
        where: {companyId, issueDate: dateRange, status: {not: 'CANCELLED'}},
        include: {customer: true},
      }),
      prisma.inventoryBalance.findMany({
        where: {warehouse: {branch: {companyId}}},
        include: {product: true, warehouse: {include: {branch: true}}},
      }),
      prisma.employee.findMany({
        where: {companyId},
        include: {department: true},
      }),
      prisma.payrollPeriod.findMany({
        where: {companyId, paymentDate: dateRange, status: {not: 'CANCELLED'}},
      }),
      prisma.supplier.findMany({where: {companyId, active: true}}),
      prisma.customer.findMany({where: {companyId, active: true}}),
      prisma.purchaseRequest.findMany({
        where: {companyId, createdAt: dateRange},
      }),
    ]);

    const purchaseTotal = purchaseOrders.reduce((sum, row) => sum + Number(row.total), 0);
    const payableTotal = accountsPayable.reduce((sum, row) => sum + Number(row.total), 0);
    const payablePaid = accountsPayable.reduce((sum, row) => sum + Number(row.paidAmount), 0);
    const receivableTotal = accountsReceivable.reduce((sum, row) => sum + Number(row.total), 0);
    const receivableCollected = accountsReceivable.reduce((sum, row) => sum + Number(row.paidAmount), 0);
    const inventoryValue = inventoryBalances.reduce(
      (sum, row) => sum + Number(row.quantity) * Number(row.averageCost),
      0,
    );
    const payrollNet = payrollPeriods.reduce((sum, row) => sum + Number(row.totalNet), 0);

    const monthly = new Map();
    function addMonthly(date, field, amount) {
      const key = monthKey(date);
      const current = monthly.get(key) ?? {
        key,
        label: monthLabel(key),
        purchases: 0,
        payables: 0,
        receivables: 0,
        payroll: 0,
      };
      current[field] += Number(amount);
      monthly.set(key, current);
    }

    purchaseOrders.forEach((row) => addMonthly(row.orderDate, 'purchases', row.total));
    accountsPayable.forEach((row) => addMonthly(row.issueDate, 'payables', row.total));
    accountsReceivable.forEach((row) => addMonthly(row.issueDate, 'receivables', row.total));
    payrollPeriods.forEach((row) => addMonthly(row.paymentDate, 'payroll', row.totalNet));

    const supplierSpendMap = new Map();
    purchaseOrders.forEach((row) => {
      const key = row.supplierId;
      supplierSpendMap.set(key, {
        id: key,
        name: row.supplier.commercialName || row.supplier.legalName,
        total: (supplierSpendMap.get(key)?.total ?? 0) + Number(row.total),
        orders: (supplierSpendMap.get(key)?.orders ?? 0) + 1,
      });
    });

    const customerBalanceMap = new Map();
    accountsReceivable.forEach((row) => {
      const balance = Number(row.total) - Number(row.paidAmount);
      const key = row.customerId;
      customerBalanceMap.set(key, {
        id: key,
        name: row.customer.commercialName || row.customer.legalName,
        balance: (customerBalanceMap.get(key)?.balance ?? 0) + balance,
        invoices: (customerBalanceMap.get(key)?.invoices ?? 0) + 1,
      });
    });

    const departmentMap = new Map();
    employees.forEach((row) => {
      const key = row.department?.id ?? 'none';
      const name = row.department?.name ?? 'Sin departamento';
      departmentMap.set(key, {
        id: key,
        name,
        employees: (departmentMap.get(key)?.employees ?? 0) + 1,
        payroll: (departmentMap.get(key)?.payroll ?? 0) + Number(row.salary),
      });
    });

    const lowStock = inventoryBalances
      .filter((row) => Number(row.quantity) <= Number(row.product.minStock))
      .map((row) => ({
        product: row.product.name,
        sku: row.product.sku,
        warehouse: row.warehouse.name,
        branch: row.warehouse.branch.name,
        quantity: Number(row.quantity),
        minStock: Number(row.product.minStock),
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 12);

    const overduePayables = accountsPayable.filter(
      (row) => Number(row.total) > Number(row.paidAmount) && new Date(row.dueDate) < new Date(),
    );
    const overdueReceivables = accountsReceivable.filter(
      (row) => Number(row.total) > Number(row.paidAmount) && new Date(row.dueDate) < new Date(),
    );

    res.json({
      ok: true,
      company,
      range: {from, to},
      summary: {
        purchaseTotal,
        payableBalance: payableTotal - payablePaid,
        receivableBalance: receivableTotal - receivableCollected,
        inventoryValue,
        payrollNet,
        activeEmployees: employees.filter((row) => row.status === 'ACTIVE').length,
        suppliers: suppliers.length,
        customers: customers.length,
        pendingPurchaseRequests: purchaseRequests.filter((row) =>
          ['DRAFT', 'PENDING'].includes(row.status),
        ).length,
        overduePayables: overduePayables.reduce(
          (sum, row) => sum + Number(row.total) - Number(row.paidAmount),
          0,
        ),
        overdueReceivables: overdueReceivables.reduce(
          (sum, row) => sum + Number(row.total) - Number(row.paidAmount),
          0,
        ),
      },
      monthly: [...monthly.values()].sort((a, b) => a.key.localeCompare(b.key)),
      supplierSpend: [...supplierSpendMap.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
      customerBalances: [...customerBalanceMap.values()]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8),
      departments: [...departmentMap.values()].sort((a, b) => b.employees - a.employees),
      lowStock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
