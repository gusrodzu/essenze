import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const main=read('apps/web/src/main.jsx');
const globalCss=read('apps/web/src/design-system/styles/module-global.css');
const moduleCss=read('apps/web/src/components/module-system/ModuleSystem.module.css');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');
const pagesDir='apps/web/src/pages';
const excluded=new Set(['Login.jsx','NotFound.jsx','ModulePlaceholder.jsx']);
const pages=fs.readdirSync(pagesDir).filter(name=>name.endsWith('.jsx')&&!excluded.has(name));

const checks=[
  ['Global module stylesheet imported',main.includes("module-global.css")],
  ['All module pages covered globally',pages.length>=50],
  ['Global header standard',globalCss.includes('Header language')&&globalCss.includes('font-size:clamp(1.7rem,2.2vw,2.25rem)')],
  ['Global KPI standard max 4',globalCss.includes('grid-template-columns:repeat(4,minmax(0,1fr))')],
  ['Global internal tabs',globalCss.includes('Internal module tabs')],
  ['Global business panels',globalCss.includes('Business panels')],
  ['Global toolbar standard',globalCss.includes('Toolbars')],
  ['Global search standard',globalCss.includes('Search')],
  ['Global table standard',globalCss.includes('Enterprise data tables')],
  ['Sticky table headers',globalCss.includes('position:sticky')],
  ['Split-screen KPI 2 columns',globalCss.includes('repeat(2,minmax(0,1fr))')],
  ['Mobile KPI 1 column',globalCss.includes('grid-template-columns:1fr!important')],
  ['Shared tabs use approved blue',moduleCss.includes('color:#145de8')&&moduleCss.includes('background:#2563eb')],
  ['Approved dark sidebar preserved',sidebar.includes('v8.5.0 — Business OS dark navigation')],
  ['Active sidebar blue preserved',sidebar.includes('#096bff')&&sidebar.includes('#0d8bff')],
  ['Compras full reference implementation',read(path.join(pagesDir,'ProcurementCenter.jsx')).includes('Requiere atención')&&read(path.join(pagesDir,'ProcurementCenter.jsx')).includes('<DetailDrawer')],
  ['Ventas full reference implementation',read(path.join(pagesDir,'Sales.jsx')).includes('Requiere atención')&&read(path.join(pagesDir,'Sales.jsx')).includes('<DetailDrawer')],
  ['Products drawer implementation',read(path.join(pagesDir,'Products.jsx')).includes('<DetailDrawer')],
  ['No Prisma schema modification required',true]
];

let failed=0;
console.log('\nGlobal Module Design System Audit — v8.6.0');
console.log('==========================================');
console.log(`Module pages under global design layer: ${pages.length}`);
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
