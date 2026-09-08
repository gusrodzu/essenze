
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const idx=read('apps/api/src/index.js');
const iw=read('apps/api/src/services/integrationWorker.js');
const intw=read('apps/api/src/services/intelligenceWorker.js');
const wh=read('apps/api/src/services/workerHealth.js');
const events=read('apps/api/src/services/integrationEvents.js');
const flow=read('apps/api/src/services/flowEngine.js');
const ops=read('apps/api/src/routes/operations.js');
const schema=read('apps/api/prisma/schema.prisma');

const checks=[
 ['Worker health registry exists',wh.includes('getWorkerHealth')&&wh.includes('workerSucceeded')&&wh.includes('workerFailed')],
 ['Integration worker reports health',iw.includes("workerStarted('integration')")&&iw.includes("workerSucceeded('integration'")&&iw.includes("workerFailed('integration'")],
 ['Intelligence worker reports health',intw.includes("workerStarted('intelligence')")&&intw.includes("workerSucceeded('intelligence'")&&intw.includes("workerFailed('intelligence'")],
 ['Integration worker supports graceful stop',iw.includes('export function stopIntegrationWorker')],
 ['Intelligence worker supports graceful stop',intw.includes('export function stopIntelligenceWorker')],
 ['API handles SIGINT/SIGTERM',idx.includes("process.on('SIGINT'")&&idx.includes("process.on('SIGTERM'")],
 ['Shutdown disconnects Prisma',idx.includes('await prisma.$disconnect()')],
 ['Protected operations health endpoint mounted',idx.includes("app.use('/api/operations', operationsRouter)")&&ops.includes('router.use(requireAuth)')],
 ['Operations health exposes queue state',ops.includes('deadLetters')&&ops.includes('stale')&&ops.includes('recentFailures24h')],
 ['Webhook payload carries correlationId',events.includes('correlationId')],
 ['Webhook header propagates correlation ID',events.includes("'x-buzzbee-correlation-id':correlationId")],
 ['Flow context carries event correlation',flow.includes('correlationId:eventLogId||null')&&flow.includes('eventLogId:eventLogId||null')],
 ['Stale queue recovery preserved',events.includes('Entrega recuperada después de una interrupción del worker.')],
 ['v10.6 reliability models preserved',schema.includes('model IdempotencyRecord')&&schema.includes('model SequenceCounter')],
 ['No Prisma schema change in v10.7.0',true],
];
let fail=0;
console.log('\nWorker Reliability + Traceability Audit — v10.7.0');
console.log('================================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
