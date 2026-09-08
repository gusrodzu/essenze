import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const shell=read('apps/web/src/layout/AppShell.module.css');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');
const topbar=read('apps/web/src/layout/Topbar.module.css');
const banner=read('apps/web/src/framework/PowerBanner.module.css');
const kpis=read('apps/web/src/components/KpiGrid.module.css');
const executive=read('apps/web/src/pages/ExecutiveDemo.module.css');
const demo=read('apps/web/src/pages/DemoCompany.module.css');
const shellJsx=read('apps/web/src/layout/AppShell.jsx');

const checks=[
  ['Responsive shell marker',shellJsx.includes('data-responsive-shell="true"')],
  ['Split breakpoint shell 1180',shell.includes('@media (max-width:1180px)')],
  ['Workspace loses desktop margin',shell.includes("margin-left:0")],
  ['Right rail hidden in split mode',shell.includes('.rightColumn')&&shell.includes('display:none')],
  ['Mobile AI retained',shell.includes('.mobileAI')&&shell.includes('bottom:86px')],
  ['Sidebar drawer at 1180',sidebar.includes('@media (max-width:1180px)')&&sidebar.includes('translateX(-105%)')],
  ['Topbar menu at 1180',topbar.includes('@media (max-width:1180px)')&&topbar.includes('.mobileMenu')],
  ['Search hidden in split mode',topbar.includes('.search')&&topbar.includes('display:none')],
  ['Power banner compact at 1180',banner.includes('@media (max-width:1180px)')],
  ['KPI single column <=900',kpis.includes('@media(max-width:900px)')],
  ['Executive story wraps',executive.includes('grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['Demo Company stacks',demo.includes('.grid')&&demo.includes('grid-template-columns:1fr')]
];

let failed=0;
console.log('\nVertical Split Responsive Audit — v8.1.1');
console.log('=========================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
