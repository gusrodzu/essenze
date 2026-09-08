import fs from 'node:fs';
const po=fs.readFileSync('apps/api/src/routes/purchaseOrders.js','utf8');
for(const token of [
  'createPurchaseOrderApproval',
  "entityType: 'PURCHASE_ORDER'",
  "code: 'APPROVAL_REQUIRED'",
  "approval.status !== 'APPROVED'",
  'ordersWithApproval',
  'approvalRequired: Boolean(approval)'
]){
  if(!po.includes(token)){console.error('Falta '+token);process.exit(1)}
}
console.log('OK: Compras v5.7.1 crea y exige aprobaciones antes de emitir OC.');
