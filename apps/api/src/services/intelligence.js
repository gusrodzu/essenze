import crypto from 'node:crypto';
import {prisma} from '../lib/prisma.js';
import {emitIntegrationEventAsync} from './integrationEvents.js';

const METRICS=[
  {
    key:'sales.revenue_30d',
    name:'Ventas 30 días',
    description:'Importe de pedidos de venta no cancelados creados en los últimos 30 días.',
    category:'COMERCIAL',
    unit:'CURRENCY',
    source:'SalesOrder'
  },
  {
    key:'purchases.total_30d',
    name:'Compras 30 días',
    description:'Importe de órdenes de compra no canceladas creadas en los últimos 30 días.',
    category:'OPERACIONES',
    unit:'CURRENCY',
    source:'PurchaseOrder'
  },
  {
    key:'inventory.value',
    name:'Valor de inventario',
    description:'Valor actual de existencias a costo promedio.',
    category:'OPERACIONES',
    unit:'CURRENCY',
    source:'InventoryBalance'
  },
  {
    key:'inventory.low_stock',
    name:'Productos en stock crítico',
    description:'Balances cuya existencia está en o por debajo del stock mínimo.',
    category:'OPERACIONES',
    unit:'COUNT',
    source:'InventoryBalance'
  },
  {
    key:'expenses.pending',
    name:'Gastos pendientes',
    description:'Importe de gastos enviados y aún no pagados.',
    category:'FINANZAS',
    unit:'CURRENCY',
    source:'Expense'
  },
  {
    key:'receivables.balance',
    name:'Cuentas por cobrar',
    description:'Saldo pendiente de clientes.',
    category:'FINANZAS',
    unit:'CURRENCY',
    source:'AccountsReceivable'
  },
  {
    key:'payables.balance',
    name:'Cuentas por pagar',
    description:'Saldo pendiente con proveedores.',
    category:'FINANZAS',
    unit:'CURRENCY',
    source:'AccountsPayable'
  },
  {
    key:'flow.error_rate',
    name:'Incidencias de automatización',
    description:'Porcentaje de ejecuciones recientes de Flow con errores.',
    category:'PLATAFORMA',
    unit:'PERCENT',
    source:'AutomationFlowRun'
  },
  {
    key:'integration.dead_letters',
    name:'Dead letters',
    description:'Entregas de integración agotadas en Dead Letter Queue.',
    category:'PLATAFORMA',
    unit:'COUNT',
    source:'WebhookDeliveryJob'
  },
  {
    key:'intelligence.health_score',
    name:'Business Health Score',
    description:'Puntuación compuesta de salud operativa de 0 a 100.',
    category:'INTELIGENCIA',
    unit:'SCORE',
    source:'BuzzBee Intelligence'
  },
  {
    key:'finance.collection_pressure',
    name:'Presión de cobranza',
    description:'Relación entre cuentas por cobrar y ventas recientes.',
    category:'FINANZAS',
    unit:'PERCENT',
    source:'AccountsReceivable'
  }
];

const num=v=>Number(v||0);
const round=(v,d=2)=>{
  const p=10**d;
  return Math.round(Number(v||0)*p)/p;
};

function dayStart(date=new Date()){
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

async function captureMetricSnapshots(companyId,metrics){
  const capturedDay=dayStart();
  for(const [metricKey,value] of Object.entries(metrics.values||{})){
    await prisma.intelligenceMetricSnapshot.upsert({
      where:{
        companyId_metricKey_capturedDay:{
          companyId,
          metricKey,
          capturedDay
        }
      },
      create:{
        companyId,
        metricKey,
        value:Number(value||0),
        capturedDay,
        metadata:{source:'INTELLIGENCE_SCAN'}
      },
      update:{
        value:Number(value||0),
        metadata:{source:'INTELLIGENCE_SCAN'}
      }
    });
  }
  return capturedDay;
}

function linearForecast(points,horizon=7){
  if(points.length<3)return null;

  const ys=points.map(p=>Number(p.value||0));
  const n=ys.length;
  const xs=ys.map((_v,i)=>i);
  const meanX=xs.reduce((a,b)=>a+b,0)/n;
  const meanY=ys.reduce((a,b)=>a+b,0)/n;

  let numerator=0;
  let denominator=0;

  for(let i=0;i<n;i++){
    numerator+=(xs[i]-meanX)*(ys[i]-meanY);
    denominator+=(xs[i]-meanX)**2;
  }

  if(denominator===0)return null;

  const slope=numerator/denominator;
  const intercept=meanY-slope*meanX;

  const fitted=xs.map(x=>intercept+slope*x);
  const ssRes=ys.reduce((sum,y,i)=>sum+(y-fitted[i])**2,0);
  const ssTot=ys.reduce((sum,y)=>sum+(y-meanY)**2,0);
  const r2=ssTot===0?1:Math.max(0,Math.min(1,1-ssRes/ssTot));

  const next=Array.from({length:horizon},(_v,i)=>({
    offset:i+1,
    value:round(Math.max(0,intercept+slope*(n+i)),2)
  }));

  return {
    method:'LINEAR_TREND',
    samples:n,
    slope:round(slope,4),
    r2:round(r2,3),
    projectedChangePct:meanY===0?0:round((next.at(-1).value-ys.at(-1))/Math.abs(meanY)*100,1),
    next
  };
}

export async function metricHistory(companyId,{days=30,metricKeys=[]}={}){
  const from=dayStart(new Date(Date.now()-Math.max(days-1,0)*86400000));
  const rows=await prisma.intelligenceMetricSnapshot.findMany({
    where:{
      companyId,
      capturedDay:{gte:from},
      ...(metricKeys.length?{metricKey:{in:metricKeys}}:{})
    },
    orderBy:[{metricKey:'asc'},{capturedDay:'asc'}]
  });

  const grouped={};
  for(const row of rows){
    grouped[row.metricKey]??=[];
    grouped[row.metricKey].push({
      id:row.id,
      date:row.capturedDay,
      value:Number(row.value)
    });
  }

  const forecasts={};
  for(const [metricKey,points] of Object.entries(grouped)){
    forecasts[metricKey]=linearForecast(points.slice(-30),7);
  }

  return {from,days,series:grouped,forecasts};
}

function sinceDays(days){
  return new Date(Date.now()-days*24*60*60*1000);
}

async function ensureMetricDefinitions(companyId){
  for(const metric of METRICS){
    await prisma.intelligenceMetricDefinition.upsert({
      where:{companyId_key:{companyId,key:metric.key}},
      create:{companyId,...metric,active:true},
      update:{
        name:metric.name,
        description:metric.description,
        category:metric.category,
        unit:metric.unit,
        source:metric.source
      }
    });
  }
}

export async function calculateMetrics(companyId){
  await ensureMetricDefinitions(companyId);

  const now=new Date();
  const d30=sinceDays(30);
  const d60=sinceDays(60);

  const [
    salesCurrent,
    salesPrevious,
    purchasesCurrent,
    purchasesPrevious,
    balances,
    expenses,
    receivables,
    payables,
    flowRuns,
    deadLetters
  ]=await Promise.all([
    prisma.salesInvoice.findMany({
      where:{
        companyId,
        issueDate:{gte:d30,lte:now},
        status:{not:'CANCELLED'}
      },
      select:{total:true}
    }),
    prisma.salesInvoice.findMany({
      where:{
        companyId,
        issueDate:{gte:d60,lt:d30},
        status:{not:'CANCELLED'}
      },
      select:{total:true}
    }),
    prisma.purchaseOrder.findMany({
      where:{
        companyId,
        orderDate:{gte:d30,lte:now},
        status:{notIn:['CANCELLED','DRAFT']}
      },
      select:{total:true}
    }),
    prisma.purchaseOrder.findMany({
      where:{
        companyId,
        orderDate:{gte:d60,lt:d30},
        status:{notIn:['CANCELLED','DRAFT']}
      },
      select:{total:true}
    }),
    prisma.inventoryBalance.findMany({
      where:{warehouse:{branch:{companyId}}},
      include:{
        product:{select:{id:true,sku:true,name:true,minStock:true}},
        warehouse:{select:{id:true,code:true,name:true}}
      }
    }),
    prisma.expense.findMany({
      where:{
        companyId,
        status:{in:['SUBMITTED','APPROVED']}
      },
      select:{amount:true}
    }),
    prisma.accountsReceivable.findMany({
      where:{companyId,status:{notIn:['PAID','CANCELLED']}},
      select:{total:true,paidAmount:true}
    }),
    prisma.accountsPayable.findMany({
      where:{companyId,status:{notIn:['PAID','CANCELLED']}},
      select:{total:true,paidAmount:true}
    }),
    prisma.automationFlowRun.findMany({
      where:{companyId,createdAt:{gte:d30}},
      select:{status:true}
    }),
    prisma.webhookDeliveryJob.count({
      where:{companyId,status:'DEAD_LETTER'}
    })
  ]);

  const sales30=salesCurrent.reduce((s,x)=>s+num(x.total),0);
  const salesPrev=salesPrevious.reduce((s,x)=>s+num(x.total),0);
  const purchases30=purchasesCurrent.reduce((s,x)=>s+num(x.total),0);
  const purchasesPrev=purchasesPrevious.reduce((s,x)=>s+num(x.total),0);
  const inventoryValue=balances.reduce((s,x)=>s+num(x.quantity)*num(x.averageCost),0);
  const lowStockRows=balances.filter(x=>num(x.quantity)<=num(x.product.minStock));
  const pendingExpenses=expenses.reduce((s,x)=>s+num(x.amount),0);
  const receivableBalance=receivables.reduce((s,x)=>s+Math.max(0,num(x.total)-num(x.paidAmount)),0);
  const payableBalance=payables.reduce((s,x)=>s+Math.max(0,num(x.total)-num(x.paidAmount)),0);
  const flowErrors=flowRuns.filter(x=>['FAILED','COMPLETED_WITH_ERRORS'].includes(x.status)).length;
  const flowErrorRate=flowRuns.length?flowErrors/flowRuns.length*100:0;
  const collectionPressure=sales30>0?receivableBalance/sales30*100:(receivableBalance>0?100:0);
  const lowStockRatio=balances.length?lowStockRows.length/balances.length*100:0;

  const change=(current,previous)=>{
    if(previous===0)return current===0?0:100;
    return (current-previous)/Math.abs(previous)*100;
  };

  const salesDelta=change(sales30,salesPrev);
  const categoryScores={
    comercial:Math.max(0,Math.min(100,100-Math.max(0,-salesDelta)*1.2)),
    operaciones:Math.max(0,Math.min(100,100-Math.min(lowStockRatio,100)*0.75)),
    finanzas:Math.max(0,Math.min(100,100-Math.max(0,collectionPressure-35)*0.65)),
    plataforma:Math.max(0,Math.min(100,100-Math.min(flowErrorRate,100)*0.45-Math.min(deadLetters*7,35)))
  };
  const healthScore=round(
    categoryScores.comercial*0.30+
    categoryScores.operaciones*0.25+
    categoryScores.finanzas*0.30+
    categoryScores.plataforma*0.15,
    1
  );
  const healthLevel=healthScore>=85?'HEALTHY':healthScore>=70?'WATCH':healthScore>=50?'RISK':'CRITICAL';

  return {
    values:{
      'sales.revenue_30d':round(sales30),
      'purchases.total_30d':round(purchases30),
      'inventory.value':round(inventoryValue),
      'inventory.low_stock':lowStockRows.length,
      'expenses.pending':round(pendingExpenses),
      'receivables.balance':round(receivableBalance),
      'payables.balance':round(payableBalance),
      'flow.error_rate':round(flowErrorRate),
      'integration.dead_letters':deadLetters,
      'intelligence.health_score':healthScore,
      'finance.collection_pressure':round(collectionPressure,1)
    },
    comparisons:{
      sales30:{current:round(sales30),previous:round(salesPrev),deltaPct:round(change(sales30,salesPrev),1)},
      purchases30:{current:round(purchases30),previous:round(purchasesPrev),deltaPct:round(change(purchases30,purchasesPrev),1)}
    },
    details:{
      lowStockRows:lowStockRows.slice(0,50).map(x=>({
        balanceId:x.id,
        product:x.product,
        warehouse:x.warehouse,
        quantity:num(x.quantity),
        minStock:num(x.product.minStock)
      })),
      flowRuns:flowRuns.length,
      flowErrors,
      deadLetters,
      health:{
        score:healthScore,
        level:healthLevel,
        categories:Object.fromEntries(
          Object.entries(categoryScores).map(([key,value])=>[key,round(value,1)])
        )
      },
      collectionPressure:round(collectionPressure,1),
      lowStockRatio:round(lowStockRatio,1)
    }
  };
}

function fingerprint(parts){
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function candidate({
  type='ALERT',
  severity='MEDIUM',
  category,
  title,
  message,
  entityType=null,
  entityId=null,
  metricKey=null,
  currentValue=null,
  baselineValue=null,
  deltaPct=null,
  recommendation=null,
  actionLink=null,
  fingerprintParts=[],
  metadata={}
}){
  return {
    type,severity,category,title,message,entityType,entityId,metricKey,
    currentValue,baselineValue,deltaPct,recommendation,actionLink,metadata,
    fingerprint:fingerprint(fingerprintParts.length?fingerprintParts:[category,title,entityType||'',entityId||''])
  };
}

export async function scanIntelligence(companyId){
  const metrics=await calculateMetrics(companyId);
  await captureMetricSnapshots(companyId,metrics);
  const items=[];

  for(const row of metrics.details.lowStockRows){
    items.push(candidate({
      type:'ALERT',
      severity:row.quantity<=0?'CRITICAL':'HIGH',
      category:'INVENTARIO',
      title:`Stock crítico · ${row.product.sku}`,
      message:`${row.product.name} tiene ${row.quantity} ${row.product.unit||'unidades'} en ${row.warehouse.name}; mínimo configurado: ${row.minStock}.`,
      entityType:'InventoryBalance',
      entityId:row.balanceId,
      metricKey:'inventory.low_stock',
      currentValue:row.quantity,
      baselineValue:row.minStock,
      recommendation:'Revisar reposición, demanda reciente y órdenes de compra abiertas.',
      actionLink:'/inventario/existencias',
      fingerprintParts:['low-stock',row.balanceId],
      metadata:{product:row.product,warehouse:row.warehouse}
    }));
  }

  if(metrics.comparisons.sales30.previous>0&&metrics.comparisons.sales30.deltaPct<=-20){
    items.push(candidate({
      type:'ANOMALY',
      severity:metrics.comparisons.sales30.deltaPct<=-40?'HIGH':'MEDIUM',
      category:'VENTAS',
      title:'Caída relevante en ventas',
      message:`Las ventas de los últimos 30 días están ${Math.abs(metrics.comparisons.sales30.deltaPct)}% por debajo de los 30 días anteriores.`,
      metricKey:'sales.revenue_30d',
      currentValue:metrics.comparisons.sales30.current,
      baselineValue:metrics.comparisons.sales30.previous,
      deltaPct:metrics.comparisons.sales30.deltaPct,
      recommendation:'Revisar pipeline, pedidos perdidos, clientes inactivos y desempeño por canal.',
      actionLink:'/ventas',
      fingerprintParts:['sales-drop',new Date().toISOString().slice(0,7)]
    }));
  }

  if(metrics.values['receivables.balance']>0&&metrics.values['receivables.balance']>metrics.values['sales.revenue_30d']*0.75){
    items.push(candidate({
      type:'RECOMMENDATION',
      severity:'MEDIUM',
      category:'FINANZAS',
      title:'Cobranza elevada frente a ventas recientes',
      message:'El saldo por cobrar representa más del 75% de las ventas de los últimos 30 días.',
      metricKey:'receivables.balance',
      currentValue:metrics.values['receivables.balance'],
      baselineValue:metrics.values['sales.revenue_30d'],
      recommendation:'Priorizar cuentas vencidas, revisar límites de crédito y programar seguimiento de cobranza.',
      actionLink:'/ventas/cobranza',
      fingerprintParts:['receivables-vs-sales',new Date().toISOString().slice(0,7)]
    }));
  }

  if(metrics.values['flow.error_rate']>=20&&metrics.details.flowRuns>=5){
    items.push(candidate({
      type:'ALERT',
      severity:metrics.values['flow.error_rate']>=40?'HIGH':'MEDIUM',
      category:'AUTOMATIZACIÓN',
      title:'Tasa elevada de errores en BuzzBee Flow',
      message:`${metrics.values['flow.error_rate']}% de las ejecuciones de Flow de los últimos 30 días terminaron con incidencias.`,
      metricKey:'flow.error_rate',
      currentValue:metrics.values['flow.error_rate'],
      baselineValue:20,
      recommendation:'Revisar acciones fallidas, plantillas y permisos del usuario de ejecución.',
      actionLink:'/flow',
      fingerprintParts:['flow-error-rate',new Date().toISOString().slice(0,7)]
    }));
  }


  const salesHistory=await metricHistory(companyId,{
    days:30,
    metricKeys:['sales.revenue_30d']
  });
  const salesForecast=salesHistory.forecasts['sales.revenue_30d'];

  if(
    salesForecast &&
    salesForecast.samples>=5 &&
    salesForecast.projectedChangePct<=-15 &&
    salesForecast.r2>=0.35
  ){
    items.push(candidate({
      type:'RECOMMENDATION',
      severity:salesForecast.projectedChangePct<=-30?'HIGH':'MEDIUM',
      category:'VENTAS',
      title:'Tendencia persistente de ventas a la baja',
      message:`La tendencia histórica registrada proyecta una variación aproximada de ${salesForecast.projectedChangePct}% en los próximos 7 puntos diarios si el patrón reciente continúa.`,
      metricKey:'sales.revenue_30d',
      currentValue:metrics.values['sales.revenue_30d'],
      recommendation:'Validar causas comerciales antes de actuar: pipeline, pérdida de clientes, estacionalidad y campañas.',
      actionLink:'/ventas',
      fingerprintParts:['sales-trend-down',new Date().toISOString().slice(0,7)],
      metadata:{
        method:salesForecast.method,
        samples:salesForecast.samples,
        r2:salesForecast.r2,
        projectedChangePct:salesForecast.projectedChangePct
      }
    }));
  }

  if(metrics.values['integration.dead_letters']>0){
    items.push(candidate({
      type:'ALERT',
      severity:metrics.values['integration.dead_letters']>=5?'HIGH':'MEDIUM',
      category:'INTEGRACIONES',
      title:'Entregas detenidas en Dead Letter Queue',
      message:`Hay ${metrics.values['integration.dead_letters']} entrega(s) que agotaron sus reintentos.`,
      metricKey:'integration.dead_letters',
      currentValue:metrics.values['integration.dead_letters'],
      baselineValue:0,
      recommendation:'Revisar endpoints externos, credenciales y errores de la cola antes de reintentar.',
      actionLink:'/integration-hub',
      fingerprintParts:['dead-letter-queue']
    }));
  }

  if(metrics.details.health.score<70){
    items.push(candidate({
      type:'RECOMMENDATION',
      severity:metrics.details.health.score<50?'CRITICAL':'HIGH',
      category:'INTELIGENCIA',
      title:'Salud general del negocio requiere atención',
      message:`El Business Health Score actual es ${metrics.details.health.score}/100 (${metrics.details.health.level}).`,
      metricKey:'intelligence.health_score',
      currentValue:metrics.details.health.score,
      baselineValue:85,
      recommendation:'Revisar primero las categorías con menor puntuación y atender insights HIGH/CRITICAL.',
      actionLink:'/inteligencia',
      fingerprintParts:['business-health',new Date().toISOString().slice(0,7)],
      metadata:{health:metrics.details.health}
    }));
  }

  const activeFingerprints=new Set(items.map(x=>x.fingerprint));

  for(const item of items){
    const existing=await prisma.intelligenceInsight.findUnique({
      where:{companyId_fingerprint:{companyId,fingerprint:item.fingerprint}}
    });

    const severityRank={INFO:0,LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4};
    const escalated=existing&&severityRank[item.severity]>severityRank[existing.severity];
    const preserveStatus=existing&&['ACKNOWLEDGED','DISMISSED'].includes(existing.status);

    const saved=await prisma.intelligenceInsight.upsert({
      where:{companyId_fingerprint:{companyId,fingerprint:item.fingerprint}},
      create:{companyId,...item,status:'OPEN',detectedAt:new Date()},
      update:{
        ...item,
        status:preserveStatus?existing.status:'OPEN',
        detectedAt:new Date(),
        acknowledgedAt:preserveStatus&&existing.status==='ACKNOWLEDGED'?existing.acknowledgedAt:null,
        resolvedAt:null,
        dismissedAt:preserveStatus&&existing.status==='DISMISSED'?existing.dismissedAt:null
      }
    });

    if(!existing){
      emitIntegrationEventAsync({
        companyId,
        event:'intelligence.insight.created',
        entityType:'IntelligenceInsight',
        entityId:saved.id,
        payload:{insight:saved}
      });
    }else if(escalated){
      emitIntegrationEventAsync({
        companyId,
        event:'intelligence.insight.escalated',
        entityType:'IntelligenceInsight',
        entityId:saved.id,
        payload:{insight:saved,previousSeverity:existing.severity}
      });
    }
  }

  const openExisting=await prisma.intelligenceInsight.findMany({
    where:{companyId,status:{in:['OPEN','ACKNOWLEDGED']}},
    select:{id:true,fingerprint:true}
  });

  const obsolete=openExisting.filter(x=>!activeFingerprints.has(x.fingerprint));
  if(obsolete.length){
    await prisma.intelligenceInsight.updateMany({
      where:{id:{in:obsolete.map(x=>x.id)}},
      data:{status:'RESOLVED',resolvedAt:new Date()}
    });
  }

  return {metrics,detected:items.length,resolved:obsolete.length};
}

export async function intelligenceDashboard(companyId){
  const [metrics,company]=await Promise.all([
    calculateMetrics(companyId),
    prisma.company.findUnique({where:{id:companyId},select:{id:true,name:true,currency:true}})
  ]);
  const history=await metricHistory(companyId,{
    days:30,
    metricKeys:[
      'sales.revenue_30d',
      'purchases.total_30d',
      'inventory.value',
      'receivables.balance',
      'payables.balance',
      'flow.error_rate'
    ]
  });
  const [definitions,insights]=await Promise.all([
    prisma.intelligenceMetricDefinition.findMany({
      where:{companyId,active:true},
      orderBy:[{category:'asc'},{name:'asc'}]
    }),
    prisma.intelligenceInsight.findMany({
      where:{companyId},
      orderBy:[{status:'asc'},{detectedAt:'desc'}],
      take:100
    })
  ]);

  const active=insights.filter(x=>['OPEN','ACKNOWLEDGED'].includes(x.status));

  return {
    company,
    metrics,
    history,
    definitions,
    insights,
    summary:{
      activeInsights:active.length,
      critical:active.filter(x=>x.severity==='CRITICAL').length,
      high:active.filter(x=>x.severity==='HIGH').length,
      anomalies:active.filter(x=>x.type==='ANOMALY').length
    }
  };
}
