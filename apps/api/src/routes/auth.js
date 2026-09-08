import bcrypt from 'bcryptjs';
import {Router} from 'express';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Correo inválido').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

function serializeUser(user) {
  const roles = user.roles.map(({role}) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions.map(({permission}) => permission.key),
  }));

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    company: user.company,
    roles,
    permissions: [...new Set(roles.flatMap((role) => role.permissions))],
  };
}

router.post('/login', async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      });
    }

    const user = await prisma.user.findUnique({
      where: {email: parsed.data.email},
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {include: {permission: true}},
              },
            },
          },
        },
      },
    });

    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return response.status(401).json({ok: false, message: 'Correo o contraseña incorrectos'});
    }

    const token = jwt.sign(
      {sub: user.id, companyId: user.companyId, email: user.email},
      process.env.JWT_SECRET,
      {expiresIn: '8h'},
    );

    await prisma.user.update({where: {id: user.id}, data: {lastLoginAt: new Date()}});
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        description: 'Inicio de sesión exitoso',
        ipAddress: request.ip,
      },
    });

    return response.json({ok: true, token, user: serializeUser(user)});
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: request.auth.sub},
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {include: {permission: true}},
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      return response.status(401).json({ok: false, message: 'Usuario no disponible'});
    }

    return response.json({ok: true, user: serializeUser(user)});
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, async (request, response, next) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: request.auth.sub,
        action: 'LOGOUT',
        entity: 'User',
        entityId: request.auth.sub,
        description: 'Cierre de sesión',
        ipAddress: request.ip,
      },
    });

    return response.json({ok: true});
  } catch (error) {
    return next(error);
  }
});

export default router;
