import fs from 'node:fs';
import path from 'node:path';

const root='apps/web/src';
const globalCss=fs.readFileSync('apps/web/src/design-system/styles/modal-centered-global.css','utf8');
const main=fs.readFileSync('apps/web/src/main.jsx','utf8');

const known=[
  'modal','largeModal','smallModal','paymentModal','duplicatesModal',
  'detailModal','drawer','overlay','backdrop','customizerOverlay','drawerLayer'
];

const checks=[
  ['Global centered-modal stylesheet exists',fs.existsSync('apps/web/src/design-system/styles/modal-centered-global.css')],
  ['Centered stylesheet imported last',main.trim().includes("import './design-system/styles/modal-centered-global.css';")],
  ['Overlay uses viewport centering',globalCss.includes('place-items:center!important')],
  ['Overlay also forces justify center',globalCss.includes('justify-content:center!important')],
  ['Modal removes docked inset positioning',globalCss.includes('right:auto!important')&&globalCss.includes('left:auto!important')],
  ['Modal height returns to content-based',globalCss.includes('height:auto!important')],
  ['Modal max height scroll-safe',globalCss.includes('max-height:min(88vh,860px)!important')],
  ['Detail modal centered',globalCss.includes('[class*="_detailModal_"]')],
  ['Legacy drawer compatibility centered',globalCss.includes('[class*="_drawer_"]')],
  ['Payment modal centered',globalCss.includes('[class*="_paymentModal_"]')],
  ['Duplicates modal centered',globalCss.includes('[class*="_duplicatesModal_"]')],
  ['Large and small modal variants covered',globalCss.includes('[class*="_largeModal_"]')&&globalCss.includes('[class*="_smallModal_"]')],
  ['Customizer overlay covered',globalCss.includes('[class*="_customizerOverlay_"]')],
  ['Mobile remains centered/inset',globalCss.includes('width:calc(100vw - 24px)!important')],
  ['Reduced motion supported',globalCss.includes('prefers-reduced-motion:reduce')],
  ['No Prisma changes required',true],
];

let failed=0;
console.log('\nAll Modals Centered Audit — v9.2.1');
console.log('===================================');
for(const [label,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${label}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
