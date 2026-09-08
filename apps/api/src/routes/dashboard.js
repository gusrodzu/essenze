import {Router} from 'express';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function asNumber(value) {
  return Number(value ?? 0);
}

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfPreviousMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

function endOfPreviousMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0, 23, 59, 59, 999));
}

function startOfRollingYear(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 11, 1));
}

function monthKey(date) {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

router.get('/', async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const userId = req.auth.sub;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const previousMonthStart = startOfPreviousMonth(now);
    const previousMonthEnd = endOfPreviousMonth(now);
    const yearStart = startOfRollingYear(now);
    const activeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      company,
      currentUser,
      pendingRequests,
      recentRequests,
      currentOrders,
      previousOrders,
      rollingOrders,
      inventoryBalances,
      notifications,
      accountsReceivable,
      accountsPayable,
      activeUsers,
      totalUsers,
    ] = await Promise.all([
      prisma.company.findUnique({
        where: {id: companyId},
        select: {id: true, name: true, currency: true, timezone: true},
      }),
      prisma.user.findUnique({
        where: {id: userId},
        select: {id: true, firstName: true, lastName: true},
      }),
      prisma.purchaseRequest.count({
        where: {companyId, status: {in: ['DRAFT', 'PENDING']}},
      }),
      prisma.purchaseRequest.findMany({
        where: {companyId},
        include: {
          requestedBy: {select: {firstName: true, lastName: true}},
          warehouse: {select: {name: true}},
          items: {select: {quantity: true, estimatedUnitCost: true}},
        },
        orderBy: {createdAt: 'desc'},
        take: 5,
      }),
      prisma.purchaseOrder.findMany({
        where: {companyId, orderDate: {gte: monthStart}, status: {not: 'CANCELLED'}},
        select: {id: true, orderDate: true, total: true},
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId,
          orderDate: {gte: previousMonthStart, lte: previousMonthEnd},
          status: {not: 'CANCELLED'},
        },
        select: {id: true, total: true},
      }),
      prisma.purchaseOrder.findMany({
        where: {companyId, orderDate: {gte: yearStart}, status: {not: 'CANCELLED'}},
        select: {orderDate: true, total: true},
        orderBy: {orderDate: 'asc'},
      }),
      prisma.inventoryBalance.findMany({
        where: {warehouse: {branch: {companyId}}},
        include: {
          product: {
            select: {
              sku: true,
              name: true,
              minStock: true,
              category: {select: {name: true}},
            },
          },
          warehouse: {select: {name: true}},
        },
      }),
      prisma.notification.findMany({
        where: {
          companyId,
          OR: [{userId: null}, {userId}],
        },
        orderBy: {createdAt: 'desc'},
        take: 5,
      }),
      prisma.accountsReceivable.findMany({
        where: {
          companyId,
          status: {not: 'CANCELLED'},
          dueDate: {gte: now},
          total: {gt: 0},
        },
        include: {
          customer: {select: {legalName: true, commercialName: true}},
        },
        orderBy: {dueDate: 'asc'},
        take: 5,
      }),
      prisma.accountsPayable.findMany({
        where: {
          companyId,
          status: {not: 'CANCELLED'},
          dueDate: {gte: now},
          total: {gt: 0},
        },
        include: {
          supplier: {select: {legalName: true, commercialName: true}},
        },
        orderBy: {dueDate: 'asc'},
        take: 5,
      }),
      prisma.user.findMany({
        where: {companyId, active: true, lastLoginAt: {gte: activeSince}},
        select: {id: true, firstName: true, lastName: true, lastLoginAt: true},
        orderBy: {lastLoginAt: 'desc'},
        take: 8,
      }),
      prisma.user.count({where: {companyId, active: true}}),
    ]);

    const inventoryValue = inventoryBalances.reduce(
      (sum, row) => sum + asNumber(row.quantity) * asNumber(row.averageCost),
      0,
    );

    const criticalStock = inventoryBalances
      .filter((row) => asNumber(row.quantity) <= asNumber(row.product.minStock))
      .sort((a, b) => {
        const ratioA = asNumber(a.product.minStock)
          ? asNumber(a.quantity) / asNumber(a.product.minStock)
          : 0;
        const ratioB = asNumber(b.product.minStock)
          ? asNumber(b.quantity) / asNumber(b.product.minStock)
          : 0;
        return ratioA - ratioB;
      });

    const currentOrderTotal = currentOrders.reduce((sum, row) => sum + asNumber(row.total), 0);
    const previousOrderTotal = previousOrders.reduce((sum, row) => sum + asNumber(row.total), 0);

    const monthlyMap = new Map();
    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      monthlyMap.set(monthKey(date), {
        key: monthKey(date),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
        total: 0,
      });
    }
    rollingOrders.forEach((row) => {
      const key = monthKey(row.orderDate);
      const item = monthlyMap.get(key);
      if (item) item.total += asNumber(row.total);
    });

    const categoryMap = new Map();
    inventoryBalances.forEach((row) => {
      const label = row.product.category?.name || 'Sin categoría';
      const value = asNumber(row.quantity) * asNumber(row.averageCost);
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + value);
    });
    const categoryTotal = [...categoryMap.values()].reduce((sum, value) => sum + value, 0);
    const categorySpend = [...categoryMap.entries()]
      .map(([label, value]) => ({
        label,
        value,
        percent: categoryTotal ? (value / categoryTotal) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const agenda = [
      ...accountsReceivable.map((row) => ({
        id: `ar-${row.id}`,
        type: 'RECEIVABLE',
        date: row.dueDate,
        title: `Cobro ${row.invoiceNumber}`,
        meta: row.customer.commercialName || row.customer.legalName,
        amount: asNumber(row.total) - asNumber(row.paidAmount),
      })),
      ...accountsPayable.map((row) => ({
        id: `ap-${row.id}`,
        type: 'PAYABLE',
        date: row.dueDate,
        title: `Pago ${row.invoiceNumber}`,
        meta: row.supplier.commercialName || row.supplier.legalName,
        amount: asNumber(row.total) - asNumber(row.paidAmount),
      })),
    ]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    const requestStatusLabels = {
      DRAFT: 'Borrador',
      PENDING: 'Pendiente',
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
      ORDERED: 'Ordenada',
      CANCELLED: 'Cancelada',
    };

    res.json({
      ok: true,
      generatedAt: now.toISOString(),
      company,
      user: currentUser,
      kpis: {
        pendingRequests,
        ordersThisMonth: currentOrders.length,
        ordersAmountThisMonth: currentOrderTotal,
        purchaseChange: percentChange(currentOrderTotal, previousOrderTotal),
        inventoryValue,
        criticalStock: criticalStock.length,
      },
      recentRequests: recentRequests.map((row) => ({
        id: row.id,
        folio: row.folio,
        title: row.title,
        area: row.warehouse?.name || 'Operación',
        requester: `${row.requestedBy.firstName} ${row.requestedBy.lastName}`,
        amount: row.items.reduce(
          (sum, item) => sum + asNumber(item.quantity) * asNumber(item.estimatedUnitCost),
          0,
        ),
        status: requestStatusLabels[row.status] || row.status,
        createdAt: row.createdAt,
      })),
      monthlyPurchases: [...monthlyMap.values()],
      criticalProducts: criticalStock.slice(0, 5).map((row) => ({
        sku: row.product.sku,
        name: row.product.name,
        stock: asNumber(row.quantity),
        min: asNumber(row.product.minStock),
        warehouse: row.warehouse.name,
      })),
      categorySpend,
      agenda,
      activity: {
        activeUsers: activeUsers.length,
        totalUsers,
        users: activeUsers.map((row) => ({
          id: row.id,
          name: `${row.firstName} ${row.lastName}`,
          lastLoginAt: row.lastLoginAt,
        })),
      },
      notifications: notifications.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        link: row.link,
        read: row.read,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
