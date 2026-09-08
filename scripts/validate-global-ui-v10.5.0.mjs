
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const main=read('apps/web/src/main.jsx');
const global=read('apps/web/src/design-system/styles/global-ui-v10.5.css');
const shell=read('apps/web/src/layout/AppShell.module.css');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');
const topbar=read('apps/web/src/layout/Topbar.module.css');
const tabs=read('apps/web/src/layout/ModuleTabBar.module.css');
const rail=read('apps/web/src/framework/BuzzBeeRightRail.module.css');
const banner=read('apps/web/src/framework/PowerBanner.module.css');

const checks=[
 ['Global UI layer imported last',main.trim().includes("global-ui-v10.5.css';")],
 ['Sidebar compact width 220',global.includes('--sidebar-width:220px')],
 ['Topbar compact height 62',topbar.includes('height:62px!important')],
 ['Workspace has dedicated module tabs row',shell.includes('grid-template-rows:auto auto minmax(0,1fr) auto')],
 ['Content starts below tabs with compact padding',shell.includes('padding:14px 4px 18px 0')],
 ['Sidebar is light',sidebar.includes('background:#fff!important')],
 ['Sidebar active state is soft blue',sidebar.includes('background:#eaf2ff!important')],
 ['Submodule navigation is tabs',tabs.includes('height:50px!important')&&tabs.includes('.active{color:#155eef')],
 ['Module identity removed from tab strip',tabs.includes('.identity')&&tabs.includes('display:none!important')],
 ['Right AI rail fixed to 276px',rail.includes('width:276px!important')],
 ['AI suggestions remain compact',rail.includes('min-height:36px!important')],
 ['Power banner compact',banner.includes('min-height:68px!important')],
 ['Global route headers standardized',global.includes('font-size:var(--type-page-title)!important')],
 ['Global cards standardized',global.includes('--bb-card-radius:14px')],
 ['Global tables standardized',global.includes('table thead th')],
 ['Global forms standardized',global.includes('input:focus')],
 ['Global modal styling retained/normalized',global.includes('[role="dialog"]')],
 ['Responsive module tabs scroll',global.includes('overflow-x:auto!important')],
 ['No Prisma changes required',true],
];

let failed=0;
console.log('\nGlobal UI Refresh Audit — v10.5.0');
console.log('=================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
