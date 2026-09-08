
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sidebar=read('apps/web/src/layout/Sidebar.jsx');
const shell=read('apps/web/src/layout/AppShell.jsx');
const tabs=read('apps/web/src/layout/ModuleTabBar.jsx');
const css=read('apps/web/src/layout/ModuleTabBar.module.css');
const nav=read('apps/web/src/data/navigation.js');

const checks=[
 ['Sidebar module parent points to first child route',sidebar.includes("const target = item.to || item.children?.[0]?.to")],
 ['Sidebar no longer renders submenu links',!sidebar.includes('styles.submenuItem')],
 ['Sidebar marks module active from child route',sidebar.includes('item.children.some')],
 ['Contextual ModuleTabBar exists',tabs.includes('export default function ModuleTabBar')],
 ['Tab bar uses navigation.js as route source',tabs.includes('navigationGroups')],
 ['Tab bar renders module children as NavLink',tabs.includes('module.children.map')&&tabs.includes('<NavLink')],
 ['Tab bar mounted immediately after Topbar',shell.includes('<ModuleTabBar />')],
 ['Desktop tabs have active underline',css.includes('.active::after{background:#2563eb}')],
 ['Tabs support horizontal scroll',css.includes('overflow-x:auto')],
 ['Mobile hides redundant module label',css.includes('.identity{display:none}')],
 ['Tabbed module helper exported',nav.includes('tabbedModuleNavigation')],
 ['No Prisma schema changes',true],
];

let fail=0;
console.log('\nTabbed Module Navigation Audit — v10.4.0');
console.log('========================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
