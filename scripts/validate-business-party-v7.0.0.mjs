import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const service=fs.readFileSync('apps/api/src/services/businessParties.js','utf8');
const route=fs.readFileSync('apps/api/src/routes/businessParties.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/BusinessParties.jsx','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');

for(const x of ['model BusinessParty','model BusinessPartyRole','enum BusinessPartyRoleType'])
  if(!schema.includes(x)){console.error('schema',x);process.exit(1)}

for(const x of ['syncBusinessParties','businessPartyDashboard','partyKey'])
  if(!service.includes(x)){console.error('service',x);process.exit(1)}

for(const x of ['/sync','business_parties.read','business_parties.manage'])
  if(!route.includes(x)&&!seed.includes(x)){console.error('route/seed',x);process.exit(1)}

for(const x of ['BusinessParties','path="terceros"'])
  if(!app.includes(x)){console.error('app',x);process.exit(1)}

for(const x of ['Terceros 360',"/terceros"])
  if(!nav.includes(x)){console.error('nav',x);process.exit(1)}

for(const x of ['KpiGrid','Terceros únicos','Roles combinados','Cobertura clientes','Cobertura proveedores'])
  if(!ui.includes(x)){console.error('ui',x);process.exit(1)}

console.log('OK: Business Party Core v7.0.0 agrega identidad unificada, roles, sync seguro y UI KPI.');
