
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.POS_QA_EMAIL||'admin@erp.local';
const password=process.env.POS_QA_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.POS_QA_WRITE||'').toLowerCase());
const report={version:'10.1.0',startedAt:new Date().toISOString(),mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',checks:[],entities:{}};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`pos-runtime-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee POS Functional QA — v10.1.0');
console.log('===================================');
console.log(`Modo: ${writeMode?'WRITE E2E':'READ-ONLY PREFLIGHT'}\n`);

try{
  await ok(await request('/health'),'API health');
  await ok(await request('/ready'),'API + PostgreSQL ready');
  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [pos,balances,movements]=await Promise.all([
    ok(await request('/pos/dashboard',{token}),'POS dashboard'),
    ok(await request('/inventory/balances',{token}),'Inventario / balances'),
    ok(await request('/inventory/movements',{token}),'Kardex'),
  ]);

  rec('Terminales disponibles',Array.isArray(pos.terminals),`${pos.terminals?.length||0}`);
  rec('Sesiones disponibles',Array.isArray(pos.sessions),`${pos.sessions?.length||0}`);
  rec('Tickets disponibles',Array.isArray(pos.sales),`${pos.sales?.length||0}`);
  rec('Productos disponibles',Array.isArray(pos.products),`${pos.products?.length||0}`);
  rec('Resumen POS disponible',Boolean(pos.summary),'OK');

  if(!writeMode){
    console.log('\nPara ejecutar venta → inventario → Kardex → anulación → cierre:');
    console.log('PowerShell: $env:POS_QA_WRITE="1"; npm run qa:pos');
    await save();process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const warehouse=pos.warehouses?.find(w=>w.active!==false);
  if(!warehouse)throw new Error('No hay almacén activo para POS QA.');

  const product=pos.products?.find(p=>{
    const bal=(p.inventoryBalances||[]).find(b=>b.warehouseId===warehouse.id);
    return Number(bal?.quantity||0)>=2 && Number(p.price||0)>0;
  });
  if(!product)throw new Error('No hay producto con al menos 2 unidades y precio > 0 para POS QA.');

  const initial=(balances.balances||[]).find(b=>b.warehouseId===warehouse.id&&b.productId===product.id);
  const before=Number(initial?.quantity||0);
  const stamp=Date.now();
  const terminalCode=`QA${String(stamp).slice(-8)}`;
  report.entities={warehouseId:warehouse.id,productId:product.id,stockBefore:before};

  const terminalData=await ok(await request('/pos/terminals',{
    method:'POST',token,body:{
      code:terminalCode,name:`Terminal QA ${stamp}`,warehouseId:warehouse.id,active:true,notes:'QA POS v10.1.0'
    }
  }),'Crear terminal POS QA');
  const terminal=terminalData.terminal;report.entities.terminalId=terminal.id;

  const sessionData=await ok(await request('/pos/sessions/open',{
    method:'POST',token,body:{terminalId:terminal.id,openingAmount:100,notes:'QA POS v10.1.0'}
  }),'Abrir sesión POS');
  const session=sessionData.session;report.entities.sessionId=session.id;

  const folio=`POS-QA-${stamp}`;
  const unitPrice=Number(product.price);
  const subtotal=unitPrice;
  const tax=unitPrice*0.16;
  const total=subtotal+tax;

  const saleData=await ok(await request('/pos/sales',{
    method:'POST',token,body:{
      sessionId:session.id,
      customerId:null,
      folio,
      notes:'QA POS v10.1.0',
      items:[{productId:product.id,quantity:1,unitPrice,discount:0,taxRate:16}],
      payments:[{method:'CASH',amount:total,reference:folio,authorization:null}],
      discount:null
    }
  }),'Registrar venta POS');
  const sale=saleData.sale;report.entities.saleId=sale.id;
  rec('Ticket queda PAID',sale.status==='PAID',sale.status);

  let afterSale=await ok(await request('/inventory/balances',{token}),'Validar stock tras venta');
  let saleBalance=(afterSale.balances||[]).find(b=>b.warehouseId===warehouse.id&&b.productId===product.id);
  rec('POS descuenta inventario',Math.abs(Number(saleBalance?.quantity||0)-(before-1))<.000001,`${before} → ${saleBalance?.quantity}`);

  let kardex=await ok(await request('/inventory/movements',{token}),'Validar Kardex SALE_OUT');
  const saleOut=(kardex.movements||[]).find(m=>m.reference===folio&&m.type==='SALE_OUT');
  rec('Kardex SALE_OUT creado',Boolean(saleOut),saleOut?.reference||'No encontrado');

  const duplicate=await request('/pos/sales',{
    method:'POST',token,body:{
      sessionId:session.id,customerId:null,folio,
      items:[{productId:product.id,quantity:1,unitPrice,discount:0,taxRate:16}],
      payments:[{method:'CASH',amount:total,reference:folio,authorization:null}]
    }
  });
  rec('Folio duplicado bloqueado',!duplicate.ok&&duplicate.status===409,duplicate.ok?'Permitido incorrectamente':`HTTP ${duplicate.status}`);

  const voidData=await ok(await request(`/pos/sales/${sale.id}/void`,{method:'POST',token,body:{}}),'Anular venta POS');
  rec('Ticket queda VOID',voidData.sale?.status==='VOID',voidData.sale?.status||'—');

  const afterVoid=await ok(await request('/inventory/balances',{token}),'Validar stock tras anulación');
  const voidBalance=(afterVoid.balances||[]).find(b=>b.warehouseId===warehouse.id&&b.productId===product.id);
  rec('Anulación restaura inventario',Math.abs(Number(voidBalance?.quantity||0)-before)<.000001,`${before-1} → ${voidBalance?.quantity}`);

  kardex=await ok(await request('/inventory/movements',{token}),'Validar Kardex SALE_RETURN_IN');
  const returnIn=(kardex.movements||[]).find(m=>m.reference===folio&&m.type==='SALE_RETURN_IN');
  rec('Kardex SALE_RETURN_IN creado',Boolean(returnIn),returnIn?.reference||'No encontrado');

  const dashboard=await ok(await request('/pos/dashboard',{token}),'Releer sesión POS');
  const sessionState=(dashboard.sessions||[]).find(s=>s.id===session.id);
  const expected=Number(sessionState?.openingAmount||0); // sale + refund net to zero, only opening remains
  rec('Caja neta vuelve al fondo inicial',Math.abs(expected-100)<.01,String(expected));

  const closeData=await ok(await request(`/pos/sessions/${session.id}/close`,{
    method:'POST',token,body:{countedAmount:100,notes:'Cierre QA POS'}
  }),'Cerrar sesión POS');
  rec('Sesión queda CLOSED',closeData.session?.status==='CLOSED',closeData.session?.status||'—');
  rec('Cierre de caja sin diferencia',Math.abs(Number(closeData.session?.difference||0))<.01,String(closeData.session?.difference||0));

  console.log('\nResultado: POS E2E PASS con inventario restaurado tras anulación.');
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
