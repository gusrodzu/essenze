import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const route=fs.readFileSync('apps/api/src/routes/businessParties.js','utf8');
const service=fs.readFileSync('apps/api/src/services/businessParties.js','utf8');
const page=fs.readFileSync('apps/web/src/pages/BusinessParties.jsx','utf8');
const css=fs.readFileSync('apps/web/src/pages/BusinessParties.module.css','utf8');

const checks=[
  ['BusinessPartyContact model',schema.includes('model BusinessPartyContact {')],
  ['BusinessPartyAddress model',schema.includes('model BusinessPartyAddress {')],
  ['Merge history model',schema.includes('model BusinessPartyMergeHistory {')],
  ['Address type enum',schema.includes('enum BusinessPartyAddressType {')],
  ['Tags on BusinessParty',schema.includes('tags           String[]')],
  ['Contacts relation',schema.includes('contacts       BusinessPartyContact[]')],
  ['Addresses relation',schema.includes('addresses      BusinessPartyAddress[]')],
  ['Duplicate endpoint',route.includes("router.get('/duplicates'")],
  ['Merge endpoint',route.includes("router.post('/merge'")],
  ['Contact endpoint',route.includes("router.post('/:id/contacts'")],
  ['Address endpoint',route.includes("router.post('/:id/addresses'")],
  ['Tenant isolation contacts',route.includes('companyId:req.auth.companyId')],
  ['Safe merge blocks customer conflict',service.includes('ambos terceros están vinculados a clientes operativos distintos')],
  ['Safe merge blocks supplier conflict',service.includes('ambos terceros están vinculados a proveedores operativos distintos')],
  ['Merge history persisted',service.includes('businessPartyMergeHistory.create')],
  ['Profile scoring',service.includes('businessPartyProfileScore')],
  ['Dedup engine',service.includes('findBusinessPartyDuplicates')],
  ['Frontend duplicate center',page.includes('Centro de deduplicación')],
  ['Frontend contacts',page.includes('Agregar contacto')],
  ['Frontend addresses',page.includes('Agregar dirección')],
  ['Frontend score KPI',page.includes('Calidad de perfiles')],
  ['Shared KPI remains',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')],
  ['Responsive workspace',css.includes('@media(max-width:1180px)')]
];

let failed=0;
console.log('\nBusiness Party v2 Audit — v7.6.0');
console.log('==================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
