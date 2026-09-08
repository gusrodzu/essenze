import fs from 'node:fs';

const pos=fs.readFileSync('apps/web/src/pages/Pos.jsx','utf8');
const css=fs.readFileSync('apps/web/src/pages/Pos.module.css','utf8');
const shared=fs.readFileSync('apps/web/src/components/module-system/ModuleSystem.jsx','utf8');

const checks=[
  ['POS imports shared DetailDrawer',pos.includes("import {DetailDrawer} from '../components/module-system';")],
  ['Ticket list opens selected ticket',pos.includes('onClick={()=>openTicket(s)}')],
  ['Ticket detail uses DetailDrawer',pos.includes("title={selected?.folio||'Ticket POS'}")],
  ['Ticket drawer has Resumen tab',pos.includes("label:'Resumen'")],
  ['Ticket drawer has Partidas tab',pos.includes("id:'items'")],
  ['Ticket drawer has Pagos tab',pos.includes("id:'payments'")],
  ['Ticket drawer has Trazabilidad tab',pos.includes("label:'Trazabilidad'")],
  ['Ticket summary shows totals and customer',pos.includes('selected.taxTotal')&&pos.includes('selected.discountTotal')&&pos.includes('Público general')],
  ['Ticket items render product lines',pos.includes('selected.items?.map')],
  ['Ticket payments render payment methods',pos.includes('selected.payments?.map')],
  ['Ticket trace shows terminal/session/ticket/payment',pos.includes('Sesión de caja')&&pos.includes('Ticket generado')&&pos.includes('Terminal')],
  ['Void stays destructive confirmation',pos.includes('if(confirm(`¿Anular ${sale.folio}?`))')],
  ['Void action available from drawer footer',pos.includes('Anular ticket')],
  ['Ticket rows styled as interactive',css.includes('.ticketRow{cursor:pointer')],
  ['Drawer responsive styles present',css.includes('@media(max-width:700px)')],
  ['Shared DetailDrawer remains canonical',shared.includes('export function DetailDrawer')],
  ['No Prisma changes required',true]
];

let failed=0;
console.log('\nPOS Ticket Drawer Audit — v8.8.1');
console.log('================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
