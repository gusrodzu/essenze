import fs from 'node:fs';
import path from 'node:path';
const dir='apps/web/src/pages';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.jsx'));
let grids=0,cards=0,fail=[];
for(const f of files){
 const t=fs.readFileSync(path.join(dir,f),'utf8');
 if(t.includes('className={styles.kpis}'))fail.push(`${f}: todavía usa styles.kpis`);
 if(t.includes('<KpiGrid>')){
   grids++;
   if(!t.includes("from '../components/KpiGrid'"))fail.push(`${f}: falta import KpiGrid`);
 }
 cards+=(t.match(/<KpiCard>/g)||[]).length;
}
for(const f of ['Expenses.jsx','FixedAssets.jsx']){
 const t=fs.readFileSync(path.join(dir,f),'utf8');
 if(!t.includes('<KpiCard>')||!t.includes('<KpiInfo'))fail.push(`${f}: KPI no estandarizado`);
}
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log(`OK: ${grids} pantallas usan KpiGrid y ${cards} KPI usan KpiCard.`);
