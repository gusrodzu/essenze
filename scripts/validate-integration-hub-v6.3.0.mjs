import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/integrations.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/IntegrationHub.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');

for(const token of [
  'model IntegrationConnection',
  'model ApiCredential',
  'model WebhookEndpoint',
  'model WebhookDeliveryLog',
  'enum WebhookDeliveryStatus'
]){
  if(!schema.includes(token)){console.error(`Falta schema: ${token}`);process.exit(1)}
}

for(const token of [
  "createHash('sha256')",
  "createCipheriv('aes-256-gcm'",
  "createHmac('sha256'",
  "/api-keys",
  "/webhooks/:id/test",
  "/webhooks/:id/rotate-secret",
  'webhookDeliveryLog'
]){
  if(!api.includes(token)){console.error(`Falta API: ${token}`);process.exit(1)}
}

for(const token of [
  '<KpiGrid>',
  '<KpiCard>',
  '<KpiInfo',
  'API Keys',
  'Webhooks',
  'Logs',
  'Signing secret'
]){
  if(!ui.includes(token)){console.error(`Falta UI: ${token}`);process.exit(1)}
}

for(const permission of [
  'integrations.read',
  'integrations.manage',
  'integrations.keys',
  'integrations.test'
]){
  if(!seed.includes(permission)){console.error(`Falta permiso: ${permission}`);process.exit(1)}
}

if(!nav.includes("label: 'Integration Hub'")){
  console.error('Integration Hub no está en navegación');
  process.exit(1);
}

console.log('OK: Integration Hub v1 tiene conexiones, API Keys, webhooks firmados, cifrado y logs.');
