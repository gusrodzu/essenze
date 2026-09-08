
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.O2C_EMAIL||'admin@erp.local';
const password=process.env.O2C_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.O2C_WRITE||'').toLowerCase());

const report={
  version:'9.6.0',
  startedAt:new Date().toISOString(),
  base,
  mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',
  checks:[],
  entities:{},
};

function rec(name,ok,detail='',meta={}){
  report.checks.push({name,ok,detail,...meta});
  console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);
  return ok;
}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`;}

async function request(route,{method='GET',token,body}={}){
  try{
    const response=await fetch(`${base}${route}`,{
      method,
      headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
      body:body===undefined?undefined:JSON.stringify(body),
    });
    let data=null; try{data=await response.json()}catch{}
    return {ok:response.ok,status:response.status,data,path:route};
  }catch(error){return {ok:false,status:null,error:error.message,path:route};}
}
async function requireOk(r,name){
  if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r),{status:r.status,path:r.path})) throw new Error(`${name}: ${msg(r)}`);
  return r.data;
}
async function save(){
  report.finishedAt=new Date().toISOString();
  report.passed=report.checks.filter(x=>x.ok).length;
  report.failed=report.checks.filter(x=>!x.ok).length;
  const dir=path.resolve('artifacts','qa'); fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`o2c-runtime-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log(`\nReporte JSON: ${file}`);
}

console.log('\nBuzzBee Order-to-Cash Functional QA — v9.6.0');
console.log('==============================================');
console.log(`Modo: ${writeMode?'WRITE E2E (crea datos QA, no elimina datos)':'READ-ONLY PREFLIGHT'}`);
console.log(`API: ${base}\n`);

try{
  await requireOk(await request('/health'),'API health');
  await requireOk(await request('/ready'),'API + PostgreSQL ready');

  const login=await requireOk(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;
  if(!token) throw new Error('Login sin token.');
  rec('Token JWT recibido',true);

  const [sales,fulfillment,balances,movements,receivables,collections,o2c]=await Promise.all([
    requireOk(await request('/sales',{token}),'Ventas endpoint'),
    requireOk(await request('/sales-fulfillment',{token}),'Fulfillment endpoint'),
    requireOk(await request('/inventory/balances',{token}),'Inventario endpoint'),
    requireOk(await request('/inventory/movements',{token}),'Kardex endpoint'),
    requireOk(await request('/accounts-receivable',{token}),'CxC endpoint'),
    requireOk(await request('/collections',{token}),'Cobranza endpoint'),
    requireOk(await request('/order-to-cash/dashboard',{token}),'Order-to-Cash dashboard'),
  ]);

  const customer=sales.customers?.[0];
  const eligible=(balances.balances||[])
    .filter(b=>Number(b.quantity)>0 && sales.products?.some(p=>p.id===b.productId))
    .sort((a,b)=>Number(b.quantity)-Number(a.quantity))[0];
  const product=sales.products?.find(p=>p.id===eligible?.productId);
  const warehouse=fulfillment.warehouses?.find(w=>w.id===eligible?.warehouseId);
  const treasury=collections.accounts?.[0];

  rec('Catálogo: cliente disponible',Boolean(customer),customer?.commercialName||customer?.legalName||'Sin cliente');
  rec('Inventario vendible disponible',Boolean(eligible&&product&&warehouse),eligible?`${product?.sku||''} · ${Number(eligible.quantity)} unidades`:'Sin stock');
  rec('Tesorería: cuenta disponible',Boolean(treasury),treasury?.name||'Sin cuenta');

  if(!customer||!eligible||!product||!warehouse||!treasury) throw new Error('Faltan datos mínimos para ejecutar Order-to-Cash.');

  if(!writeMode){
    console.log('\nPreflight completado. Para ejecutar el flujo transaccional completo:');
    console.log('PowerShell:  $env:O2C_WRITE="1"; npm run qa:o2c');
    console.log('El modo WRITE crea registros QA y NO elimina ni resetea información.');
    await save();
    process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const now=new Date();
  const valid=new Date(now); valid.setDate(valid.getDate()+15);
  const due=new Date(now); due.setDate(due.getDate()+30);
  const stamp=Date.now();
  const key=`QA-O2C-${stamp}`;
  const qty=1;
  const price=Math.max(1,Number(product.price||product.salePrice||100));
  const beforeQty=Number(eligible.quantity);
  report.entities.qaKey=key;
  report.entities.beforeQty=beforeQty;

  // 1. Quote
  const qd=await requireOk(await request('/sales/quotes',{
    method:'POST',token,body:{
      customerId:customer.id,
      quoteDate:now.toISOString(),
      validUntil:valid.toISOString(),
      currency:'MXN',
      notes:key,
      terms:'QA funcional Order-to-Cash v9.6.0',
      items:[{productId:product.id,description:product.name,quantity:qty,unitPrice:price,taxRate:16}]
    }
  }),'Crear cotización');
  const quote=qd.quote;
  report.entities.quote={id:quote.id,folio:quote.folio};
  rec('Cotización inicia DRAFT',quote.status==='DRAFT',quote.status);

  const sent=await requireOk(await request(`/sales/quotes/${quote.id}/status`,{
    method:'PATCH',token,body:{status:'SENT'}
  }),'Enviar cotización');
  rec('Cotización queda SENT',sent.quote?.status==='SENT',sent.quote?.status||'—');

  const accepted=await requireOk(await request(`/sales/quotes/${quote.id}/status`,{
    method:'PATCH',token,body:{status:'ACCEPTED'}
  }),'Aceptar cotización');
  rec('Cotización queda ACCEPTED',accepted.quote?.status==='ACCEPTED',accepted.quote?.status||'—');

  // 2. Convert to order and confirm
  const converted=await requireOk(await request(`/sales/quotes/${quote.id}/convert`,{
    method:'POST',token,body:{deliveryDate:now.toISOString(),shippingAddress:'QA Order-to-Cash'}
  }),'Convertir cotización a pedido');
  const order=converted.order;
  report.entities.order={id:order.id,folio:order.folio};
  rec('Pedido nace DRAFT',order.status==='DRAFT',order.status);

  const confirmed=await requireOk(await request(`/sales/orders/${order.id}/status`,{
    method:'PATCH',token,body:{status:'CONFIRMED'}
  }),'Confirmar pedido');
  rec('Pedido queda CONFIRMED',confirmed.order?.status==='CONFIRMED',confirmed.order?.status||'—');

  // 3. Fetch order item
  const sales2=await requireOk(await request('/sales',{token}),'Releer pedido');
  const orderFresh=(sales2.orders||[]).find(o=>o.id===order.id);
  const orderItem=orderFresh?.items?.[0];
  if(!orderItem) throw new Error('No se encontró la partida del pedido.');

  // 4. Deliver -> inventory + kardex
  const delivered=await requireOk(await request('/sales-fulfillment/deliveries',{
    method:'POST',token,body:{
      salesOrderId:order.id,
      warehouseId:warehouse.id,
      deliveryDate:now.toISOString(),
      recipientName:'Cliente QA',
      reference:key,
      shippingAddress:'QA Order-to-Cash',
      notes:key,
      items:[{salesOrderItemId:orderItem.id,quantity:qty}]
    }
  }),'Registrar remisión / entrega');
  const delivery=delivered.delivery;
  report.entities.delivery={id:delivery.id,folio:delivery.folio};

  const balances2=await requireOk(await request('/inventory/balances',{token}),'Releer inventario');
  const after=(balances2.balances||[]).find(b=>b.warehouseId===warehouse.id&&b.productId===product.id);
  const afterQty=Number(after?.quantity||0);
  report.entities.afterQty=afterQty;
  rec('Inventario descuenta la entrega',Math.abs(afterQty-(beforeQty-qty))<0.000001,`${beforeQty} → ${afterQty}`);

  const moves2=await requireOk(await request('/inventory/movements',{token}),'Releer Kardex');
  const saleMove=(moves2.movements||[]).find(m=>m.reference===delivery.folio&&m.type==='SALE_OUT');
  rec('Kardex contiene SALE_OUT',Boolean(saleMove),saleMove?`${saleMove.type} · ${saleMove.reference}`:'No encontrado');
  if(!saleMove) throw new Error('No se encontró SALE_OUT en Kardex.');

  // 5. Invoice + AR
  const invd=await requireOk(await request('/sales-fulfillment/invoices',{
    method:'POST',token,body:{
      salesOrderId:order.id,
      issueDate:now.toISOString(),
      dueDate:due.toISOString(),
      notes:key
    }
  }),'Facturar pedido');
  const invoice=invd.invoice;
  report.entities.invoice={id:invoice.id,invoiceNumber:invoice.invoiceNumber,total:Number(invoice.total)};

  // Duplicate invoice must be blocked
  const duplicate=await request('/sales-fulfillment/invoices',{
    method:'POST',token,body:{salesOrderId:order.id,issueDate:now.toISOString(),dueDate:due.toISOString(),notes:key}
  });
  rec('Doble facturación bloqueada',!duplicate.ok&&duplicate.status===409,duplicate.ok?'La API permitió duplicado':`HTTP ${duplicate.status}`);
  if(duplicate.ok) throw new Error('La API permitió facturar dos veces el pedido.');

  const arData=await requireOk(await request('/accounts-receivable',{token}),'Releer CxC');
  const ar=(arData.invoices||[]).find(x=>x.invoiceNumber===invoice.invoiceNumber);
  rec('Factura genera CxC',Boolean(ar),ar?`${ar.invoiceNumber} · ${ar.status}`:'No encontrada');
  if(!ar) throw new Error('La factura no generó CxC.');
  report.entities.receivable={id:ar.id,total:Number(ar.total)};

  // 6. Full collection through commercial collections module -> Treasury + AR
  const balance=Number(ar.balance??(Number(ar.total)-Number(ar.paidAmount||0)));
  const col=await requireOk(await request('/collections/payments',{
    method:'POST',token,body:{
      customerId:customer.id,
      treasuryAccountId:treasury.id,
      paymentDate:now.toISOString(),
      amount:balance,
      method:'TRANSFER',
      reference:key,
      notes:'Cobro QA Order-to-Cash v9.6.0',
      applications:[{accountsReceivableId:ar.id,amount:balance}]
    }
  }),'Registrar cobranza');
  report.entities.collection={id:col.payment?.id,folio:col.payment?.folio};

  const arFinal=await requireOk(await request('/accounts-receivable',{token}),'Validar CxC final');
  const arClosed=(arFinal.invoices||[]).find(x=>x.id===ar.id);
  rec('CxC queda PAID',arClosed?.status==='PAID',arClosed?.status||'—');
  rec('Saldo CxC queda en cero',Math.abs(Number(arClosed?.balance||0))<0.001,String(arClosed?.balance??'—'));

  const fulfillmentFinal=await requireOk(await request('/sales-fulfillment',{token}),'Validar factura comercial');
  const salesInvoice=(fulfillmentFinal.invoices||[]).find(x=>x.id===invoice.id);
  rec('Factura comercial sincroniza PAID',salesInvoice?.status==='PAID',salesInvoice?.status||'—');

  const collectionsFinal=await requireOk(await request('/collections',{token}),'Validar cobranza / tesorería');
  const receipt=(collectionsFinal.payments||[]).find(x=>x.id===col.payment?.id);
  rec('Recibo de cobranza queda APPLIED',receipt?.status==='APPLIED',receipt?.status||'—');
  rec('Cobro totalmente aplicado',Math.abs(Number(receipt?.unappliedAmount||0))<0.001,String(receipt?.unappliedAmount??'—'));

  await requireOk(await request('/order-to-cash/dashboard',{token}),'Actualizar dashboard Order-to-Cash');

  console.log('\n----------------------------------------------');
  console.log(`Flujo creado: ${quote.folio} → ${order.folio} → ${delivery.folio} → ${invoice.invoiceNumber} → ${col.payment?.folio||'COB'}`);
  console.log('Resultado: Order-to-Cash E2E PASS.');
}catch(error){
  console.error(`\nERROR QA: ${error.message}`);
  report.runtimeError=error.message;
}finally{
  await save();
}
if(report.runtimeError||report.checks.some(x=>!x.ok)) process.exit(1);
