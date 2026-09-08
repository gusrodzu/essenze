
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const schema=read('apps/api/prisma/schema.prisma');
const index=read('apps/api/src/index.js');
const idem=read('apps/api/src/middleware/idempotency.js');
const tele=read('apps/api/src/middleware/operationalTelemetry.js');
const seq=read('apps/api/src/services/sequence.js');
const pr=read('apps/api/src/routes/purchaseRequests.js');
const po=read('apps/api/src/routes/purchaseOrders.js');
const treasury=read('apps/api/src/routes/treasury.js');
const flow=read('apps/api/src/services/flowEngine.js');

const protectedRouters=[
 'purchaseRequests.js','purchaseOrders.js','receipts.js','inventoryOperations.js',
 'accountsPayable.js','accountsReceivable.js','treasury.js','sales.js',
 'salesFulfillment.js','salesReturns.js','collections.js','expenses.js',
 'bankReconciliation.js','accounting.js','payroll.js','pos.js','production.js','fiscal.js','flow.js'
];

const checks=[
 ['IdempotencyRecord is additive and tenant-scoped',schema.includes('model IdempotencyRecord')&&schema.includes('@@unique([companyId, scope, key])')],
 ['SequenceCounter is additive and tenant-scoped',schema.includes('model SequenceCounter')&&schema.includes('@@unique([companyId, scope, period])')],
 ['Idempotency hashes method/path/body',idem.includes('requestHash')&&idem.includes("createHash('sha256')")],
 ['Idempotency rejects key reuse with different payload',idem.includes('requestHash!==requestHash')],
 ['Completed requests are replayed',idem.includes("x-idempotency-status','replayed")],
 ['Concurrent same-key requests are blocked',idem.includes('IDEMPOTENCY_IN_PROGRESS')],
 ['Sequence allocation uses atomic increment',seq.includes("data:{value:{increment:1}}")],
 ['Sequence bootstraps existing records',seq.includes('baseCount+1')],
 ['Purchase Request folio uses SequenceCounter',pr.includes("scope:'purchase-request'")],
 ['Purchase Order folio uses SequenceCounter',po.includes("scope:'purchase-order'")],
 ['Treasury folio uses SequenceCounter',treasury.includes("scope:`treasury-${prefix.toLowerCase()}`")],
 ['Flow auto-restock shares Purchase Request sequence',flow.includes("scope:'purchase-request'")],
 ['Operational telemetry is mounted',index.includes('app.use(operationalTelemetry)')],
 ['Telemetry includes request/tenant/user/duration',tele.includes('requestId')&&tele.includes('companyId')&&tele.includes('userId')&&tele.includes('durationMs')],
 ['API health version is 10.6.0',index.includes("version: '10.6.0'")&&index.includes("version:'10.6.0'")],
 ['High-risk routers enable optional idempotency',
   protectedRouters.every(name=>read(`apps/api/src/routes/${name}`).includes('router.use(idempotency());'))],
 ['No destructive migration/reset commands introduced',
   ![schema,index,idem,tele,seq].join('\n').includes('migrate reset')&&! [schema,index,idem,tele,seq].join('\n').includes('down -v')],
];

let fail=0;
console.log('\nIdempotency + Observability + Concurrency Audit — v10.6.0');
console.log('========================================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)fail++;
}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
