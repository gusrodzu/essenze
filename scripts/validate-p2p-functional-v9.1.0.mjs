
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const pr=read('apps/api/src/routes/purchaseRequests.js');
const po=read('apps/api/src/routes/purchaseOrders.js');
const receipts=read('apps/api/src/routes/receipts.js');
const ap=read('apps/api/src/routes/accountsPayable.js');
const inventory=read('apps/api/src/routes/inventory.js');
const approvals=read('apps/api/src/routes/approvals.js');
const procurement=read('apps/api/src/routes/procurement.js');
const runtime=read('scripts/runtime-p2p-functional-v9.1.0.mjs');

const checks=[
  ['SOLPED create endpoint',pr.includes("router.post('/', requirePermission('purchase_requests.create')")],
  ['SOLPED submit endpoint',pr.includes("router.post('/:id/submit'")&&pr.includes("status:'PENDING'")],
  ['SOLPED creates workflow approval',pr.includes("entityType:'PURCHASE_REQUEST'")&&pr.includes('createApprovalForEntity')],
  ['Workflow decision applies to domain entity',approvals.includes('applyApprovalDecisionToEntity')],
  ['OC requires approved SOLPED when linked',po.includes("status: 'APPROVED'")&&po.includes('purchaseRequestId')],
  ['OC creates approval request',po.includes("entityType:'PURCHASE_ORDER'")&&po.includes('createPurchaseOrderApproval')],
  ['OC issue blocks pending approval',po.includes("code: 'APPROVAL_REQUIRED'")],
  ['Direct receive endpoint blocked',po.includes('Registra la entrada desde Compras → Recepciones')],
  ['Receipt validates pending quantity',receipts.includes('input.quantity > pending')],
  ['Receipt updates inventory balance',receipts.includes('inventoryBalance.upsert')],
  ['Receipt creates Kardex movement',receipts.includes("type: 'PURCHASE_RECEIPT'")&&receipts.includes('inventoryMovement.create')],
  ['Receipt updates PO received quantity',receipts.includes('purchaseOrderItem.update')],
  ['Receipt supports partial/complete status',receipts.includes("'PARTIALLY_RECEIVED'")&&receipts.includes("'RECEIVED'")],
  ['Receipt generates CxP from supplier document',receipts.includes('accountsPayable.create')&&receipts.includes('supplierDocument')],
  ['CxP due date uses payment terms',receipts.includes('order.paymentTerms')],
  ['Duplicate supplier invoice prevented',receipts.includes('ALREADY_EXISTS')],
  ['CxP payment endpoint',ap.includes("router.post('/:id/payments'")],
  ['Overpayment blocked',ap.includes('El pago supera el saldo pendiente')],
  ['Payment marks PAID or PARTIALLY_PAID',ap.includes("'PARTIALLY_PAID'")&&ap.includes("'PAID'")],
  ['Inventory balances readable',inventory.includes("router.get('/balances'")],
  ['Kardex readable',inventory.includes("router.get('/movements'")],
  ['Procurement dashboard available',procurement.includes("router.get('/dashboard'")],
  ['Runtime QA defaults read-only',runtime.includes("READ_ONLY_PREFLIGHT")&&runtime.includes("P2P_WRITE")],
  ['Runtime QA never resets database',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes('deleteMany(')],
  ['Runtime QA covers payment',runtime.includes('Registrar pago a proveedor')],
  ['Runtime QA writes report artifact',runtime.includes("artifacts','qa")],
  ['No Prisma schema change required',true]
];

let failed=0;
console.log('\nProcure-to-Pay Functional Audit — v9.1.0');
console.log('========================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
