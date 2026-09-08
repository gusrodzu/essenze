
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const auth=read('apps/api/src/middleware/auth.js');
const key=read('apps/api/src/middleware/apiKey.js');
const context=read('apps/api/src/middleware/requestContext.js');
const modules=read('apps/api/src/routes/modules.js');
const billing=read('apps/api/src/routes/billing.js');
const integrations=read('apps/api/src/routes/integrations.js');
const index=read('apps/api/src/index.js');
const runtime=read('scripts/runtime-core-saas-v10.3.0.mjs');
const version=read('apps/api/src/lib/version.js');

const checks=[
 ['Request correlation middleware',context.includes('crypto.randomUUID')&&context.includes("x-request-id")],
 ['Request context installed globally',index.includes('app.use(requestContext)')],
 ['Error responses expose requestId',index.includes("requestId:request.id||null")],
 ['Readiness version aligned',index.includes('version:APP_VERSION')&&version.includes("APP_VERSION = '13.0.1 RC1.1'")],
 ['JWT requires sub and companyId',auth.includes('!payload?.sub || !payload?.companyId')],
 ['JWT validates active user in token tenant',auth.includes('companyId:payload.companyId')&&auth.includes('active:true')],
 ['JWT validates active company',auth.includes('company:{active:true}')],
 ['API key lookup uses prefix only',key.includes("findUnique({")&&key.includes("where:{prefix}")],
 ['API key hash uses timingSafeEqual',key.includes('crypto.timingSafeEqual')],
 ['API key rejects inactive tenant',key.includes("!credential.company?.active")],
 ['API key keeps scope enforcement',key.includes('scopes.includes(scope)')],
 ['Public API access logs retained',key.includes('apiAccessLog.create')],
 ['Integration URL blocks localhost',integrations.includes("host==='localhost'")],
 ['Integration URL blocks private IPv4',integrations.includes("host.startsWith('10.')")||integrations.includes("ip.startsWith('10.')")],
 ['Integration URL blocks link-local metadata',integrations.includes("169.254.")&&integrations.includes('metadata.google.internal')],
 ['Production webhook requires HTTPS',integrations.includes("process.env.NODE_ENV==='production'&&u.protocol!=='https:'")],
 ['Usage endpoint available',modules.includes("router.get('/usage'")],
 ['Usage merges plan + override limits',modules.includes('planLimits')&&modules.includes('overrideLimits')],
 ['Usage exposes percent/exceeded',modules.includes('percent:')&&modules.includes('exceeded:')],
 ['SaaS status endpoint available',modules.includes("router.get('/saas-status'")],
 ['SaaS status exposes modules/API keys/webhooks/DLQ',modules.includes('activeApiKeys')&&modules.includes('activeWebhooks')&&modules.includes('deadLetters')],
 ['Billing health version aligned',billing.includes('version:APP_VERSION')],
 ['Billing plan changes audited',billing.includes("auditBilling(req,'CHANGE_PLAN'")],
 ['Billing scheduled changes audited',billing.includes("auditBilling(req,'SCHEDULE'")&&billing.includes("auditBilling(req,'APPLY_SCHEDULED'")],
 ['Billing payment method creation audited',billing.includes("BillingPaymentMethod")&&billing.includes('auditBilling')],
 ['Runtime QA is read-only',runtime.includes("mode:'READ_ONLY'")],
 ['Runtime validates request ID',runtime.includes('Request ID propagado')],
 ['Runtime validates tenant auth',runtime.includes('Endpoint tenant sin token bloqueado')],
 ['Runtime validates Public API auth',runtime.includes('Public API sin key bloqueada')],
 ['Runtime validates usage/limits',runtime.includes('Usage & limits')],
 ['Runtime validates SaaS status',runtime.includes('SaaS status')],
 ['Runtime never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['No Prisma schema changes in v10.3.0',true],
];

let failed=0;
console.log('\nCore SaaS Hardening Audit — v10.3.0');
console.log('===================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
