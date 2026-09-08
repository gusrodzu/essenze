import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const schema=read('apps/api/prisma/schema.prisma');
const index=read('apps/api/src/index.js');
const modules=read('apps/api/src/routes/modules.js');
const ai=read('apps/api/src/services/buzzbeeAI.js');
const seed=read('apps/api/prisma/seed.js');
const auth=read('apps/api/src/middleware/auth.js');
const perms=read('apps/api/src/middleware/permissions.js');

const tests=[
 ['Prisma schema has Company',schema.includes('model Company {')],
 ['Prisma schema has CompanyModule',schema.includes('model CompanyModule {')],
 ['Prisma schema has BusinessParty',schema.includes('model BusinessParty {')],
 ['Prisma schema has persistent webhook queue',schema.includes('model WebhookDeliveryJob {')],
 ['Auth exports requireAuth',auth.includes('export function requireAuth')],
 ['Permissions exports requirePermission',perms.includes('export function requirePermission')],
 ['Modules dashboard registered',index.includes("app.use('/api/modules', modulesRouter)")],
 ['Modules dashboard has serializer',modules.includes('function serializeSubscription')],
 ['Billing date helper exists',modules.includes('function getNextBillingDate')],
 ['Readiness endpoint exists',index.includes("app.get('/api/ready'")],
 ['AI permission seeded',seed.includes("['ai.read'")],
 ['AI is read-only',ai.includes("mode:'READ_ONLY'")],
 ['AI has no raw SQL',!ai.includes('$queryRaw')&&!ai.includes('$executeRaw')],
 ['AI PurchaseOrder statuses match schema',ai.includes("['DRAFT','ISSUED','PARTIALLY_RECEIVED']")],
 ['AI HR incidents use actual date field',ai.includes("prisma.hrIncident.count({where:{companyId,date:{gte:since(30)}}})")],
 ['AI Intelligence uses message field',ai.includes('message:true')&&!ai.includes('summary:true')],
];

let failed=0;
console.log('\nBuzzBee Core Audit v7.5.1');
console.log('==========================');
for(const [name,ok] of tests){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${tests.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
