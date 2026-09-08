import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sales=read('apps/web/src/pages/Sales.jsx');
const css=read('apps/web/src/pages/Sales.module.css');
const checks=[
 ['ModuleHeader visible',sales.includes('<ModuleHeader')],
 ['Shared KPI grid',sales.includes('<KpiGrid>')],
 ['Four KPI cards',(sales.match(/<KpiCard>/g)||[]).length===4],
 ['Attention block',sales.includes('Requiere atención')],
 ['Six-month chart',sales.includes('monthSeries')&&sales.includes('miniChart')],
 ['Shared ModuleToolbar',sales.includes('<ModuleToolbar')],
 ['Shared DataTableFrame',sales.includes('<DataTableFrame')],
 ['Row detail drawer',sales.includes('<DetailDrawer')],
 ['Vertical split stacks',css.includes('@media(max-width:1180px)')&&css.includes('.overviewGrid{grid-template-columns:1fr}')],
];
let failed=0;
console.log('\nVisual Design System Fix Audit — v8.4.1');
console.log('========================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
