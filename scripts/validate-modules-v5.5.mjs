import fs from 'node:fs';
const reqs=[
 ['apps/api/prisma/schema.prisma',['model Module {','model CompanyModule {','model ModuleFeature {','model SubscriptionPlan {','model CompanySubscription {','model CompanyFeatureLimit {','model UsageRecord {']],
 ['apps/api/src/routes/modules.js',["router.get('/dashboard'","router.put('/company/:moduleId'","router.post('/subscriptions'"]],
 ['apps/web/src/pages/Modules.jsx',["apiRequest('/modules/dashboard')",'Configuración de módulos']],
 ['apps/web/src/App.jsx',['path="configuracion/modulos"']],
 ['apps/api/prisma/seed.js',["'modules.read'","'modules.manage'"]],
];
let bad=false;
for(const [file,tokens] of reqs){const t=fs.readFileSync(file,'utf8');for(const token of tokens){if(!t.includes(token)){console.error(`Falta ${token} en ${file}`);bad=true}}}
if(bad)process.exit(1);
console.log('OK: Configuración modular SaaS v5.5.0 tiene dominio, API, UI, permisos, planes y límites.');
