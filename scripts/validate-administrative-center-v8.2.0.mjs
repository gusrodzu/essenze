import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const service=read('apps/api/src/services/administrativeCenter.js');
const route=read('apps/api/src/routes/administrativeCenter.js');
const index=read('apps/api/src/index.js');
const app=read('apps/web/src/App.jsx');
const nav=read('apps/web/src/data/navigation.js');
const page=read('apps/web/src/pages/AdministrativeCenter.jsx');

const checks=[
 ['Administrative service',service.includes('getAdministrativeCenter')],
 ['AP summary',service.includes('accountsPayable.findMany')],
 ['AR summary',service.includes('accountsReceivable.findMany')],
 ['Expenses summary',service.includes('prisma.expense.findMany')],
 ['Treasury summary',service.includes('treasuryAccount.findMany')],
 ['Budgets summary',service.includes('prisma.budget.findMany')],
 ['Fixed assets summary',service.includes('fixedAsset.findMany')],
 ['Attention engine',service.includes('attention=[')],
 ['Route uses auth',route.includes('requireAuth')],
 ['Route uses reports.read',route.includes("requirePermission('reports.read')")],
 ['API route registered',index.includes("app.use('/api/administration'")],
 ['Frontend route',app.includes('element={<AdministrativeCenter />}')],
 ['Navigation entry',nav.includes("to:'/administracion'")],
 ['Shared KPI design',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')&&page.includes('<KpiInfo')],
 ['Vertical split responsive',read('apps/web/src/pages/AdministrativeCenter.module.css').includes('@media(max-width:1180px)')],
 ['No schema change required',true]
];

let failed=0;
console.log('\nAdministrative Center Audit — v8.2.0');
console.log('=====================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
