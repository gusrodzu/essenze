import {Router} from 'express';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/balances', requirePermission('inventory.read'), async (req, res, next) => {
  try {
    const balances = await prisma.inventoryBalance.findMany({
      where: {warehouse: {branch: {companyId: req.auth.companyId}}},
      include: {
        product: {include: {category: true}},
        warehouse: {include: {branch: true}},
      },
      orderBy: [{product: {name: 'asc'}}, {warehouse: {name: 'asc'}}],
    });

    const summary = {
      records: balances.length,
      units: balances.reduce((sum, row) => sum + Number(row.quantity), 0),
      value: balances.reduce((sum, row) => sum + Number(row.quantity) * Number(row.averageCost), 0),
      lowStock: balances.filter((row) => Number(row.quantity) <= Number(row.product.minStock)).length,
    };

    res.json({ok: true, balances, summary});
  } catch (error) {
    next(error);
  }
});

router.get('/movements', requirePermission('inventory_movements.read'), async (req, res, next) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: {companyId: req.auth.companyId},
      include: {
        product: {select: {id: true, sku: true, name: true, unit: true}},
        warehouse: {include: {branch: true}},
        createdBy: {select: {firstName: true, lastName: true}},
        goodsReceipt: {select: {id: true, folio: true}},
      },
      orderBy: {occurredAt: 'desc'},
      take: 500,
    });
    res.json({ok: true, movements});
  } catch (error) {
    next(error);
  }
});

export default router;
