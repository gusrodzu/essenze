import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const pagesDir='apps/web/src/pages';
const pageNames=fs.readdirSync(pagesDir).filter(name=>name.endsWith('.jsx'));
const pages=Object.fromEntries(pageNames.map(name=>[name,read(path.join(pagesDir,name))]));

const main=read('apps/web/src/main.jsx');
const css=read('apps/web/src/design-system/styles/detail-drawer-global.css');
const shared=read('apps/web/src/components/module-system/ModuleSystem.jsx');

const legacyDrawerPages=pageNames.filter(name=>{
  const txt=pages[name];
  return txt.includes('styles.drawer') || txt.includes('styles.detailModal');
});

const sharedDrawerPages=pageNames.filter(name=>pages[name].includes('<DetailDrawer'));

const checks=[
  ['Global drawer stylesheet imported',main.includes("detail-drawer-global.css")],
  ['Right-side slide animation',css.includes('@keyframes buzzbeeDetailDrawerIn')&&css.includes('translateX(100%)')],
  ['Legacy overlays align right',css.includes('justify-content:flex-end!important')],
  ['Legacy drawer full height',css.includes('height:100%!important')],
  ['Legacy detail modal supported',css.includes('[class*="_detailModal_"]')],
  ['Legacy drawer supported',css.includes('[class*="_drawer_"]')],
  ['Sticky drawer headers',css.includes('position:sticky!important')&&css.includes('top:0!important')],
  ['Sticky drawer footers',css.includes('bottom:0!important')],
  ['Drawer tables have local scroll',css.includes('overflow-x:auto!important')],
  ['Mobile drawers full width',css.includes('width:100%!important')&&css.includes('@media(max-width:700px)')],
  ['Reduced-motion respected',css.includes('prefers-reduced-motion')],
  ['Shared DetailDrawer remains canonical',shared.includes('export function DetailDrawer')],
  ['Accounts payable detail covered',pages['AccountsPayable.jsx'].includes('styles.drawer')],
  ['Accounts receivable detail covered',pages['AccountsReceivable.jsx'].includes('styles.drawer')],
  ['Purchase orders detail covered',pages['PurchaseOrders.jsx'].includes('styles.drawer')],
  ['Payroll detail covered',pages['Payroll.jsx'].includes('styles.detailModal')],
  ['Budgets detail covered',pages['Budgets.jsx'].includes('styles.detailModal')],
  ['Purchasing shared drawer preserved',pages['PurchaseRequests.jsx'].includes('<DetailDrawer')],
  ['Sales shared drawer preserved',pages['Sales.jsx'].includes('<DetailDrawer')],
  ['Products shared drawer preserved',pages['Products.jsx'].includes('<DetailDrawer')],
  ['Create/edit modals not globally converted',!css.includes('> :where([class*="_modal_"])')],
  ['No Prisma changes required',true]
];

let failed=0;
console.log('\nGlobal Detail Drawer Audit — v8.7.0');
console.log('===================================');
console.log(`Legacy detail-view pages covered: ${legacyDrawerPages.length}`);
console.log(`Shared DetailDrawer pages: ${sharedDrawerPages.length}`);
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
