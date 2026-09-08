import {prisma} from '../lib/prisma.js';

export function requirePermission(permissionKey) {
  return async function permissionMiddleware(request, response, next) {
    try {
      const count = await prisma.userRole.count({
        where: {
          userId: request.auth.sub,
          role: {
            permissions: {
              some: {permission: {key: permissionKey}},
            },
          },
        },
      });

      if (count === 0) {
        return response.status(403).json({ok: false, message: 'No tienes permiso para realizar esta acción'});
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
