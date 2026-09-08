import fs from 'node:fs';
const css=fs.readFileSync('apps/web/src/layout/Sidebar.module.css','utf8');
for(const x of ['background:#ffffff!important','border-right:1px solid #e6eaf2!important','background:linear-gradient(90deg,#5b35e8']){
 if(!css.includes(x)){console.error('Falta',x);process.exit(1)}
}
console.log('OK: sidebar claro aplicado conservando estado activo BuzzBee.');
