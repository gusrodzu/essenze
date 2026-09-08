
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.INTEL_QA_EMAIL||'admin@erp.local';
const password=process.env.INTEL_QA_PASSWORD||'Admin123!';
const scanMode=['1','true','yes'].includes(String(process.env.INTEL_QA_SCAN||'').toLowerCase());
const report={version:'10.2.0',startedAt:new Date().toISOString(),mode:scanMode?'SCAN_SAFE':'READ_ONLY_PREFLIGHT',checks:[]};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`intelligence-ai-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee Reports + Intelligence + AI QA — v10.2.0');
console.log('================================================');
console.log(`Modo: ${scanMode?'SCAN SAFE':'READ-ONLY PREFLIGHT'}\n`);

try{
  await ok(await request('/health'),'API health');
  await ok(await request('/ready'),'API + PostgreSQL ready');
  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [reports,intel,history,metrics,aiContext,pos,admin,hr]=await Promise.all([
    ok(await request('/reports/executive',{token}),'Reporte ejecutivo'),
    ok(await request('/intelligence/dashboard',{token}),'Intelligence dashboard'),
    ok(await request('/intelligence/history',{token}),'Histórico Intelligence'),
    ok(await request('/intelligence/metrics',{token}),'Catálogo de métricas'),
    ok(await request('/ai/context',{token}),'BuzzBee AI context'),
    ok(await request('/pos/dashboard',{token}),'POS dashboard'),
    ok(await request('/administration/dashboard',{token}),'Centro Administrativo'),
    ok(await request('/human-resources',{token}),'Recursos Humanos'),
  ]);

  const values=intel.metrics?.values||{};
  rec('Intelligence incluye moneda empresa',Boolean(intel.company?.currency),intel.company?.currency||'—');
  rec('Business Health Score 0-100',Number(values['intelligence.health_score'])>=0&&Number(values['intelligence.health_score'])<=100,String(values['intelligence.health_score']??'—'));
  rec('Intelligence incluye ventas 30d',typeof values['sales.revenue_30d']==='number',String(values['sales.revenue_30d']??'—'));
  rec('Intelligence incluye inventario',typeof values['inventory.value']==='number',String(values['inventory.value']??'—'));
  rec('Intelligence incluye CxC',typeof values['receivables.balance']==='number',String(values['receivables.balance']??'—'));
  rec('Intelligence incluye CxP',typeof values['payables.balance']==='number',String(values['payables.balance']??'—'));
  rec('Catálogo de métricas disponible',Array.isArray(metrics.metrics)&&metrics.metrics.length>0,`${metrics.metrics?.length||0}`);
  rec('Histórico/forecast disponible',Boolean(history.series&&history.forecasts),'OK');
  rec('Reporte ejecutivo incluye empleados',Number(reports.summary?.activeEmployees||0)===(hr.employees||[]).filter(e=>e.status==='ACTIVE').length,`${reports.summary?.activeEmployees||0}`);
  rec('Reporte ejecutivo incluye inventario',typeof reports.summary?.inventoryValue==='number',String(reports.summary?.inventoryValue??'—'));
  rec('Centro Admin e Intelligence CxC consistentes',Math.abs(Number(admin.summary?.receivableBalance||0)-Number(values['receivables.balance']||0))<.02,`${admin.summary?.receivableBalance||0} / ${values['receivables.balance']||0}`);
  rec('Centro Admin e Intelligence CxP consistentes',Math.abs(Number(admin.summary?.payableBalance||0)-Number(values['payables.balance']||0))<.02,`${admin.summary?.payableBalance||0} / ${values['payables.balance']||0}`);
  rec('AI está en modo READ_ONLY',aiContext.mode==='READ_ONLY',aiContext.mode||'—');

  const aiExec=await ok(await request('/ai/ask',{method:'POST',token,body:{
    question:'Dame un resumen ejecutivo breve de la situación del negocio.',
    route:'/reportes',
    context:'executive'
  }}),'BuzzBee AI ejecutivo');
  rec('AI responde con fuentes',Array.isArray(aiExec.sources)&&aiExec.sources.length>0,`${aiExec.sources?.length||0} fuente(s)`);
  rec('AI mantiene READ_ONLY',aiExec.mode==='READ_ONLY',aiExec.mode||'—');

  const aiPos=await ok(await request('/ai/ask',{method:'POST',token,body:{
    question:'Resume el desempeño reciente del punto de venta.',
    route:'/pos'
  }}),'BuzzBee AI POS');
  rec('AI reconoce contexto POS',aiPos.context==='pos',aiPos.context||'—');
  rec('AI POS usa fuente POS',Boolean((aiPos.sources||[]).find(s=>s.name==='POS')),(aiPos.sources||[]).map(s=>s.name).join(', '));

  if(scanMode){
    const scan=await ok(await request('/intelligence/scan',{method:'POST',token,body:{}}),'Ejecutar Intelligence scan');
    rec('Scan devuelve métricas',Boolean(scan.metrics?.values),'OK');
    rec('Scan reporta insights detectados',Number.isFinite(Number(scan.detected)),String(scan.detected));
    const reread=await ok(await request('/intelligence/dashboard',{token}),'Releer Intelligence tras scan');
    rec('Snapshots/histórico siguen disponibles',Boolean(reread.history?.series),'OK');
  }else{
    console.log('\nPara probar el scan (crea/actualiza snapshots e insights, sin borrar datos):');
    console.log('PowerShell: $env:INTEL_QA_SCAN="1"; npm run qa:intelligence-ai');
  }
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
