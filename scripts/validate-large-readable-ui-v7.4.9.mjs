import fs from 'node:fs';
const t=fs.readFileSync('apps/web/src/design-system/styles/tokens.css','utf8');
const r=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
for(const x of ['--type-page-title:clamp(1.85rem','--type-section-title:1.3125rem','--type-body:1rem','--type-body-sm:.9375rem']){
 if(!t.includes(x)){console.error('Falta',x);process.exit(1)}
}
if(!r.includes('font-size:.9375rem!important')) process.exit(1);
console.log('OK: v7.4.9 aplica escala tipográfica grande y legible.');
