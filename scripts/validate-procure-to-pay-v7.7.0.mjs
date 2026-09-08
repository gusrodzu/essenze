import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const approvals=read('apps/api/src/routes/approvals.js');
const requests=read('apps/api/src/routes/purchaseRequests.js');
const orders=read('apps/api/src/routes/purchaseOrders.js');
const receipts=read('apps/api/src/routes/receipts.js');
const service=read('apps/api/src/services/procurementFlow.js');
const route=read('apps/api/src/routes/procurement.js');
const seed=read('apps/api/prisma/seed.js');
const app=read('apps/web/src/App.jsx');
const nav=read('apps/web/src/data/navigation.js');
const page=read('apps/web/src/pages/ProcurementCenter.jsx');

const checks=[
 ['CompanyUser bug removed',!approvals.includes('prisma.companyUser')],
 ['UserRole permission resolution',approvals.includes('prisma.userRole.findMany')],
 ['Domain decision sync',approvals.includes('applyApprovalDecisionToEntity')],
 ['SOLPED creates workflow approval',requests.includes("entityType:'PURCHASE_REQUEST'")],
 ['SOLPED emits submitted event',requests.includes("event:'purchase.request.submitted'")],
 ['Manual approval bypass blocked',requests.includes('WORKFLOW_APPROVAL_ACTIVE')],
 ['Shared approval service',service.includes('createApprovalForEntity')],
 ['Purchase request decision sync',service.includes("approvalRequest.entityType==='PURCHASE_REQUEST'")],
 ['Purchase order shared approval',orders.includes('createApprovalForEntity')],
 ['Receipt updates inventory remains',receipts.includes('inventoryBalance.upsert')],
 ['Receipt creates inventory movement',receipts.includes("type: 'PURCHASE_RECEIPT'")],
 ['Receipt finance handoff',receipts.includes('financeHandoff')],
 ['Receipt auto CxP',receipts.includes('tx.accountsPayable.create')],
 ['Due date uses payment terms',receipts.includes('order.paymentTerms')],
 ['Goods receipt event',receipts.includes("event:'goods.receipt.posted'")],
 ['Inventory received event',receipts.includes("event:'inventory.received'")],
 ['CxP created event',receipts.includes("event:'accounts_payable.created'")],
 ['Procurement dashboard service',service.includes('procurementDashboard')],
 ['Procurement dashboard API',route.includes("router.get('/dashboard'")],
 ['Approvals read permission seeded',seed.includes("['approvals.read'")],
 ['Approvals decide permission seeded',seed.includes("['approvals.decide'")],
 ['SOLPED workflow seeded',seed.includes("key: 'purchase_request_default'")],
 ['OC workflow seeded',seed.includes("key: 'purchase_order_default'")],
 ['Procurement center route',app.includes('element={<ProcurementCenter />}')],
 ['Procurement center navigation',nav.includes("Centro de compras")],
 ['Procurement standard KPIs',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')],
 ['Critical path visible',page.includes('1 · SOLPED')&&page.includes('6 · Administración')],
 ['Admin handoff explained',page.includes('Handoff automático a Administración')]
];

let failed=0;
console.log('\nProcure-to-Pay Audit — v7.7.0');
console.log('================================');
for(const [name,ok] of checks){
 console.log(`${ok?'PASS':'FAIL'}  ${name}`);
 if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
