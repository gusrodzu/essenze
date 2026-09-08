import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const billing=fs.readFileSync('apps/api/src/routes/billing.js','utf8');

const relation='scheduledPlan SubscriptionPlan? @relation("ScheduledSubscriptionPlan", fields: [scheduledPlanId], references: [id], onDelete: SetNull)';
if(!schema.includes(relation)){
  console.error('Falta CompanySubscription.scheduledPlan');
  process.exit(1);
}
if(!schema.includes('scheduledSubscriptions CompanySubscription[] @relation("ScheduledSubscriptionPlan")')){
  console.error('Falta relación inversa scheduledSubscriptions');
  process.exit(1);
}
const exact='<Route path="configuracion/facturacion" element={<Billing />} />';
if(!app.includes(exact)){
  console.error('Falta ruta configuracion/facturacion');
  process.exit(1);
}
if(app.indexOf(exact)>app.indexOf('<Route path="configuracion/*"')){
  console.error('La ruta billing quedó después del wildcard');
  process.exit(1);
}
if(!billing.includes("router.get('/health'")){
  console.error('Falta billing health');
  process.exit(1);
}
console.log('OK: v5.6.1 corrige relación Prisma y ruta React de Billing.');
