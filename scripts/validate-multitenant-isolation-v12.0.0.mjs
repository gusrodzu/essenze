import fs from 'node:fs';
import path from 'node:path';
const dir='apps/api/src/routes';
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.js'));
const exempt=new Set(['auth.js','health.js']);
const globalCatalogs=new Set([]); // keep empty unless architecture explicitly declares a global route.
let protectedFiles=0,tenantAware=0;
const warnings=[];

for(const file of files){
  if(exempt.has(file)||globalCatalogs.has(file))continue;
  const s=fs.readFileSync(path.join(dir,file),'utf8');
  if(!(s.includes('requireAuth')||s.includes('requireApiKeyScope')))continue;
  protectedFiles++;

  const explicitTenant=
    s.includes('req.auth.companyId')||
    s.includes('request.auth.companyId')||
    s.includes('req.apiAuth.companyId')||
    s.includes('request.apiAuth.companyId');

  if(explicitTenant)tenantAware++;
  else warnings.push(file);
}

const pct=protectedFiles?Math.round(tenantAware/protectedFiles*100):100;
console.log('\nMulti-company Isolation Audit — v12.1.0 RC1');
console.log('============================================');
console.log(`Protected route files: ${protectedFiles}`);
console.log(`Tenant-aware route files: ${tenantAware}`);
console.log(`Coverage: ${pct}%`);
warnings.forEach(x=>console.log(`WARN  ${x}`));
if(pct<98){
  console.error('FAIL  Tenant scoping coverage < 98%.');
  process.exit(1);
}
console.log('PASS  Tenant scoping coverage >= 98%.');
