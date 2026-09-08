import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const service=fs.readFileSync('apps/api/src/services/intelligence.js','utf8');
const route=fs.readFileSync('apps/api/src/routes/intelligence.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/Intelligence.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');

for(const x of ['model IntelligenceMetricDefinition','model IntelligenceInsight','enum IntelligenceInsightSeverity','enum IntelligenceInsightType'])
  if(!schema.includes(x)){console.error('schema',x);process.exit(1)}

for(const x of ['calculateMetrics','scanIntelligence','sales.revenue_30d','inventory.low_stock','flow.error_rate','integration.dead_letters'])
  if(!service.includes(x)){console.error('service',x);process.exit(1)}

for(const x of ['/dashboard','/scan','/insights/:id/status','intelligence.read','intelligence.scan'])
  if(!route.includes(x)){console.error('route',x);process.exit(1)}

for(const x of ['BuzzBee Core · Intelligence v1','Insights','Métricas','reglas explicables','<KpiGrid>'])
  if(!ui.includes(x)){console.error('ui',x);process.exit(1)}

if(!nav.includes("label: 'BuzzBee Intelligence'"))process.exit(1);

for(const x of ['intelligence.read','intelligence.manage','intelligence.scan'])
  if(!seed.includes(x)){console.error('permission',x);process.exit(1)}

console.log('OK: Intelligence v1 tiene catálogo KPI, scanner, insights explicables y UI estándar.');
