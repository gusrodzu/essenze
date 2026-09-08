import fs from 'node:fs';

const css=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');

for(const token of [
  'grid-template-rows:minmax(0,1fr) minmax(0,1fr)',
  'grid-template-rows:repeat(3,minmax(0,1fr))',
  'grid-template-columns:repeat(4,minmax(0,1fr))',
  'justify-content:center',
  'align-self:end'
]){
  if(!css.includes(token)){
    console.error('Falta regla:',token);
    process.exit(1);
  }
}

console.log('OK: v7.4.4 rellena completamente BuzzBee AI y Aplicaciones.');
