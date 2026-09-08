import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const root=JSON.parse(read('package.json'));
const login=read('apps/web/src/pages/Login.jsx');
const app=read('apps/web/src/App.jsx');
const demo=read('apps/web/src/pages/DemoCompany.jsx');
const exec=read('apps/web/src/pages/ExecutiveDemo.jsx');
const e2e=read('scripts/runtime-demo-e2e-v8.1.0.mjs');

const checks=[
 ['Runtime E2E script registered',root.scripts['demo:e2e']==='node scripts/runtime-demo-e2e-v8.1.0.mjs'],
 ['QA audit registered',root.scripts['qa:audit']==='node scripts/validate-qa-commercial-v8.1.0.mjs'],
 ['Login branded BuzzBee',login.includes('BuzzBee Business OS')],
 ['Demo credential helper',login.includes('Usar Demo Company')],
 ['Login version current',login.includes('Versión 10.3.0')],
 ['Demo page loading state',demo.includes('Validando empresa demo')],
 ['Demo page error retry',demo.includes('Reintentar validación')],
 ['Executive demo retry',exec.includes('Reintentar')],
 ['NotFound route',app.includes('element={<NotFound />}')],
 ['E2E health probe',e2e.includes("request('/health')")],
 ['E2E readiness probe',e2e.includes("request('/ready')")],
 ['E2E login',e2e.includes("request('/auth/login'")],
 ['E2E tenant probe',e2e.includes("['/auth/me','Sesión y tenant']")],
 ['E2E Demo Readiness',e2e.includes("['/reports/demo-readiness','Demo Readiness']")],
 ['E2E procurement',e2e.includes("['/procurement/dashboard','Procure-to-Pay']")],
 ['E2E HR',e2e.includes("['/hr-client/dashboard','RRHH Cliente']")],
 ['E2E AI',e2e.includes("['/ai/context','BuzzBee AI Context']")]
];

let failed=0;
console.log('\nQA + Commercial Polish Audit — v8.1.0');
console.log('======================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
