import {prisma} from '../lib/prisma.js';
import {calculateMetrics} from './intelligence.js';

const num=value=>Number(value??0);
const openBalance=row=>Math.max(0,num(row.total)-num(row.paidAmount));

export async function executiveDemoDashboard(companyId){
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1);
  const todayStart=new Date(now);
  todayStart.setHours(0,0,0,0);
  const todayEnd=new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate()+1);

  const [
    company,
    metrics,
    requests,
    approvals,
    orders,
    receipts,
    inventory,
    payables,
    receivables,
    employees,
    attendanceToday,
    pendingLeaves,
    incidentsMonth,
    insights
  ]=await Promise.all([
    prisma.company.findUnique({
      where:{id:companyId},
      select:{id:true,name:true,currency:true,timezone:true}
    }),
    calculateMetrics(companyId),
    prisma.purchaseRequest.findMany({
      where:{companyId},
      select:{id:true,folio:true,status:true,createdAt:true}
    }),
    prisma.approvalRequest.findMany({
      where:{companyId},
      select:{id:true,entityType:true,entityId:true,status:true,requestedAt:true}
    }),
    prisma.purchaseOrder.findMany({
      where:{companyId},
      select:{id:true,folio:true,status:true,total:true,currency:true,createdAt:true}
    }),
    prisma.goodsReceipt.findMany({
      where:{companyId},
      select:{id:true,folio:true,purchaseOrderId:true,receivedAt:true}
    }),
    prisma.inventoryBalance.findMany({
      where:{warehouse:{branch:{companyId}}},
      select:{
        quantity:true,
        averageCost:true,
        product:{select:{minStock:true}},
      }
    }),
    prisma.accountsPayable.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{total:true,paidAmount:true,dueDate:true,status:true}
    }),
    prisma.accountsReceivable.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{total:true,paidAmount:true,dueDate:true,status:true}
    }),
    prisma.employee.findMany({
      where:{companyId},
      select:{id:true,status:true,salary:true}
    }),
    prisma.attendanceRecord.findMany({
      where:{companyId,date:{gte:todayStart,lt:todayEnd}},
      select:{employeeId:true,status:true}
    }),
    prisma.leaveRequest.count({
      where:{companyId,status:'PENDING'}
    }),
    prisma.hrIncident.count({
      where:{companyId,date:{gte:monthStart,lt:monthEnd}}
    }),
    prisma.intelligenceInsight.findMany({
      where:{companyId,status:'OPEN'},
      orderBy:[{severity:'asc'},{detectedAt:'desc'}],
      take:8,
      select:{
        id:true,severity:true,category:true,title:true,message:true,
        recommendation:true,actionLink:true,detectedAt:true
      }
    })
  ]);

  if(!company)throw new Error('Empresa no encontrada');

  const health=metrics.details.health;
  const activeEmployees=employees.filter(x=>x.status==='ACTIVE').length;
  const presentToday=attendanceToday.filter(x=>
    ['PRESENT','LATE','REMOTE'].includes(x.status)
  ).length;
  const attendanceRate=activeEmployees
    ?Math.min(100,Math.round(presentToday/activeEmployees*100))
    :100;

  const openPayables=payables.filter(x=>openBalance(x)>0);
  const openReceivables=receivables.filter(x=>openBalance(x)>0);
  const overduePayables=openPayables.filter(x=>new Date(x.dueDate)<now);
  const overdueReceivables=openReceivables.filter(x=>new Date(x.dueDate)<now);

  const inventoryValue=inventory.reduce(
    (sum,row)=>sum+num(row.quantity)*num(row.averageCost),0
  );
  const lowStock=inventory.filter(
    row=>num(row.quantity)<=num(row.product.minStock)
  ).length;

  const purchasePipeline={
    draftRequests:requests.filter(x=>x.status==='DRAFT').length,
    pendingRequests:requests.filter(x=>x.status==='PENDING').length,
    approvedRequests:requests.filter(x=>x.status==='APPROVED').length,
    orderedRequests:requests.filter(x=>x.status==='ORDERED').length,
    pendingApprovals:approvals.filter(x=>x.status==='PENDING').length,
    draftOrders:orders.filter(x=>x.status==='DRAFT').length,
    issuedOrders:orders.filter(x=>x.status==='ISSUED').length,
    partialOrders:orders.filter(x=>x.status==='PARTIALLY_RECEIVED').length,
    receivedOrders:orders.filter(x=>x.status==='RECEIVED').length,
    receipts:receipts.length
  };

  const readiness=[
    {
      key:'THIRD_PARTIES',
      label:'Terceros',
      ready:true,
      detail:'Business Party v2 activo para clientes y proveedores.'
    },
    {
      key:'PROCUREMENT',
      label:'Compras',
      ready:true,
      detail:'SOLPED, aprobaciones, OC, recepción e inventario conectados.'
    },
    {
      key:'FINANCE',
      label:'Administración',
      ready:true,
      detail:'CxP/CxC y handoff desde recepción disponibles.'
    },
    {
      key:'HR',
      label:'RR. HH.',
      ready:true,
      detail:'Empleados, asistencias, incidencias, permisos y prenómina disponibles.'
    },
    {
      key:'REPORTS',
      label:'Reportes',
      ready:true,
      detail:'Resumen ejecutivo e Intelligence conectados a datos reales del ERP.'
    },
    {
      key:'AI',
      label:'BuzzBee AI',
      ready:true,
      detail:'Asistente empresarial de solo lectura con evidencia y aislamiento por empresa.'
    }
  ];

  const actionItems=[
    ...(purchasePipeline.pendingApprovals?[
      {
        priority:'HIGH',
        title:`${purchasePipeline.pendingApprovals} aprobación(es) pendientes`,
        detail:'Hay decisiones pendientes que pueden detener el flujo de compras.',
        to:'/aprobaciones'
      }
    ]:[]),
    ...(lowStock?[
      {
        priority:'HIGH',
        title:`${lowStock} posición(es) con stock mínimo o crítico`,
        detail:'Revisa abastecimiento para evitar interrupciones de operación.',
        to:'/inventario/existencias'
      }
    ]:[]),
    ...(overduePayables.length?[
      {
        priority:'MEDIUM',
        title:`${overduePayables.length} cuenta(s) por pagar vencida(s)`,
        detail:'Revisa vencimientos y programación de tesorería.',
        to:'/finanzas/cuentas-por-pagar'
      }
    ]:[]),
    ...(overdueReceivables.length?[
      {
        priority:'MEDIUM',
        title:`${overdueReceivables.length} cuenta(s) por cobrar vencida(s)`,
        detail:'Prioriza cobranza y seguimiento con clientes.',
        to:'/finanzas/cuentas-por-cobrar'
      }
    ]:[]),
    ...(pendingLeaves?[
      {
        priority:'LOW',
        title:`${pendingLeaves} permiso(s) de RR. HH. pendiente(s)`,
        detail:'Hay solicitudes de personal esperando resolución.',
        to:'/recursos-humanos/operacion'
      }
    ]:[])
  ].slice(0,6);

  return {
    ok:true,
    generatedAt:now.toISOString(),
    company,
    health:{
      score:health.score,
      level:health.level,
      categories:health.categories
    },
    summary:{
      sales30d:metrics.values['sales.revenue_30d'],
      purchases30d:metrics.values['purchases.total_30d'],
      inventoryValue,
      lowStock,
      receivableBalance:openReceivables.reduce((s,x)=>s+openBalance(x),0),
      payableBalance:openPayables.reduce((s,x)=>s+openBalance(x),0),
      overdueReceivables:overdueReceivables.reduce((s,x)=>s+openBalance(x),0),
      overduePayables:overduePayables.reduce((s,x)=>s+openBalance(x),0),
      activeEmployees,
      attendanceRate,
      pendingLeaves,
      incidentsMonth
    },
    purchasePipeline,
    actionItems,
    insights,
    readiness,
    demoStory:[
      {step:1,label:'SOLPED',value:requests.length,to:'/compras/solicitudes'},
      {step:2,label:'Aprobación',value:approvals.length,to:'/aprobaciones'},
      {step:3,label:'Orden de compra',value:orders.length,to:'/compras/ordenes'},
      {step:4,label:'Recepción',value:receipts.length,to:'/compras/recepciones'},
      {step:5,label:'Inventario',value:inventory.length,to:'/inventario/existencias'},
      {step:6,label:'Administración',value:openPayables.length,to:'/finanzas/cuentas-por-pagar'},
      {step:7,label:'RR. HH.',value:activeEmployees,to:'/recursos-humanos/operacion'},
      {step:8,label:'Inteligencia',value:insights.length,to:'/inteligencia'}
    ]
  };
}
