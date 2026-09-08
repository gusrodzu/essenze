import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const service=read('apps/api/src/services/executiveDemo.js');
const reports=read('apps/api/src/routes/reports.js');
const ai=read('apps/api/src/services/buzzbeeAI.js');
const app=read('apps/web/src/App.jsx');
const nav=read('apps/web/src/data/navigation.js');
const page=read('apps/web/src/pages/ExecutiveDemo.jsx');
const reportPage=read('apps/web/src/pages/Reports.jsx');

const checks=[
  ['Executive service',service.includes('executiveDemoDashboard')],
  ['Uses Business Health Score',service.includes('calculateMetrics(companyId)')],
  ['Procurement story',service.includes('purchasePipeline')],
  ['Finance summary',service.includes('overdueReceivables')&&service.includes('overduePayables')],
  ['HR summary',service.includes('attendanceRate')&&service.includes('pendingLeaves')],
  ['Intelligence insights',service.includes('intelligenceInsight.findMany')],
  ['Demo readiness',service.includes('readiness=[')],
  ['Reports demo endpoint',reports.includes("router.get('/demo'")],
  ['Reports executive returns company',reports.includes('company,' )],
  ['AI executive context route',ai.includes("return 'executive'")],
  ['AI executive multi-domain dataset',ai.includes("effective==='executive'")],
  ['AI HR permission uses real key',ai.includes("add('employees.read',()=>hr")],
  ['Executive frontend route',app.includes('element={<ExecutiveDemo />}')],
  ['Executive navigation',nav.includes("Demo ejecutiva")],
  ['Executive standard KPI',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')],
  ['Commercial story visible',page.includes('Del requerimiento a la decisión ejecutiva')],
  ['Business health visual',page.includes('Business Health Score')],
  ['BuzzBee AI briefing',page.includes('Briefing con BuzzBee AI')&&page.includes("context:'executive'")],
  ['Demo readiness UI',page.includes('Preparación de la demo')],
  ['Reports migrated to KpiGrid',reportPage.includes('<KpiGrid>')],
  ['Reports dynamic company currency',reportPage.includes("data?.company?.currency")]
];

let failed=0;
console.log('\nExecutive Intelligence Demo Audit — v7.9.0');
console.log('============================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
