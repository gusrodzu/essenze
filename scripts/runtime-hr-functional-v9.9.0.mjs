
import fs from 'node:fs';
import path from 'node:path';

const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.HR_QA_EMAIL||'admin@erp.local';
const password=process.env.HR_QA_PASSWORD||'Admin123!';
const writeMode=['1','true','yes'].includes(String(process.env.HR_QA_WRITE||'').toLowerCase());

const report={version:'9.9.0',startedAt:new Date().toISOString(),mode:writeMode?'WRITE_E2E':'READ_ONLY_PREFLIGHT',checks:[],entities:{}};

function rec(name,ok,detail=''){report.checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);return ok}
function msg(r){return r?.data?.message||r?.data?.error||r?.error||`HTTP ${r?.status??'-'}`}
async function request(route,{method='GET',token,body}={}){try{const response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch{}return{ok:response.ok,status:response.status,data,path:route}}catch(error){return{ok:false,status:null,error:error.message,path:route}}}
async function ok(r,name){if(!rec(name,r.ok,r.ok?`HTTP ${r.status}`:msg(r)))throw new Error(`${name}: ${msg(r)}`);return r.data}
async function save(){report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.ok).length;report.failed=report.checks.filter(x=>!x.ok).length;const dir=path.resolve('artifacts','qa');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`hr-runtime-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(`\nReporte JSON: ${file}`)}

console.log('\nBuzzBee HR Functional QA — v9.9.0');
console.log('==================================');
console.log(`Modo: ${writeMode?'WRITE E2E':'READ-ONLY PREFLIGHT'}\n`);

try{
  await ok(await request('/health'),'API health');
  await ok(await request('/ready'),'API + PostgreSQL ready');
  const login=await ok(await request('/auth/login',{method:'POST',body:{email,password}}),'Autenticación QA');
  const token=login?.token;if(!token)throw new Error('Login sin token.');

  const [hr,ops,docs,payroll,client,preview,reports]=await Promise.all([
    ok(await request('/human-resources',{token}),'Recursos Humanos'),
    ok(await request('/hr-operations',{token}),'Operación RRHH'),
    ok(await request('/employee-documents',{token}),'Expedientes/documentos'),
    ok(await request('/payroll',{token}),'Nómina'),
    ok(await request('/hr-client/dashboard',{token}),'HR Client dashboard'),
    ok(await request('/hr-client/payroll-preview',{token}),'Payroll preview'),
    ok(await request('/reports/executive',{token}),'Reportes ejecutivos'),
  ]);

  const active=(hr.employees||[]).filter(e=>e.status==='ACTIVE');
  rec('Empleados activos disponibles',active.length>0,`${active.length} activo(s)`);
  rec('Departamentos disponibles',Array.isArray(hr.departments),`${hr.departments?.length||0}`);
  rec('Puestos disponibles',Array.isArray(hr.positions),`${hr.positions?.length||0}`);
  rec('Asistencia disponible',Array.isArray(ops.attendance),`${ops.attendance?.length||0}`);
  rec('Permisos disponibles',Array.isArray(ops.leaves),`${ops.leaves?.length||0}`);
  rec('Incidencias disponibles',Array.isArray(ops.incidents),`${ops.incidents?.length||0}`);
  rec('Documentos disponibles',Array.isArray(docs.documents),`${docs.documents?.length||0}`);
  rec('Payroll preview responde',Boolean(preview),'OK');
  rec('Reportes incluyen plantilla',Number(reports.summary?.activeEmployees||0)===active.length,`${reports.summary?.activeEmployees||0} / ${active.length}`);

  if(!writeMode){
    console.log('\nPara ejecutar el flujo funcional completo:');
    console.log('PowerShell: $env:HR_QA_WRITE="1"; npm run qa:hr');
    console.log('La prueba crea registros QA y cancela la nómina al finalizar. No elimina información.');
    await save();process.exit(report.checks.some(x=>!x.ok)?1:0);
  }

  const employee=active[0];
  if(!employee)throw new Error('No hay empleado activo para QA.');
  const stamp=Date.now();
  const key=`QA-HR-${stamp}`;
  const testDate='2001-01-15';
  const periodStart='2001-01-01';
  const periodEnd='2001-01-15';
  const paymentDate='2001-01-16';
  report.entities.employee={id:employee.id,employeeNumber:employee.employeeNumber,name:`${employee.firstName} ${employee.lastName}`};

  // Attendance upsert on isolated historical date.
  const attendance=await ok(await request('/hr-operations/attendance',{
    method:'POST',token,body:{
      employeeId:employee.id,date:testDate,status:'PRESENT',
      checkIn:'2001-01-15T09:00:00.000Z',checkOut:'2001-01-15T18:00:00.000Z',notes:key
    }
  }),'Registrar asistencia QA');
  report.entities.attendance={id:attendance.record?.id};
  rec('Asistencia queda PRESENT',attendance.record?.status==='PRESENT',attendance.record?.status||'—');

  // Leave lifecycle.
  const leaveData=await ok(await request('/hr-operations/leaves',{
    method:'POST',token,body:{
      employeeId:employee.id,type:'PERSONAL',startDate:'2001-02-01',endDate:'2001-02-01',days:1,reason:key
    }
  }),'Crear permiso QA');
  const leave=leaveData.leave;report.entities.leave={id:leave.id};
  rec('Permiso inicia PENDING',leave.status==='PENDING',leave.status);

  const leaveResolved=await ok(await request(`/hr-operations/leaves/${leave.id}/status`,{
    method:'PATCH',token,body:{status:'APPROVED',resolution:'QA HR v9.9.0'}
  }),'Aprobar permiso QA');
  rec('Permiso queda APPROVED',leaveResolved.leave?.status==='APPROVED',leaveResolved.leave?.status||'—');

  // Incident that must feed payroll.
  const incidentData=await ok(await request('/hr-operations/incidents',{
    method:'POST',token,body:{
      employeeId:employee.id,type:'BONUS',date:testDate,amount:123,description:'Bono QA nómina',notes:key
    }
  }),'Crear incidencia BONUS');
  const incident=incidentData.incident;report.entities.incident={id:incident.id};
  rec('Incidencia BONUS registrada',incident.type==='BONUS',incident.type);

  // Employee document metadata, no binary file required.
  const documentData=await ok(await request('/employee-documents',{
    method:'POST',token,body:{
      employeeId:employee.id,type:'OTHER',name:`Documento ${key}`,fileUrl:'',fileName:'',issuedAt:testDate,status:'VALID',notes:key
    }
  }),'Crear documento de expediente');
  const document=documentData.document;report.entities.document={id:document.id};
  rec('Documento asociado al empleado',document.employeeId===employee.id,document.employeeId);

  // Payroll period.
  const periodData=await ok(await request('/payroll',{
    method:'POST',token,body:{
      name:`Nómina ${key}`,startDate:periodStart,endDate:periodEnd,paymentDate,notes:key
    }
  }),'Crear periodo de nómina');
  const period=periodData.period;report.entities.payroll={id:period.id,folio:period.folio};
  rec('Nómina inicia DRAFT',period.status==='DRAFT',period.status);

  await ok(await request(`/payroll/${period.id}/calculate`,{method:'POST',token,body:{}}),'Calcular nómina');

  let payrollState=await ok(await request('/payroll',{token}),'Releer nómina calculada');
  let calculated=(payrollState.periods||[]).find(p=>p.id===period.id);
  rec('Nómina queda CALCULATED',calculated?.status==='CALCULATED',calculated?.status||'—');
  const employeeItem=calculated?.items?.find(i=>i.employeeId===employee.id);
  rec('Empleado aparece en nómina',Boolean(employeeItem),employeeItem?`${employee.firstName} ${employee.lastName}`:'No encontrado');
  rec('Incidencia BONUS impacta nómina',Number(employeeItem?.bonuses||0)>=123,String(employeeItem?.bonuses??'—'));

  const invalidPaid=await request(`/payroll/${period.id}/status`,{method:'PATCH',token,body:{status:'PAID'}});
  rec('Pago antes de aprobación bloqueado',!invalidPaid.ok&&invalidPaid.status===409,invalidPaid.ok?'Permitido incorrectamente':`HTTP ${invalidPaid.status}`);

  const approved=await ok(await request(`/payroll/${period.id}/status`,{method:'PATCH',token,body:{status:'APPROVED'}}),'Aprobar nómina');
  rec('Nómina queda APPROVED',approved.period?.status==='APPROVED',approved.period?.status||'—');

  // Do not mark paid in QA; cancel to avoid contaminating financial reports.
  const cancelled=await ok(await request(`/payroll/${period.id}/status`,{method:'PATCH',token,body:{status:'CANCELLED'}}),'Cancelar nómina QA');
  rec('Nómina QA queda CANCELLED',cancelled.period?.status==='CANCELLED',cancelled.period?.status||'—');

  // Re-read operations and documents.
  const [opsFinal,docsFinal,payrollFinal]=await Promise.all([
    ok(await request('/hr-operations',{token}),'Validar operación RRHH final'),
    ok(await request('/employee-documents',{token}),'Validar expediente final'),
    ok(await request('/payroll',{token}),'Validar nómina final'),
  ]);
  rec('Asistencia visible en historial',Boolean((opsFinal.attendance||[]).find(x=>x.id===attendance.record?.id)),attendance.record?.id||'—');
  rec('Permiso visible en historial',Boolean((opsFinal.leaves||[]).find(x=>x.id===leave.id)),leave.id);
  rec('Incidencia visible en historial',Boolean((opsFinal.incidents||[]).find(x=>x.id===incident.id)),incident.id);
  rec('Documento visible en expediente',Boolean((docsFinal.documents||[]).find(x=>x.id===document.id)),document.id);
  rec('Periodo QA visible y cancelado',Boolean((payrollFinal.periods||[]).find(x=>x.id===period.id&&x.status==='CANCELLED')),period.folio);

  console.log('\nResultado: HR E2E PASS.');
}catch(error){console.error(`\nERROR QA: ${error.message}`);report.runtimeError=error.message}finally{await save()}
if(report.runtimeError||report.checks.some(x=>!x.ok))process.exit(1);
