import {Router} from 'express';
import {z} from 'zod';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, '../../uploads/projects');
await fs.mkdir(uploadsDirectory, {recursive: true});

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirectory),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'archivo';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {fileSize: 15 * 1024 * 1024, files: 1},
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Formato no permitido. Usa PDF, imagen, Word, Excel o TXT.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

const projectSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
  managerId: z.string().cuid().optional().nullable(),
  parentProjectId: z.string().cuid().optional().nullable(),
  status: z.enum(['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED']).default('PLANNING'),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().min(0).default(0),
  plannedHours: z.coerce.number().min(0).default(0),
  tags: z.string().trim().max(500).optional().nullable(),
});

const taskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  parentTaskId: z.string().cuid().optional().nullable(),
  status: z.enum(['TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED']).default('TODO'),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedHours: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const timeSchema = z.object({
  taskId: z.string().cuid().optional().nullable(),
  employeeId: z.string().cuid(),
  date: z.coerce.date(),
  hours: z.coerce.number().positive().max(24),
  hourlyCost: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const memberSchema = z.object({
  employeeId: z.string().cuid(),
  role: z.string().trim().max(100).optional().nullable(),
  allocationPercent: z.coerce.number().int().min(1).max(100).default(100),
});

const linkSchema = z.object({
  type: z.enum(['SALES_ORDER','PURCHASE_ORDER']),
  referenceId: z.string().cuid(),
});

async function audit(req, action, entity, entityId, description, metadata) {
  await prisma.auditLog.create({
    data: {
      userId: req.auth.sub,
      action,
      entity,
      entityId,
      description,
      ipAddress: req.ip,
      metadata: metadata ?? undefined,
    },
  });
}

const projectInclude = {
  customer: true,
  manager: {include: {department: true, position: true}},
  parentProject: {select: {id: true, code: true, name: true}},
  subprojects: {select: {id: true, code: true, name: true, status: true, progress: true}},
  members: {include: {employee: {include: {department: true, position: true}}}},
  tasks: {
    include: {
      assignee: {include: {department: true, position: true}},
      timeEntries: true,
    },
    orderBy: [{sortOrder: 'asc'}, {createdAt: 'asc'}],
  },
  timeEntries: {
    include: {
      employee: {include: {department: true, position: true}},
      task: {select: {id: true, title: true}},
      createdBy: {select: {firstName: true, lastName: true}},
    },
    orderBy: {date: 'desc'},
  },
  comments: {
    include: {createdBy: {select: {firstName: true, lastName: true}}},
    orderBy: {createdAt: 'desc'},
  },
  documents: {
    include: {uploadedBy: {select: {firstName: true, lastName: true}}},
    orderBy: {createdAt: 'desc'},
  },
  salesOrders: {
    include: {salesOrder: {include: {customer: true}}},
  },
  purchaseOrders: {
    include: {purchaseOrder: {include: {supplier: true}}},
  },
};

function number(value) {
  return Number(value ?? 0);
}

function normalizeProject(project) {
  const productiveTasks = project.tasks.filter((task) => task.status !== 'CANCELLED');
  const completedTasks = productiveTasks.filter((task) => task.status === 'DONE');
  const taskProgress = productiveTasks.length
    ? Math.round((completedTasks.length / productiveTasks.length) * 100)
    : project.progress;

  const laborHours = project.timeEntries.reduce((sum, entry) => sum + number(entry.hours), 0);
  const laborCost = project.timeEntries.reduce(
    (sum, entry) => sum + number(entry.hours) * number(entry.hourlyCost),
    0,
  );
  const purchaseCost = project.purchaseOrders.reduce(
    (sum, link) => sum + number(link.purchaseOrder.total),
    0,
  );
  const revenue = project.salesOrders.reduce(
    (sum, link) => sum + number(link.salesOrder.total),
    0,
  );
  const actualCost = laborCost + purchaseCost;
  const margin = revenue - actualCost;
  const budget = number(project.budget);
  const budgetUsed = budget > 0 ? Math.round((actualCost / budget) * 100) : 0;
  const overdueTasks = project.tasks.filter(
    (task) =>
      task.dueDate &&
      !['DONE','CANCELLED'].includes(task.status) &&
      new Date(task.dueDate) < new Date(),
  ).length;

  return {
    ...project,
    metrics: {
      taskProgress,
      tasksTotal: productiveTasks.length,
      tasksDone: completedTasks.length,
      overdueTasks,
      laborHours,
      laborCost,
      purchaseCost,
      actualCost,
      revenue,
      margin,
      budgetUsed,
      plannedHours: number(project.plannedHours),
    },
  };
}

async function ensureProject(req, id) {
  return prisma.project.findFirst({
    where: {id, companyId: req.auth.companyId},
    include: projectInclude,
  });
}

async function recalculateProgress(projectId) {
  const tasks = await prisma.projectTask.findMany({
    where: {projectId, status: {not: 'CANCELLED'}},
    select: {status: true},
  });
  if (!tasks.length) return;
  const done = tasks.filter((task) => task.status === 'DONE').length;
  await prisma.project.update({
    where: {id: projectId},
    data: {progress: Math.round((done / tasks.length) * 100)},
  });
}

router.get('/dashboard', requirePermission('projects.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const [projectsRaw, customers, employees, salesOrders, purchaseOrders] = await Promise.all([
      prisma.project.findMany({
        where: {companyId},
        include: projectInclude,
        orderBy: [{status: 'asc'}, {dueDate: 'asc'}, {createdAt: 'desc'}],
      }),
      prisma.customer.findMany({
        where: {companyId, active: true},
        orderBy: [{commercialName: 'asc'}, {legalName: 'asc'}],
      }),
      prisma.employee.findMany({
        where: {companyId, status: 'ACTIVE'},
        include: {department: true, position: true},
        orderBy: [{lastName: 'asc'}, {firstName: 'asc'}],
      }),
      prisma.salesOrder.findMany({
        where: {companyId, status: {not: 'CANCELLED'}},
        include: {customer: true},
        orderBy: {orderDate: 'desc'},
        take: 100,
      }),
      prisma.purchaseOrder.findMany({
        where: {companyId, status: {not: 'CANCELLED'}},
        include: {supplier: true},
        orderBy: {orderDate: 'desc'},
        take: 100,
      }),
    ]);

    const projects = projectsRaw.map(normalizeProject);
    const active = projects.filter((project) => ['PLANNING','ACTIVE','ON_HOLD'].includes(project.status));
    const totals = projects.reduce(
      (acc, project) => {
        acc.budget += number(project.budget);
        acc.actualCost += project.metrics.actualCost;
        acc.revenue += project.metrics.revenue;
        acc.hours += project.metrics.laborHours;
        acc.overdueTasks += project.metrics.overdueTasks;
        return acc;
      },
      {budget: 0, actualCost: 0, revenue: 0, hours: 0, overdueTasks: 0},
    );

    res.json({
      ok: true,
      projects,
      customers,
      employees,
      salesOrders,
      purchaseOrders,
      summary: {
        total: projects.length,
        active: active.length,
        completed: projects.filter((p) => p.status === 'COMPLETED').length,
        ...totals,
        margin: totals.revenue - totals.actualCost,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('projects.read'), async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {companyId: req.auth.companyId},
      include: projectInclude,
      orderBy: {updatedAt: 'desc'},
    });
    res.json({ok: true, projects: projects.map(normalizeProject)});
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requirePermission('projects.read'), async (req, res, next) => {
  try {
    const project = await ensureProject(req, req.params.id);
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});
    res.json({ok: true, project: normalizeProject(project)});
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {id: parsed.data.customerId, companyId: req.auth.companyId},
      });
      if (!customer) return res.status(404).json({ok: false, message: 'Cliente no encontrado'});
    }
    if (parsed.data.managerId) {
      const employee = await prisma.employee.findFirst({
        where: {id: parsed.data.managerId, companyId: req.auth.companyId},
      });
      if (!employee) return res.status(404).json({ok: false, message: 'Responsable no encontrado'});
    }
    if (parsed.data.parentProjectId) {
      const parent = await prisma.project.findFirst({
        where: {id: parsed.data.parentProjectId, companyId: req.auth.companyId},
      });
      if (!parent) return res.status(404).json({ok: false, message: 'Proyecto padre no encontrado'});
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        description: parsed.data.description || null,
        customerId: parsed.data.customerId || null,
        managerId: parsed.data.managerId || null,
        parentProjectId: parsed.data.parentProjectId || null,
        tags: parsed.data.tags || null,
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
      },
      include: projectInclude,
    });

    await audit(req, 'CREATE', 'Project', project.id, `Proyecto ${project.code} creado`);
    res.status(201).json({ok: true, project: normalizeProject(project)});
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ok: false, message: 'Ya existe un proyecto con ese código'});
    }
    next(error);
  }
});

router.put('/:id', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }
    const exists = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!exists) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});
    if (parsed.data.parentProjectId === exists.id) {
      return res.status(400).json({ok: false, message: 'Un proyecto no puede ser su propio proyecto padre'});
    }

    const project = await prisma.project.update({
      where: {id: exists.id},
      data: {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        description: parsed.data.description || null,
        customerId: parsed.data.customerId || null,
        managerId: parsed.data.managerId || null,
        parentProjectId: parsed.data.parentProjectId || null,
        tags: parsed.data.tags || null,
        completedAt: parsed.data.status === 'COMPLETED' ? exists.completedAt ?? new Date() : null,
      },
      include: projectInclude,
    });
    await audit(req, 'UPDATE', 'Project', project.id, `Proyecto ${project.code} actualizado`);
    res.json({ok: true, project: normalizeProject(project)});
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ok: false, message: 'Ya existe un proyecto con ese código'});
    }
    next(error);
  }
});

router.patch('/:id/status', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.enum(['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED']),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Estado inválido'});

    const exists = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!exists) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const project = await prisma.project.update({
      where: {id: exists.id},
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === 'COMPLETED' ? new Date() : null,
      },
      include: projectInclude,
    });
    await audit(req, 'UPDATE', 'Project', project.id, `Proyecto ${project.code}: ${parsed.data.status}`);
    res.json({ok: true, project: normalizeProject(project)});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/tasks', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    if (parsed.data.assigneeId) {
      const employee = await prisma.employee.findFirst({
        where: {id: parsed.data.assigneeId, companyId: req.auth.companyId},
      });
      if (!employee) return res.status(404).json({ok: false, message: 'Responsable no encontrado'});
    }

    const task = await prisma.projectTask.create({
      data: {
        ...parsed.data,
        projectId: project.id,
        description: parsed.data.description || null,
        assigneeId: parsed.data.assigneeId || null,
        parentTaskId: parsed.data.parentTaskId || null,
        completedAt: parsed.data.status === 'DONE' ? new Date() : null,
      },
      include: {assignee: true, timeEntries: true},
    });
    await recalculateProgress(project.id);
    await audit(req, 'CREATE', 'ProjectTask', task.id, `Tarea creada en ${project.code}: ${task.title}`);
    res.status(201).json({ok: true, task});
  } catch (error) {
    next(error);
  }
});

router.put('/:id/tasks/:taskId', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const taskExists = await prisma.projectTask.findFirst({
      where: {id: req.params.taskId, projectId: project.id},
    });
    if (!taskExists) return res.status(404).json({ok: false, message: 'Tarea no encontrada'});

    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const task = await prisma.projectTask.update({
      where: {id: taskExists.id},
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        assigneeId: parsed.data.assigneeId || null,
        parentTaskId: parsed.data.parentTaskId || null,
        completedAt:
          parsed.data.status === 'DONE'
            ? taskExists.completedAt ?? new Date()
            : null,
      },
      include: {assignee: true, timeEntries: true},
    });
    await recalculateProgress(project.id);
    await audit(req, 'UPDATE', 'ProjectTask', task.id, `Tarea actualizada: ${task.title}`);
    res.json({ok: true, task});
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/tasks/:taskId/status', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.enum(['TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED']),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Estado de tarea inválido'});

    const task = await prisma.projectTask.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.id,
        project: {companyId: req.auth.companyId},
      },
    });
    if (!task) return res.status(404).json({ok: false, message: 'Tarea no encontrada'});

    const updated = await prisma.projectTask.update({
      where: {id: task.id},
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === 'DONE' ? task.completedAt ?? new Date() : null,
      },
    });
    await recalculateProgress(req.params.id);
    await audit(req, 'UPDATE', 'ProjectTask', updated.id, `Tarea ${updated.title}: ${parsed.data.status}`);
    res.json({ok: true, task: updated});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/time-entries', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const parsed = timeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }

    const employee = await prisma.employee.findFirst({
      where: {id: parsed.data.employeeId, companyId: req.auth.companyId},
    });
    if (!employee) return res.status(404).json({ok: false, message: 'Empleado no encontrado'});

    if (parsed.data.taskId) {
      const task = await prisma.projectTask.findFirst({
        where: {id: parsed.data.taskId, projectId: project.id},
      });
      if (!task) return res.status(404).json({ok: false, message: 'Tarea no encontrada'});
    }

    const entry = await prisma.projectTimeEntry.create({
      data: {
        ...parsed.data,
        projectId: project.id,
        taskId: parsed.data.taskId || null,
        notes: parsed.data.notes || null,
        createdById: req.auth.sub,
      },
      include: {employee: true, task: true},
    });
    await audit(req, 'CREATE', 'ProjectTimeEntry', entry.id, `${parsed.data.hours} h registradas en ${project.code}`);
    res.status(201).json({ok: true, entry});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const parsed = memberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    }
    const employee = await prisma.employee.findFirst({
      where: {id: parsed.data.employeeId, companyId: req.auth.companyId},
    });
    if (!employee) return res.status(404).json({ok: false, message: 'Empleado no encontrado'});

    const member = await prisma.projectMember.upsert({
      where: {projectId_employeeId: {projectId: project.id, employeeId: employee.id}},
      update: {
        role: parsed.data.role || null,
        allocationPercent: parsed.data.allocationPercent,
      },
      create: {
        projectId: project.id,
        employeeId: employee.id,
        role: parsed.data.role || null,
        allocationPercent: parsed.data.allocationPercent,
      },
      include: {employee: true},
    });
    await audit(req, 'UPDATE', 'Project', project.id, `${employee.firstName} ${employee.lastName} asignado a ${project.code}`);
    res.status(201).json({ok: true, member});
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:memberId', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const member = await prisma.projectMember.findFirst({
      where: {
        id: req.params.memberId,
        projectId: req.params.id,
        project: {companyId: req.auth.companyId},
      },
    });
    if (!member) return res.status(404).json({ok: false, message: 'Miembro no encontrado'});
    await prisma.projectMember.delete({where: {id: member.id}});
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      taskId: z.string().cuid().optional().nullable(),
      body: z.string().trim().min(1).max(4000),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Comentario inválido'});
    }
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    const comment = await prisma.projectComment.create({
      data: {
        projectId: project.id,
        taskId: parsed.data.taskId || null,
        createdById: req.auth.sub,
        body: parsed.data.body,
      },
      include: {createdBy: {select: {firstName: true, lastName: true}}},
    });
    await audit(req, 'CREATE', 'ProjectComment', comment.id, `Comentario agregado a ${project.code}`);
    res.status(201).json({ok: true, comment});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/links', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const parsed = linkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Referencia inválida'});

    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});

    if (parsed.data.type === 'SALES_ORDER') {
      const order = await prisma.salesOrder.findFirst({
        where: {id: parsed.data.referenceId, companyId: req.auth.companyId},
      });
      if (!order) return res.status(404).json({ok: false, message: 'Pedido de venta no encontrado'});
      const link = await prisma.projectSalesOrder.upsert({
        where: {
          projectId_salesOrderId: {projectId: project.id, salesOrderId: order.id},
        },
        update: {},
        create: {projectId: project.id, salesOrderId: order.id},
      });
      await audit(req, 'UPDATE', 'Project', project.id, `Pedido ${order.folio} vinculado`);
      return res.status(201).json({ok: true, link});
    }

    const order = await prisma.purchaseOrder.findFirst({
      where: {id: parsed.data.referenceId, companyId: req.auth.companyId},
    });
    if (!order) return res.status(404).json({ok: false, message: 'Orden de compra no encontrada'});
    const link = await prisma.projectPurchaseOrder.upsert({
      where: {
        projectId_purchaseOrderId: {projectId: project.id, purchaseOrderId: order.id},
      },
      update: {},
      create: {projectId: project.id, purchaseOrderId: order.id},
    });
    await audit(req, 'UPDATE', 'Project', project.id, `Orden ${order.folio} vinculada`);
    res.status(201).json({ok: true, link});
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/links/:type/:linkId', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});
    if (req.params.type === 'sales') {
      const link = await prisma.projectSalesOrder.findFirst({
        where: {id: req.params.linkId, projectId: project.id},
      });
      if (!link) return res.status(404).json({ok: false, message: 'Vínculo no encontrado'});
      await prisma.projectSalesOrder.delete({where: {id: link.id}});
    } else if (req.params.type === 'purchase') {
      const link = await prisma.projectPurchaseOrder.findFirst({
        where: {id: req.params.linkId, projectId: project.id},
      });
      if (!link) return res.status(404).json({ok: false, message: 'Vínculo no encontrado'});
      await prisma.projectPurchaseOrder.delete({where: {id: link.id}});
    } else {
      return res.status(400).json({ok: false, message: 'Tipo de vínculo inválido'});
    }
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

router.post('/:id/documents/upload', requirePermission('projects.manage'), (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        ok: false,
        message: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 15 MB.' : error.message,
      });
    }
    if (!req.file) return res.status(400).json({ok: false, message: 'Selecciona un archivo'});
    next();
  });
}, async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!project) {
      await fs.unlink(req.file.path).catch(() => undefined);
      return res.status(404).json({ok: false, message: 'Proyecto no encontrado'});
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/projects/${encodeURIComponent(req.file.filename)}`;
    const document = await prisma.projectDocument.create({
      data: {
        projectId: project.id,
        uploadedById: req.auth.sub,
        name: req.body.name?.trim() || req.file.originalname,
        fileName: req.file.originalname,
        fileUrl,
        mimeType: req.file.mimetype,
        size: req.file.size,
        notes: req.body.notes?.trim() || null,
      },
      include: {uploadedBy: {select: {firstName: true, lastName: true}}},
    });
    await audit(req, 'CREATE', 'ProjectDocument', document.id, `Archivo agregado a ${project.code}: ${document.name}`);
    res.status(201).json({ok: true, document});
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/documents/:documentId', requirePermission('projects.manage'), async (req, res, next) => {
  try {
    const document = await prisma.projectDocument.findFirst({
      where: {
        id: req.params.documentId,
        projectId: req.params.id,
        project: {companyId: req.auth.companyId},
      },
    });
    if (!document) return res.status(404).json({ok: false, message: 'Archivo no encontrado'});

    await prisma.projectDocument.delete({where: {id: document.id}});
    if (document.fileUrl?.includes('/uploads/projects/')) {
      const filename = decodeURIComponent(document.fileUrl.split('/uploads/projects/').pop().split('?')[0]);
      await fs.unlink(path.join(uploadsDirectory, path.basename(filename))).catch(() => undefined);
    }
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

export default router;
