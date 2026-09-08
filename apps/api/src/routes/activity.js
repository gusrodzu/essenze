import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {requireAuthenticatedSelfService} from '../middleware/selfService.js';

const router = Router();
router.use(requireAuth);

const notificationSchema = z.object({
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
  title: z.string().trim().min(3).max(140),
  message: z.string().trim().min(3).max(500),
  link: z.string().trim().optional().nullable(),
  userId: z.string().cuid().optional().nullable(),
});

router.get('/activity', requirePermission('audit.read'), async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const entity = String(req.query.entity ?? '').trim();
    const action = String(req.query.action ?? '').trim();
    const take = Math.min(Number(req.query.take ?? 100), 250);

    const logs = await prisma.auditLog.findMany({
      where: {
        user: {companyId: req.auth.companyId},
        ...(entity ? {entity} : {}),
        ...(action ? {action} : {}),
        ...(query
          ? {
              OR: [
                {description: {contains: query, mode: 'insensitive'}},
                {entity: {contains: query, mode: 'insensitive'}},
                {action: {contains: query, mode: 'insensitive'}},
                {
                  user: {
                    OR: [
                      {firstName: {contains: query, mode: 'insensitive'}},
                      {lastName: {contains: query, mode: 'insensitive'}},
                      {email: {contains: query, mode: 'insensitive'}},
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {createdAt: 'desc'},
      take,
    });

    const [entities, actions] = await Promise.all([
      prisma.auditLog.findMany({
        where: {user: {companyId: req.auth.companyId}},
        distinct: ['entity'],
        select: {entity: true},
      }),
      prisma.auditLog.findMany({
        where: {user: {companyId: req.auth.companyId}},
        distinct: ['action'],
        select: {action: true},
      }),
    ]);

    res.json({
      ok: true,
      logs,
      filters: {
        entities: entities.map((item) => item.entity).filter(Boolean).sort(),
        actions: actions.map((item) => item.action).filter(Boolean).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        companyId: req.auth.companyId,
        OR: [{userId: req.auth.sub}, {userId: null}],
      },
      orderBy: {createdAt: 'desc'},
      take: 100,
    });

    res.json({
      ok: true,
      notifications,
      unread: notifications.filter((item) => !item.read).length,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/notifications',
  requirePermission('notifications.manage'),
  async (req, res, next) => {
    try {
      const parsed = notificationSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
        });
      }

      if (parsed.data.userId) {
        const user = await prisma.user.findFirst({
          where: {
            id: parsed.data.userId,
            companyId: req.auth.companyId,
          },
        });

        if (!user) {
          return res.status(404).json({
            ok: false,
            message: 'El usuario seleccionado no existe',
          });
        }
      }

      const notification = await prisma.notification.create({
        data: {
          ...parsed.data,
          companyId: req.auth.companyId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.auth.sub,
          action: 'CREATE',
          entity: 'Notification',
          entityId: notification.id,
          description: `Notificación creada: ${notification.title}`,
          ipAddress: req.ip,
        },
      });

      res.status(201).json({ok: true, notification});
    } catch (error) {
      next(error);
    }
  },
);

router.patch('/notifications/:id/read', requireAuthenticatedSelfService, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        companyId: req.auth.companyId,
        OR: [{userId: req.auth.sub}, {userId: null}],
      },
    });

    if (!notification) {
      return res.status(404).json({
        ok: false,
        message: 'Notificación no encontrada',
      });
    }

    const updated = await prisma.notification.update({
      where: {id: notification.id},
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({ok: true, notification: updated});
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/read-all', requireAuthenticatedSelfService, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        companyId: req.auth.companyId,
        OR: [{userId: req.auth.sub}, {userId: null}],
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/notifications/:id',
  requirePermission('notifications.manage'),
  async (req, res, next) => {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          companyId: req.auth.companyId,
        },
      });

      if (!notification) {
        return res.status(404).json({
          ok: false,
          message: 'Notificación no encontrada',
        });
      }

      await prisma.notification.delete({
        where: {id: notification.id},
      });

      res.json({ok: true});
    } catch (error) {
      next(error);
    }
  },
);

export default router;
