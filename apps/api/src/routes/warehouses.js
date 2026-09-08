import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const warehouseSchema = z.object({
  branchId: z.string().min(1, 'Selecciona una sucursal'),
  name: z.string().trim().min(2, 'El nombre es obligatorio'),
  code: z.string().trim().min(2, 'El código es obligatorio').max(20).transform((value) => value.toUpperCase()),
  active: z.boolean().default(true),
});

// Tenant boundary: warehouses inherit company ownership through Branch.
async function findCompanyBranch(branchId, companyId) {
  return prisma.branch.findFirst({where: {id: branchId, companyId}});
}

router.get('/', requirePermission('warehouses.read'), async (request, response, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: {branch: {companyId: request.auth.companyId}},
      include: {branch: {select: {id: true, name: true, code: true, active: true}}},
      orderBy: [{branch: {name: 'asc'}}, {name: 'asc'}],
    });

    const branches = await prisma.branch.findMany({
      where: {companyId: request.auth.companyId},
      select: {id: true, name: true, code: true, active: true},
      orderBy: {name: 'asc'},
    });

    return response.json({ok: true, warehouses, branches});
  } catch (error) {
    return next(error);
  }
});

router.post('/', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const parsed = warehouseSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const branch = await findCompanyBranch(parsed.data.branchId, request.auth.companyId);
    if (!branch) return response.status(404).json({ok: false, message: 'Sucursal no encontrada'});

    const warehouse = await prisma.warehouse.create({data: parsed.data});
    await prisma.auditLog.create({
      data: {
        userId: request.auth.sub,
        action: 'CREATE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        description: `Almacén ${warehouse.name} creado`,
        ipAddress: request.ip,
      },
    });

    return response.status(201).json({ok: true, warehouse});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe un almacén con ese código en la sucursal'});
    return next(error);
  }
});

router.put('/:id', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const parsed = warehouseSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const existing = await prisma.warehouse.findFirst({
      where: {id: request.params.id, branch: {companyId: request.auth.companyId}},
    });
    if (!existing) return response.status(404).json({ok: false, message: 'Almacén no encontrado'});

    const branch = await findCompanyBranch(parsed.data.branchId, request.auth.companyId);
    if (!branch) return response.status(404).json({ok: false, message: 'Sucursal no encontrada'});

    const warehouse = await prisma.warehouse.update({where: {id: existing.id}, data: parsed.data});
    await prisma.auditLog.create({
      data: {
        userId: request.auth.sub,
        action: 'UPDATE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        description: `Almacén ${warehouse.name} actualizado`,
        ipAddress: request.ip,
      },
    });

    return response.json({ok: true, warehouse});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe un almacén con ese código en la sucursal'});
    return next(error);
  }
});

router.patch('/:id/status', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const parsed = z.object({active: z.boolean()}).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: 'Estado inválido'});

    const existing = await prisma.warehouse.findFirst({
      where: {id: request.params.id, branch: {companyId: request.auth.companyId}},
    });
    if (!existing) return response.status(404).json({ok: false, message: 'Almacén no encontrado'});

    const warehouse = await prisma.warehouse.update({where: {id: existing.id}, data: parsed.data});
    return response.json({ok: true, warehouse});
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const existing = await prisma.warehouse.findFirst({
      where: {id: request.params.id, branch: {companyId: request.auth.companyId}},
    });
    if (!existing) return response.status(404).json({ok: false, message: 'Almacén no encontrado'});

    await prisma.warehouse.delete({where: {id: existing.id}});
    await prisma.auditLog.create({
      data: {
        userId: request.auth.sub,
        action: 'DELETE',
        entity: 'Warehouse',
        entityId: existing.id,
        description: `Almacén ${existing.name} eliminado`,
        ipAddress: request.ip,
      },
    });

    return response.json({ok: true});
  } catch (error) {
    return next(error);
  }
});

export default router;
