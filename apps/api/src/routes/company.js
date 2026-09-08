import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const companySchema = z.object({
  name: z.string().trim().min(2, 'El nombre comercial es obligatorio'),
  legalName: z.string().trim().optional().nullable(),
  taxId: z.string().trim().optional().nullable(),
  email: z.union([z.string().trim().email('Correo inválido'), z.literal('')]).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  country: z.string().trim().min(2).default('MX'),
  currency: z.string().trim().min(3).default('MXN'),
  timezone: z.string().trim().min(2).default('America/Monterrey'),
  address: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
});

const branchSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio'),
  code: z.string().trim().min(2, 'El código es obligatorio').max(20).transform((v) => v.toUpperCase()),
  address: z.string().trim().optional().nullable(),
  active: z.boolean().default(true),
});

router.get('/', async (request, response, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: {id: request.auth.companyId},
      include: {branches: {orderBy: {createdAt: 'asc'}}},
    });
    if (!company) return response.status(404).json({ok: false, message: 'Empresa no encontrada'});
    return response.json({ok: true, company});
  } catch (error) {
    return next(error);
  }
});

router.put('/', requirePermission('users.manage'), async (request, response, next) => {
  try {
    const parsed = companySchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }
    const data = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [key, value === '' ? null : value]));
    const company = await prisma.company.update({where: {id: request.auth.companyId}, data});
    await prisma.auditLog.create({
      data: {userId: request.auth.sub, action: 'UPDATE', entity: 'Company', entityId: company.id, description: 'Actualización de datos de la empresa', ipAddress: request.ip},
    });
    return response.json({ok: true, company});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'El RFC ya está registrado'});
    return next(error);
  }
});

router.post('/branches', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const parsed = branchSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const branch = await prisma.branch.create({data: {...parsed.data, companyId: request.auth.companyId}});
    await prisma.auditLog.create({data: {userId: request.auth.sub, action: 'CREATE', entity: 'Branch', entityId: branch.id, description: `Sucursal ${branch.name} creada`, ipAddress: request.ip}});
    return response.status(201).json({ok: true, branch});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe una sucursal con ese código'});
    return next(error);
  }
});

router.put('/branches/:id', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const parsed = branchSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const existing = await prisma.branch.findFirst({where: {id: request.params.id, companyId: request.auth.companyId}});
    if (!existing) return response.status(404).json({ok: false, message: 'Sucursal no encontrada'});
    const branch = await prisma.branch.update({where: {id: existing.id}, data: parsed.data});
    return response.json({ok: true, branch});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe una sucursal con ese código'});
    return next(error);
  }
});

router.delete('/branches/:id', requirePermission('warehouses.manage'), async (request, response, next) => {
  try {
    const branch = await prisma.branch.findFirst({where: {id: request.params.id, companyId: request.auth.companyId}, include: {_count: {select: {warehouses: true}}}});
    if (!branch) return response.status(404).json({ok: false, message: 'Sucursal no encontrada'});
    if (branch._count.warehouses > 0) return response.status(409).json({ok: false, message: 'No se puede eliminar una sucursal que tiene almacenes'});
    await prisma.branch.delete({where: {id: branch.id}});
    return response.json({ok: true});
  } catch (error) {
    return next(error);
  }
});

export default router;
