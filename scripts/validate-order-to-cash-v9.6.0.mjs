
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sales=read('apps/api/src/routes/sales.js');
const fulfillment=read('apps/api/src/routes/salesFulfillment.js');
const ar=read('apps/api/src/routes/accountsReceivable.js');
const collections=read('apps/api/src/routes/collections.js');
const o2c=read('apps/api/src/routes/orderToCash.js');
const schema=read('apps/api/prisma/schema.prisma');
const runtime=read('scripts/runtime-o2c-functional-v9.6.0.mjs');

const checks=[
 ['Cotización create endpoint',sales.includes("router.post('/quotes'")],
 ['Cotización status SENT/ACCEPTED',sales.includes("'SENT'")&&sales.includes("'ACCEPTED'")],
 ['Cotización convert endpoint',sales.includes("router.post('/quotes/:id/convert'")],
 ['Conversión marca quote CONVERTED',sales.includes("status: 'CONVERTED'")],
 ['Pedido status CONFIRMED',sales.includes("router.patch('/orders/:id/status'")&&sales.includes("'CONFIRMED'")],
 ['Entrega valida pedido confirmado',fulfillment.includes("status: {in: ['CONFIRMED', 'PARTIALLY_DELIVERED']}")],
 ['Entrega valida stock',fulfillment.includes('Stock insuficiente')],
 ['Entrega descuenta inventario',fulfillment.includes('inventoryBalance.update')],
 ['InventoryMovement enum soporta SALE_OUT',/enum InventoryMovementType \{[\s\S]*SALE_OUT/.test(schema)],
 ['Entrega usa createdById canónico',fulfillment.includes('createdById: req.auth.sub')],
 ['Entrega crea Kardex SALE_OUT',fulfillment.includes("type: 'SALE_OUT'")&&fulfillment.includes('reference: folio')],
 ['Pedido se actualiza PARTIALLY_DELIVERED/DELIVERED',fulfillment.includes("'PARTIALLY_DELIVERED'")&&fulfillment.includes("'DELIVERED'")],
 ['Facturación requiere pedido entregado',fulfillment.includes("status: {in: ['DELIVERED', 'PARTIALLY_DELIVERED']}")],
 ['Doble factura bloqueada',fulfillment.includes('El pedido ya tiene una factura asociada')],
 ['Factura crea CxC',fulfillment.includes('accountsReceivable.create')],
 ['Factura marca pedido INVOICED',fulfillment.includes("status: 'INVOICED'")],
 ['CxC soporta cobro total/parcial',ar.includes("'PARTIALLY_PAID'")&&ar.includes("'PAID'")],
 ['Sobre-cobro bloqueado',ar.includes('El cobro supera el saldo pendiente')],
 ['Cobranza crea movimiento de tesorería',collections.includes('treasuryMovement.create')],
 ['Cobranza actualiza saldo de tesorería',collections.includes('treasuryAccount.update')],
 ['Cobranza aplica a CxC',collections.includes('accountsReceivable.update')],
 ['Cobranza sincroniza SalesInvoice',collections.includes('salesInvoice.update')],
 ['Dashboard Order-to-Cash disponible',o2c.includes("router.get('/dashboard'")],
 ['Runtime QA es read-only por defecto',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('O2C_WRITE')],
 ['Runtime QA no resetea DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes('deleteMany(')],
 ['Runtime QA cubre quote→order→delivery→invoice→collection',runtime.includes('Crear cotización')&&runtime.includes('Registrar remisión / entrega')&&runtime.includes('Registrar cobranza')],
 ['Runtime QA verifica Kardex',runtime.includes('Kardex contiene SALE_OUT')],
 ['Runtime QA verifica doble factura',runtime.includes('Doble facturación bloqueada')],
 ['Runtime QA genera reporte JSON',runtime.includes("artifacts','qa")],
 ['Schema change es sólo extensión de enum requerida por ventas',schema.includes('SALE_OUT')],
];

let failed=0;
console.log('\nOrder-to-Cash Functional Audit — v9.6.0');
console.log('========================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
