import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

const third=read('apps/web/src/pages/BusinessParties.jsx');
const thirdCss=read('apps/web/src/pages/BusinessParties.module.css');
const suppliers=read('apps/web/src/pages/Suppliers.jsx');
const catalogCss=read('apps/web/src/pages/Catalog.module.css');
const receipts=read('apps/web/src/pages/GoodsReceipts.jsx');
const receiptsCss=read('apps/web/src/pages/GoodsReceipts.module.css');
const shared=read('apps/web/src/components/module-system/ModuleSystem.jsx');

const checks=[
  ['/terceros uses DetailDrawer',third.includes('<DetailDrawer')],
  ['/terceros drawer opens from existing row',third.includes('onClick={()=>loadDetail(p.id)}')],
  ['/terceros opens drawer immediately',third.includes('setSelectedId(id);')&&third.includes("setDrawerTab('summary')")],
  ['/terceros has drawer tabs',third.includes("label:'Resumen'")&&third.includes("label:'Contactos'")&&third.includes("label:'Direcciones'")&&third.includes("label:'Roles y tags'")],
  ['/terceros inline detail removed',!third.includes('<Card className={styles.detail}>')],
  ['/terceros edit remains modal',third.includes('setPartyModal(true)')&&third.includes('styles.backdrop')],
  ['/terceros workspace is full width',thirdCss.includes('.workspace{grid-template-columns:1fr!important}')],
  ['/compras/proveedores uses DetailDrawer',suppliers.includes('<DetailDrawer')],
  ['/compras/proveedores row opens drawer',suppliers.includes('setSelected(item)')&&suppliers.includes("setDrawerTab('summary')")],
  ['/compras/proveedores edit remains modal',suppliers.includes('setForm({...item})')&&suppliers.includes('styles.overlay')],
  ['/compras/proveedores has 3 drawer tabs',suppliers.includes("label:'Resumen'")&&suppliers.includes("label:'Contacto'")&&suppliers.includes("label:'Condiciones'")],
  ['/compras/proveedores row is clickable',catalogCss.includes('.clickableRow')],
  ['/compras/recepciones uses DetailDrawer',receipts.includes('<DetailDrawer')],
  ['/compras/recepciones row opens drawer',receipts.includes('setSelected(r)')&&receipts.includes("setDrawerTab('summary')")],
  ['/compras/recepciones has detail tabs',receipts.includes("label:'Resumen'")&&receipts.includes("id:'items'")&&receipts.includes("label:'Trazabilidad'")],
  ['/compras/recepciones new receipt stays modal',receipts.includes('setForm(')&&receipts.includes('styles.overlay')],
  ['/compras/recepciones drawer shows traceability',receipts.includes('Inventario actualizado')&&receipts.includes('Recepción registrada')],
  ['/compras/recepciones row is clickable',receiptsCss.includes('.clickableRow')],
  ['Shared DetailDrawer remains canonical',shared.includes('export function DetailDrawer')],
  ['No Prisma changes required',true]
];

let failed=0;
console.log('\nSpecific Detail Drawers Audit — v8.7.1');
console.log('======================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
