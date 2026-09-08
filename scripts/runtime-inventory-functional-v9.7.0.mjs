
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.INVENTORY_QA_EMAIL||'admin@erp.local';
const password=process.env.INVENTORY_QA_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.INVENTORY_QA_WRITE||'').toLowerCase());
const report={version:'9.7.0',startedAt:new Date().toISOString(),mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',checks:[],entities:{}};

function record(name,ok,detail='',meta={}){report.checks.push({name,ok,detail,...meta});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function message(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function requireOk(r,name){if(!record(name,r.ok,r.ok?`HTTP ${r.status}`:message(r),{status:r.status,path:r.path}))throw new Error(`${name}: ${message(r)}`);return r.data}
async function saveReport(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`inventory-runtime-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee Inventory Functional QA — v9.7.0');
console.log('=========================================');
console.log(`Modo: ${writeMode?'WRITE E2E (operaciones QA con balance neto controlado)':'READ-ONLY PREFLIGHT'}\n`);

try{
  await requireOk(await request('/health'),'API health');
  await requireOk(await request('/ready'),'API + PostgreSQL ready');
  const login=await requireOk(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');record('Token JWT recibido',true);

  const [balancesData,movementsData,operationsData,warehousesData]=await Promise.all([
    requireOk(await request('/inventory/balances',{token}),'Inventario / existencias'),
    requireOk(await request('/inventory/movements',{token}),'Kardex / movimientos'),
    requireOk(await request('/inventory-operations',{token}),'Operaciones de inventario'),
    requireOk(await request('/warehouses',{token}),'Catálogo de almacenes'),
  ]);

  record('Resumen de inventario disponible',Boolean(balancesData.summary),`${balancesData.summary?.records||0} balances`);
  record('Kardex disponible',Array.isArray(movementsData.movements),`${movementsData.movements?.length||0} movimientos`);
  record('Ajustes disponibles',Array.isArray(operationsData.adjustments),`${operationsData.adjustments?.length||0} ajustes`);
  record('Transferencias disponibles',Array.isArray(operationsData.transfers),`${operationsData.transfers?.length||0} transferencias`);

  const products=operationsData.products||[],warehouses=operationsData.warehouses||[],branches=warehousesData.branches||[];
  const source=warehouses[0],product=products[0];
  record('Producto activo disponible',Boolean(product),product?`${product.sku} · ${product.name}`:'Sin producto');
  record('Almacén origen disponible',Boolean(source),source?.name||'Sin almacén');
  if(!product||!source)throw new Error('Faltan producto o almacén para ejecutar QA de inventario.');

  if(!writeMode){
    console.log('\nPreflight completado. Para ejecutar ajustes + transferencia + validación de Kardex:');
    console.log('PowerShell:  $env:INVENTORY_QA_WRITE="1"; npm run qa:inventory');
    console.log('La prueba intenta dejar el stock neto igual al inicial y no elimina registros.');
    await saveReport();process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const stamp=Date.now(),key=`QA-INV-${stamp}`;
  const initialSource=(balancesData.balances||[]).find(b=>b.warehouseId===source.id&&b.productId===product.id);
  const sourceBefore=Number(initialSource?.quantity||0);
  const sourceCost=Number(initialSource?.averageCost||product.cost||1)||1;
  report.entities.qaKey=key;report.entities.source={id:source.id,name:source.name,before:sourceBefore};report.entities.product={id:product.id,sku:product.sku,name:product.name};

  let destination=warehouses.find(w=>w.id!==source.id);
  if(!destination){
    const branch=branches.find(b=>b.id===source.branchId)||branches[0];
    if(!branch)throw new Error('No existe sucursal para crear almacén QA secundario.');
    const created=await requireOk(await request('/warehouses',{method:'POST',token,body:{branchId:branch.id,name:`Almacén QA ${String(stamp).slice(-6)}`,code:`QA${String(stamp).slice(-8)}`.slice(0,20),active:true}}),'Crear almacén QA secundario');
    destination=created.warehouse;record('Almacén QA secundario creado',true,destination.name);
  }else record('Almacén destino existente reutilizado',true,destination.name);
  report.entities.destination={id:destination.id,name:destination.name};
  const initialDest=(balancesData.balances||[]).find(b=>b.warehouseId===destination.id&&b.productId===product.id);
  const destBefore=Number(initialDest?.quantity||0);report.entities.destination.before=destBefore;

  const invalidOut=await request('/inventory-operations/adjustments',{method:'POST',token,body:{warehouseId:source.id,reason:`${key} · negative stock guard`,items:[{productId:product.id,direction:'OUT',quantity:sourceBefore+1000000,unitCost:sourceCost,notes:key}]}});
  record('Ajuste OUT no permite stock negativo',!invalidOut.ok&&[400,409].includes(invalidOut.status),invalidOut.ok?'La API permitió stock negativo':`HTTP ${invalidOut.status}`);
  if(invalidOut.ok)throw new Error('La API permitió un ajuste que deja stock negativo.');

  const adjInData=await requireOk(await request('/inventory-operations/adjustments',{method:'POST',token,body:{warehouseId:source.id,reason:`${key} · ajuste entrada`,notes:'QA funcional inventario v9.7.0',items:[{productId:product.id,direction:'IN',quantity:2,unitCost:sourceCost,notes:key}]}}),'Registrar ajuste de entrada');
  const adjIn=adjInData.adjustment;report.entities.adjustmentIn={id:adjIn.id,folio:adjIn.folio};

  let balances=await requireOk(await request('/inventory/balances',{token}),'Validar balance tras ajuste IN');
  let sourceRow=(balances.balances||[]).find(b=>b.warehouseId===source.id&&b.productId===product.id);
  record('Ajuste IN incrementa existencias',Math.abs(Number(sourceRow?.quantity||0)-(sourceBefore+2))<0.000001,`${sourceBefore} → ${Number(sourceRow?.quantity||0)}`);

  const sameWarehouse=await request('/inventory-operations/transfers',{method:'POST',token,body:{fromWarehouseId:source.id,toWarehouseId:source.id,notes:key,items:[{productId:product.id,quantity:1,notes:key}]}});
  record('Transferencia al mismo almacén bloqueada',!sameWarehouse.ok&&[400,409].includes(sameWarehouse.status),sameWarehouse.ok?'La API permitió origen=destino':`HTTP ${sameWarehouse.status}`);
  if(sameWarehouse.ok)throw new Error('La API permitió transferencia al mismo almacén.');

  const transferData=await requireOk(await request('/inventory-operations/transfers',{method:'POST',token,body:{fromWarehouseId:source.id,toWarehouseId:destination.id,notes:`${key} · transferencia`,items:[{productId:product.id,quantity:1,notes:key}]}}),'Registrar transferencia');
  const transfer=transferData.transfer;report.entities.transfer={id:transfer.id,folio:transfer.folio};

  balances=await requireOk(await request('/inventory/balances',{token}),'Validar balances tras transferencia');
  sourceRow=(balances.balances||[]).find(b=>b.warehouseId===source.id&&b.productId===product.id);
  let destRow=(balances.balances||[]).find(b=>b.warehouseId===destination.id&&b.productId===product.id);
  record('Transferencia descuenta origen',Math.abs(Number(sourceRow?.quantity||0)-(sourceBefore+1))<0.000001,String(sourceRow?.quantity??'—'));
  record('Transferencia incrementa destino',Math.abs(Number(destRow?.quantity||0)-(destBefore+1))<0.000001,`${destBefore} → ${Number(destRow?.quantity||0)}`);

  let moves=await requireOk(await request('/inventory/movements',{token}),'Validar Kardex de transferencia');
  const transferOut=(moves.movements||[]).find(m=>m.reference===transfer.folio&&m.type==='TRANSFER_OUT');
  const transferIn=(moves.movements||[]).find(m=>m.reference===transfer.folio&&m.type==='TRANSFER_IN');
  record('Kardex TRANSFER_OUT creado',Boolean(transferOut),transferOut?transferOut.reference:'No encontrado');
  record('Kardex TRANSFER_IN creado',Boolean(transferIn),transferIn?transferIn.reference:'No encontrado');
  if(!transferOut||!transferIn)throw new Error('La transferencia no generó ambos lados del Kardex.');

  const adjSourceOutData=await requireOk(await request('/inventory-operations/adjustments',{method:'POST',token,body:{warehouseId:source.id,reason:`${key} · compensación origen`,items:[{productId:product.id,direction:'OUT',quantity:1,unitCost:sourceCost,notes:key}]}}),'Compensar origen');
  const adjDestOutData=await requireOk(await request('/inventory-operations/adjustments',{method:'POST',token,body:{warehouseId:destination.id,reason:`${key} · compensación destino`,items:[{productId:product.id,direction:'OUT',quantity:1,unitCost:sourceCost,notes:key}]}}),'Compensar destino');

  balances=await requireOk(await request('/inventory/balances',{token}),'Validar balance neto final');
  sourceRow=(balances.balances||[]).find(b=>b.warehouseId===source.id&&b.productId===product.id);
  destRow=(balances.balances||[]).find(b=>b.warehouseId===destination.id&&b.productId===product.id);
  const sourceFinal=Number(sourceRow?.quantity||0),destFinal=Number(destRow?.quantity||0);
  record('Stock origen vuelve al valor inicial',Math.abs(sourceFinal-sourceBefore)<0.000001,`${sourceBefore} → ${sourceFinal}`);
  record('Stock destino vuelve al valor inicial',Math.abs(destFinal-destBefore)<0.000001,`${destBefore} → ${destFinal}`);

  moves=await requireOk(await request('/inventory/movements',{token}),'Validar Kardex final');
  const adjInMove=(moves.movements||[]).find(m=>m.reference===adjIn.folio&&m.type==='ADJUSTMENT_IN');
  const adjOutSource=(moves.movements||[]).find(m=>m.reference===adjSourceOutData.adjustment.folio&&m.type==='ADJUSTMENT_OUT');
  const adjOutDest=(moves.movements||[]).find(m=>m.reference===adjDestOutData.adjustment.folio&&m.type==='ADJUSTMENT_OUT');
  record('Kardex ADJUSTMENT_IN creado',Boolean(adjInMove),adjInMove?.reference||'No encontrado');
  record('Kardex ADJUSTMENT_OUT origen creado',Boolean(adjOutSource),adjOutSource?.reference||'No encontrado');
  record('Kardex ADJUSTMENT_OUT destino creado',Boolean(adjOutDest),adjOutDest?.reference||'No encontrado');

  const operationsFinal=await requireOk(await request('/inventory-operations',{token}),'Validar historial de operaciones');
  record('Transferencia visible en historial',Boolean((operationsFinal.transfers||[]).find(x=>x.id===transfer.id)),transfer.folio);
  record('Ajuste visible en historial',Boolean((operationsFinal.adjustments||[]).find(x=>x.id===adjIn.id)),adjIn.folio);

  console.log('\nResultado: Inventory E2E PASS con stock neto restaurado.');
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await saveReport()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
