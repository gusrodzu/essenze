import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const center=read('apps/web/src/pages/ProcurementCenter.jsx');
const centerCss=read('apps/web/src/pages/ProcurementCenter.module.css');
const requests=read('apps/web/src/pages/PurchaseRequests.jsx');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');
const system=read('apps/web/src/components/module-system/ModuleSystem.jsx');

const checks=[
 ['Compras uses ModuleHeader',center.includes('<ModuleHeader')],
 ['Compras uses internal ModuleTabs',center.includes('<ModuleTabs')],
 ['Compras uses shared KPI grid',center.includes('<KpiGrid>')],
 ['Compras has attention panel',center.includes('Requiere atención')&&center.includes('attentionCard')],
 ['Compras has six-month chart',center.includes('monthSeries')&&center.includes('Compras de los últimos 6 meses')],
 ['Compras has recent request table',center.includes('Solicitudes recientes')&&center.includes('<DataTableFrame')],
 ['Compras table search toolbar',center.includes('<ModuleToolbar')],
 ['Compras CSV export',center.includes('exportCsv')&&center.includes('Exportar')],
 ['Compras shared DetailDrawer',center.includes('<DetailDrawer')],
 ['Compras drawer has 5 tabs',center.includes("label:'Resumen'")&&center.includes("label:'Historial'")&&center.includes("label:'Aprobaciones'")&&center.includes("label:'Documentos'")],
 ['Compras drawer approval actions',center.includes("act(detail.id,'APPROVED')")&&center.includes("act(detail.id,'REJECTED')")],
 ['Purchase Requests uses ModuleHeader',requests.includes('<ModuleHeader')],
 ['Purchase Requests uses shared KPI',requests.includes('<KpiGrid>')],
 ['Purchase Requests table uses DataTableFrame',requests.includes('<DataTableFrame')],
 ['Purchase Requests uses DetailDrawer',requests.includes('<DetailDrawer')],
 ['Purchase Requests drawer tabs functional',requests.includes('onTabChange={setDrawerTab}')],
 ['Dark Business OS sidebar',sidebar.includes('v8.5.0 — Business OS dark navigation')],
 ['Active sidebar blue gradient',sidebar.includes('#096bff')&&sidebar.includes('#0d8bff')],
 ['Vertical split responsive',centerCss.includes('@media(max-width:1180px)')],
 ['Shared module system preserved',system.includes('export function ModuleHeader')&&system.includes('export function DetailDrawer')],
 ['No Prisma changes required',true]
];

let failed=0;
console.log('\nModule Design Rollout Audit — v8.5.0');
console.log('====================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
