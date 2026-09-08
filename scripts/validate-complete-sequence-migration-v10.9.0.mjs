import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const files=['receipts','accountsReceivable','bankReconciliation','salesFulfillment','collections','sales','fixedAssets','accounting','salesReturns','expenses','accountsPayable','payroll','inventoryOperations'];
const src=Object.fromEntries(files.map(n=>[n,read(`apps/api/src/routes/${n}.js`)]));
const checks=[
 ['Receipts use SequenceCounter',src.receipts.includes("scope:'goods-receipt'")],
 ['AR collections use SequenceCounter',src.accountsReceivable.includes("scope:'customer-payment'")],
 ['Bank reconciliation uses SequenceCounter',src.bankReconciliation.includes("scope:'bank-statement'")],
 ['Sales fulfillment uses shared sequence helper',src.salesFulfillment.includes('nextSequenceFolio')],
 ['Collections use shared sequence helper',src.collections.includes('nextSequenceFolio')],
 ['Sales quote/order use shared sequence helper',src.sales.includes('nextSequenceFolio')],
 ['Fixed assets use global SequenceCounter',src.fixedAssets.includes("scope:'fixed-asset'")&&src.fixedAssets.includes('nextSequence(')],
 ['Accounting journal uses SequenceCounter',src.accounting.includes("scope:'journal-entry'")],
 ['Sales returns/credit notes use shared sequence helper',src.salesReturns.includes('nextSequenceFolio')],
 ['Expenses use SequenceCounter',src.expenses.includes("scope:'expense'")],
 ['AP supplier payments use SequenceCounter',src.accountsPayable.includes("scope:'supplier-payment'")],
 ['AP Treasury MOV shares canonical treasury-mov sequence',src.accountsPayable.includes("scope:'treasury-mov'")],
 ['Collections Treasury MOV shares canonical treasury-mov sequence',src.collections.includes("'treasury-mov'")],
 ['Payroll uses SequenceCounter',src.payroll.includes("scope:'payroll-period'")],
 ['Inventory adjustments/transfers use SequenceCounter',src.inventoryOperations.includes('nextSequenceFolio')],
 ['Legacy folio count+1 removed from migrated routes',!files.some(n=>/count\s*\+\s*1|count\+1|c\+1/.test(src[n]))],
 ['No destructive reset commands introduced',!Object.values(src).join('\n').includes('migrate reset')]
];
let fail=0; console.log('\nComplete Sequence Migration Audit — v10.9.0'); console.log('===========================================');
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`);if(!ok)fail++;}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`); if(fail)process.exit(1);
