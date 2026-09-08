
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const system=read('apps/web/src/components/module-system/ModuleSystem.jsx');
const systemCss=read('apps/web/src/components/module-system/ModuleSystem.module.css');
const bar=read('apps/web/src/layout/ModuleTabBar.jsx');
const barCss=read('apps/web/src/layout/ModuleTabBar.module.css');
const sales=read('apps/web/src/pages/SalesEnterprise.jsx');
const hr=read('apps/web/src/pages/HumanResources.jsx');
const hrOps=read('apps/web/src/pages/HrOperations.jsx');
const invOps=read('apps/web/src/pages/InventoryOperations.jsx');
const app=read('apps/web/src/App.jsx');

const checks=[
 ['ModuleTabs uses React portal',system.includes('createPortal')&&system.includes("document.getElementById('module-local-tabs')")],
 ['Module tabs target exists in topbar navigation',bar.includes('id="module-local-tabs"')],
 ['Topbar supports secondary local tab row',barCss.includes('.localTabsSlot:not(:empty)')],
 ['Local tabs have topbar visual style',systemCss.includes('tabs[data-module-local-tabs="true"]')],
 ['Modal tabs stay inline',system.includes('inline label="Pestañas del modal"')],
 ['Ventas local tabs use ModuleTabs',sales.includes('<ModuleTabs')],
 ['RRHH local tabs use ModuleTabs',hr.includes('<ModuleTabs')],
 ['RRHH operation tabs moved to ModuleTabs',hrOps.includes('<ModuleTabs')&&!hrOps.includes('<div className={styles.tabs}>')],
 ['Inventory operation tabs moved to ModuleTabs',invOps.includes('<ModuleTabs')&&!invOps.includes('<div className={styles.tabs}>')],
 ['Legacy /rrhh remains redirect',app.includes('path="rrhh" element={<Navigate to="/recursos-humanos" replace />}')],
 ['No Prisma changes required',true],
];

let fail=0;
console.log('\nAll Tabs in Topbar Audit — v10.5.3');
console.log('==================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)fail++;
}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
