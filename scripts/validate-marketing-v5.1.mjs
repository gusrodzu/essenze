import fs from 'node:fs';

const requirements = [
  ['apps/api/prisma/schema.prisma', [
    'model MarketingChannel {',
    'model MarketingCampaign {',
    'model MarketingCampaignLead {',
    'model MarketingCampaignOpportunity {',
    'model MarketingCampaignExpense {',
    'model MarketingCalendarEvent {',
    'model MarketingMetric {',
  ]],
  ['apps/api/src/routes/marketing.js', [
    "router.get('/dashboard'",
    "router.post('/campaigns'",
    "'/campaigns/:id/leads'",
    "'/campaigns/:id/opportunities'",
    "'/campaigns/:id/metrics'",
    "router.post('/events'",
  ]],
  ['apps/web/src/pages/Marketing.jsx', [
    "apiRequest('/marketing/dashboard')",
    'Leads y atribución',
    'ROI Marketing',
    'Calendario de Marketing',
  ]],
  ['apps/web/src/App.jsx', ['path="marketing"']],
  ['apps/web/src/data/navigation.js', ["label: 'Marketing'"]],
  ['apps/api/prisma/seed.js', ["'marketing.read'", "'marketing.manage'"]],
];

let failed = false;
for (const [file, tokens] of requirements) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!text.includes(token)) {
      console.error(`Falta ${token} en ${file}`);
      failed = true;
    }
  }
}

const schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');
const prospect = schema.slice(schema.indexOf('model Prospect {'), schema.indexOf('\nmodel ', schema.indexOf('model Prospect {') + 1));
const order = schema.slice(schema.indexOf('model SalesOrder {'), schema.indexOf('\nmodel ', schema.indexOf('model SalesOrder {') + 1));
const company = schema.slice(schema.indexOf('model Company {'), schema.indexOf('\nmodel ', schema.indexOf('model Company {') + 1));
if (!prospect.includes('marketingLeads MarketingCampaignLead[]') || !prospect.includes('marketingOpportunities MarketingCampaignOpportunity[]')) {
  console.error('Faltan relaciones de Marketing en Prospect.');
  failed = true;
}
if (!order.includes('marketingOpportunities MarketingCampaignOpportunity[]')) {
  console.error('Falta relación de atribución en SalesOrder.');
  failed = true;
}
if (!company.includes('marketingCampaigns MarketingCampaign[]')) {
  console.error('Faltan relaciones Marketing en Company.');
  failed = true;
}
if (failed) process.exit(1);
console.log('OK: Marketing v5.1.0 tiene dominio, API, UI, permisos e integración CRM/Ventas.');
