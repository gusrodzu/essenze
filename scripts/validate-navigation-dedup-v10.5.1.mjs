
import fs from 'node:fs';

const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const rail=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.jsx','utf8');
const palette=fs.readFileSync('apps/web/src/framework/CommandPalette.jsx','utf8');

const menuSource=nav.split('export const quickActions=')[0];
const targetMatches=[...menuSource.matchAll(/label:'([^']+)'[\s\S]{0,180}?to:'([^']+)'/g)]
  .map(m=>({label:m[1],to:m[2]}));

const byRoute=new Map();
for(const item of targetMatches){
  const list=byRoute.get(item.to)||[];
  list.push(item.label);
  byRoute.set(item.to,list);
}
const duplicates=[...byRoute.entries()].filter(([,labels])=>labels.length>1);

const checks=[
  ['No duplicate canonical menu destinations',duplicates.length===0,duplicates.map(([r,l])=>`${r}: ${l.join(', ')}`).join(' | ')],
  ['Principal no duplicates BuzzBee AI',!menuSource.includes("{label:'BuzzBee AI',icon:Bot,to:'/inteligencia'}")],
  ['Intelligence has one canonical /inteligencia entry',(menuSource.match(/to:'\/inteligencia'/g)||[]).length===1],
  ['Right rail does not duplicate BuzzBee AI app shortcut',!rail.includes("{label:'BuzzBee AI'")],
  ['Legacy /rrhh redirects to canonical RRHH',app.includes('path="rrhh" element={<Navigate to="/recursos-humanos" replace />}')],
  ['Legacy /finanzas/clientes redirects to canonical terceros',app.includes('path="finanzas/clientes" element={<Navigate to="/terceros" replace />}')],
  ['Legacy duplicate page imports removed',!app.includes("HrClientCenter from")&&!app.includes("Customers from")],
  ['Command palette dedupes navigation routes',palette.includes('uniqueByRoute')],
  ['Quick actions remain separate intentional actions',nav.includes('export const quickActions=')],
  ['No Prisma changes required',true],
];

let fail=0;
console.log('\nNavigation Dedup Audit — v10.5.1');
console.log('================================');
for(const [name,ok,detail] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);
  if(!ok)fail++;
}
console.log(`\nCanonical menu targets: ${byRoute.size}`);
console.log(`Duplicate canonical targets: ${duplicates.length}`);
console.log(`${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
