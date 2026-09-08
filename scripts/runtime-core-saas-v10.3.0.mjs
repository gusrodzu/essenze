
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.CORE_QA_EMAIL||'admin@erp.local';
const password=process.env.CORE_QA_PASSWORD||'Admin123!';
const report={version:'10.3.0',startedAt:new Date().toISOString(),mode:'READ_ONLY',checks:[]};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body,headers={}}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...headers},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,headers:response.headers,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`core-saas-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee Core SaaS Hardening QA — v10.3.0');
console.log('=========================================');

try{
  const customRequestId=`qa-core-${Date.now()}`;
  const healthReq=await request('/health',{headers:{'x-request-id':customRequestId}});
  await ok(healthReq,'API health');
  rec('Request ID propagado',healthReq.headers?.get('x-request-id')===customRequestId,healthReq.headers?.get('x-request-id')||'—');
  const apiVersion=healthReq.data?.version;
  rec('API reporta versión',Boolean(apiVersion),apiVersion||'—');

  const ready=await ok(await request('/ready'),'API + PostgreSQL ready');
  rec('Ready usa misma versión',Boolean(apiVersion)&&ready.version===apiVersion,ready.version||'—');

  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [modules,billing,usage,status,integrations,ai]=await Promise.all([
    ok(await request('/modules/dashboard',{token}),'Modules dashboard'),
    ok(await request('/billing/dashboard',{token}),'Billing dashboard'),
    ok(await request('/modules/usage',{token}),'Usage & limits'),
    ok(await request('/modules/saas-status',{token}),'SaaS status'),
    ok(await request('/integrations/dashboard',{token}),'Integration Hub'),
    ok(await request('/ai/context',{token}),'AI context'),
  ]);

  rec('Usage devuelve periodo',Boolean(usage.period?.start&&usage.period?.end),'OK');
  rec('Usage devuelve métricas',Array.isArray(usage.metrics),`${usage.metrics?.length||0}`);
  rec('SaaS status devuelve plataforma',Boolean(status.platform),'OK');
  rec('SaaS status módulos consistentes',Number(status.platform?.enabledModules||0)>=0,String(status.platform?.enabledModules||0));
  rec('Integraciones expone API keys activas',Number(integrations.summary?.activeKeys||0)>=0,String(integrations.summary?.activeKeys||0));
  rec('Integraciones expone DLQ',Number(integrations.summary?.deadLetters||0)>=0,String(integrations.summary?.deadLetters||0));
  rec('AI permanece READ_ONLY',ai.mode==='READ_ONLY',ai.mode||'—');

  const unauth=await request('/modules/dashboard');
  rec('Endpoint tenant sin token bloqueado',unauth.status===401,`HTTP ${unauth.status}`);
  rec('Error auth incluye requestId',Boolean(unauth.data?.requestId),unauth.data?.requestId||'—');

  const publicNoKey=await request('/public/v1/customers');
  rec('Public API sin key bloqueada',publicNoKey.status===401,`HTTP ${publicNoKey.status}`);
  rec('Public API auth incluye requestId',Boolean(publicNoKey.data?.requestId),publicNoKey.data?.requestId||'—');

}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
