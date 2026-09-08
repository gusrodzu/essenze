import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const campaignSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(180),
  channelId: z.string().cuid().optional().nullable(),
  ownerId: z.string().cuid().optional().nullable(),
  objective: z.enum(['AWARENESS','LEAD_GENERATION','SALES','RETENTION','EVENT','OTHER']).default('LEAD_GENERATION'),
  status: z.enum(['DRAFT','PLANNED','ACTIVE','PAUSED','COMPLETED','CANCELLED']).default('DRAFT'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().min(0).default(0),
  targetAudience: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  utmSource: z.string().trim().max(120).optional().nullable(),
  utmMedium: z.string().trim().max(120).optional().nullable(),
  utmCampaign: z.string().trim().max(180).optional().nullable(),
  notes: z.string().trim().max(3000).optional().nullable(),
});

const channelSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['SEARCH','SOCIAL','EMAIL','CONTENT','EVENT','REFERRAL','DISPLAY','OFFLINE','OTHER']).default('OTHER'),
  active: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const expenseSchema = z.object({
  date: z.coerce.date(),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  vendor: z.string().trim().max(180).optional().nullable(),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(120).optional().nullable(),
});

const eventSchema = z.object({
  campaignId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  type: z.enum(['CAMPAIGN','CONTENT','EMAIL','SOCIAL','EVENT','MILESTONE','OTHER']).default('OTHER'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  channel: z.string().trim().max(100).optional().nullable(),
  ownerName: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

const leadSchema = z.object({
  prospectId: z.string().cuid(),
  capturedAt: z.coerce.date().optional(),
  source: z.string().trim().max(120).optional().nullable(),
  medium: z.string().trim().max(120).optional().nullable(),
  content: z.string().trim().max(180).optional().nullable(),
  term: z.string().trim().max(180).optional().nullable(),
  landingUrl: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const opportunitySchema = z.object({
  prospectId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  salesOrderId: z.string().cuid().optional().nullable(),
  attributedRevenue: z.coerce.number().min(0).default(0),
  attributionPct: z.coerce.number().int().min(0).max(100).default(100),
  convertedAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const metricSchema = z.object({
  date: z.coerce.date(),
  impressions: z.coerce.number().int().min(0).default(0),
  clicks: z.coerce.number().int().min(0).default(0),
  sessions: z.coerce.number().int().min(0).default(0),
  leads: z.coerce.number().int().min(0).default(0),
  conversions: z.coerce.number().int().min(0).default(0),
  spend: z.coerce.number().min(0).default(0),
  revenue: z.coerce.number().min(0).default(0),
});

const campaignInclude = {
  channel: true,
  owner: {select: {id: true, firstName: true, lastName: true}},
  createdBy: {select: {id: true, firstName: true, lastName: true}},
  leads: {
    include: {
      prospect: {include: {owner: {select: {id: true, firstName: true, lastName: true}}}},
    },
    orderBy: {capturedAt: 'desc'},
  },
  opportunities: {
    include: {
      prospect: true,
      customer: true,
      salesOrder: {include: {customer: true}},
    },
    orderBy: {updatedAt: 'desc'},
  },
  expenses: {orderBy: {date: 'desc'}},
  events: {orderBy: {startAt: 'asc'}},
  metrics: {orderBy: {date: 'asc'}},
};

const num = (value) => Number(value || 0);

function normalizeCampaign(campaign) {
  const expenseTotal = campaign.expenses.reduce((sum, row) => sum + num(row.amount), 0);
  const metricSpend = campaign.metrics.reduce((sum, row) => sum + num(row.spend), 0);
  const spend = Math.max(expenseTotal, metricSpend);
  const attributedRevenue = campaign.opportunities.reduce(
    (sum, row) => sum + num(row.attributedRevenue) * (row.attributionPct / 100),
    0,
  );
  const metricRevenue = campaign.metrics.reduce((sum, row) => sum + num(row.revenue), 0);
  const revenue = Math.max(attributedRevenue, metricRevenue);
  const impressions = campaign.metrics.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = campaign.metrics.reduce((sum, row) => sum + row.clicks, 0);
  const sessions = campaign.metrics.reduce((sum, row) => sum + row.sessions, 0);
  const trackedLeads = campaign.leads.length;
  const metricLeads = campaign.metrics.reduce((sum, row) => sum + row.leads, 0);
  const leads = Math.max(trackedLeads, metricLeads);
  const conversions = campaign.opportunities.filter(
    (row) => row.convertedAt || row.salesOrderId || row.prospect.stage === 'WON',
  ).length;
  const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const conversionRate = leads > 0 ? (conversions / leads) * 100 : 0;

  return {
    ...campaign,
    performance: {
      spend,
      revenue,
      impressions,
      clicks,
      sessions,
      leads,
      conversions,
      roi,
      roas,
      cpl,
      ctr,
      conversionRate,
      budgetUsed: num(campaign.budget) > 0 ? (spend / num(campaign.budget)) * 100 : 0,
    },
  };
}

async function audit(req, action, entity, entityId, description) {
  await prisma.auditLog.create({
    data: {
      userId: req.auth.sub,
      action,
      entity,
      entityId,
      description,
      ipAddress: req.ip,
    },
  });
}

async function findCampaign(req, id) {
  return prisma.marketingCampaign.findFirst({
    where: {id, companyId: req.auth.companyId},
    include: campaignInclude,
  });
}

router.get('/dashboard', requirePermission('marketing.read'), async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const [campaignRows, channels, prospects, customers, salesOrders, users, events] = await Promise.all([
      prisma.marketingCampaign.findMany({
        where: {companyId},
        include: campaignInclude,
        orderBy: [{status: 'asc'}, {startDate: 'desc'}, {createdAt: 'desc'}],
      }),
      prisma.marketingChannel.findMany({where: {companyId, active: true}, orderBy: {name: 'asc'}}),
      prisma.prospect.findMany({
        where: {companyId},
        include: {owner: {select: {id: true, firstName: true, lastName: true}}},
        orderBy: {updatedAt: 'desc'},
      }),
      prisma.customer.findMany({where: {companyId, active: true}, orderBy: {commercialName: 'asc'}}),
      prisma.salesOrder.findMany({
        where: {companyId, status: {not: 'CANCELLED'}},
        include: {customer: true},
        orderBy: {orderDate: 'desc'},
        take: 150,
      }),
      prisma.user.findMany({
        where: {companyId, active: true},
        select: {id: true, firstName: true, lastName: true, email: true},
        orderBy: [{firstName: 'asc'}, {lastName: 'asc'}],
      }),
      prisma.marketingCalendarEvent.findMany({
        where: {companyId},
        include: {campaign: {select: {id: true, code: true, name: true}}},
        orderBy: {startAt: 'asc'},
        take: 100,
      }),
    ]);

    const campaigns = campaignRows.map(normalizeCampaign);
    const totals = campaigns.reduce(
      (acc, row) => {
        acc.budget += num(row.budget);
        acc.spend += row.performance.spend;
        acc.revenue += row.performance.revenue;
        acc.leads += row.performance.leads;
        acc.conversions += row.performance.conversions;
        acc.impressions += row.performance.impressions;
        acc.clicks += row.performance.clicks;
        return acc;
      },
      {budget: 0, spend: 0, revenue: 0, leads: 0, conversions: 0, impressions: 0, clicks: 0},
    );

    res.json({
      ok: true,
      campaigns,
      channels,
      prospects,
      customers,
      salesOrders,
      users,
      events,
      summary: {
        ...totals,
        activeCampaigns: campaigns.filter((row) => row.status === 'ACTIVE').length,
        roi: totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        cpl: totals.leads > 0 ? totals.spend / totals.leads : 0,
        conversionRate: totals.leads > 0 ? (totals.conversions / totals.leads) * 100 : 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/channels', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = channelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const channel = await prisma.marketingChannel.create({
      data: {...parsed.data, companyId: req.auth.companyId, notes: parsed.data.notes || null},
    });
    await audit(req, 'CREATE', 'MarketingChannel', channel.id, `Canal de marketing creado: ${channel.name}`);
    res.status(201).json({ok: true, channel});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ya existe un canal con ese nombre'});
    next(error);
  }
});

router.post('/campaigns', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = campaignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const campaign = await prisma.marketingCampaign.create({
      data: {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
        channelId: parsed.data.channelId || null,
        ownerId: parsed.data.ownerId || null,
        targetAudience: parsed.data.targetAudience || null,
        description: parsed.data.description || null,
        utmSource: parsed.data.utmSource || null,
        utmMedium: parsed.data.utmMedium || null,
        utmCampaign: parsed.data.utmCampaign || null,
        notes: parsed.data.notes || null,
      },
      include: campaignInclude,
    });
    await audit(req, 'CREATE', 'MarketingCampaign', campaign.id, `Campaña ${campaign.code} creada`);
    res.status(201).json({ok: true, campaign: normalizeCampaign(campaign)});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ya existe una campaña con ese código'});
    next(error);
  }
});

router.put('/campaigns/:id', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = campaignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const exists = await prisma.marketingCampaign.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!exists) return res.status(404).json({ok: false, message: 'Campaña no encontrada'});
    const campaign = await prisma.marketingCampaign.update({
      where: {id: exists.id},
      data: {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        channelId: parsed.data.channelId || null,
        ownerId: parsed.data.ownerId || null,
        targetAudience: parsed.data.targetAudience || null,
        description: parsed.data.description || null,
        utmSource: parsed.data.utmSource || null,
        utmMedium: parsed.data.utmMedium || null,
        utmCampaign: parsed.data.utmCampaign || null,
        notes: parsed.data.notes || null,
      },
      include: campaignInclude,
    });
    await audit(req, 'UPDATE', 'MarketingCampaign', campaign.id, `Campaña ${campaign.code} actualizada`);
    res.json({ok: true, campaign: normalizeCampaign(campaign)});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok: false, message: 'Ya existe una campaña con ese código'});
    next(error);
  }
});

router.patch('/campaigns/:id/status', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({status: z.enum(['DRAFT','PLANNED','ACTIVE','PAUSED','COMPLETED','CANCELLED'])}).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: 'Estado inválido'});
    const exists = await prisma.marketingCampaign.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!exists) return res.status(404).json({ok: false, message: 'Campaña no encontrada'});
    const campaign = await prisma.marketingCampaign.update({
      where: {id: exists.id},
      data: {status: parsed.data.status},
      include: campaignInclude,
    });
    await audit(req, 'UPDATE', 'MarketingCampaign', campaign.id, `Campaña ${campaign.code}: ${parsed.data.status}`);
    res.json({ok: true, campaign: normalizeCampaign(campaign)});
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/expenses', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const campaign = await prisma.marketingCampaign.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!campaign) return res.status(404).json({ok: false, message: 'Campaña no encontrada'});
    const expense = await prisma.marketingCampaignExpense.create({
      data: {
        ...parsed.data,
        companyId: req.auth.companyId,
        campaignId: campaign.id,
        createdById: req.auth.sub,
        description: parsed.data.description || null,
        vendor: parsed.data.vendor || null,
        reference: parsed.data.reference || null,
      },
    });
    await audit(req, 'CREATE', 'MarketingCampaignExpense', expense.id, `Gasto registrado en ${campaign.code}`);
    res.status(201).json({ok: true, expense});
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/leads', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const campaign = await prisma.marketingCampaign.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    const prospect = await prisma.prospect.findFirst({where: {id: parsed.data.prospectId, companyId: req.auth.companyId}});
    if (!campaign || !prospect) return res.status(404).json({ok: false, message: 'Campaña o prospecto no encontrado'});
    const lead = await prisma.marketingCampaignLead.upsert({
      where: {campaignId_prospectId: {campaignId: campaign.id, prospectId: prospect.id}},
      update: {
        capturedAt: parsed.data.capturedAt || new Date(),
        source: parsed.data.source || campaign.utmSource || null,
        medium: parsed.data.medium || campaign.utmMedium || null,
        content: parsed.data.content || null,
        term: parsed.data.term || null,
        landingUrl: parsed.data.landingUrl || null,
        notes: parsed.data.notes || null,
      },
      create: {
        campaignId: campaign.id,
        prospectId: prospect.id,
        capturedAt: parsed.data.capturedAt || new Date(),
        source: parsed.data.source || campaign.utmSource || null,
        medium: parsed.data.medium || campaign.utmMedium || null,
        content: parsed.data.content || null,
        term: parsed.data.term || null,
        landingUrl: parsed.data.landingUrl || null,
        notes: parsed.data.notes || null,
      },
    });
    await audit(req, 'UPDATE', 'MarketingCampaign', campaign.id, `Lead ${prospect.name} atribuido a ${campaign.code}`);
    res.status(201).json({ok: true, lead});
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/opportunities', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = opportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const campaign = await prisma.marketingCampaign.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    const prospect = await prisma.prospect.findFirst({where: {id: parsed.data.prospectId, companyId: req.auth.companyId}});
    if (!campaign || !prospect) return res.status(404).json({ok: false, message: 'Campaña o prospecto no encontrado'});

    let customerId = parsed.data.customerId || null;
    let salesOrderId = parsed.data.salesOrderId || null;
    let attributedRevenue = parsed.data.attributedRevenue;

    if (salesOrderId) {
      const order = await prisma.salesOrder.findFirst({where: {id: salesOrderId, companyId: req.auth.companyId}});
      if (!order) return res.status(404).json({ok: false, message: 'Pedido de venta no encontrado'});
      customerId = customerId || order.customerId;
      if (!attributedRevenue) attributedRevenue = Number(order.total);
    }
    if (customerId) {
      const customer = await prisma.customer.findFirst({where: {id: customerId, companyId: req.auth.companyId}});
      if (!customer) return res.status(404).json({ok: false, message: 'Cliente no encontrado'});
    }

    const opportunity = await prisma.marketingCampaignOpportunity.upsert({
      where: {campaignId_prospectId: {campaignId: campaign.id, prospectId: prospect.id}},
      update: {
        customerId,
        salesOrderId,
        attributedRevenue,
        attributionPct: parsed.data.attributionPct,
        convertedAt: parsed.data.convertedAt || null,
        notes: parsed.data.notes || null,
      },
      create: {
        campaignId: campaign.id,
        prospectId: prospect.id,
        customerId,
        salesOrderId,
        attributedRevenue,
        attributionPct: parsed.data.attributionPct,
        convertedAt: parsed.data.convertedAt || null,
        notes: parsed.data.notes || null,
      },
    });
    await audit(req, 'UPDATE', 'MarketingCampaign', campaign.id, `Oportunidad ${prospect.name} atribuida a ${campaign.code}`);
    res.status(201).json({ok: true, opportunity});
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/metrics', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = metricSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const campaign = await prisma.marketingCampaign.findFirst({where: {id: req.params.id, companyId: req.auth.companyId}});
    if (!campaign) return res.status(404).json({ok: false, message: 'Campaña no encontrada'});

    const day = new Date(parsed.data.date);
    day.setUTCHours(12, 0, 0, 0);
    const metric = await prisma.marketingMetric.upsert({
      where: {campaignId_date: {campaignId: campaign.id, date: day}},
      update: {...parsed.data, date: day},
      create: {...parsed.data, date: day, companyId: req.auth.companyId, campaignId: campaign.id},
    });
    res.status(201).json({ok: true, metric});
  } catch (error) {
    next(error);
  }
});

router.post('/events', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    if (parsed.data.campaignId) {
      const campaign = await prisma.marketingCampaign.findFirst({where: {id: parsed.data.campaignId, companyId: req.auth.companyId}});
      if (!campaign) return res.status(404).json({ok: false, message: 'Campaña no encontrada'});
    }
    const event = await prisma.marketingCalendarEvent.create({
      data: {
        ...parsed.data,
        companyId: req.auth.companyId,
        createdById: req.auth.sub,
        campaignId: parsed.data.campaignId || null,
        endAt: parsed.data.endAt || null,
        channel: parsed.data.channel || null,
        ownerName: parsed.data.ownerName || null,
        description: parsed.data.description || null,
      },
    });
    await audit(req, 'CREATE', 'MarketingCalendarEvent', event.id, `Evento de marketing creado: ${event.title}`);
    res.status(201).json({ok: true, event});
  } catch (error) {
    next(error);
  }
});

router.patch('/events/:id/complete', requirePermission('marketing.manage'), async (req, res, next) => {
  try {
    const event = await prisma.marketingCalendarEvent.findFirst({
      where: {id: req.params.id, companyId: req.auth.companyId},
    });
    if (!event) return res.status(404).json({ok: false, message: 'Evento no encontrado'});
    const updated = await prisma.marketingCalendarEvent.update({
      where: {id: event.id},
      data: {completedAt: event.completedAt ? null : new Date()},
    });
    res.json({ok: true, event: updated});
  } catch (error) {
    next(error);
  }
});

export default router;
