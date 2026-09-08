
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.P2P_EMAIL||'admin@erp.local';
const password=process.env.P2P_PASSWORD||'Admin123!';
const writeMode=String(process.env.P2P_WRITE||'').toLowerCase()==='1'
  || String(process.env.P2P_WRITE||'').toLowerCase()==='true';

const report={
  version:'9.1.0',
  startedAt:new Date().toISOString(),
  base,
  mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',
  checks:[],
  entities:{},
};

function record(name,ok,detail='',meta={}){
  report.checks.push({name,ok,detail,...meta});
  console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);
  return ok;
}

async function request(pathname,{method='GET',token,body}={}){
  try{
    const response=await fetch(`${base}${pathname}`,{
      method,
      headers:{
        'Content-Type':'application/json',
        ...(token?{Authorization:`Bearer ${token}`}:{})
      },
      body:body===undefined?undefined:JSON.stringify(body)
    });
    let data=null;
    try{data=await response.json()}catch{}
    return {ok:response.ok,status:response.status,data,path:pathname};
  }catch(error){
    return {ok:false,status:null,data:null,error:error.message,path:pathname};
  }
}

function detail(result){
  return result?.data?.message||result?.data?.error||result?.error||`HTTP ${result?.status??'-'}`;
}

async function requireOk(result,name){
  const ok=record(name,result.ok,result.ok?`HTTP ${result.status}`:detail(result),{status:result.status,path:result.path});
  if(!ok) throw new Error(`${name}: ${detail(result)}`);
  return result.data;
}

async function approveUntilDone(token,approvalId,label){
  if(!approvalId)return null;
  let status='PENDING';
  let last=null;
  for(let i=0;i<6 && status==='PENDING';i++){
    const r=await request(`/approvals/requests/${approvalId}/approve`,{
      method:'POST',token,body:{comment:`QA P2P v9.1.0 · ${label}`}
    });
    if(!r.ok){
      record(`${label}: aprobación workflow`,false,detail(r),{status:r.status});
      throw new Error(`${label}: no se pudo aprobar workflow`);
    }
    last=r.data;
    status=last?.status||'PENDING';
    record(`${label}: paso de aprobación ${i+1}`,true,status);
  }
  if(status!=='APPROVED'){
    record(`${label}: aprobación final`,false,status);
    throw new Error(`${label}: workflow no terminó APPROVED`);
  }
  record(`${label}: aprobación final`,true,status);
  return last;
}

async function saveReport(){
  report.finishedAt=new Date().toISOString();
  report.passed=report.checks.filter(x=>x.ok).length;
  report.failed=report.checks.filter(x=>!x.ok).length;
  const dir=path.resolve('artifacts','qa');
  fs.mkdirSync(dir,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const file=path.join(dir,`p2p-runtime-${stamp}.json`);
  fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log(`\nReporte JSON: ${file}`);
}

console.log('\nBuzzBee Procure-to-Pay Functional QA — v9.1.0');
console.log('===============================================');
console.log(`Modo: ${writeMode?'WRITE E2E (crea datos QA, no elimina datos)':'READ-ONLY PREFLIGHT'}`);
console.log(`API: ${base}\n`);

try{
  const health=await request('/health');
  await requireOk(health,'API health');
  const ready=await request('/ready');
  await requireOk(ready,'API + PostgreSQL ready');

  const login=await request('/auth/login',{method:'POST',body:{email,password}});
  const loginData=await requireOk(login,'Autenticación QA');
  const token=loginData?.token;
  if(!token)throw new Error('La respuesta de login no contiene token.');
  record('Token JWT recibido',true);

  const [requestsData,ordersData,approvalsData,receiptsData,inventoryData,movementsData,payablesData,procurementData]=await Promise.all([
    requireOk(await request('/purchase-requests',{token}),'SOLPED endpoint'),
    requireOk(await request('/purchase-orders',{token}),'Órdenes de compra endpoint'),
    requireOk(await request('/approvals/dashboard',{token}),'Aprobaciones endpoint'),
    requireOk(await request('/receipts',{token}),'Recepciones endpoint'),
    requireOk(await request('/inventory/balances',{token}),'Inventario endpoint'),
    requireOk(await request('/inventory/movements',{token}),'Kardex endpoint'),
    requireOk(await request('/accounts-payable',{token}),'CxP endpoint'),
    requireOk(await request('/procurement/dashboard',{token}),'Procure-to-Pay dashboard'),
  ]);

  const warehouse=requestsData.warehouses?.[0]||ordersData.warehouses?.[0];
  const product=requestsData.products?.[0]||ordersData.products?.[0];
  const supplier=ordersData.suppliers?.[0];

  record('Catálogo: almacén disponible',Boolean(warehouse),warehouse?.name||'Sin almacén');
  record('Catálogo: producto disponible',Boolean(product),product?`${product.sku} · ${product.name}`:'Sin producto');
  record('Catálogo: proveedor disponible',Boolean(supplier),supplier?.legalName||supplier?.commercialName||'Sin proveedor');

  if(!warehouse||!product||!supplier){
    throw new Error('Faltan datos maestros mínimos para ejecutar Procure-to-Pay.');
  }

  if(!writeMode){
    console.log('\nPreflight completado. Para ejecutar el flujo transaccional completo:');
    console.log('PowerShell:  $env:P2P_WRITE="1"; npm run qa:p2p');
    console.log('El modo WRITE crea registros con prefijo QA-P2P y NO elimina ni resetea información.');
    await saveReport();
    process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const stamp=Date.now();
  const qaKey=`QA-P2P-${stamp}`;
  const qty=1;
  const unitCost=Math.max(1,Number(product.cost||product.purchasePrice||100));
  const initialBalance=(inventoryData.balances||[]).find(x=>x.warehouseId===warehouse.id&&x.productId===product.id);
  const beforeQty=Number(initialBalance?.quantity||0);
  report.entities.qaKey=qaKey;
  report.entities.beforeQty=beforeQty;

  // 1. SOLPED
  const prCreated=await requireOk(await request('/purchase-requests',{
    method:'POST',token,
    body:{
      warehouseId:warehouse.id,
      title:`${qaKey} · Validación funcional`,
      justification:'Prueba funcional controlada Procure-to-Pay v9.1.0.',
      priority:'NORMAL',
      items:[{productId:product.id,quantity:qty,estimatedUnitCost:unitCost,notes:qaKey}]
    }
  }),'Crear SOLPED');
  const pr=prCreated.request;
  report.entities.purchaseRequest={id:pr.id,folio:pr.folio};
  record('SOLPED inicia DRAFT',pr.status==='DRAFT',pr.status);

  // 2. Submit + approval
  const submitted=await requireOk(await request(`/purchase-requests/${pr.id}/submit`,{
    method:'POST',token,body:{}
  }),'Enviar SOLPED a aprobación');
  record('SOLPED pasa a PENDING',submitted.request?.status==='PENDING',submitted.request?.status||'—');

  if(submitted.approvalRequired){
    const approvalId=submitted.approval?.id;
    report.entities.purchaseRequestApprovalId=approvalId;
    await approveUntilDone(token,approvalId,'SOLPED');
  }else{
    record('SOLPED sin workflow configurado',true,'No requiere aprobación');
  }

  const prAfter=await requireOk(await request(`/purchase-requests/${pr.id}`,{token}),'Releer SOLPED');
  record('SOLPED queda APPROVED',prAfter.request?.status==='APPROVED',prAfter.request?.status||'—');
  if(prAfter.request?.status!=='APPROVED')throw new Error('La SOLPED no quedó APPROVED.');

  // 3. Purchase Order
  const poCreated=await requireOk(await request('/purchase-orders',{
    method:'POST',token,
    body:{
      supplierId:supplier.id,
      warehouseId:warehouse.id,
      purchaseRequestId:pr.id,
      paymentTerms:Number(supplier.paymentTerms||15),
      currency:'MXN',
      notes:qaKey,
      items:[{productId:product.id,quantity:qty,unitCost,taxRate:16,notes:qaKey}]
    }
  }),'Crear Orden de Compra');
  const po=poCreated.order;
  report.entities.purchaseOrder={id:po.id,folio:po.folio};
  record('OC inicia DRAFT',po.status==='DRAFT',po.status);

  if(poCreated.approvalRequired){
    const approvalId=poCreated.approval?.id;
    report.entities.purchaseOrderApprovalId=approvalId;
    await approveUntilDone(token,approvalId,'Orden de Compra');
  }else{
    record('OC sin workflow configurado',true,'No requiere aprobación');
  }

  const issued=await requireOk(await request(`/purchase-orders/${po.id}/issue`,{
    method:'POST',token,body:{}
  }),'Emitir Orden de Compra');
  record('OC queda ISSUED',issued.order?.status==='ISSUED',issued.order?.status||'—');
  if(issued.order?.status!=='ISSUED')throw new Error('La OC no quedó ISSUED.');

  // 4. Receipt
  const poList=await requireOk(await request('/purchase-orders',{token}),'Releer Orden de Compra');
  const poFresh=(poList.orders||[]).find(x=>x.id===po.id);
  const poItem=poFresh?.items?.[0];
  if(!poItem)throw new Error('No se encontró la partida de la OC para recibir.');

  const supplierDocument=`${qaKey}-INV`;
  const receiptCreated=await requireOk(await request('/receipts',{
    method:'POST',token,
    body:{
      purchaseOrderId:po.id,
      supplierDocument,
      notes:qaKey,
      items:[{purchaseOrderItemId:poItem.id,quantity:qty,notes:qaKey}]
    }
  }),'Registrar recepción');
  const receipt=receiptCreated.receipt;
  report.entities.receipt={id:receipt.id,folio:receipt.folio};
  record('Recepción genera handoff financiero',Boolean(receiptCreated.financeHandoff?.created),receiptCreated.financeHandoff?.created?'CxP creada':'Sin CxP');
  if(!receiptCreated.financeHandoff?.created)throw new Error('La recepción no generó la CxP esperada.');

  // 5. Inventory / Kardex
  const balancesAfter=await requireOk(await request('/inventory/balances',{token}),'Releer inventario');
  const afterBalance=(balancesAfter.balances||[]).find(x=>x.warehouseId===warehouse.id&&x.productId===product.id);
  const afterQty=Number(afterBalance?.quantity||0);
  report.entities.afterQty=afterQty;
  record('Inventario aumenta por recepción',Math.abs(afterQty-(beforeQty+qty))<0.000001,`${beforeQty} → ${afterQty}`);

  const movementsAfter=await requireOk(await request('/inventory/movements',{token}),'Releer Kardex');
  const movement=(movementsAfter.movements||[]).find(x=>x.goodsReceiptId===receipt.id||x.goodsReceipt?.id===receipt.id||x.reference===receipt.folio);
  record('Kardex contiene PURCHASE_RECEIPT',Boolean(movement)&&movement.type==='PURCHASE_RECEIPT',movement?`${movement.type} · ${movement.reference||receipt.folio}`:'No encontrado');
  if(!movement)throw new Error('No se encontró el movimiento de Kardex.');

  // 6. Accounts Payable
  const payables=await requireOk(await request('/accounts-payable',{token}),'Releer Cuentas por Pagar');
  const payable=(payables.invoices||[]).find(x=>x.invoiceNumber===supplierDocument);
  record('CxP creada desde recepción',Boolean(payable),payable?`${payable.invoiceNumber} · ${payable.displayStatus||payable.status}`:'No encontrada');
  if(!payable)throw new Error('No se encontró la CxP generada.');
  report.entities.payable={id:payable.id,invoiceNumber:payable.invoiceNumber,total:Number(payable.total)};

  const balance=Number(payable.balance??(Number(payable.total)-Number(payable.paidAmount||0)));
  const payment=await requireOk(await request(`/accounts-payable/${payable.id}/payments`,{
    method:'POST',token,
    body:{
      amount:balance,
      paymentDate:new Date().toISOString(),
      method:'Transferencia',
      reference:qaKey,
      notes:'Pago QA P2P v9.1.0'
    }
  }),'Registrar pago a proveedor');
  record('CxP queda PAID',payment.invoice?.status==='PAID',payment.invoice?.status||'—');
  record('Saldo CxP queda en cero',Math.abs(Number(payment.invoice?.balance||0))<0.001,String(payment.invoice?.balance??'—'));

  // 7. Final operational read
  const finalProcurement=await requireOk(await request('/procurement/dashboard',{token}),'Actualizar dashboard Procure-to-Pay');
  record('Dashboard P2P responde después del flujo',Boolean(finalProcurement),`OK`);

  console.log('\n----------------------------------------------');
  console.log(`Flujo creado: ${pr.folio} → ${po.folio} → ${receipt.folio} → ${supplierDocument}`);
  console.log('Resultado: Procure-to-Pay E2E PASS.');
}catch(error){
  console.error(`\nERROR QA: ${error.message}`);
  report.runtimeError=error.message;
}finally{
  await saveReport();
}

if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
