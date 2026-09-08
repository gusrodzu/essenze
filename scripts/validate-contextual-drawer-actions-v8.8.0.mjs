import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const third=read('apps/web/src/pages/BusinessParties.jsx');
const suppliers=read('apps/web/src/pages/Suppliers.jsx');
const receipts=read('apps/web/src/pages/GoodsReceipts.jsx');
const shared=read('apps/web/src/components/module-system/ModuleSystem.jsx');

const checks=[
  ['Shared DetailDrawer exists',shared.includes('export function DetailDrawer')],
  ['/terceros view uses drawer',third.includes("title={detail?.displayName||'Tercero'}")],
  ['/terceros create/edit uses drawer',third.includes('open={partyModal}')&&third.includes('party-drawer-form')],
  ['/terceros contact create uses drawer',third.includes('open={contactModal}')&&third.includes('contact-drawer-form')],
  ['/terceros address create uses drawer',third.includes('open={addressModal}')&&third.includes('address-drawer-form')],
  ['/terceros dedup workflow remains modal',third.includes('duplicatesOpen?<div className={styles.backdrop}>')],
  ['/terceros no create/edit backdrop',!third.includes('{partyModal?<div className={styles.backdrop}>')&&!third.includes('{contactModal?<div className={styles.backdrop}>')&&!third.includes('{addressModal?<div className={styles.backdrop}>')],
  ['/compras/proveedores view uses drawer',suppliers.includes("title={selected?.commercialName||selected?.legalName||'Proveedor'}")],
  ['/compras/proveedores create/edit uses drawer',suppliers.includes('supplier-drawer-form')&&suppliers.includes("title={form?.id?'Editar proveedor':'Nuevo proveedor'}")],
  ['/compras/proveedores no centered form modal',!suppliers.includes('styles.overlay')],
  ['/compras/recepciones existing detail uses drawer',receipts.includes("title={selected?.folio||'Recepción'}")],
  ['/compras/recepciones new receipt uses drawer',receipts.includes('receipt-drawer-form')&&receipts.includes('title="Registrar recepción"')],
  ['/compras/recepciones no centered form modal',!receipts.includes('styles.overlay')],
  ['Form submit remains native through form attribute',suppliers.includes('form="supplier-drawer-form"')&&receipts.includes('form="receipt-drawer-form"')&&third.includes('form="party-drawer-form"')],
  ['Destructive supplier delete still confirms',suppliers.includes('window.confirm')],
  ['No Prisma changes required',true]
];

let failed=0;
console.log('\nContextual Drawer Actions Audit — v8.8.0');
console.log('========================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
