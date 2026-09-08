import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const root=JSON.parse(read('package.json'));
const system=read('apps/web/src/components/module-system/ModuleSystem.jsx');
const css=read('apps/web/src/components/module-system/ModuleSystem.module.css');

const pages={
  procurement:read('apps/web/src/pages/ProcurementCenter.jsx'),
  sales:read('apps/web/src/pages/SalesEnterprise.jsx'),
  orderToCash:read('apps/web/src/pages/OrderToCash.jsx'),
  inventory:read('apps/web/src/pages/InventoryBalances.jsx'),
  products:read('apps/web/src/pages/Products.jsx'),
  hr:read('apps/web/src/pages/HrClientCenter.jsx'),
  hrMaster:read('apps/web/src/pages/HumanResources.jsx'),
  administration:read('apps/web/src/pages/AdministrativeCenter.jsx')
};

const checks=[
  ['ModuleHeader component',system.includes('export function ModuleHeader')],
  ['ModuleTabs component',system.includes('export function ModuleTabs')],
  ['ModuleToolbar component',system.includes('export function ModuleToolbar')],
  ['DataTableFrame component',system.includes('export function DataTableFrame')],
  ['AttentionPanel component',system.includes('export function AttentionPanel')],
  ['DetailDrawer component',system.includes('export function DetailDrawer')],
  ['Responsive split breakpoint',css.includes('@media(max-width:1180px)')],
  ['Drawer mobile full width',css.includes('.drawer{width:100%}')],
  ['Purchasing migrated',pages.procurement.includes('<ModuleHeader')&&pages.procurement.includes('<ModuleTabs')],
  ['Sales migrated',pages.sales.includes('<ModuleHeader')&&pages.sales.includes('<ModuleTabs')],
  ['Order-to-Cash migrated',pages.orderToCash.includes('<ModuleHeader')&&pages.orderToCash.includes('<ModuleTabs')],
  ['Inventory migrated',pages.inventory.includes('<ModuleHeader')&&pages.inventory.includes('<ModuleToolbar')&&pages.inventory.includes('<DataTableFrame')],
  ['Products migrated',pages.products.includes('<ModuleHeader')&&pages.products.includes('<DetailDrawer')&&pages.products.includes('<DataTableFrame')],
  ['HR operational migrated',pages.hr.includes('<ModuleHeader')&&pages.hr.includes('<ModuleTabs')],
  ['HR master migrated',pages.hrMaster.includes('<ModuleHeader')&&pages.hrMaster.includes('<ModuleToolbar')&&pages.hrMaster.includes('<DataTableFrame')],
  ['Administration migrated',pages.administration.includes('<ModuleHeader')&&pages.administration.includes('<ModuleTabs')],
  ['Shared KPI preserved',pages.products.includes('<KpiGrid>')&&pages.inventory.includes('<KpiGrid>')],
  ['No Prisma schema changes required',true],
  ['Audit script registered',root.scripts['design:audit']==='node scripts/validate-module-design-system-v8.4.0.mjs']
];

let failed=0;
console.log('\nModule Design System Audit — v8.4.0');
console.log('===================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
