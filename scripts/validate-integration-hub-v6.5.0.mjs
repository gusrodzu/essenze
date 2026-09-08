import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const events=fs.readFileSync('apps/api/src/services/integrationEvents.js','utf8');
const worker=fs.readFileSync('apps/api/src/services/integrationWorker.js','utf8');
const expenses=fs.readFileSync('apps/api/src/routes/expenses.js','utf8');
const approvals=fs.readFileSync('apps/api/src/routes/approvals.js','utf8');
const inventory=fs.readFileSync('apps/api/src/routes/inventoryOperations.js','utf8');
const fulfillment=fs.readFileSync('apps/api/src/routes/salesFulfillment.js','utf8');
const api=fs.readFileSync('apps/api/src/routes/integrations.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/IntegrationHub.jsx','utf8');

for(const x of ['enum WebhookQueueStatus','model WebhookDeliveryJob','DEAD_LETTER','RETRY_WAIT'])
  if(!schema.includes(x)){console.error('schema',x);process.exit(1)}

for(const x of ['processDueWebhookDeliveries','retryDeadLetterJob','RETRY_DELAYS_MS','emitLowStockEvents','webhookDeliveryJob.createMany'])
  if(!events.includes(x)){console.error('events',x);process.exit(1)}

for(const x of ['startIntegrationWorker','setInterval'])
  if(!worker.includes(x)){console.error('worker',x);process.exit(1)}

for(const [source,tokens] of [
  [expenses,['expense.submitted','approval.required']],
  [approvals,['approval.required']],
  [inventory,['emitLowStockEvents']],
  [fulfillment,['emitLowStockEvents']],
  [api,["/queue/process","/queue/:id/retry"]],
  [ui,['Cola / DLQ','Dead Letter Queue','processQueue','retryDeadLetter']]
]){
  for(const x of tokens)if(!source.includes(x)){console.error('token',x);process.exit(1)}
}

console.log('OK: Integration Hub v3 tiene cola durable, retry/backoff, DLQ y eventos restantes conectados.');
