import fs from 'node:fs';
const svc=fs.readFileSync('apps/api/src/services/stateTransitions.js','utf8'),payroll=fs.readFileSync('apps/api/src/routes/payroll.js','utf8'),expenses=fs.readFileSync('apps/api/src/routes/expenses.js','utf8'),approvals=fs.readFileSync('apps/api/src/routes/approvals.js','utf8');
const checks=[
['Shared transition error',svc.includes('InvalidStateTransitionError')],
['PAYROLL terminal states',svc.includes("PAID:[]")&&svc.includes("CANCELLED:[]")],
['Purchase state machines',svc.includes('PURCHASE_REQUEST')&&svc.includes('PURCHASE_ORDER')],
['Receivables/payables state machines',svc.includes('ACCOUNTS_PAYABLE')&&svc.includes('ACCOUNTS_RECEIVABLE')],
['Payroll uses central guard',payroll.includes('assertTransition({')&&payroll.includes('STATE_MACHINES.PAYROLL')],
['Expenses DRAFT submit guard',expenses.includes("expense.status!=='DRAFT'")],
['Paid expense cancel guard',expenses.includes("expense.status==='PAID'")],
['Approvals include conflict guards',approvals.includes('409')]
];
let f=0;console.log('\nState Transition Hardening — v12.0.0');for(const[n,o]of checks){console.log(`${o?'PASS':'FAIL'}  ${n}`);if(!o)f++;}console.log(`\n${checks.length-f} PASS / ${f} FAIL`);if(f)process.exit(1);
