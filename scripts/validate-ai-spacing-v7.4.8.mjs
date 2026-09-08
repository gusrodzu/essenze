import fs from 'node:fs';
const jsx=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.jsx','utf8');
const css=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
const ctx=fs.readFileSync('apps/web/src/framework/aiContext.js','utf8');
if(!jsx.includes('slice(0, 5)')&&!jsx.includes('slice(0,5)')) process.exit(1);
if(!css.includes('repeat(5,minmax(28px,1fr))')) process.exit(1);
const blocks=[...ctx.matchAll(/suggestions:\s*\[(.*?)\]/gs)];
if(blocks.length<12) process.exit(1);
for(const b of blocks){const n=(b[1].match(/'/g)||[]).length/2;if(n<5){console.error('Bloque con menos de 5',n);process.exit(1)}}
console.log(`OK: ${blocks.length} contextos tienen al menos 5 sugerencias y el rail muestra 5.`);
