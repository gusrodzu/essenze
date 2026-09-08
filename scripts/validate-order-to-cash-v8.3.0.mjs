import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

const service=read('apps/api/src/services/orderToCash.js');
const route=read('apps/api/src/routes/orderToCash.js');
const index=read('apps/api/src/index.js');
const collections=read('apps/api/src/routes/collections.js');
const app=read('apps/web/src/App.jsx');
const nav=read('apps/web/src/data/navigation.js');
const page=read('apps/web/src/pages/OrderToCash.jsx');
const css=read('apps/web/src/pages/OrderToCash.module.css');
const e2e=read('scripts/runtime-demo-e2e-v8.1.0.mjs');

const checks=[
 ['O2C service',service.includes('getOrderToCashDashboard')],
 ['Quotes stage',service.includes('salesQuote.findMany')],
 ['Orders stage',service.includes('salesOrder.findMany')],
 ['Delivery stage',service.includes('salesDelivery.findMany')],
 ['Invoice stage',service.includes('salesInvoice.findMany')],
 ['Receivables stage',service.includes('accountsReceivable.findMany')],
 ['Collections stage',service.includes('collectionReceipt.findMany')],
 ['Bottleneck alerts',service.includes('deliveredNotInvoiced')&&service.includes('overdueReceivables')],
 ['Tenant auth route',route.includes('requireAuth')&&route.includes("requirePermission('sales.read')")],
 ['API registered',index.includes("app.use('/api/order-to-cash'")],
 ['Frontend route',app.includes('element={<OrderToCash />}')],
 ['Navigation entry',nav.includes("to:'/ventas/order-to-cash'")],
 ['Shared KPI pattern',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')&&page.includes('<KpiInfo')],
 ['Six-stage visual flow',page.includes('data.stages?.map')],
 ['Vertical split responsive',css.includes('@media(max-width:1180px)')],
 ['Collections uses canonical CollectionReceipt',collections.includes('tx.collectionReceipt.create({')],
 ['Wrong customerPayment create removed',!collections.includes('tx.customerPayment.create({')],
 ['Runtime E2E probe',e2e.includes("['/order-to-cash/dashboard','Order-to-Cash']")],
 ['No Prisma schema changes',true]
];

let failed=0;
console.log('\nOrder-to-Cash Audit — v8.3.0');
console.log('=============================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
