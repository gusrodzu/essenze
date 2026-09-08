import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const schema=read('apps/api/prisma/schema.prisma');
const seed=read('apps/api/prisma/seed-demo-company-v8.js');

const checks=[
  ['Company.slug removed',!seed.includes("slug:'buzzbee-demo'")&&!seed.includes('where:{slug')],
  ['Company uses unique taxId',seed.includes("where:{taxId}")&&seed.includes("taxId='BBD260904D01'")],
  ['Role is global, no companyId filter',!seed.includes("prisma.role.findFirst({\n    where:{companyId")],
  ['Warehouse uses branchId_code',seed.includes('branchId_code:{branchId:branch.id')],
  ['Warehouse does not write companyId',!seed.includes("create:{\n      companyId:company.id,\n      branchId:branch.id,\n      code:'ALM-MTY'")],
  ['Position includes companyId',seed.includes("companyId:company.id,\n        code,\n        name,\n        departmentId")],
  ['PurchaseRequestItem has no description',!seed.includes("description:product.name")],
  ['PurchaseOrderItem calculated totals',seed.includes('subtotal,')&&seed.includes('taxAmount,')&&seed.includes('total,')],
  ['GoodsReceipt uses createdById',seed.includes('createdById:demoUser.id')&&!seed.includes('receivedById')],
  ['HR incident uses real enum',seed.includes("type:'LATE_ARRIVAL'")],
  ['HR incident uses real fields',!seed.includes('impactType')&&!seed.includes('impactAmount')],
  ['Attendance uses employeeId_date',seed.includes('employeeId_date:{employeeId:employee.id,date:today}')],
  ['Business Party role composite valid',seed.includes("partyId_role:{partyId:party.id,role:'SUPPLIER'}")],
  ['Seed stays company-scoped',seed.includes('companyId:company.id')],
  ['No destructive deleteMany',!seed.includes('.deleteMany(')],
];

let failed=0;
console.log('\nDemo Seed Hotfix Audit — v8.0.1');
console.log('================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
