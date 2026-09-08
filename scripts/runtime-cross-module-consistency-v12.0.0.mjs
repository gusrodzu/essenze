import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient(), failures=[], checks=[];
const check=(name,rows)=>{const ok=rows.length===0;checks.push([name,ok,rows.length]);if(!ok)failures.push({name,count:rows.length,sample:rows.slice(0,5)});};
try{
  const [ap,ar,orders,balances]=await Promise.all([
    prisma.accountsPayable.findMany({select:{id:true,companyId:true,total:true,paidAmount:true,status:true}}),
    prisma.accountsReceivable.findMany({select:{id:true,companyId:true,total:true,paidAmount:true,status:true}}),
    prisma.salesOrderItem.findMany({select:{id:true,quantity:true,deliveredQty:true}}),
    prisma.inventoryBalance.findMany({select:{id:true,quantity:true}})
  ]);
  check('CxP paidAmount no excede total',ap.filter(x=>Number(x.paidAmount)>Number(x.total)+0.001));
  check('CxC paidAmount no excede total',ar.filter(x=>Number(x.paidAmount)>Number(x.total)+0.001));
  check('Pedidos deliveredQty no excede quantity',orders.filter(x=>Number(x.deliveredQty)>Number(x.quantity)+0.001));
  check('Inventario sin balances negativos',balances.filter(x=>Number(x.quantity)<-0.001));
  check('CxP PAID coincide con saldo',ap.filter(x=>x.status==='PAID'&&Math.abs(Number(x.total)-Number(x.paidAmount))>0.01));
  check('CxC PAID coincide con saldo',ar.filter(x=>x.status==='PAID'&&Math.abs(Number(x.total)-Number(x.paidAmount))>0.01));
  console.log('\nCross-module Consistency — v12.0.0 (READ ONLY)');
  for(const [n,ok,c] of checks)console.log(`${ok?'PASS':'FAIL'}  ${n}${c?` (${c})`:''}`);
  console.log(`\n${checks.filter(x=>x[1]).length} PASS / ${failures.length} FAIL`);
  if(failures.length){console.log(JSON.stringify(failures,null,2));process.exitCode=1;}
}finally{await prisma.$disconnect();}
