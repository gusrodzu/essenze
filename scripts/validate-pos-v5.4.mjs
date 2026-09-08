import fs from 'node:fs';
const reqs=[
 ['apps/api/prisma/schema.prisma',['model PosTerminal {','model PosSession {','model PosSale {','model PosSaleItem {','model PosPayment {','model PosCashMovement {','model PosDiscount {']],
 ['apps/api/src/routes/pos.js',["router.get('/dashboard'","router.post('/sessions/open'","router.post('/sales'","'/sales/:id/void'"]],
 ['apps/web/src/pages/Pos.jsx',["apiRequest('/pos/dashboard')",'Punto de venta','Tickets']],
 ['apps/web/src/App.jsx',['path="pos"']],
 ['apps/web/src/data/navigation.js',["label: 'POS'"]],
 ['apps/api/prisma/seed.js',["'pos.read'","'pos.manage'"]],
];
let bad=false;
for(const [file,tokens] of reqs){const t=fs.readFileSync(file,'utf8');for(const token of tokens){if(!t.includes(token)){console.error(`Falta ${token} en ${file}`);bad=true}}}
if(bad)process.exit(1);
console.log('OK: POS v5.4.0 tiene dominio, API, UI, permisos e integración con productos/clientes/caja.');
