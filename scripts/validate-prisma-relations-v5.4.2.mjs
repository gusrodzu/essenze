import fs from 'node:fs';
const s=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const block=(name)=>{
  const m=s.match(new RegExp(`^model ${name} \\{[\\s\\S]*?^\\}`,'m'));
  if(!m) throw new Error(`No existe model ${name}`);
  return m[0];
};
const product=block('Product');
const order=block('ProductionOrder');
if(!product.includes('productionOrders ProductionOrder[]')){
  console.error('Falta Product.productionOrders dentro de model Product');
  process.exit(1);
}
if(!order.includes('product          Product')){
  console.error('Falta ProductionOrder.product');
  process.exit(1);
}
console.log('OK: Product.productionOrders y ProductionOrder.product son relaciones opuestas presentes.');
