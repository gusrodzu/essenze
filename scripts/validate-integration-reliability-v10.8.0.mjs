
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const schema=read('apps/api/prisma/schema.prisma');
const events=read('apps/api/src/services/integrationEvents.js');
const integrations=read('apps/api/src/routes/integrations.js');
const publicApi=read('apps/api/src/routes/publicApi.js');
const idem=read('apps/api/src/middleware/idempotency.js');
const ops=read('apps/api/src/routes/operations.js');
const idx=read('apps/api/src/index.js');

const checks=[
 ['Integration events have additive dedup fields',schema.includes('dedupKey        String?')&&schema.includes('correlationId   String?')&&schema.includes('replayOfId      String?')],
 ['Dedup is tenant-scoped unique',schema.includes('@@unique([companyId, dedupKey])')],
 ['Event emitter checks existing dedup key',events.includes('companyId_dedupKey')&&events.includes('deduplicated:true')],
 ['Dedup handles concurrent P2002 race',events.includes("error?.code==='P2002'")],
 ['Replay bypasses normal event dedup',events.includes('bypassDedup:true')&&events.includes('replayOfId:original.id')],
 ['Replay preserves original correlation ID',events.includes('correlationId:original.correlationId||original.id')],
 ['Webhook delivery uses persisted correlation ID',events.includes('job.eventLog?.correlationId||job.eventLogId||requestId')],
 ['Public customer POST uses idempotency after API key auth',publicApi.includes("router.post('/customers',requireApiKeyScope('customers.write'),idempotency()")],
 ['Public product POST uses idempotency after API key auth',publicApi.includes("router.post('/products',requireApiKeyScope('products.write'),idempotency()")],
 ['Idempotency supports API-key tenant context',idem.includes("req.auth?.companyId||req.apiAuth?.companyId")],
 ['Public API event carries request trace',publicApi.includes('sourceRequestId:req.id||null')],
 ['Controlled replay endpoint is permission protected',integrations.includes("router.post('/events/:id/replay',requirePermission('integrations.test')")],
 ['Historical metrics endpoint is permission protected',integrations.includes("router.get('/metrics',requirePermission('integrations.read')")],
 ['Metrics include webhook success and API error rates',integrations.includes('webhookSuccessRate')&&integrations.includes('apiErrorRate')],
 ['Operational health includes 24h success rate',ops.includes('successRate24h')&&ops.includes('recentEvents24h')],
 ['API version bumped to 10.8.0',idx.includes("version: '10.8.0'")&&idx.includes("version:'10.8.0'")],
 ['No destructive migration/reset commands introduced',![schema,events,integrations].join('\n').includes('migrate reset')],
];

let fail=0;
console.log('\nIntegration Reliability Audit — v10.8.0');
console.log('======================================='); 
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
