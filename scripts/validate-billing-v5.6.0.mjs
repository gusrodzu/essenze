import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/billing.js','utf8');
const page=fs.readFileSync('apps/web/src/pages/Billing.jsx','utf8');

for(const token of [
  'model SubscriptionChange','model BillingInvoice','model BillingInvoiceLine',
  'model BillingCredit','model BillingPaymentMethod','model BillingPaymentAttempt',
  'enum BillingCycle'
]){
  if(!schema.includes(token)){console.error('Falta '+token);process.exit(1)}
}
for(const token of [
  "router.post('/change-plan'","type==='DOWNGRADE'","proratedAmount",
  "scheduledPlanId","syncCompanyModules"
]){
  if(!api.includes(token)){console.error('Falta API '+token);process.exit(1)}
}
for(const token of ['Plan y facturación','Mejorar ahora','Cambiar al próximo ciclo']){
  if(!page.includes(token)){console.error('Falta UI '+token);process.exit(1)}
}
console.log('OK: Billing & Subscriptions v5.6.0 incluye upgrades, downgrades, prorrateo, ciclos e invoices.');
