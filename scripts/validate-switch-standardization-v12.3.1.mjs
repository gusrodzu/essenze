import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const css=fs.readFileSync(path.join(root,'apps/web/src/design-system/components/Switch.module.css'),'utf8');
const globalCss=fs.readFileSync(path.join(root,'apps/web/src/design-system/styles/global-ui-v12.3.css'),'utf8');
const jsx=fs.readFileSync(path.join(root,'apps/web/src/design-system/components/Switch.jsx'),'utf8');
const checks=[
  ['Switch compartido usa 40px de ancho',/width:\s*40px/.test(css)],
  ['Switch compartido usa 22px de alto',/height:\s*22px/.test(css)],
  ['Thumb usa 16px',/width:\s*16px[\s\S]*height:\s*16px/.test(css)],
  ['Recorrido del thumb es 18px',/translateX\(18px\)/.test(css)],
  ['Mantiene role switch accesible',/role="switch"/.test(jsx)],
  ['Mantiene aria-checked',/aria-checked/.test(jsx)],
  ['Token global de ancho',/--bb-switch-w:40px/.test(globalCss)],
  ['Token global de alto',/--bb-switch-h:22px/.test(globalCss)],
  ['Fallback global role=switch',/button\[role="switch"\]/.test(globalCss)],
  ['Hover no cambia tamaño/posición',/button\[role="switch"\]:not\(:disabled\):hover\{transform:none!important;\}/.test(globalCss)],
];
let fail=0;
for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'}  ${name}`); if(!ok) fail++; }
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;
