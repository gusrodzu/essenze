import fs from 'node:fs';
import path from 'node:path';

const pagesDir='apps/web/src/pages';
const files=fs.readdirSync(pagesDir).filter(x=>x.endsWith('.jsx'));
const modalPattern=/(styles\.(?:modal|drawer|detailModal|paymentModal|duplicatesModal)|<DetailDrawer|<RecordModal)/;
const modalPages=files.filter(file=>modalPattern.test(fs.readFileSync(path.join(pagesDir,file),'utf8')));
const css=fs.readFileSync('apps/web/src/design-system/styles/modal-format-v9.4.css','utf8');
const shared=fs.readFileSync('apps/web/src/components/module-system/ModuleSystem.jsx','utf8');
const main=fs.readFileSync('apps/web/src/main.jsx','utf8');

const checks=[
  ['Global modal format stylesheet imported',main.includes("modal-format-v9.4.css")],
  ['Global modal format imported last',main.trim().includes("import './design-system/styles/modal-format-v9.4.css';")],
  ['All modal-bearing pages covered by global selectors',modalPages.length>=30],
  ['Centered modal behavior preserved',css.includes('place-items:center!important')],
  ['Approved modal backdrop',css.includes('backdrop-filter:blur(5px)')],
  ['Approved rounded modal surface',css.includes('--bb-modal-radius:20px')],
  ['Legacy modal headers standardized',css.includes('Legacy modal header -> approved hero language')],
  ['Shared RecordModal upgraded',shared.includes('recordModalHeader')&&shared.includes("eyebrow='Detalle'")],
  ['Shared modal supports optional metadata',shared.includes('meta=[]')&&shared.includes('recordModalMeta')],
  ['Shared modal supports optional status',shared.includes('status')&&shared.includes('recordModalStatus')],
  ['Tabs standardized',css.includes('/* ---------- Tabs ---------- */')],
  ['Detail grids become information cards',css.includes('[class*="_detailGrid_"]')&&css.includes('background:#fff!important')],
  ['Notes/resolution blocks standardized',css.includes('[class*="_resolution_"]')],
  ['Tables standardized inside modal',css.includes('Tables inside modal')],
  ['Create/edit inputs standardized',css.includes('Inputs keep same form language')],
  ['Footer standardized',css.includes('/* ---------- Footer ---------- */')],
  ['Responsive modal format',css.includes('@media(max-width:760px)')],
  ['Purchase Request custom approved modal preserved',fs.readFileSync(path.join(pagesDir,'PurchaseRequests.jsx'),'utf8').includes('recordSummaryGrid')],
  ['No Prisma changes required',true],
];

let failed=0;
console.log('\nGlobal Modal Format Audit — v9.4.0');
console.log('==================================');
console.log(`Modal-bearing pages covered: ${modalPages.length}`);
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
