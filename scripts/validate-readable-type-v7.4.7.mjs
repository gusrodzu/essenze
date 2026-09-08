import fs from 'node:fs';
const t=fs.readFileSync('apps/web/src/design-system/styles/tokens.css','utf8');
const r=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
for(const x of ['--type-page-title:clamp(1.65rem','--type-section-title:1.125rem','--type-body:.9375rem','--type-kpi-value:clamp(1.55rem']){
 if(!t.includes(x)){console.error('Falta',x);process.exit(1)}
}
for(const x of ['font-size:.8125rem','font-size:.6875rem','font-size:.625rem']){
 if(!r.includes(x)){console.error('Rail falta',x);process.exit(1)}
}
console.log('OK: v7.4.7 tipografía ampliada conservando jerarquía y layout.');
