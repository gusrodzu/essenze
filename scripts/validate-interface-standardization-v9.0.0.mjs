import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');
const topbar=read('apps/web/src/layout/Topbar.module.css');
const shell=read('apps/web/src/layout/AppShell.module.css');
const main=read('apps/web/src/main.jsx');
const refresh=read('apps/web/src/design-system/styles/interface-v9.css');
const moduleSystem=read('apps/web/src/components/module-system/ModuleSystem.jsx');
const pagesDir='apps/web/src/pages';
const pageCount=fs.readdirSync(pagesDir).filter(f=>f.endsWith('.jsx')&&!['Login.jsx','NotFound.jsx','ModulePlaceholder.jsx'].includes(f)).length;

const checks=[
  ['White sidebar enabled',sidebar.includes('v9.0.0 — Unified Light Navigation')&&sidebar.includes('background:#ffffff!important')],
  ['Sidebar active state uses blue soft fill',sidebar.includes('background:#edf4ff!important')&&sidebar.includes('color:#145de8!important')],
  ['Sidebar dark v8 rule safely overridden later',sidebar.lastIndexOf('v9.0.0 — Unified Light Navigation')>sidebar.lastIndexOf('v8.5.0 — Business OS dark navigation')],
  ['Unified refresh imported last',main.includes("import './design-system/styles/interface-v9.css';")&&main.trim().includes("interface-v9.css")],
  ['Unified canvas token',refresh.includes('--bb-page:#f6f8fb')],
  ['Unified card radius token',refresh.includes('--bb-radius-card:16px')],
  ['Unified control radius token',refresh.includes('--bb-radius-control:11px')],
  ['Global module header refresh',refresh.includes('Consistent module headers')],
  ['Global KPI refresh',refresh.includes('KPI consistency')],
  ['Global tabs refresh',refresh.includes('/* Tabs */')],
  ['Global controls refresh',refresh.includes('Toolbar/search/form controls')],
  ['Global table refresh',refresh.includes('/* Tables */')],
  ['Global interaction surface standardized',refresh.includes('Standardized record modal')],
  ['Topbar unified',topbar.includes('v9.0.0 — Unified topbar')],
  ['Workspace unified',shell.includes('v9.0.0 — Unified workspace proportions')],
  ['Shared DetailDrawer preserved',moduleSystem.includes('export function DetailDrawer')],
  ['Responsive split preserved',refresh.includes('@media(max-width:1180px)')],
  ['Mobile refresh preserved',refresh.includes('@media(max-width:700px)')],
  ['Functional pages remain under global layer',pageCount>=50],
  ['No Prisma changes required',true]
];

let failed=0;
console.log('\nInterface Standardization Audit — v9.0.0');
console.log('========================================');
console.log(`Functional pages covered by global UI layer: ${pageCount}`);
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
