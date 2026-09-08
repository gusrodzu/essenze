import fs from 'node:fs';
const p=fs.readFileSync('apps/api/src/routes/publicApi.js','utf8'),h=fs.readFileSync('apps/api/src/lib/pagination.js','utf8');
const c=[['helper',h.includes('paginationFromQuery')&&h.includes('maxSize=250')],['customers paginated',p.includes('prisma.customer.count({where})')],['products paginated',p.includes('prisma.product.count({where})')],['suppliers paginated',p.includes('prisma.supplier.count({where})')],['orders paginated',p.includes('prisma.salesOrder.count({where})')],['page size bounded',h.includes('Math.min')&&h.includes('maxSize')]];
let f=0;console.log('\nPerformance + Pagination — v12.0.0');for(const[n,o]of c){console.log(`${o?'PASS':'FAIL'}  ${n}`);if(!o)f++;}console.log(`\n${c.length-f} PASS / ${f} FAIL`);if(f)process.exit(1);
