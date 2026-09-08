import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const schema=read('apps/api/prisma/schema.prisma');
const service=read('apps/api/src/services/hrClient.js');
const route=read('apps/api/src/routes/hrClient.js');
const page=read('apps/web/src/pages/HrClientCenter.jsx');

const employeeBlock=schema.match(/model Employee \{[\s\S]*?\n\}/)?.[0]||'';

const checks=[
 ['No duplicate Employee leaveRequests', (employeeBlock.match(/leaveRequests/g)||[]).length===1],
 ['Canonical attendance relation remains',employeeBlock.includes('attendanceRecords AttendanceRecord[]')],
 ['Canonical leave relation remains',employeeBlock.includes('leaveRequests LeaveRequest[]')],
 ['No HrAttendance model',!schema.includes('model HrAttendance {')],
 ['No HrLeaveRequest model',!schema.includes('model HrLeaveRequest {')],
 ['Service uses attendanceRecord',service.includes('prisma.attendanceRecord')],
 ['Service uses leaveRequest',service.includes('prisma.leaveRequest')],
 ['Service uses employeeNumber',service.includes('employeeNumber')],
 ['Service uses Employee.status',service.includes("status:'ACTIVE'")],
 ['Leave uses createdAt',service.includes('at:x.createdAt')],
 ['Leave resolution uses canonical field',service.includes('resolution:notes||null')],
 ['Route reuses employees.read',route.includes("requirePermission('employees.read')")],
 ['Route reuses attendance.manage',route.includes("requirePermission('attendance.manage')")],
 ['Route reuses leave_requests.manage',route.includes("requirePermission('leave_requests.manage')")],
 ['Attendance enum matches schema',route.includes("['PRESENT','ABSENT','LATE','REMOTE','DAY_OFF']")],
 ['Frontend uses employeeNumber',page.includes('employee.employeeNumber')],
 ['Frontend uses Employee.status',page.includes("employee.status==='ACTIVE'")],
 ['Frontend uses DAY_OFF',page.includes('value="DAY_OFF"')]
];

let failed=0;
console.log('\nHR Schema Hotfix Audit — v7.8.1');
console.log('=================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
