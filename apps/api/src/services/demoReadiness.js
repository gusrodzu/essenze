import {prisma} from '../lib/prisma.js';

export async function demoReadiness(companyId){
  const [
    parties,customers,suppliers,employees,products,
    requests,orders,receipts,payables,receivables,
    attendance,leaves
  ]=await Promise.all([
    prisma.businessParty.count({where:{companyId,active:true}}),
    prisma.customer.count({where:{companyId,active:true}}),
    prisma.supplier.count({where:{companyId,active:true}}),
    prisma.employee.count({where:{companyId,status:'ACTIVE'}}),
    prisma.product.count({where:{companyId,active:true}}),
    prisma.purchaseRequest.count({where:{companyId}}),
    prisma.purchaseOrder.count({where:{companyId}}),
    prisma.goodsReceipt.count({where:{companyId}}),
    prisma.accountsPayable.count({where:{companyId}}),
    prisma.accountsReceivable.count({where:{companyId}}),
    prisma.attendanceRecord.count({where:{companyId}}),
    prisma.leaveRequest.count({where:{companyId}})
  ]);

  const checks=[
    ['Terceros',parties>=3,parties],
    ['Clientes',customers>=2,customers],
    ['Proveedores',suppliers>=2,suppliers],
    ['Empleados',employees>=4,employees],
    ['Productos',products>=5,products],
    ['SOLPED',requests>=1,requests],
    ['Órdenes de compra',orders>=1,orders],
    ['Recepciones',receipts>=1,receipts],
    ['Cuentas por pagar',payables>=1,payables],
    ['Cuentas por cobrar',receivables>=1,receivables],
    ['Asistencia',attendance>=4,attendance],
    ['Permisos',leaves>=1,leaves]
  ];

  return {
    ok:checks.every(([,ready])=>ready),
    score:Math.round(checks.filter(([,ready])=>ready).length/checks.length*100),
    checks:checks.map(([label,ready,count])=>({label,ready,count}))
  };
}
