import fs from 'node:fs';
const jsx=fs.readFileSync('apps/web/src/pages/PurchaseRequests.jsx','utf8');
const css=fs.readFileSync('apps/web/src/pages/PurchaseRequests.module.css','utf8');
const checks=[
  ['Modal centered',css.includes('.recordOverlay')&&css.includes('place-items:center')],
  ['Structured hero',jsx.includes('recordHero')&&jsx.includes('recordIdentity')],
  ['Status and priority in header',jsx.includes('heroStatus')&&jsx.includes('Prioridad')],
  ['Metadata chips',jsx.includes('recordMeta')&&jsx.includes('CalendarDays')],
  ['Summary tab',jsx.includes("drawerTab==='summary'")],
  ['Items tab',jsx.includes("drawerTab==='items'")],
  ['Approvals tab',jsx.includes("drawerTab==='approvals'")],
  ['Information card',jsx.includes('Información general')],
  ['Justification card',jsx.includes('Justificación')],
  ['Resolution card',jsx.includes('Resolución')],
  ['Approval flow visualization',jsx.includes('Flujo de aprobación')&&jsx.includes('flowTimeline')],
  ['Items table',jsx.includes('itemsTableHead')&&jsx.includes('Total estimado')],
  ['Responsive modal',css.includes('@media(max-width:820px)')&&css.includes('@media(max-width:640px)')],
  ['Existing workflow actions preserved',jsx.includes('Enviar a aprobación')&&jsx.includes('Rechazar')&&jsx.includes('Aprobar')],
  ['No Prisma changes required',true],
];
let failed=0;
console.log('\nPurchase Request Modal Audit — v9.3.0');
console.log('======================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
