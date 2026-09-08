import {spawnSync} from 'node:child_process';
const suites=[
 ['UX e interacción','scripts/validate-ux-interactions-v13.0.0.mjs'],
 ['Idioma UI','scripts/validate-ui-language-v13.0.0.mjs'],
 ['Deployment','scripts/validate-deployment-v13.0.0.mjs'],
 ['Module rationalization','scripts/validate-module-rationalization-v12.2.0.mjs'],
 ['Visual standardization','scripts/validate-visual-standardization-v12.3.0.mjs'],
 ['Switch standardization','scripts/validate-switch-standardization-v12.3.1.mjs'],
 ['Final hardening','scripts/validate-final-hardening-v12.1.0.mjs'],
 ['Transactional integrity','scripts/validate-transactional-integrity-v11.0.0.mjs']
];
let failed=0;
for(const [name,file] of suites){console.log(`\n=== ${name} ===`);const r=spawnSync(process.execPath,[file],{stdio:'inherit'});if(r.status!==0)failed++}
console.log(`\nRelease Candidate v13.0.0 RC1: ${suites.length-failed}/${suites.length} suites PASS`);process.exit(failed?1:0);
