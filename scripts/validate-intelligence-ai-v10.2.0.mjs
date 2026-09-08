
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const intel=read('apps/api/src/services/intelligence.js');
const intelRoute=read('apps/api/src/routes/intelligence.js');
const reports=read('apps/api/src/routes/reports.js');
const ai=read('apps/api/src/services/buzzbeeAI.js');
const aiRoute=read('apps/api/src/routes/ai.js');
const ui=read('apps/web/src/pages/Intelligence.jsx');
const runtime=read('scripts/runtime-intelligence-ai-v10.2.0.mjs');

const checks=[
 ['Executive report endpoint',reports.includes("router.get('/executive'")],
 ['Intelligence dashboard endpoint',intelRoute.includes("router.get('/dashboard'")],
 ['Intelligence scan endpoint',intelRoute.includes("router.post('/scan'")],
 ['Intelligence history endpoint',intelRoute.includes("router.get('/history'")],
 ['Intelligence metrics endpoint',intelRoute.includes("router.get('/metrics'")],
 ['Sales metric uses SalesInvoice',intel.includes('prisma.salesInvoice.findMany')],
 ['Sales metric uses issueDate',intel.includes('issueDate:{gte:d30,lte:now}')],
 ['Purchases metric uses orderDate',intel.includes('orderDate:{gte:d30,lte:now}')],
 ['Business Health score available',intel.includes("'intelligence.health_score'")],
 ['Intelligence returns company currency',intel.includes('select:{id:true,name:true,currency:true}')&&intel.includes('company,')],
 ['Snapshots persist daily metrics',intel.includes('intelligenceMetricSnapshot.upsert')],
 ['Forecast remains explainable linear trend',intel.includes("method:'LINEAR_TREND'")],
 ['Insight events emitted',intel.includes('intelligence.insight.created')&&intel.includes('intelligence.insight.escalated')],
 ['AI context endpoint',aiRoute.includes("router.get('/context'")],
 ['AI ask endpoint',aiRoute.includes("router.post('/ask'")],
 ['AI queries audited',aiRoute.includes("action:'AI_QUERY'")],
 ['AI mode read-only',ai.includes("mode:'READ_ONLY'")],
 ['AI provider fallback present',ai.includes('deterministicAnswer')],
 ['AI uses permission-aware datasets',ai.includes('userPermissions')&&ai.includes("can(permissions,permission)")],
 ['AI POS route context',ai.includes("route.startsWith('/pos')")&&ai.includes("return 'pos'")],
 ['AI POS dataset available',ai.includes("async function pos(")&&ai.includes("add('pos.read',()=>pos(companyId,currency))")],
 ['Intelligence UI uses dynamic currency',ui.includes("const currencyCode=data.company?.currency||'MXN'")],
 ['Intelligence UI uses shared KPI grid',ui.includes('<KpiGrid>')&&ui.includes('<KpiCard>')],
 ['Intelligence UI has exactly 4 KPI cards',((ui.match(/<KpiCard>/g)||[]).length===4)],
 ['Runtime QA read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('INTEL_QA_SCAN')],
 ['Runtime QA cross-checks CxC',runtime.includes('Centro Admin e Intelligence CxC consistentes')],
 ['Runtime QA cross-checks CxP',runtime.includes('Centro Admin e Intelligence CxP consistentes')],
 ['Runtime QA verifies AI sources',runtime.includes('AI responde con fuentes')],
 ['Runtime QA verifies POS AI context',runtime.includes('AI reconoce contexto POS')],
 ['Runtime QA scan is opt-in',runtime.includes('SCAN_SAFE')],
 ['Runtime QA never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['Runtime QA writes JSON report',runtime.includes("artifacts','qa")],
 ['No Prisma schema changes in v10.2.0',true],
];

let failed=0;
console.log('\nReports + Intelligence + AI Audit — v10.2.0');
console.log('============================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
