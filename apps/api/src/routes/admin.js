import bcrypt from 'bcryptjs';
import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const userSchema = z.object({
  firstName: z.string().trim().min(2, 'El nombre es obligatorio'),
  lastName: z.string().trim().min(2, 'El apellido es obligatorio'),
  email: z.string().trim().email('Correo inválido').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional().or(z.literal('')),
  active: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
});

const roleSchema = z.object({
  name: z.string().trim().min(2, 'El nombre del rol es obligatorio'),
  description: z.string().trim().optional().nullable(),
  permissionIds: z.array(z.string()).default([]),
});

function serializeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    roles: user.roles.map(({role}) => ({id: role.id, name: role.name})),
  };
}

router.get('/users', requirePermission('users.manage'), async (request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {companyId: request.auth.companyId},
      include: {roles: {include: {role: true}}},
      orderBy: [{active: 'desc'}, {firstName: 'asc'}],
    });
    return response.json({ok: true, users: users.map(serializeUser)});
  } catch (error) {
    return next(error);
  }
});

router.post('/users', requirePermission('users.manage'), async (request, response, next) => {
  try {
    const parsed = userSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});

    const {password, roleIds, ...data} = parsed.data;
    if (!password) return response.status(400).json({ok: false, message: 'La contraseña es obligatoria para usuarios nuevos'});

    const roles = await prisma.role.findMany({
      where:{
        id:{in:roleIds},
        users:{some:{user:{companyId:request.auth.companyId}}}
      }
    });
    if (roles.length !== roleIds.length) {
      return response.status(400).json({ok:false,message:'Uno o más roles no pertenecen a esta empresa'});
    }

    const user = await prisma.user.create({
      data: {
        ...data,
        companyId: request.auth.companyId,
        passwordHash: await bcrypt.hash(password, 12),
        roles: {create: roleIds.map((roleId) => ({roleId}))},
      },
      include: {roles: {include: {role: true}}},
    });

    await prisma.auditLog.create({data: {userId: request.auth.sub, action: 'CREATE', entity: 'User', entityId: user.id, description: `Usuario ${user.email} creado`, ipAddress: request.ip}});
    return response.status(201).json({ok: true, user: serializeUser(user)});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'El correo ya está registrado'});
    return next(error);
  }
});

router.put('/users/:id', requirePermission('users.manage'), async (request, response, next) => {
  try {
    const parsed = userSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});

    const existing = await prisma.user.findFirst({where: {id: request.params.id, companyId: request.auth.companyId}});
    if (!existing) return response.status(404).json({ok: false, message: 'Usuario no encontrado'});

    const {password, roleIds, ...data} = parsed.data;
    const passwordData = password ? {passwordHash: await bcrypt.hash(password, 12)} : {};

    const user = await prisma.$transaction(async (transaction) => {
      await transaction.userRole.deleteMany({where: {userId: existing.id}});
      return transaction.user.update({
        where: {id: existing.id},
        data: {...data, ...passwordData, roles: {create: roleIds.map((roleId) => ({roleId}))}},
        include: {roles: {include: {role: true}}},
      });
    });

    await prisma.auditLog.create({data: {userId: request.auth.sub, action: 'UPDATE', entity: 'User', entityId: user.id, description: `Usuario ${user.email} actualizado`, ipAddress: request.ip}});
    return response.json({ok: true, user: serializeUser(user)});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'El correo ya está registrado'});
    return next(error);
  }
});

router.patch('/users/:id/status', requirePermission('users.manage'), async (request, response, next) => {
  try {
    const parsed = z.object({active: z.boolean()}).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: 'Estado inválido'});
    if (request.params.id === request.auth.sub && parsed.data.active === false) return response.status(409).json({ok: false, message: 'No puedes desactivar tu propia cuenta'});

    const existing = await prisma.user.findFirst({where: {id: request.params.id, companyId: request.auth.companyId}});
    if (!existing) return response.status(404).json({ok: false, message: 'Usuario no encontrado'});
    const user = await prisma.user.update({where: {id: existing.id}, data: parsed.data});
    return response.json({ok: true, user});
  } catch (error) {
    return next(error);
  }
});

router.get('/roles', requirePermission('roles.manage'), async (request, response, next) => {
  try {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        where:{users:{some:{user:{companyId:request.auth.companyId}}}},
        include:{permissions:{include:{permission:true}},_count:{select:{users:true}}},
        orderBy:{name:'asc'}
      }),
      prisma.permission.findMany({orderBy: {key: 'asc'}}),
    ]);
    return response.json({
      ok: true,
      roles: roles.map((role) => ({...role, permissions: role.permissions.map(({permission}) => permission)})),
      permissions,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/roles', requirePermission('roles.manage'), async (request, response, next) => {
  try {
    const parsed = roleSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const {permissionIds, ...data} = parsed.data;
    const role = await prisma.role.create({
      data: {...data, permissions: {create: permissionIds.map((permissionId) => ({permissionId}))}},
      include: {permissions: {include: {permission: true}}, _count: {select: {users: true}}},
    });
    return response.status(201).json({ok: true, role: {...role, permissions: role.permissions.map(({permission}) => permission)}});
  } catch (error) {
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe un rol con ese nombre'});
    return next(error);
  }
});

router.put('/roles/:id', requirePermission('roles.manage'), async (request, response, next) => {
  try {
    const parsed = roleSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const {permissionIds, ...data} = parsed.data;
    const existingRole=await prisma.role.findFirst({
      where:{
        id:request.params.id,
        users:{some:{user:{companyId:request.auth.companyId}}}
      }
    });
    if(!existingRole)return response.status(404).json({ok:false,message:'Rol no encontrado en esta empresa'});

    const role = await prisma.$transaction(async (transaction) => {
      await transaction.rolePermission.deleteMany({where: {roleId: request.params.id}});
      return transaction.role.update({
        where: {id: request.params.id},
        data: {...data, permissions: {create: permissionIds.map((permissionId) => ({permissionId}))}},
        include: {permissions: {include: {permission: true}}, _count: {select: {users: true}}},
      });
    });
    return response.json({ok: true, role: {...role, permissions: role.permissions.map(({permission}) => permission)}});
  } catch (error) {
    if (error.code === 'P2025') return response.status(404).json({ok: false, message: 'Rol no encontrado'});
    if (error.code === 'P2002') return response.status(409).json({ok: false, message: 'Ya existe un rol con ese nombre'});
    return next(error);
  }
});

export default router;
