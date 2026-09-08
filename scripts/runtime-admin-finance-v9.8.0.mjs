
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.ADMIN_QA_EMAIL||'admin@erp.local';
const password=process.env.ADMIN_QA_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.ADMIN_QA_WRITE||'').toLowerCase());
const report={version:'9.8.0',startedAt:new Date().toISOString(),mode:writeMode?'WRITE_SAFE':'READ_ONLY_PREFLIGHT',checks:[]};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`admin-finance-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee Administration & Finance QA — v9.8.0');
console.log('==============================================');
console.log(`Modo: ${writeMode?'WRITE SAFE':'READ-ONLY PREFLIGHT'}\n`);

try{
  await ok(await request('/health'),'API health');
  await ok(await request('/ready'),'API + PostgreSQL ready');
  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [ap,ar,treasury,expenses,budgets,assets,admin,reports,collections]=await Promise.all([
    ok(await request('/accounts-payable',{token}),'Cuentas por pagar'),
    ok(await request('/accounts-receivable',{token}),'Cuentas por cobrar'),
    ok(await request('/treasury',{token}),'Tesorería'),
    ok(await request('/expenses/dashboard',{token}),'Gastos'),
    ok(await request('/budgets',{token}),'Presupuestos'),
    ok(await request('/fixed-assets/dashboard',{token}),'Activos fijos'),
    ok(await request('/administration/dashboard',{token}),'Centro Administrativo'),
    ok(await request('/reports/executive',{token}),'Reportes ejecutivos'),
    ok(await request('/collections',{token}),'Cobranza'),
  ]);

  const eps=.02;
  rec('Centro Admin = saldo CxP',Math.abs(Number(admin.summary?.payableBalance||0)-Number(ap.metrics?.balance||0))<eps,`${admin.summary?.payableBalance||0} / ${ap.metrics?.balance||0}`);
  rec('Centro Admin = saldo CxC',Math.abs(Number(admin.summary?.receivableBalance||0)-Number(ar.metrics?.balance||0))<eps,`${admin.summary?.receivableBalance||0} / ${ar.metrics?.balance||0}`);
  rec('Centro Admin = saldo Tesorería',Math.abs(Number(admin.summary?.treasuryBalance||0)-Number(treasury.stats?.totalBalance||0))<eps,`${admin.summary?.treasuryBalance||0} / ${treasury.stats?.totalBalance||0}`);
  rec('Centro Admin = valor neto Activos',Math.abs(Number(admin.summary?.assetNet||0)-Number(assets.summary?.bookValue||0))<eps,`${admin.summary?.assetNet||0} / ${assets.summary?.bookValue||0}`);
  rec('Presupuestos exponen variación',budgets.summary&&'variance' in budgets.summary,String(budgets.summary?.variance??'—'));
  rec('Gastos exponen resumen',Boolean(expenses.summary),`${expenses.expenses?.length||0} registros`);
  rec('Cobranza expone saldos',Boolean(collections.stats),`${collections.stats?.openInvoices||0} facturas abiertas`);
  rec('Reporte ejecutivo disponible',Boolean(reports.summary),'summary OK');

  if(writeMode){
    const account=(treasury.accounts||[]).find(a=>a.active);
    if(!account)throw new Error('No hay cuenta activa de tesorería para QA seguro.');
    const before=Number(account.currentBalance);
    const amount=1;
    const key=`QA-ADM-${Date.now()}`;
    await ok(await request('/treasury/movements',{method:'POST',token,body:{accountId:account.id,type:'INCOME',movementDate:new Date().toISOString(),amount,concept:`${key} entrada`,category:'QA',reference:key,notes:'QA compensable'}}),'Tesorería ingreso QA');
    await ok(await request('/treasury/movements',{method:'POST',token,body:{accountId:account.id,type:'EXPENSE',movementDate:new Date().toISOString(),amount,concept:`${key} salida`,category:'QA',reference:key,notes:'QA compensable'}}),'Tesorería salida compensatoria');
    const after=await ok(await request('/treasury',{token}),'Validar Tesorería final');
    const accountAfter=(after.accounts||[]).find(a=>a.id===account.id);
    rec('Tesorería vuelve al saldo inicial',Math.abs(Number(accountAfter?.currentBalance||0)-before)<eps,`${before} → ${accountAfter?.currentBalance}`);
  }else{
    console.log('\nPara la prueba segura de tesorería:');
    console.log('PowerShell: $env:ADMIN_QA_WRITE="1"; npm run qa:admin-finance');
  }
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
