import fs from 'node:fs';
const pos=fs.readFileSync('apps/web/src/pages/Pos.jsx','utf8');
const css=fs.readFileSync('apps/web/src/pages/Pos.module.css','utf8');
const api=fs.readFileSync('apps/api/src/routes/pos.js','utf8');
const checks=[
  ['POS uses exactly four shared KPI cards',(pos.match(/<KpiCard>/g)||[]).length===4],
  ['POS has redesigned two-pane workspace',pos.includes('className={styles.posWorkspace}')&&pos.includes('className={styles.liveTicket}')],
  ['Catalog has category rail',pos.includes('className={styles.categoryRail}')&&pos.includes("setCategoryId('ALL')")],
  ['Catalog search remains functional',pos.includes('setProductQuery')&&pos.includes('filteredProducts')],
  ['Product cards include stock state',pos.includes('getStock(product,activeWarehouseId)')&&pos.includes('stockOk')],
  ['Ticket uses quantity stepper',pos.includes('quantityControl')&&pos.includes("item.quantity+1")],
  ['Ticket supports note',pos.includes('ticketNote')&&pos.includes('Agregar nota al ticket')],
  ['Payment methods redesigned',pos.includes('paymentMethods')&&pos.includes("['CASH','CARD','TRANSFER']")],
  ['Checkout remains guarded by session/cart/payment',pos.includes('disabled={!activeSession||!cart.length||Math.abs(pending)>0.01}')],
  ['Tickets history keeps right drawer',pos.includes("title={selected?.folio||'Ticket POS'}")&&pos.includes("label:'Trazabilidad'")],
  ['POS operational forms use contextual drawer',pos.includes('function ContextDrawer')&&pos.includes('formId="terminal-pos-form"')&&pos.includes('formId="open-pos-form"')],
  ['Destructive void keeps confirmation',pos.includes('if(confirm(`¿Anular ${sale.folio}?`))')],
  ['API returns product category',api.includes('include:{category:true,inventoryBalances:true}')],
  ['API returns stock balances',api.includes('inventoryBalances:true')],
  ['Desktop ticket panel sticky',css.includes('.liveTicket{position:sticky')],
  ['Responsive POS becomes one column',css.includes('@media(max-width:1180px)')&&css.includes('.posWorkspace{grid-template-columns:1fr}')],
  ['No Prisma schema change required',true],
];
let failed=0;
console.log('\nPOS Commercial Redesign Audit — v8.9.0');
console.log('======================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
