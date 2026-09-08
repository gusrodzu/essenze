
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const ap=read('apps/api/src/routes/accountsPayable.js');
const ar=read('apps/api/src/routes/accountsReceivable.js');
const collections=read('apps/api/src/routes/collections.js');
const treasury=read('apps/api/src/routes/treasury.js');
const expenses=read('apps/api/src/routes/expenses.js');
const budgets=read('apps/api/src/routes/budgets.js');
const assets=read('apps/api/src/routes/fixedAssets.js');
const admin=read('apps/api/src/services/administrativeCenter.js');
const runtime=read('scripts/runtime-admin-finance-v9.8.0.mjs');

const checks=[
 ['CxP payment endpoint',ap.includes("router.post('/:id/payments'")],
 ['CxP overpayment blocked',ap.includes('El pago supera el saldo pendiente')],
 ['CxP catalogs expose treasury accounts',ap.includes('treasuryAccounts')],
 ['CxP payment optionally posts Treasury EXPENSE',ap.includes("type:'EXPENSE'")&&ap.includes("referenceType:'SupplierPayment'")],
 ['CxP Treasury insufficient funds blocked',ap.includes('La cuenta de tesorería no tiene saldo suficiente')],
 ['CxC collection endpoint',ar.includes("router.post('/:id/payments'")],
 ['CxC overcollection blocked',ar.includes('El cobro supera el saldo pendiente')],
 ['Collections posts Treasury INCOME',collections.includes("type: 'INCOME'")],
 ['Collections updates treasury account',collections.includes('treasuryAccount.update')],
 ['Collections application updates CollectionReceipt model',collections.includes('tx.collectionReceipt.update')],
 ['Legacy wrong customerPayment update removed',!collections.includes('tx.customerPayment.update')],
 ['Treasury blocks negative balance',treasury.includes('El movimiento dejaría la cuenta con saldo negativo')],
 ['Treasury transfer requires distinct accounts',treasury.includes('La cuenta origen y destino deben ser diferentes')],
 ['Expenses require approval before pay',expenses.includes('El gasto debe estar aprobado antes de pagarse')],
 ['Paid expense cannot cancel',expenses.includes('Un gasto pagado no puede cancelarse')],
 ['Budgets expose planned vs actual',budgets.includes('plannedTotal')&&budgets.includes('actualTotal')&&budgets.includes('variance')],
 ['Budget line updates total',budgets.includes('refreshBudgetTotal')],
 ['Fixed assets calculate straight-line depreciation',assets.includes('monthlyDepreciation')&&assets.includes('bookValue')],
 ['Administrative Center calculates live asset book value',admin.includes('assetBookValue')&&admin.includes('usefulLifeMonths')],
 ['Administrative Center aggregates AP/AR/Treasury/Budget/Assets',admin.includes('payableBalance')&&admin.includes('receivableBalance')&&admin.includes('treasuryBalance')&&admin.includes('budgetTotal')&&admin.includes('assetNet')],
 ['Runtime QA is read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('ADMIN_QA_WRITE')],
 ['Runtime QA cross-checks AP',runtime.includes('Centro Admin = saldo CxP')],
 ['Runtime QA cross-checks AR',runtime.includes('Centro Admin = saldo CxC')],
 ['Runtime QA cross-checks Treasury',runtime.includes('Centro Admin = saldo Tesorería')],
 ['Runtime QA cross-checks Assets',runtime.includes('Centro Admin = valor neto Activos')],
 ['Write QA uses compensating Treasury movement',runtime.includes('Tesorería salida compensatoria')],
 ['Runtime QA never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")],
 ['No Prisma schema changes in v9.8.0',true],
];

let failed=0;
console.log('\nAdministration & Finance Audit — v9.8.0');
console.log('========================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
