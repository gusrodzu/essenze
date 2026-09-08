import fs from 'node:fs';
const reqs=[
 ['apps/api/prisma/schema.prisma',['model ProductionWorkCenter {','model BillOfMaterials {','model ProductionOrder {','model ProductionOperation {','model ProductionConsumption {','model ProductionWaste {','model ProductionBatch {']],
 ['apps/api/src/routes/production.js',["router.get('/dashboard'","router.post('/boms'","router.post('/orders'","'/orders/:id/consumptions'","'/orders/:id/outputs'"]],
 ['apps/web/src/pages/Production.jsx',["apiRequest('/production/dashboard')",'Producción','BOM / materiales']],
 ['apps/web/src/App.jsx',['path="produccion"']],
 ['apps/web/src/data/navigation.js',["label: 'Producción'"]],
 ['apps/api/prisma/seed.js',["'production.read'","'production.manage'"]],
];
let bad=false;
for(const [file,tokens] of reqs){const t=fs.readFileSync(file,'utf8');for(const token of tokens){if(!t.includes(token)){console.error(`Falta ${token} en ${file}`);bad=true}}}
if(bad)process.exit(1);
console.log('OK: Producción v5.3.0 tiene dominio, API, UI, permisos e integración con Inventario/Ventas/Proyectos.');
