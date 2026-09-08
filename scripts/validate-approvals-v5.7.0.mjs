import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/approvals.js','utf8');
const page=fs.readFileSync('apps/web/src/pages/Approvals.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');

for(const token of ['model ApprovalWorkflow','model ApprovalRule','model ApprovalRequest','model ApprovalStep','model ApprovalAction']){
  if(!schema.includes(token)){console.error('Falta '+token);process.exit(1)}
}
for(const token of ["router.get('/dashboard'","router.post('/requests'","/approve","/reject"]){
  if(!api.includes(token)){console.error('Falta API '+token);process.exit(1)}
}
for(const token of ['Mi bandeja','Mis solicitudes','Historial','Flujos']){
  if(!page.includes(token)){console.error('Falta UI '+token);process.exit(1)}
}
if(!nav.includes("label: 'Aprobaciones'") || !app.includes('<Route path="aprobaciones" element={<Approvals />} />')){
  console.error('Falta navegación/ruta de aprobaciones');process.exit(1)
}
console.log('OK: Workflows y Aprobaciones v5.7.0 tiene dominio, API, UI y navegación.');
