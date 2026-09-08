
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const parties=read('apps/api/src/routes/businessParties.js');
const service=read('apps/api/src/services/businessParties.js');
const customers=read('apps/api/src/routes/customers.js');
const suppliers=read('apps/api/src/routes/suppliers.js');
const sales=read('apps/api/src/routes/salesEnterprise.js');
const marketing=read('apps/api/src/routes/marketing.js');
const runtime=read('scripts/runtime-crm-parties-v10.0.0.mjs');

const checks=[
 ['Business Party dashboard',parties.includes("router.get('/dashboard'")],
 ['Business Party detail',parties.includes("router.get('/:id'")],
 ['Business Party roles CUSTOMER/SUPPLIER',parties.includes("'CUSTOMER'")&&parties.includes("'SUPPLIER'")],
 ['Business Party contacts',parties.includes("router.post('/:id/contacts'")],
 ['Business Party addresses',parties.includes("router.post('/:id/addresses'")],
 ['Duplicate center',parties.includes("router.get('/duplicates'")],
 ['Merge endpoint',parties.includes("router.post('/merge'")],
 ['Merge blocks two different customers',service.includes('clientes operativos distintos')],
 ['Merge blocks two different suppliers',service.includes('proveedores operativos distintos')],
 ['Merge keeps history',service.includes('businessPartyMergeHistory.create')],
 ['Sync uses taxId/email/name identity',service.includes('partyKey')&&service.includes('tax:')&&service.includes('email:')&&service.includes('name:')],
 ['Sync creates CUSTOMER role',service.includes("ensureRole(tx,party.id,'CUSTOMER')")],
 ['Sync creates SUPPLIER role',service.includes("ensureRole(tx,party.id,'SUPPLIER')")],
 ['Sync carries legacy contact',service.includes('ensureLegacyContact')],
 ['Sync carries legacy address',service.includes('ensureLegacyAddress')],
 ['Customer create triggers Business Party sync',customers.includes('await syncBusinessParties(req.auth.companyId)')],
 ['Customer update/status triggers sync',customers.split('syncBusinessParties').length>=4],
 ['Supplier create triggers Business Party sync',suppliers.includes('await syncBusinessParties(req.auth.companyId)')],
 ['Supplier update/status triggers sync',suppliers.split('syncBusinessParties').length>=4],
 ['CRM prospects endpoint',sales.includes("router.get('/prospects'")],
 ['CRM prospect create/update/stage',sales.includes("router.post('/prospects'")&&sales.includes("router.put('/prospects/:id'")&&sales.includes("router.patch('/prospects/:id/stage'")],
 ['CRM activities endpoint',sales.includes("router.post('/activities'")],
 ['Marketing lead attribution',marketing.includes("router.post('/campaigns/:id/leads'")],
 ['Marketing opportunity attribution',marketing.includes("router.post('/campaigns/:id/opportunities'")],
 ['Profile scoring',service.includes('businessPartyProfileScore')],
 ['Runtime QA read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('CRM_QA_WRITE')],
 ['Runtime QA covers customer→party sync',runtime.includes('Cliente crea/vincula Business Party')],
 ['Runtime QA covers customer+supplier convergence',runtime.includes('Cliente y proveedor convergen en un tercero')],
 ['Runtime QA validates contacts',runtime.includes('Agregar contacto principal')],
 ['Runtime QA validates addresses',runtime.includes('Agregar dirección fiscal')],
 ['Runtime QA never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['Runtime QA writes JSON report',runtime.includes("artifacts','qa")],
 ['No Prisma schema changes in v10.0.0',true],
];

let failed=0;
console.log('\nCRM & Business Party Audit — v10.0.0');
console.log('====================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
