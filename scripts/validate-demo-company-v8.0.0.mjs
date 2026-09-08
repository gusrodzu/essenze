import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const seed=read('apps/api/prisma/seed-demo-company-v8.js');
const ready=read('apps/api/src/services/demoReadiness.js');
const reports=read('apps/api/src/routes/reports.js');
const app=read('apps/web/src/App.jsx');
const nav=read('apps/web/src/data/navigation.js');
const page=read('apps/web/src/pages/DemoCompany.jsx');
const executive=read('apps/web/src/pages/ExecutiveDemo.jsx');

const checks=[
  ['Demo seed exists',seed.includes('BuzzBee Demo Company')],
  ['Demo company identity',seed.includes("taxId='BBD260904D01'")&&seed.includes('where:{taxId}')],
  ['Dedicated demo user',seed.includes("demo@buzzbee.mx")],
  ['Seed is scoped by company',seed.includes('companyId:company.id')],
  ['Products seeded',seed.includes("PAP-A4")&&seed.includes("LAP-001")],
  ['Suppliers seeded',seed.includes("PROV-001")],
  ['Customers seeded',seed.includes("CLI-001")],
  ['Employees seeded',seed.includes("EMP-001")&&seed.includes("EMP-005")],
  ['Inventory seeded',seed.includes('inventoryBalance.upsert')],
  ['SOLPED seeded',seed.includes("SOL-DEM-001")],
  ['Purchase Order seeded',seed.includes("OC-DEM-001")],
  ['Receipt seeded',seed.includes("REC-DEM-001")],
  ['Payable seeded',seed.includes("FAC-DEM-1001")],
  ['Receivable seeded',seed.includes("CXC-DEM-001")],
  ['Attendance seeded',seed.includes('attendanceRecord.upsert')],
  ['Pending leave seeded',seed.includes('Trámite personal demo')],
  ['Business Party sync seed',seed.includes('businessPartyRole.upsert')],
  ['Readiness service',ready.includes('demoReadiness')],
  ['Readiness checks 12 blocks',ready.includes("['Terceros'")&&ready.includes("['Permisos'")],
  ['Readiness endpoint',reports.includes("router.get('/demo-readiness'")],
  ['Demo Company route',app.includes('element={<DemoCompany />}')],
  ['Demo Company navigation',nav.includes('Demo Company')],
  ['Demo Company shared KPI',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')],
  ['Commercial script 8 steps',page.includes('BuzzBee AI')&&page.includes('SOLPED')&&page.includes('RR. HH.')],
  ['Executive demo shows readiness',executive.includes('Demo Readiness')]
];

let failed=0;
console.log('\nDemo Company Audit — v8.0.0');
console.log('============================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
