import fs from 'node:fs';
const jsx=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.jsx','utf8');
const css=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
if(!jsx.includes('slice(0, 4)')&&!jsx.includes('slice(0,4)')) process.exit(1);
if(!css.includes('repeat(4,minmax(32px,1fr))')) process.exit(1);
console.log('OK: BuzzBee AI muestra 4 sugerencias manteniendo el bloque actual.');
