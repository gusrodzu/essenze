import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const schema=read('apps/api/prisma/schema.prisma');
const service=read('apps/api/src/services/hrClient.js');
const route=read('apps/api/src/routes/hrClient.js');
const seed=read('apps/api/prisma/seed.js');
const app=read('apps/web/src/App.jsx');
const page=read('apps/web/src/pages/HrClientCenter.jsx');

const checks=[
 ['Attendance model',schema.includes('model HrAttendance {')],
 ['Leave model',schema.includes('model HrLeaveRequest {')],
 ['Company HR relations',schema.includes('hrAttendances HrAttendance[]')&&schema.includes('hrLeaveRequests HrLeaveRequest[]')],
 ['Employee HR relations',schema.includes('attendances HrAttendance[]')&&schema.includes('leaveRequests HrLeaveRequest[]')],
 ['HR dashboard service',service.includes('hrDashboard')],
 ['Attendance upsert',service.includes('hrAttendance.upsert')],
 ['Leave create',service.includes('hrLeaveRequest.create')],
 ['Leave resolve',service.includes('resolveLeaveRequest')],
 ['Prenómina preview',service.includes('payrollPreview')],
 ['Attendance event',service.includes("event:'hr.attendance.recorded'")],
 ['Leave requested event',service.includes("event:'hr.leave.requested'")],
 ['HR dashboard API',route.includes("router.get('/dashboard'")],
 ['Payroll preview API',route.includes("router.get('/payroll-preview'")],
 ['Attendance API',route.includes("router.post('/attendance'")],
 ['Leave API',route.includes("router.post('/leave-requests'")],
 ['Resolve API',route.includes("router.post('/leave-requests/:id/resolve'")],
 ['HR permissions seeded',seed.includes("['hr.read'")&&seed.includes("['hr.manage'")],
 ['Frontend RRHH route',app.includes('element={<HrClientCenter />}')],
 ['Shared KPI standard',page.includes('<KpiGrid>')&&page.includes('<KpiCard>')],
 ['Prenómina UI',page.includes('Vista previa del mes')],
 ['Attendance UI',page.includes('Registrar asistencia')],
 ['Leave approval UI',page.includes('Permisos pendientes')]
];

let failed=0;
console.log('\nHR Client Audit — v7.8.0');
console.log('==========================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
