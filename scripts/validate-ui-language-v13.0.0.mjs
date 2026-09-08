import fs from 'node:fs'; import path from 'node:path';
const root='apps/web/src';
const forbidden=[
  ['title="Dashboard"','Dashboard'],['>Dashboard<','Dashboard'],['title="Search"','Search'],['>Search<','Search'],
  ['title="Save"','Save'],['>Save<','Save'],['title="Cancel"','Cancel'],['>Cancel<','Cancel'],
  ['title="Delete"','Delete'],['>Delete<','Delete'],['title="Edit"','Edit'],['>Edit<','Edit'],
  ['title="Loading"','Loading'],['>Loading<','Loading'],['>No data<','No data'],
  ['title="Revenue"','Revenue'],['>Revenue<','Revenue'],['title="Planning"','Planning'],['eyebrow="Funnel"','Funnel']
];
const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(jsx|js)$/.test(e.name))files.push(p)}}; walk(root);
const hits=[];
for(const f of files){const s=fs.readFileSync(f,'utf8'); for(const [needle,label] of forbidden){if(s.includes(needle))hits.push(`${f}: ${label}`)}}
const dict=fs.readFileSync('apps/web/src/design-system/i18n/uiLanguage.js','utf8');
const badge=fs.readFileSync('apps/web/src/design-system/components/Badge.jsx','utf8');
const checks=[['Diccionario es-MX central',dict.includes("ACTIVE:'Activo'")&&dict.includes("HEALTHY:'Saludable'")],['Badge usa statusLabel',badge.includes('statusLabel')],['Sin copy inglés crítico detectado',hits.length===0]];
for(const [n,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${n}`);
if(hits.length){console.log('\nHallazgos:');hits.forEach(h=>console.log('- '+h))}
const fail=checks.filter(x=>!x[1]); console.log(`\nUI Language Audit: ${checks.length-fail.length} PASS / ${fail.length} FAIL`);process.exit(fail.length?1:0);
