
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.CRM_QA_EMAIL||'admin@erp.local';
const password=process.env.CRM_QA_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.CRM_QA_WRITE||'').toLowerCase());
const report={version:'10.0.0',startedAt:new Date().toISOString(),mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',checks:[],entities:{}};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`crm-parties-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee CRM & Business Party QA — v10.0.0');
console.log('==========================================');
console.log(`Modo: ${writeMode?'WRITE E2E':'READ-ONLY PREFLIGHT'}\n`);

try{
  await ok(await request('/health'),'API health');
  await ok(await request('/ready'),'API + PostgreSQL ready');
  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [customers,suppliers,parties,duplicates,crm,marketing]=await Promise.all([
    ok(await request('/customers',{token}),'Clientes'),
    ok(await request('/suppliers',{token}),'Proveedores'),
    ok(await request('/business-parties/dashboard',{token}),'Terceros / Business Party'),
    ok(await request('/business-parties/duplicates',{token}),'Centro de duplicados'),
    ok(await request('/sales-enterprise/prospects',{token}),'CRM / Prospectos'),
    ok(await request('/marketing/dashboard',{token}),'Marketing / Leads'),
  ]);

  rec('Cobertura clientes disponible',Number(parties.summary?.coverage?.customers??0)>=0,`${parties.summary?.coverage?.customers??0}%`);
  rec('Cobertura proveedores disponible',Number(parties.summary?.coverage?.suppliers??0)>=0,`${parties.summary?.coverage?.suppliers??0}%`);
  rec('Score de perfil disponible',typeof parties.summary?.averageProfileScore==='number',String(parties.summary?.averageProfileScore??'—'));
  rec('Duplicados evaluados',Array.isArray(duplicates.candidates),`${duplicates.total??0} candidato(s)`);
  rec('CRM prospectos disponible',Array.isArray(crm.prospects),`${crm.prospects?.length||0}`);
  rec('Marketing prospectos disponible',Array.isArray(marketing.prospects),`${marketing.prospects?.length||0}`);

  if(!writeMode){
    console.log('\nPara validar sincronización Cliente + Proveedor → Business Party:');
    console.log('PowerShell: $env:CRM_QA_WRITE="1"; npm run qa:crm-parties');
    await save();process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const stamp=Date.now();
  const code=`QA${String(stamp).slice(-8)}`;
  const taxId=`QAT${String(stamp).slice(-10)}`.slice(0,13).toUpperCase();
  const sharedEmail=`qa-${stamp}@example.com`;
  const name=`Empresa QA ${stamp}`;
  report.entities={code,taxId,email:sharedEmail};

  const customerData=await ok(await request('/customers',{
    method:'POST',token,body:{
      code:`C${code}`.slice(0,30),legalName:name,commercialName:name,taxId,
      contactName:'Contacto QA',email:sharedEmail,phone:'8180000000',
      address:'Monterrey, NL',creditDays:30,creditLimit:10000,active:true
    }
  }),'Crear cliente QA');
  const customer=customerData.customer;report.entities.customerId=customer.id;

  let partyDash=await ok(await request('/business-parties/dashboard',{token}),'Validar sync automático Cliente → Tercero');
  let party=(partyDash.parties||[]).find(p=>p.customerId===customer.id);
  rec('Cliente crea/vincula Business Party',Boolean(party),party?.displayName||'No encontrado');
  rec('Business Party tiene rol CUSTOMER',Boolean(party?.roles?.some(r=>r.role==='CUSTOMER'&&r.active!==false)),'CUSTOMER');

  const supplierData=await ok(await request('/suppliers',{
    method:'POST',token,body:{
      code:`P${code}`.slice(0,30),legalName:name,commercialName:name,taxId,
      contactName:'Contacto QA',email:sharedEmail,phone:'8180000000',
      address:'Monterrey, NL',paymentTerms:30,active:true
    }
  }),'Crear proveedor QA');
  const supplier=supplierData.supplier;report.entities.supplierId=supplier.id;

  partyDash=await ok(await request('/business-parties/dashboard',{token}),'Validar consolidación Cliente + Proveedor');
  party=(partyDash.parties||[]).find(p=>p.customerId===customer.id&&p.supplierId===supplier.id);
  rec('Cliente y proveedor convergen en un tercero',Boolean(party),party?.displayName||'No unificado');
  rec('Tercero conserva rol CUSTOMER',Boolean(party?.roles?.some(r=>r.role==='CUSTOMER'&&r.active!==false)),'CUSTOMER');
  rec('Tercero agrega rol SUPPLIER',Boolean(party?.roles?.some(r=>r.role==='SUPPLIER'&&r.active!==false)),'SUPPLIER');

  if(!party)throw new Error('No se consolidó Cliente + Proveedor en Business Party.');

  const detail=await ok(await request(`/business-parties/${party.id}`,{token}),'Detalle de tercero');
  rec('Contacto heredado disponible',Array.isArray(detail.party?.contacts)&&detail.party.contacts.length>0,`${detail.party?.contacts?.length||0}`);
  rec('Dirección heredada disponible',Array.isArray(detail.party?.addresses)&&detail.party.addresses.length>0,`${detail.party?.addresses?.length||0}`);
  rec('Vínculo operativo doble',detail.party?.customer?.id===customer.id&&detail.party?.supplier?.id===supplier.id,'Cliente + Proveedor');

  const contactData=await ok(await request(`/business-parties/${party.id}/contacts`,{
    method:'POST',token,body:{name:'Directora QA',jobTitle:'Directora General',department:'Dirección',email:`directora-${stamp}@example.com`,phone:'8181111111',mobile:'8182222222',primary:true,active:true}
  }),'Agregar contacto principal');
  report.entities.contactId=contactData.contact.id;

  const addressData=await ok(await request(`/business-parties/${party.id}/addresses`,{
    method:'POST',token,body:{type:'FISCAL',label:'Fiscal QA',street:'Av. QA 100',exterior:'100',interior:null,neighborhood:'Centro',city:'Monterrey',state:'Nuevo León',postalCode:'64000',country:'MX',primary:true,active:true}
  }),'Agregar dirección fiscal');
  report.entities.addressId=addressData.address.id;

  const detailFinal=await ok(await request(`/business-parties/${party.id}`,{token}),'Validar perfil unificado final');
  rec('Contacto principal único',detailFinal.party.contacts.filter(c=>c.primary&&c.active!==false).length===1,String(detailFinal.party.contacts.filter(c=>c.primary&&c.active!==false).length));
  rec('Dirección principal única',detailFinal.party.addresses.filter(a=>a.primary&&a.active!==false).length===1,String(detailFinal.party.addresses.filter(a=>a.primary&&a.active!==false).length));
  rec('Profile score calculado',typeof detailFinal.party.profile?.score==='number',String(detailFinal.party.profile?.score??'—'));

  console.log('\nResultado: CRM / Business Party E2E PASS.');
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
