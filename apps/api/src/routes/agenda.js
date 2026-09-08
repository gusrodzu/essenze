import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const DAY = 24 * 60 * 60 * 1000;

const agendaEventSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  allDay: z.boolean().default(false),
  priority: z.enum(['LOW','NORMAL','HIGH','URGENT']).default('NORMAL'),
  reminderMinutes: z.coerce.number().int().min(0).max(43200).optional().nullable(),
  assigneeEmployeeId: z.string().cuid().optional().nullable(),
  status: z.enum(['ACTIVE','COMPLETED','CANCELLED']).default('ACTIVE'),
});

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function partyName(row) {
  return row?.commercialName || row?.legalName || 'Sin tercero';
}

function employeeName(employee) {
  if (!employee) return 'RR. HH.';
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'RR. HH.';
}

function agendaItem({id, module, type, title, meta, date, route, tone = 'blue', priority = 'normal', ...extra}) {
  return {
    id,
    module,
    type,
    title,
    meta: meta || module,
    date,
    route,
    tone,
    priority,
    source: extra.source || 'system',
    editable: Boolean(extra.editable),
    ...extra,
  };
}

router.get('/meta', async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {companyId: req.auth.companyId, status: {not: 'TERMINATED'}},
      select: {id: true, employeeNumber: true, firstName: true, lastName: true, email: true},
      orderBy: [{lastName: 'asc'}, {firstName: 'asc'}],
      take: 500,
    });
    res.json({ok: true, employees});
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const now = new Date();
    const todayStart = startOfDay(now);
    const pastDays = clamp(req.query.pastDays, 0, 365, 14);
    const days = clamp(req.query.days, 7, 365, 60);
    const take = clamp(req.query.take, 1, 500, 30);
    const requestedFrom = req.query.from ? new Date(req.query.from) : null;
    const requestedTo = req.query.to ? new Date(req.query.to) : null;
    const hasExplicitRange =
      requestedFrom && requestedTo &&
      !Number.isNaN(requestedFrom.getTime()) &&
      !Number.isNaN(requestedTo.getTime()) &&
      requestedTo >= requestedFrom;
    const from = hasExplicitRange ? startOfDay(requestedFrom) : new Date(todayStart.getTime() - pastDays * DAY);
    const to = hasExplicitRange ? endOfDay(requestedTo) : endOfDay(new Date(todayStart.getTime() + days * DAY));
    const range = {gte: from, lte: to};

    const [
      receivables,
      payables,
      salesActivities,
      marketingEvents,
      projectTasks,
      projects,
      purchaseRequests,
      purchaseOrders,
      salesOrders,
      salesQuotes,
      payrollPeriods,
      leaveRequests,
      employeeDocuments,
      productionOrders,
    ] = await Promise.all([
      prisma.accountsReceivable.findMany({
        where: {companyId, status: {notIn: ['PAID', 'CANCELLED']}, dueDate: range},
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          status: true,
          customer: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {dueDate: 'asc'},
        take: 80,
      }),
      prisma.accountsPayable.findMany({
        where: {companyId, status: {notIn: ['PAID', 'CANCELLED']}, dueDate: range},
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          status: true,
          supplier: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {dueDate: 'asc'},
        take: 80,
      }),
      prisma.salesActivity.findMany({
        where: {companyId, completedAt: null, dueAt: range},
        select: {
          id: true,
          title: true,
          type: true,
          dueAt: true,
          prospect: {select: {name: true, companyName: true}},
          customer: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {dueAt: 'asc'},
        take: 80,
      }),
      prisma.marketingCalendarEvent.findMany({
        where: {companyId, completedAt: null, startAt: range},
        select: {id: true, title: true, type: true, startAt: true, channel: true, ownerName: true},
        orderBy: {startAt: 'asc'},
        take: 80,
      }),
      prisma.projectTask.findMany({
        where: {
          project: {companyId},
          status: {notIn: ['DONE', 'CANCELLED']},
          dueDate: range,
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          project: {select: {name: true, code: true}},
          assignee: {select: {firstName: true, lastName: true}},
        },
        orderBy: {dueDate: 'asc'},
        take: 100,
      }),
      prisma.project.findMany({
        where: {companyId, status: {notIn: ['COMPLETED', 'CANCELLED']}, dueDate: range},
        select: {id: true, code: true, name: true, dueDate: true, priority: true},
        orderBy: {dueDate: 'asc'},
        take: 60,
      }),
      prisma.purchaseRequest.findMany({
        where: {
          companyId,
          status: {in: ['DRAFT', 'PENDING', 'APPROVED']},
          requiredDate: range,
        },
        select: {id: true, folio: true, title: true, requiredDate: true, priority: true},
        orderBy: {requiredDate: 'asc'},
        take: 60,
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId,
          status: {notIn: ['RECEIVED', 'CANCELLED']},
          expectedDate: range,
        },
        select: {
          id: true,
          folio: true,
          expectedDate: true,
          supplier: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {expectedDate: 'asc'},
        take: 60,
      }),
      prisma.salesOrder.findMany({
        where: {
          companyId,
          status: {notIn: ['DELIVERED', 'INVOICED', 'CANCELLED']},
          deliveryDate: range,
        },
        select: {
          id: true,
          folio: true,
          deliveryDate: true,
          customer: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {deliveryDate: 'asc'},
        take: 60,
      }),
      prisma.salesQuote.findMany({
        where: {
          companyId,
          status: {in: ['DRAFT', 'SENT']},
          validUntil: range,
        },
        select: {
          id: true,
          folio: true,
          validUntil: true,
          customer: {select: {commercialName: true, legalName: true}},
        },
        orderBy: {validUntil: 'asc'},
        take: 60,
      }),
      prisma.payrollPeriod.findMany({
        where: {companyId, status: {notIn: ['PAID', 'CANCELLED']}, paymentDate: range},
        select: {id: true, folio: true, name: true, paymentDate: true, status: true},
        orderBy: {paymentDate: 'asc'},
        take: 40,
      }),
      prisma.leaveRequest.findMany({
        where: {companyId, status: {in: ['PENDING', 'APPROVED']}, startDate: range},
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true,
          employee: {select: {firstName: true, lastName: true}},
        },
        orderBy: {startDate: 'asc'},
        take: 60,
      }),
      prisma.employeeDocument.findMany({
        where: {
          companyId,
          status: {notIn: ['EXPIRED', 'REJECTED']},
          expiresAt: range,
        },
        select: {
          id: true,
          name: true,
          type: true,
          expiresAt: true,
          employee: {select: {firstName: true, lastName: true}},
        },
        orderBy: {expiresAt: 'asc'},
        take: 60,
      }),
      prisma.productionOrder.findMany({
        where: {
          companyId,
          status: {notIn: ['COMPLETED', 'CANCELLED']},
          plannedEndAt: range,
        },
        select: {id: true, folio: true, plannedEndAt: true, priority: true, product: {select: {name: true}}},
        orderBy: {plannedEndAt: 'asc'},
        take: 60,
      }),
    ]);

    const manualEvents = await prisma.agendaEvent.findMany({
      where: {
        companyId,
        status: {not: 'CANCELLED'},
        startAt: range,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        allDay: true,
        priority: true,
        status: true,
        reminderMinutes: true,
        reminderSentAt: true,
        assigneeEmployeeId: true,
        assignee: {select: {firstName: true, lastName: true, employeeNumber: true}},
        createdById: true,
      },
      orderBy: {startAt: 'asc'},
      take: 500,
    });

    const items = [
      ...manualEvents.map((row) => agendaItem({
        id: `manual-${row.id}`,
        rawId: row.id,
        module: 'Agenda',
        type: 'EVENTO',
        title: row.title,
        meta: row.assignee ? `Responsable · ${employeeName(row.assignee)}` : (row.description || 'Evento manual'),
        date: row.startAt,
        route: '/agenda',
        tone: row.priority === 'URGENT' ? 'rose' : row.priority === 'HIGH' ? 'orange' : 'indigo',
        priority: ['HIGH','URGENT'].includes(row.priority) ? 'high' : 'normal',
        source: 'manual',
        editable: true,
        description: row.description,
        endAt: row.endAt,
        allDay: row.allDay,
        eventPriority: row.priority,
        status: row.status,
        reminderMinutes: row.reminderMinutes,
        reminderSentAt: row.reminderSentAt,
        assigneeEmployeeId: row.assigneeEmployeeId,
        createdById: row.createdById,
      })),
      ...receivables.map((row) => agendaItem({
        id: `receivable-${row.id}`,
        module: 'Finanzas',
        type: 'COBRO',
        title: `Cobro ${row.invoiceNumber}`,
        meta: partyName(row.customer),
        date: row.dueDate,
        route: '/finanzas/cuentas-por-cobrar',
        tone: 'green',
        priority: row.status === 'OVERDUE' ? 'high' : 'normal',
      })),
      ...payables.map((row) => agendaItem({
        id: `payable-${row.id}`,
        module: 'Finanzas',
        type: 'PAGO',
        title: `Pago ${row.invoiceNumber}`,
        meta: partyName(row.supplier),
        date: row.dueDate,
        route: '/finanzas/cuentas-por-pagar',
        tone: 'orange',
        priority: row.status === 'OVERDUE' ? 'high' : 'normal',
      })),
      ...salesActivities.map((row) => agendaItem({
        id: `crm-${row.id}`,
        module: 'CRM',
        type: row.type,
        title: row.title,
        meta: row.prospect?.companyName || row.prospect?.name || partyName(row.customer),
        date: row.dueAt,
        route: '/crm',
        tone: 'green',
      })),
      ...marketingEvents.map((row) => agendaItem({
        id: `marketing-${row.id}`,
        module: 'Marketing',
        type: row.type,
        title: row.title,
        meta: row.channel || row.ownerName || 'Marketing',
        date: row.startAt,
        route: '/marketing',
        tone: 'pink',
      })),
      ...projectTasks.map((row) => agendaItem({
        id: `project-task-${row.id}`,
        module: 'Proyectos',
        type: 'TAREA',
        title: row.title,
        meta: `${row.project.code} · ${row.project.name}${row.assignee ? ` · ${employeeName(row.assignee)}` : ''}`,
        date: row.dueDate,
        route: '/proyectos',
        tone: 'purple',
        priority: ['HIGH', 'CRITICAL'].includes(row.priority) ? 'high' : 'normal',
      })),
      ...projects.map((row) => agendaItem({
        id: `project-${row.id}`,
        module: 'Proyectos',
        type: 'HITO',
        title: `Entrega ${row.code}`,
        meta: row.name,
        date: row.dueDate,
        route: '/proyectos',
        tone: 'purple',
        priority: ['HIGH', 'CRITICAL'].includes(row.priority) ? 'high' : 'normal',
      })),
      ...purchaseRequests.map((row) => agendaItem({
        id: `purchase-request-${row.id}`,
        module: 'Compras',
        type: 'SOLPED',
        title: row.folio,
        meta: row.title,
        date: row.requiredDate,
        route: '/compras/solicitudes',
        tone: 'orange',
        priority: ['HIGH', 'URGENT'].includes(row.priority) ? 'high' : 'normal',
      })),
      ...purchaseOrders.map((row) => agendaItem({
        id: `purchase-order-${row.id}`,
        module: 'Compras',
        type: 'RECEPCIÓN',
        title: `Recepción ${row.folio}`,
        meta: partyName(row.supplier),
        date: row.expectedDate,
        route: '/compras/ordenes',
        tone: 'amber',
      })),
      ...salesOrders.map((row) => agendaItem({
        id: `sales-order-${row.id}`,
        module: 'Ventas',
        type: 'ENTREGA',
        title: `Entrega ${row.folio}`,
        meta: partyName(row.customer),
        date: row.deliveryDate,
        route: '/ventas',
        tone: 'violet',
      })),
      ...salesQuotes.map((row) => agendaItem({
        id: `sales-quote-${row.id}`,
        module: 'Ventas',
        type: 'COTIZACIÓN',
        title: `Vence ${row.folio}`,
        meta: partyName(row.customer),
        date: row.validUntil,
        route: '/ventas',
        tone: 'violet',
      })),
      ...payrollPeriods.map((row) => agendaItem({
        id: `payroll-${row.id}`,
        module: 'RR. HH.',
        type: 'NÓMINA',
        title: row.name || row.folio,
        meta: `Pago de nómina · ${row.folio}`,
        date: row.paymentDate,
        route: '/recursos-humanos/prenomina',
        tone: 'blue',
      })),
      ...leaveRequests.map((row) => agendaItem({
        id: `leave-${row.id}`,
        module: 'RR. HH.',
        type: 'AUSENCIA',
        title: employeeName(row.employee),
        meta: `${row.type} · ${row.status === 'PENDING' ? 'Pendiente' : 'Aprobada'}`,
        date: row.startDate,
        route: '/recursos-humanos/operacion',
        tone: 'blue',
      })),
      ...employeeDocuments.map((row) => agendaItem({
        id: `employee-document-${row.id}`,
        module: 'RR. HH.',
        type: 'DOCUMENTO',
        title: `Vence ${row.name}`,
        meta: employeeName(row.employee),
        date: row.expiresAt,
        route: '/recursos-humanos/expedientes',
        tone: 'cyan',
      })),
      ...productionOrders.map((row) => agendaItem({
        id: `production-${row.id}`,
        module: 'Producción',
        type: 'PRODUCCIÓN',
        title: `Finalizar ${row.folio}`,
        meta: row.product?.name || 'Orden de producción',
        date: row.plannedEndAt,
        route: '/produccion',
        tone: 'rose',
        priority: ['HIGH', 'CRITICAL'].includes(row.priority) ? 'high' : 'normal',
      })),
    ].filter((item) => item.date);

    const todayEnd = endOfDay(now);
    const next7End = endOfDay(new Date(todayStart.getTime() + 7 * DAY));

    const enriched = items.map((item) => {
      const date = new Date(item.date);
      const overdue = date < todayStart && item.status !== 'COMPLETED';
      const today = date >= todayStart && date <= todayEnd;
      return {...item, overdue, today};
    });

    enriched.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.overdue && b.overdue) return new Date(b.date) - new Date(a.date);
      return new Date(a.date) - new Date(b.date);
    });

    res.json({
      ok: true,
      generatedAt: now.toISOString(),
      window: {from: from.toISOString(), to: to.toISOString()},
      summary: {
        total: enriched.length,
        overdue: enriched.filter((item) => item.overdue).length,
        today: enriched.filter((item) => item.today).length,
        manual: enriched.filter((item) => item.source === 'manual').length,
        next7: enriched.filter((item) => {
          const date = new Date(item.date);
          return date >= todayStart && date <= next7End;
        }).length,
      },
      items: enriched.slice(0, take),
    });
  } catch (error) {
    next(error);
  }
});


async function validateAssignee(companyId, employeeId) {
  if (!employeeId) return null;
  return prisma.employee.findFirst({
    where: {id: employeeId, companyId, status: {not: 'TERMINATED'}},
    select: {id: true},
  });
}

function normalizeEventInput(parsed) {
  if (parsed.endAt && parsed.endAt < parsed.startAt) {
    const error = new Error('La fecha de término no puede ser anterior al inicio');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }
  return {
    ...parsed,
    description: parsed.description || null,
    endAt: parsed.endAt || null,
    reminderMinutes: parsed.reminderMinutes ?? null,
    assigneeEmployeeId: parsed.assigneeEmployeeId || null,
  };
}

router.post('/events', async (req, res, next) => {
  try {
    const parsed = agendaEventSchema.parse(req.body);
    const data = normalizeEventInput(parsed);
    if (data.assigneeEmployeeId && !(await validateAssignee(req.auth.companyId, data.assigneeEmployeeId))) {
      return res.status(400).json({ok: false, message: 'El responsable no pertenece a la empresa'});
    }
    const event = await prisma.agendaEvent.create({
      data: {
        ...data,
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
      },
      include: {assignee: {select: {id: true, firstName: true, lastName: true, employeeNumber: true}}},
    });
    res.status(201).json({ok: true, event});
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ok: false, message: 'Revisa los datos del evento'});
    }
    next(error);
  }
});

router.put('/events/:id', async (req, res, next) => {
  try {
    const existing = await prisma.agendaEvent.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
      select: {id: true, startAt: true, reminderMinutes: true},
    });
    if (!existing) return res.status(404).json({ok: false, message: 'Evento no encontrado'});

    const parsed = agendaEventSchema.parse(req.body);
    const data = normalizeEventInput(parsed);
    if (data.assigneeEmployeeId && !(await validateAssignee(req.auth.companyId, data.assigneeEmployeeId))) {
      return res.status(400).json({ok: false, message: 'El responsable no pertenece a la empresa'});
    }

    const reminderChanged =
      existing.startAt.getTime() !== data.startAt.getTime() ||
      existing.reminderMinutes !== data.reminderMinutes;

    const event = await prisma.agendaEvent.update({
      where: {id: existing.id},
      data: {...data, ...(reminderChanged ? {reminderSentAt: null} : {})},
      include: {assignee: {select: {id: true, firstName: true, lastName: true, employeeNumber: true}}},
    });
    res.json({ok: true, event});
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ok: false, message: 'Revisa los datos del evento'});
    }
    next(error);
  }
});

router.patch('/events/:id/status', async (req, res, next) => {
  try {
    const status = z.enum(['ACTIVE','COMPLETED','CANCELLED']).parse(req.body?.status);
    const existing = await prisma.agendaEvent.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
      select: {id: true},
    });
    if (!existing) return res.status(404).json({ok: false, message: 'Evento no encontrado'});
    const event = await prisma.agendaEvent.update({where: {id: existing.id}, data: {status}});
    res.json({ok: true, event});
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ok: false, message: 'Estado inválido'});
    }
    next(error);
  }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    const existing = await prisma.agendaEvent.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
      select: {id: true},
    });
    if (!existing) return res.status(404).json({ok: false, message: 'Evento no encontrado'});
    await prisma.agendaEvent.update({where: {id: existing.id}, data: {status: 'CANCELLED'}});
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

export default router;
