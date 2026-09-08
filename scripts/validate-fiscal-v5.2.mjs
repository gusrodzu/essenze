import fs from 'node:fs';
const reqs=[
 ['apps/api/prisma/schema.prisma',['model Customer {','model FiscalIssuerProfile {','model FiscalCustomerProfile {','model FiscalInvoice {','model FiscalInvoiceItem {','model FiscalInvoiceTax {','model FiscalPaymentComplement {','model FiscalPaymentRelatedDocument {']],
 ['apps/api/src/routes/fiscal.js',["router.get('/dashboard'","'/invoices/from-sales-invoice'","'/invoices/:id/stamp-result'","'/payment-complements/from-receipt'"]],
 ['apps/web/src/pages/Fiscal.jsx',["apiRequest('/fiscal/dashboard')",'Facturación fiscal','Complementos de pago']],
 ['apps/web/src/App.jsx',['path="facturacion-fiscal"']],
 ['apps/web/src/data/navigation.js',["label: 'Facturación fiscal'"]],
 ['apps/api/prisma/seed.js',["'fiscal.read'","'fiscal.manage'"]],
];
let bad=false;
for(const [file,tokens] of reqs){const t=fs.readFileSync(file,'utf8');for(const token of tokens){if(!t.includes(token)){console.error(`Falta ${token} en ${file}`);bad=true}}}
const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
for(const model of ['Customer','MarketingCampaign','FiscalInvoice']){
 const matches=[...schema.matchAll(new RegExp(`^model ${model} \\{`,'gm'))].length;
 if(matches!==1){console.error(`${model}: se esperaban 1 modelo y hay ${matches}`);bad=true}
}
if(bad)process.exit(1);
console.log('OK: Facturación fiscal v5.2.0 tiene dominio, API, UI, permisos e integración comercial.');
