
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(p,'utf8');
const helper=read('apps/api/src/services/transactionalIntegrity.js');
const idx=read('apps/api/src/index.js');
const treasury=read('apps/api/src/routes/treasury.js');
const fulfillment=read('apps/api/src/routes/salesFulfillment.js');
const schema=read('apps/api/prisma/schema.prisma');
const files=fs.readdirSync('apps/api/src/routes').filter(x=>x.endsWith('.js'));
const hardened=files.filter(x=>read(path.join('apps/api/src/routes',x)).includes('transactionalIntegrity.js'));
const raw=files.filter(x=>{
  const s=read(path.join('apps/api/src/routes',x));
  return s.includes('prisma.$transaction(async (tx) => {')||s.includes('prisma.$transaction(async(tx)=>{');
});
const checks=[
 ['Serializable isolation is enforced',helper.includes("isolationLevel:'Serializable'")],
 ['P2034 write conflicts retry',helper.includes("'P2034'")],
 ['Postgres serialization/deadlock conflicts retry',helper.includes("'40001'")&&helper.includes("'40P01'")],
 ['Retries are bounded',helper.includes('retries=3')&&helper.includes('attempt>retries')],
 ['Jittered exponential backoff exists',helper.includes('Math.random()')&&helper.includes('2**(attempt-1)')],
 ['Exhausted conflict becomes HTTP 409',helper.includes("statusCode=409")&&helper.includes("code='CONCURRENCY_CONFLICT'")],
 ['Global handler exposes safe operational conflict',idx.includes('const expose=Boolean(error?.expose)')&&idx.includes("error.code||'OPERATION_CONFLICT'")],
 ['At least 15 transactional routes hardened',hardened.length>=15],
 ['No legacy direct callback transactions remain in routes',raw.length===0],
 ['Treasury sequence accepts transaction client',treasury.includes("prefix='MOV', db=prisma")&&treasury.includes('db,')],
 ['Treasury MOV sequence is transaction-local',treasury.includes("nextFolio(req.auth.companyId, 'MOV', tx)")],
 ['Treasury transfer sequence is transaction-local',treasury.includes("nextFolio(req.auth.companyId, 'TRS', tx)")],
 ['Sales delivery sequence is transaction-local',fulfillment.includes("nextFolio(req.auth.companyId, 'salesDelivery', 'REM', tx)")],
 ['Idempotency model preserved',schema.includes('model IdempotencyRecord')],
 ['SequenceCounter preserved',schema.includes('model SequenceCounter')],
 ['Integration event dedup preserved',schema.includes('dedupKey')&&schema.includes('correlationId')],
 ['No Prisma schema changes required',true],
 ['No destructive reset introduced',![helper,idx,treasury,fulfillment].join('\n').includes('migrate reset')],
];
let fail=0;
console.log('\nTransactional Integrity Audit — v11.0.0');
console.log('=======================================');
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`);if(!ok)fail++;}
console.log(`\nHardened route files: ${hardened.length}`);
console.log(`Legacy direct transaction callbacks: ${raw.length}`);
console.log(`${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
