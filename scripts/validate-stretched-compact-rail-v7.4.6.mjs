import fs from 'node:fs';
const css=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
for(const token of [
  'grid-template-rows:minmax(0,1fr) minmax(0,1fr)',
  'justify-content:space-evenly',
  'grid-template-rows:repeat(3,minmax(52px,1fr))',
  'width:31px',
  'min-height:31px'
]){
  if(!css.includes(token)){console.error('Falta regla:',token);process.exit(1)}
}
console.log('OK: v7.4.6 conserva dimensiones compactas y distribuye contenido a lo largo.');
