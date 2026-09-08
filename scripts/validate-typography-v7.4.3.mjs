import fs from 'node:fs';
import path from 'node:path';

const tokens=fs.readFileSync('apps/web/src/design-system/styles/tokens.css','utf8');
const globals=fs.readFileSync('apps/web/src/design-system/styles/globals.css','utf8');
const kpi=fs.readFileSync('apps/web/src/components/KpiCard.module.css','utf8');
const rail=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');

for(const token of [
  '--type-page-title',
  '--type-section-title',
  '--type-subsection-title',
  '--type-body',
  '--type-caption',
  '--type-kpi-value'
]){
  if(!tokens.includes(token)){
    console.error('Falta token:',token);
    process.exit(1);
  }
}

for(const token of ['h1 {','h2 {','h3 {','table {','label {']){
  if(!globals.includes(token)){
    console.error('Falta jerarquía global:',token);
    process.exit(1);
  }
}

if(!kpi.includes('var(--type-kpi-value)')){
  console.error('KPI no usa escala semántica');
  process.exit(1);
}

if(!rail.includes('v7.4.3 — Right rail typography hierarchy')){
  console.error('Rail derecho no actualizado');
  process.exit(1);
}

const dir='apps/web/src/pages';
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.module.css'));
let standardized=0;
for(const file of files){
  const txt=fs.readFileSync(path.join(dir,file),'utf8');
  if(txt.includes('v7.4.3 — standardized typography hierarchy')) standardized++;
}
console.log(`OK: Typography v7.4.3 activa. ${standardized} módulos recibieron overrides semánticos.`);
