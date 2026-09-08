
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const pos=read('apps/api/src/routes/pos.js');
const schema=read('apps/api/prisma/schema.prisma');
const ui=read('apps/web/src/pages/Pos.jsx');
const runtime=read('scripts/runtime-pos-functional-v10.1.0.mjs');

const checks=[
 ['POS dashboard endpoint',pos.includes("router.get('/dashboard'")],
 ['Terminal creation endpoint',pos.includes("router.post('/terminals'")],
 ['Session open endpoint',pos.includes("router.post('/sessions/open'")],
 ['Session close endpoint',pos.includes("router.post('/sessions/:id/close'")],
 ['Cash movements endpoint',pos.includes("router.post('/sessions/:id/movements'")],
 ['Sale endpoint',pos.includes("router.post('/sales'")],
 ['Void endpoint',pos.includes("router.post('/sales/:id/void'")],
 ['Sale blocks duplicate products',pos.includes('No repitas productos en el mismo ticket')],
 ['Sale requires exact payment',pos.includes('deben coincidir con el total')],
 ['POS validates stock',pos.includes('Stock insuficiente para')],
 ['POS decrements InventoryBalance',pos.includes("data:{quantity:nextQty}")],
 ['POS creates SALE_OUT Kardex',pos.includes("type:'SALE_OUT'")],
 ['Void restores InventoryBalance',pos.includes("type:'SALE_RETURN_IN'")],
 ['SALE_RETURN_IN exists in Prisma enum',/enum InventoryMovementType \{[\s\S]*SALE_RETURN_IN/.test(schema)],
 ['Cash sale creates SALE movement',pos.includes("type:'SALE'")],
 ['Void cash creates REFUND movement',pos.includes("type:'REFUND'")],
 ['Close no longer double-counts cash payments',pos.includes('No se vuelven a sumar desde PosPayment')&&!pos.includes('movementNet + cashSales')],
 ['Low stock events after POS sale',pos.includes('emitLowStockEvents')],
 ['Frontend blocks adding beyond stock',ui.includes('Solo hay ${stock} unidad(es) disponibles')],
 ['Runtime QA read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('POS_QA_WRITE')],
 ['Runtime QA covers sale→stock',runtime.includes('POS descuenta inventario')],
 ['Runtime QA covers SALE_OUT',runtime.includes('Kardex SALE_OUT creado')],
 ['Runtime QA covers duplicate folio',runtime.includes('Folio duplicado bloqueado')],
 ['Runtime QA covers void→stock restore',runtime.includes('Anulación restaura inventario')],
 ['Runtime QA covers SALE_RETURN_IN',runtime.includes('Kardex SALE_RETURN_IN creado')],
 ['Runtime QA covers session close',runtime.includes('Cerrar sesión POS')],
 ['Runtime QA never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['Runtime QA writes JSON report',runtime.includes("artifacts','qa")],
 ['Prisma change limited to additive SALE_RETURN_IN enum',/SALE_OUT\s+SALE_RETURN_IN/.test(schema.replace(/\s+/g,' '))],
];

let failed=0;
console.log('\nPOS Functional Audit — v10.1.0');
console.log('==============================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
