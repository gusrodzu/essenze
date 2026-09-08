import fs from 'node:fs';

const css=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');

for(const token of [
  'flex-direction:column',
  'height:auto',
  'grid-template-columns:repeat(4,minmax(0,1fr))',
  'min-height:31px',
  'gap:8px'
]){
  if(!css.includes(token)){
    console.error('Falta regla:', token);
    process.exit(1);
  }
}

console.log('OK: v7.4.5 usa espaciado compacto y altura natural en BuzzBee AI/Aplicaciones.');
