import {prisma} from '../lib/prisma.js';

const num=value=>Number(value??0);
const openBalance=row=>Math.max(0,num(row.total)-num(row.paidAmount));

export async function getOrderToCashDashboard(companyId){
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);

  const [
    company,
    quotes,
    orders,
    deliveries,
    invoices,
    receivables,
    collections
  ]=await Promise.all([
    prisma.company.findUnique({
      where:{id:companyId},
      select:{id:true,name:true,currency:true}
    }),
    prisma.salesQuote.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{id:true,folio:true,quoteDate:true,validUntil:true,status:true,total:true,customer:{select:{legalName:true,commercialName:true}}},
      orderBy:{quoteDate:'desc'},
      take:200
    }),
    prisma.salesOrder.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{id:true,folio:true,orderDate:true,deliveryDate:true,status:true,total:true,customer:{select:{legalName:true,commercialName:true}}},
      orderBy:{orderDate:'desc'},
      take:200
    }),
    prisma.salesDelivery.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{id:true,folio:true,deliveryDate:true,status:true,salesOrder:{select:{folio:true,total:true}}},
      orderBy:{deliveryDate:'desc'},
      take:200
    }),
    prisma.salesInvoice.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{id:true,invoiceNumber:true,issueDate:true,dueDate:true,status:true,total:true,paidAmount:true,customer:{select:{legalName:true,commercialName:true}}},
      orderBy:{issueDate:'desc'},
      take:200
    }),
    prisma.accountsReceivable.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{id:true,invoiceNumber:true,dueDate:true,status:true,total:true,paidAmount:true,customer:{select:{legalName:true,commercialName:true}}},
      orderBy:{dueDate:'asc'},
      take:250
    }),
    prisma.collectionReceipt.findMany({
      where:{companyId,status:'APPLIED',paymentDate:{gte:monthStart}},
      select:{id:true,folio:true,paymentDate:true,amount:true,unappliedAmount:true,customer:{select:{legalName:true,commercialName:true}}},
      orderBy:{paymentDate:'desc'},
      take:100
    })
  ]);

  if(!company)throw new Error('Empresa no encontrada');

  const quotePipeline=quotes.filter(x=>['DRAFT','SENT','ACCEPTED'].includes(x.status));
  const activeOrders=orders.filter(x=>['DRAFT','CONFIRMED','PARTIALLY_DELIVERED','DELIVERED'].includes(x.status));
  const pendingDelivery=orders.filter(x=>['CONFIRMED','PARTIALLY_DELIVERED'].includes(x.status));
  const deliveredNotInvoiced=orders.filter(x=>x.status==='DELIVERED');
  const openInvoices=invoices.filter(x=>['ISSUED','PARTIALLY_PAID','OVERDUE'].includes(x.status));
  const openReceivables=receivables.filter(x=>openBalance(x)>0);
  const overdueReceivables=openReceivables.filter(x=>new Date(x.dueDate)<now);
  const collectedMonth=collections.reduce((sum,x)=>sum+num(x.amount),0);
  const receivableBalance=openReceivables.reduce((sum,x)=>sum+openBalance(x),0);
  const overdueBalance=overdueReceivables.reduce((sum,x)=>sum+openBalance(x),0);
  const activeOrderValue=activeOrders.reduce((sum,x)=>sum+num(x.total),0);
  const quoteValue=quotePipeline.reduce((sum,x)=>sum+num(x.total),0);

  const acceptedQuotes=quotes.filter(x=>['ACCEPTED','CONVERTED'].includes(x.status)).length;
  const sentOrClosedQuotes=quotes.filter(x=>['SENT','ACCEPTED','CONVERTED','REJECTED'].includes(x.status)).length;
  const conversionRate=sentOrClosedQuotes?Math.round((acceptedQuotes/sentOrClosedQuotes)*100):0;

  const attention=[
    ...(pendingDelivery.length?[{
      key:'PENDING_DELIVERY',
      level:'MEDIUM',
      title:`${pendingDelivery.length} pedido(s) pendientes de entrega`,
      detail:'Hay pedidos confirmados o parcialmente entregados.',
      to:'/ventas/operacion'
    }]:[]),
    ...(deliveredNotInvoiced.length?[{
      key:'NOT_INVOICED',
      level:'HIGH',
      title:`${deliveredNotInvoiced.length} pedido(s) entregados sin facturar`,
      detail:'Conviene emitir la factura para iniciar formalmente la cobranza.',
      to:'/ventas/operacion'
    }]:[]),
    ...(overdueReceivables.length?[{
      key:'OVERDUE_AR',
      level:'HIGH',
      title:`${overdueReceivables.length} factura(s) vencida(s)`,
      detail:`Cartera vencida por ${overdueBalance.toFixed(2)}.`,
      to:'/ventas/cobranza'
    }]:[]),
    ...(quotePipeline.filter(x=>x.status==='SENT'&&new Date(x.validUntil)<now).length?[{
      key:'EXPIRED_QUOTES',
      level:'MEDIUM',
      title:'Cotizaciones enviadas fuera de vigencia',
      detail:'Revisa seguimiento o genera una nueva propuesta.',
      to:'/ventas'
    }]:[])
  ].slice(0,6);

  const stages=[
    {key:'quotes',label:'Cotizaciones',count:quotePipeline.length,value:quoteValue,to:'/ventas'},
    {key:'orders',label:'Pedidos activos',count:activeOrders.length,value:activeOrderValue,to:'/ventas'},
    {key:'deliveries',label:'Entregas registradas',count:deliveries.filter(x=>x.status==='POSTED').length,value:null,to:'/ventas/operacion'},
    {key:'invoices',label:'Facturas abiertas',count:openInvoices.length,value:openInvoices.reduce((s,x)=>s+openBalance(x),0),to:'/ventas/operacion'},
    {key:'receivables',label:'CxC abiertas',count:openReceivables.length,value:receivableBalance,to:'/finanzas/cuentas-por-cobrar'},
    {key:'collections',label:'Cobros del mes',count:collections.length,value:collectedMonth,to:'/ventas/cobranza'}
  ];

  return {
    ok:true,
    generatedAt:now.toISOString(),
    company,
    summary:{
      quoteValue,
      activeOrderValue,
      receivableBalance,
      overdueBalance,
      collectedMonth,
      conversionRate
    },
    counts:{
      quotes:quotePipeline.length,
      orders:activeOrders.length,
      pendingDelivery:pendingDelivery.length,
      deliveredNotInvoiced:deliveredNotInvoiced.length,
      openInvoices:openInvoices.length,
      openReceivables:openReceivables.length,
      overdueReceivables:overdueReceivables.length,
      collections:collections.length
    },
    stages,
    attention,
    recent:{
      quotes:quotes.slice(0,5),
      orders:orders.slice(0,5),
      invoices:invoices.slice(0,5),
      collections:collections.slice(0,5)
    }
  };
}
