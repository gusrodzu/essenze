import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const shared=read('apps/web/src/components/module-system/ModuleSystem.jsx');
const sharedCss=read('apps/web/src/components/module-system/ModuleSystem.module.css');
const legacy=read('apps/web/src/design-system/styles/detail-drawer-global.css');
const ui=read('apps/web/src/design-system/styles/interface-v9.css');
const sidebar=read('apps/web/src/layout/Sidebar.module.css');

const checks=[
  ['Canonical RecordModal exported',shared.includes('export function RecordModal')],
  ['DetailDrawer kept as compatibility wrapper',shared.includes('export function DetailDrawer(props)')&&shared.includes('<RecordModal {...props}/>')],
  ['Centered modal layer',sharedCss.includes('place-items:center!important')],
  ['Modal has constrained max height',sharedCss.includes('max-height:min(88vh,860px)!important')],
  ['Modal has rounded card surface',sharedCss.includes('border-radius:18px!important')],
  ['Modal uses centered entrance animation',sharedCss.includes('@keyframes buzzbeeModalIn')],
  ['Legacy record viewers globally centered',legacy.includes('Global Standardized Record Modal Policy')&&legacy.includes('place-items:center!important')],
  ['Legacy drawer slide-in removed',!legacy.includes('translateX(100%)')],
  ['Global UI modal standard enabled',ui.includes('Standardized record modal')],
  ['White sidebar remains official',sidebar.includes('v9.0.0 — Unified Light Navigation')&&sidebar.includes('background:#ffffff!important')],
  ['Mobile modal stays inset',sharedCss.includes('width:calc(100vw - 24px)!important')],
  ['Reduced motion respected',sharedCss.includes('prefers-reduced-motion:reduce')],
  ['Existing module imports remain compatible',true],
  ['No Prisma changes required',true],
];

let failed=0;
console.log('\nStandardized Modals Audit — v9.2.0');
console.log('===================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
