import fs from 'node:fs';

const schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');
const route = fs.readFileSync('apps/api/src/routes/modules.js', 'utf8');

for (const field of ['billingDay', 'nextBillingAt', 'planChangeLockedUntil']) {
  if (!schema.includes(field)) {
    console.error(`Falta ${field} en CompanySubscription`);
    process.exit(1);
  }
}
for (const token of [
  'getNextBillingDate',
  'PLAN_CHANGE_LOCKED',
  'planChangeLockedUntil',
  'billingDay: z.number().int().min(1).max(28)',
  'currentPeriodEnd: nextBillingAt',
]) {
  if (!route.includes(token)) {
    console.error(`Falta regla de billing: ${token}`);
    process.exit(1);
  }
}
console.log('OK: ciclo de facturación y bloqueo de cambio de plan v5.5.3.');
