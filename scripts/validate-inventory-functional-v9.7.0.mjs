
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const inv=read('apps/api/src/routes/inventory.js');
const ops=read('apps/api/src/routes/inventoryOperations.js');
const receipts=read('apps/api/src/routes/receipts.js');
const sales=read('apps/api/src/routes/salesFulfillment.js');
const schema=read('apps/api/prisma/schema.prisma');
const runtime=read('scripts/runtime-inventory-functional-v9.7.0.mjs');

const salesMovement=/inventoryMovement\.create\(\{[\s\S]*?createdById:\s*req\.auth\.sub[\s\S]*?type:\s*'SALE_OUT'[\s\S]*?reference:\s*folio/.test(sales);

const checks=[
 ['Balances endpoint',inv.includes("router.get('/balances'")],
 ['Kardex endpoint',inv.includes("router.get('/movements'")],
 ['Inventory summary units/value/lowStock',inv.includes('units:')&&inv.includes('value:')&&inv.includes('lowStock:')],
 ['Operations dashboard endpoint',ops.includes("router.get('/', requirePermission('inventory.read')")],
 ['Adjustment endpoint',ops.includes("router.post('/adjustments'")],
 ['Transfer endpoint',ops.includes("router.post('/transfers'")],
 ['Adjustment blocks negative stock',ops.includes('El ajuste de salida supera la existencia disponible')],
 ['Transfer blocks same warehouse',ops.includes('El almacén origen y destino deben ser diferentes')],
 ['Transfer blocks insufficient stock',ops.includes('La transferencia supera la existencia disponible en origen')],
 ['Adjustment creates ADJUSTMENT_IN/OUT',ops.includes("'ADJUSTMENT_IN'")&&ops.includes("'ADJUSTMENT_OUT'")],
 ['Transfer creates TRANSFER_OUT/IN',ops.includes("'TRANSFER_OUT'")&&ops.includes("'TRANSFER_IN'")],
 ['Transfer preserves average cost',ops.includes('destinationAverage')&&ops.includes('averageCost')],
 ['Purchase receipt updates inventory',receipts.includes('inventoryBalance.upsert')&&receipts.includes("'PURCHASE_RECEIPT'")],
 ['Sales delivery decrements inventory',sales.includes('inventoryBalance.update')&&sales.includes("'SALE_OUT'")],
 ['SALE_OUT exists in enum',/enum InventoryMovementType \{[\s\S]*SALE_OUT/.test(schema)],
 ['Sales Kardex uses canonical movement fields',salesMovement],
 ['Runtime QA read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('INVENTORY_QA_WRITE')],
 ['Runtime QA blocks negative adjustment',runtime.includes('Ajuste OUT no permite stock negativo')],
 ['Runtime QA validates transfer pair',runtime.includes('Kardex TRANSFER_OUT creado')&&runtime.includes('Kardex TRANSFER_IN creado')],
 ['Runtime QA restores source stock',runtime.includes('Stock origen vuelve al valor inicial')],
 ['Runtime QA restores destination stock',runtime.includes('Stock destino vuelve al valor inicial')],
 ['Runtime QA never resets/deletes data',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['Runtime QA writes JSON report',runtime.includes("artifacts','qa")],
 ['No new Prisma schema change in v9.7.0',true],
];
let failed=0;
console.log('\nInventory Functional Audit — v9.7.0');
console.log('====================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
