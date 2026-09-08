import {prisma} from '../lib/prisma.js';

const DAY=24*60*60*1000;
const money=(value,currency='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0));
const num=(value)=>Number(value??0);
const since=(days)=>new Date(Date.now()-days*DAY);
const pct=(value)=>`${Math.round(Number(value||0)*10)/10}%`;

function routeContext(route=''){
  if(route.startsWith('/ventas'))return 'sales';
  if(route.startsWith('/compras'))return 'purchases';
  if(route.startsWith('/inventario')||route.startsWith('/almacenes'))return 'inventory';
  if(route.startsWith('/crm')||route.startsWith('/terceros')||route.startsWith('/clientes')||route.startsWith('/proveedores'))return 'crm';
  if(route.startsWith('/pos'))return 'pos';
  if(route.startsWith('/finanzas')||route.startsWith('/gastos')||route.startsWith('/activos-fijos'))return 'finance';
  if(route.startsWith('/recursos-humanos'))return 'hr';
  if(route.startsWith('/produccion'))return 'production';
  if(route.startsWith('/proyectos'))return 'projects';
  if(route.startsWith('/marketing'))return 'marketing';
  if(route.startsWith('/reportes/demo'))return 'executive';
  if(route.startsWith('/inteligencia')||route.startsWith('/reportes'))return 'intelligence';
  if(route.startsWith('/flow')||route.startsWith('/integration-hub')||route.startsWith('/datos-maestros')||route.startsWith('/data-hub'))return 'system';
  return 'home';
}

async function userPermissions(userId){
  const rows=await prisma.userRole.findMany({
    where:{userId},
    select:{role:{select:{permissions:{select:{permission:{select:{key:true}}}}}}}
  });
  return new Set(rows.flatMap(row=>row.role.permissions.map(item=>item.permission.key)));
}

const can=(permissions,key)=>permissions.has(key);

async function sales(companyId,currency){
  const start30=since(30), start60=since(60);
  const [current,previous,quotes,orders]=await Promise.all([
    prisma.salesInvoice.aggregate({where:{companyId,issueDate:{gte:start30},status:{not:'CANCELLED'}},_sum:{total:true},_count:true}),
    prisma.salesInvoice.aggregate({where:{companyId,issueDate:{gte:start60,lt:start30},status:{not:'CANCELLED'}},_sum:{total:true}}),
    prisma.salesQuote.count({where:{companyId,status:{in:['DRAFT','SENT','ACCEPTED']}}}),
    prisma.salesOrder.count({where:{companyId,status:{notIn:['CANCELLED','INVOICED']}}})
  ]);
  const cur=num(current._sum.total), prev=num(previous._sum.total);
  const change=prev?((cur-prev)/Math.abs(prev))*100:null;
  return {title:'Ventas',facts:[
    `Ventas facturadas últimos 30 días: ${money(cur,currency)} en ${current._count} facturas.`,
    change===null?'No hay base suficiente para comparar con los 30 días anteriores.':`Variación contra los 30 días anteriores: ${pct(change)}.`,
    `Cotizaciones abiertas: ${quotes}.`,
    `Pedidos de venta aún no cerrados/facturados: ${orders}.`
  ],evidence:{revenue30d:cur,changePercent:change,openQuotes:quotes,openOrders:orders}};
}

async function purchases(companyId,currency){
  const start30=since(30);
  const [agg,pending,overdue]=await Promise.all([
    prisma.purchaseOrder.aggregate({where:{companyId,orderDate:{gte:start30},status:{not:'CANCELLED'}},_sum:{total:true},_count:true}),
    prisma.purchaseOrder.count({where:{companyId,status:{in:['DRAFT','ISSUED','PARTIALLY_RECEIVED']}}}),
    prisma.accountsPayable.aggregate({where:{companyId,status:{in:['PENDING','PARTIALLY_PAID','OVERDUE']},dueDate:{lt:new Date()}},_sum:{total:true,paidAmount:true},_count:true})
  ]);
  const overdueBalance=num(overdue._sum.total)-num(overdue._sum.paidAmount);
  return {title:'Compras',facts:[
    `Compras de los últimos 30 días: ${money(agg._sum.total,currency)} en ${agg._count} órdenes.`,
    `Órdenes abiertas o en proceso: ${pending}.`,
    `Cuentas por pagar vencidas: ${overdue._count}, saldo aproximado ${money(overdueBalance,currency)}.`
  ],evidence:{purchases30d:num(agg._sum.total),openOrders:pending,overduePayables:overdueBalance}};
}

async function inventory(companyId,currency){
  const balances=await prisma.inventoryBalance.findMany({
    where:{warehouse:{branch:{companyId}}},
    select:{quantity:true,averageCost:true,product:{select:{name:true,sku:true,minStock:true}},warehouse:{select:{name:true}}}
  });
  const value=balances.reduce((s,r)=>s+num(r.quantity)*num(r.averageCost),0);
  const low=balances.filter(r=>num(r.quantity)<=num(r.product.minStock)).sort((a,b)=>num(a.quantity)-num(b.quantity));
  return {title:'Inventario',facts:[
    `Valor aproximado del inventario: ${money(value,currency)}.`,
    `Posiciones en stock mínimo o crítico: ${low.length}.`,
    ...low.slice(0,3).map(r=>`${r.product.name} (${r.product.sku}) tiene ${num(r.quantity)} en ${r.warehouse.name}; mínimo ${num(r.product.minStock)}.`)
  ],evidence:{inventoryValue:value,criticalStock:low.length}};
}

async function crm(companyId,currency){
  const [prospects,customers]=await Promise.all([
    prisma.prospect.findMany({where:{companyId,stage:{notIn:['WON','LOST']}},select:{stage:true,estimatedValue:true,probability:true,nextActionAt:true}}),
    prisma.customer.count({where:{companyId,active:true}})
  ]);
  const pipeline=prospects.reduce((s,r)=>s+num(r.estimatedValue),0);
  const weighted=prospects.reduce((s,r)=>s+num(r.estimatedValue)*(num(r.probability)/100),0);
  const unattended=prospects.filter(r=>!r.nextActionAt||new Date(r.nextActionAt)<new Date()).length;
  return {title:'CRM',facts:[
    `Clientes activos: ${customers}.`,
    `Oportunidades abiertas: ${prospects.length}, valor de pipeline ${money(pipeline,currency)}.`,
    `Pipeline ponderado por probabilidad: ${money(weighted,currency)}.`,
    `Oportunidades sin próxima acción vigente: ${unattended}.`
  ],evidence:{customers,openProspects:prospects.length,pipeline,weightedPipeline:weighted,needsFollowup:unattended}};
}

async function pos(companyId,currency){
  const start30=since(30);
  const [sales,openSessions]=await Promise.all([
    prisma.posSale.findMany({
      where:{companyId,status:'PAID',saleDate:{gte:start30}},
      select:{total:true,payments:{select:{method:true,amount:true}}}
    }),
    prisma.posSession.count({where:{companyId,status:'OPEN'}})
  ]);
  const revenue=sales.reduce((sum,row)=>sum+num(row.total),0);
  const cash=sales.flatMap(row=>row.payments).filter(p=>p.method==='CASH').reduce((sum,p)=>sum+num(p.amount),0);
  const card=sales.flatMap(row=>row.payments).filter(p=>p.method==='CARD').reduce((sum,p)=>sum+num(p.amount),0);
  const avg=sales.length?revenue/sales.length:0;
  return {title:'POS',facts:[
    `Ventas POS pagadas últimos 30 días: ${money(revenue,currency)} en ${sales.length} ticket(s).`,
    `Ticket promedio POS: ${money(avg,currency)}.`,
    `Cobro en efectivo: ${money(cash,currency)}; tarjeta: ${money(card,currency)}.`,
    `Sesiones de caja abiertas: ${openSessions}.`
  ],evidence:{revenue30d:revenue,tickets:sales.length,averageTicket:avg,cash,card,openSessions}};
}

async function finance(companyId,currency){
  const [ar,ap,expenses]=await Promise.all([
    prisma.accountsReceivable.findMany({where:{companyId,status:{in:['PENDING','PARTIALLY_PAID','OVERDUE']}},select:{total:true,paidAmount:true,dueDate:true}}),
    prisma.accountsPayable.findMany({where:{companyId,status:{in:['PENDING','PARTIALLY_PAID','OVERDUE']}},select:{total:true,paidAmount:true,dueDate:true}}),
    prisma.expense.aggregate({where:{companyId,expenseDate:{gte:since(30)},status:{not:'CANCELLED'}},_sum:{amount:true},_count:true})
  ]);
  const arBalance=ar.reduce((s,r)=>s+num(r.total)-num(r.paidAmount),0);
  const apBalance=ap.reduce((s,r)=>s+num(r.total)-num(r.paidAmount),0);
  const now=new Date();
  const arOver=ar.filter(r=>new Date(r.dueDate)<now).reduce((s,r)=>s+num(r.total)-num(r.paidAmount),0);
  const apOver=ap.filter(r=>new Date(r.dueDate)<now).reduce((s,r)=>s+num(r.total)-num(r.paidAmount),0);
  return {title:'Finanzas',facts:[
    `Cuentas por cobrar abiertas: ${money(arBalance,currency)}; vencidas: ${money(arOver,currency)}.`,
    `Cuentas por pagar abiertas: ${money(apBalance,currency)}; vencidas: ${money(apOver,currency)}.`,
    `Gastos registrados últimos 30 días: ${money(expenses._sum.amount,currency)} en ${expenses._count} movimientos.`
  ],evidence:{receivables:arBalance,overdueReceivables:arOver,payables:apBalance,overduePayables:apOver,expenses30d:num(expenses._sum.amount)}};
}

async function hr(companyId,currency){
  const [active,leave,incidents,payroll]=await Promise.all([
    prisma.employee.count({where:{companyId,status:'ACTIVE'}}),
    prisma.leaveRequest.count({where:{employee:{companyId},status:'PENDING'}}),
    prisma.hrIncident.count({where:{companyId,date:{gte:since(30)}}}),
    prisma.employee.aggregate({where:{companyId,status:'ACTIVE'},_sum:{salary:true}})
  ]);
  return {title:'Recursos Humanos',facts:[
    `Colaboradores activos: ${active}.`,
    `Solicitudes de ausencia/vacaciones pendientes: ${leave}.`,
    `Incidencias registradas en los últimos 30 días: ${incidents}.`,
    `Suma de salarios base activos: ${money(payroll._sum.salary,currency)}.`
  ],evidence:{activeEmployees:active,pendingLeave:leave,incidents30d:incidents,basePayroll:num(payroll._sum.salary)}};
}

async function production(companyId){
  const [open,late]=await Promise.all([
    prisma.productionOrder.count({where:{companyId,status:{notIn:['COMPLETED','CANCELLED']}}}),
    prisma.productionOrder.count({where:{companyId,status:{notIn:['COMPLETED','CANCELLED']},plannedEndAt:{lt:new Date()}}})
  ]);
  return {title:'Producción',facts:[`Órdenes de producción abiertas: ${open}.`,`Órdenes abiertas con fecha planeada vencida: ${late}.`],evidence:{openOrders:open,lateOrders:late}};
}

async function projects(companyId,currency){
  const rows=await prisma.project.findMany({where:{companyId,status:{notIn:['COMPLETED','CANCELLED']}},select:{budget:true,progress:true,dueDate:true}});
  const budget=rows.reduce((s,r)=>s+num(r.budget),0);
  const late=rows.filter(r=>r.dueDate&&new Date(r.dueDate)<new Date()).length;
  return {title:'Proyectos',facts:[`Proyectos activos: ${rows.length}.`,`Presupuesto conjunto: ${money(budget,currency)}.`,`Proyectos activos con fecha vencida: ${late}.`],evidence:{activeProjects:rows.length,budget,lateProjects:late}};
}

async function intelligence(companyId){
  const [insights,dead]=await Promise.all([
    prisma.intelligenceInsight.findMany({where:{companyId,status:'OPEN'},orderBy:{createdAt:'desc'},take:5,select:{title:true,severity:true,message:true}}),
    prisma.webhookDeliveryJob.count({where:{companyId,status:'DEAD_LETTER'}})
  ]);
  return {title:'Inteligencia',facts:[`Insights abiertos: ${insights.length}${insights.length===5?' o más':''}.`,`Entregas en DLQ de integraciones: ${dead}.`,...insights.slice(0,3).map(x=>`${x.severity}: ${x.title}${x.message?` — ${x.message}`:''}`)],evidence:{openInsights:insights.length,deadLetters:dead}};
}

async function approvals(companyId){
  const count=await prisma.approvalRequest.count({where:{companyId,status:'PENDING'}});
  return {title:'Aprobaciones',facts:[`Solicitudes de aprobación pendientes: ${count}.`],evidence:{pendingApprovals:count}};
}

async function buildDataset({companyId,userId,context,currency}){
  const permissions=await userPermissions(userId);
  const datasets=[];
  const add=async(permission,fn)=>{
    if(can(permissions,permission)){
      try{datasets.push(await fn())}catch(error){datasets.push({title:'Dato no disponible',facts:[`No fue posible consultar una fuente permitida (${error.code||error.name||'error'}).`],evidence:{}})}
    }
  };

  const effective=context||'home';
  if(effective==='sales')await add('sales.read',()=>sales(companyId,currency));
  else if(effective==='purchases')await add('purchases.read',()=>purchases(companyId,currency));
  else if(effective==='inventory')await add('inventory.read',()=>inventory(companyId,currency));
  else if(effective==='crm')await add('sales.pipeline',()=>crm(companyId,currency));
  else if(effective==='pos')await add('pos.read',()=>pos(companyId,currency));
  else if(effective==='finance'){
    await add('accounts_receivable.read',()=>finance(companyId,currency));
    if(!datasets.length)await add('expenses.read',()=>finance(companyId,currency));
  }
  else if(effective==='hr')await add('employees.read',()=>hr(companyId,currency));
  else if(effective==='production')await add('production.read',()=>production(companyId));
  else if(effective==='projects')await add('projects.read',()=>projects(companyId,currency));
  else if(effective==='executive'){
    await add('sales.read',()=>sales(companyId,currency));
    await add('purchases.read',()=>purchases(companyId,currency));
    await add('inventory.read',()=>inventory(companyId,currency));
    await add('accounts_receivable.read',()=>finance(companyId,currency));
    await add('employees.read',()=>hr(companyId,currency));
    await add('approvals.read',()=>approvals(companyId));
    await add('intelligence.read',()=>intelligence(companyId));
  }
  else if(effective==='intelligence')await add('intelligence.read',()=>intelligence(companyId));
  else {
    await add('sales.read',()=>sales(companyId,currency));
    await add('purchases.read',()=>purchases(companyId,currency));
    await add('inventory.read',()=>inventory(companyId,currency));
    await add('accounts_receivable.read',()=>finance(companyId,currency));
    await add('approvals.read',()=>approvals(companyId));
  }
  return {permissions,datasets};
}

function deterministicAnswer(question,datasets){
  if(!datasets.length)return 'No tengo acceso a datos suficientes para responder esta consulta con tus permisos actuales.';
  const facts=datasets.flatMap(d=>d.facts);
  const q=question.toLowerCase();
  let selected=facts;
  const keywords=[
    ['stock','invent'],['venc','pagar'],['cobrar','cobrar'],['venta','venta'],['compra','compra'],
    ['gasto','gasto'],['aprob','aprob'],['proyecto','proyecto'],['produ','produ'],['cliente','cliente']
  ];
  for(const [needle] of keywords){
    if(q.includes(needle)){
      const filtered=facts.filter(f=>f.toLowerCase().includes(needle));
      if(filtered.length)selected=filtered;
      break;
    }
  }
  return `Con los datos actuales de BuzzBee:\n\n${selected.slice(0,6).map(x=>`• ${x}`).join('\n')}\n\nEsta respuesta es de solo lectura y está basada únicamente en información disponible para tu usuario.`;
}

async function openAIAnswer({question,context,datasets,companyName,currency}){
  if(!process.env.OPENAI_API_KEY)return null;
  const model=process.env.BUZZBEE_AI_MODEL||'gpt-5.6-sol';
  const evidence=datasets.map(d=>({section:d.title,facts:d.facts,evidence:d.evidence}));
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model,
      store:false,
      max_output_tokens:650,
      instructions:'Eres BuzzBee AI, asistente empresarial de un ERP. Responde en español, breve y ejecutivo. Usa EXCLUSIVAMENTE la evidencia JSON entregada. No inventes cifras. Si falta información, dilo. No propongas que ejecutaste acciones. Este modo es solo lectura.',
      input:`Empresa: ${companyName}\nMoneda: ${currency}\nContexto: ${context}\nPregunta: ${question}\nEvidencia ERP:\n${JSON.stringify(evidence)}`
    })
  });
  if(!response.ok)throw new Error(`Proveedor AI respondió ${response.status}`);
  const data=await response.json();
  return data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||null;
}

export async function askBuzzBeeAI({companyId,userId,question,route,context}){
  const company=await prisma.company.findUnique({where:{id:companyId},select:{name:true,currency:true}});
  if(!company)throw new Error('Empresa no encontrada');
  const effectiveContext=context||routeContext(route);
  const {datasets}=await buildDataset({companyId,userId,context:effectiveContext,currency:company.currency||'MXN'});
  let answer=null, provider='BUZZBEE_DATA';
  try{
    answer=await openAIAnswer({question,context:effectiveContext,datasets,companyName:company.name,currency:company.currency||'MXN'});
    if(answer)provider='OPENAI';
  }catch(error){
    console.warn('[BuzzBeeAI] proveedor externo no disponible:',error.message);
  }
  if(!answer)answer=deterministicAnswer(question,datasets);
  return {
    answer,
    provider,
    mode:'READ_ONLY',
    context:effectiveContext,
    sources:datasets.map(d=>({name:d.title,facts:d.facts})),
    generatedAt:new Date().toISOString()
  };
}
