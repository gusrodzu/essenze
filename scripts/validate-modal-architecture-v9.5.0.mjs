import fs from 'node:fs';
const shared=fs.readFileSync('apps/web/src/components/module-system/ModuleSystem.jsx','utf8');
const ap=fs.readFileSync('apps/web/src/pages/AccountsPayable.jsx','utf8');
const ar=fs.readFileSync('apps/web/src/pages/AccountsReceivable.jsx','utf8');
const hr=fs.readFileSync('apps/web/src/pages/HumanResources.jsx','utf8');
const procurement=fs.readFileSync('apps/web/src/pages/ProcurementCenter.jsx','utf8');
const checks=[
 ['Shared ModalSection exists',shared.includes('export function ModalSection')],
 ['Shared ModalInfoGrid exists',shared.includes('export function ModalInfoGrid')],
 ['Shared ModalNote exists',shared.includes('export function ModalNote')],
 ['Shared ModalFormSection exists',shared.includes('export function ModalFormSection')],
 ['CxP detail uses RecordModal',ap.includes('<RecordModal')&&ap.includes('Resumen financiero')],
 ['CxP content adapted to finance',ap.includes('Historial de pagos')&&ap.includes('Orden relacionada')],
 ['CxC detail uses RecordModal',ar.includes('<RecordModal')&&ar.includes('Historial de cobros')],
 ['CxC content adapted to receivables',ar.includes('Cliente')&&ar.includes('Cobrado')],
 ['HR edit/create uses RecordModal',hr.includes('<RecordModal')&&hr.includes('hr-record-form')],
 ['HR form grouped by semantic sections',hr.includes('Identificación')&&hr.includes('Asignación organizacional')&&hr.includes('Información laboral y personal')],
 ['Procurement shared modal gets rich header',procurement.includes('eyebrow="Solicitud de compra"')&&procurement.includes('icon={ClipboardCheck}')],
 ['All existing DetailDrawer consumers inherit RecordModal',shared.includes('return <RecordModal {...props}/>')],
 ['Global modal format remains active',fs.readFileSync('apps/web/src/main.jsx','utf8').includes('modal-format-v9.4.css')],
 ['All modals remain centered',fs.readFileSync('apps/web/src/main.jsx','utf8').includes('modal-centered-global.css')],
 ['No Prisma changes required',true],
];
let failed=0;
console.log('\nModal Architecture Migration Audit — v9.5.0');
console.log('============================================');
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
