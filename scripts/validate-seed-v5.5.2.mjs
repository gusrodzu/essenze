import fs from 'node:fs';
const s=fs.readFileSync('apps/api/prisma/seed-demo.js','utf8');
if(s.includes('warehouseMain')) {
  console.error('ERROR: warehouseMain todavía existe.');
  process.exit(1);
}
const required=[
  "const warehouses = {};",
  "warehouses['MTY-GEN'].id",
  "Creando POS demo...",
  "Creando configuración modular demo..."
];
for(const token of required){
  if(!s.includes(token)){
    console.error(`ERROR: falta ${token}`);
    process.exit(1);
  }
}
console.log('OK: seed v5.5.2 usa el almacén MTY-GEN existente y alcanza los bloques POS/SaaS.');
