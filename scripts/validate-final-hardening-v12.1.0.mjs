import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const routes='apps/api/src/routes';
const files=fs.readdirSync(routes).filter(x=>x.endsWith('.js'));

let mutations=0,protectedMutations=0,validated=0;
const unprotected=[];
for(const file of files){
  const s=read(path.join(routes,file));
  for(const m of s.matchAll(/router\.(post|put|patch|delete)\s*\(/g)){
    mutations++;
    const chunk=s.slice(m.index,m.index+650);
    const protectedRoute=
      chunk.includes('requirePermission(')||
      chunk.includes('requireApiKeyScope(')||
      chunk.includes('requireAuthenticatedSelfService')||
      file==='auth.js';
    if(protectedRoute)protectedMutations++;
    else unprotected.push(`${file}@${s.slice(0,m.index).split('\n').length}`);
    const contract=s.slice(m.index,m.index+5000);
    if(contract.includes('.safeParse(')||contract.includes('.parse(')||file==='auth.js')validated++;
  }
}

const app=read('apps/web/src/App.jsx');
const vite=read('apps/web/vite.config.js');
const company=read('apps/api/src/routes/company.js');
const activity=read('apps/api/src/routes/activity.js');
const admin=read('apps/api/src/routes/admin.js');
const warehouses=read('apps/api/src/routes/warehouses.js');

const checks=[
  ['Mutating endpoints have explicit permission/scope/self-service guard',protectedMutations===mutations],
  ['Company mutations use explicit permissions',company.includes("router.put('/', requirePermission('users.manage')")&&company.includes("router.post('/branches', requirePermission('warehouses.manage')")],
  ['Notification self-service mutations have explicit guard',activity.includes("router.patch('/notifications/:id/read', requireAuthenticatedSelfService")&&activity.includes("router.patch('/notifications/read-all', requireAuthenticatedSelfService")],
  ['Role list is tenant-aware',admin.includes("users:{some:{user:{companyId:request.auth.companyId}}}")],
  ['Role update verifies tenant ownership',admin.includes("message:'Rol no encontrado en esta empresa'")],
  ['Warehouse tenant boundary is explicit',warehouses.includes('Tenant boundary: warehouses inherit company ownership through Branch')],
  ['React pages use route-level lazy loading',app.includes("import {lazy, Suspense} from 'react'")&&app.includes("lazy(()=>import('./pages/")],
  ['Routes have Suspense fallback',app.includes('<Suspense fallback=')],
  ['Vite uses manualChunks',vite.includes('manualChunks(id)')],
  ['React vendor chunk configured',vite.includes("return 'vendor-react'")],
  ['Contract validation coverage remains >= 75%',mutations?validated/mutations>=0.75:true]
];

let fail=0;
console.log('\nFinal Hardening Audit — v12.1.0 RC1');
console.log('====================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\nMutating endpoints: ${mutations}`);
console.log(`Explicitly protected: ${protectedMutations} (${mutations?Math.round(protectedMutations/mutations*100):100}%)`);
console.log(`Schema-validated nearby: ${validated} (${mutations?Math.round(validated/mutations*100):100}%)`);
if(unprotected.length)console.log('Unprotected:',unprotected.join(', '));
console.log(`${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
