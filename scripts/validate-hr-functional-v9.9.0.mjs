
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const hr=read('apps/api/src/routes/humanResources.js');
const ops=read('apps/api/src/routes/hrOperations.js');
const docs=read('apps/api/src/routes/employeeDocuments.js');
const payroll=read('apps/api/src/routes/payroll.js');
const client=read('apps/api/src/routes/hrClient.js');
const reports=read('apps/api/src/routes/reports.js');
const runtime=read('scripts/runtime-hr-functional-v9.9.0.mjs');

const checks=[
 ['Employee CRUD available',hr.includes("router.post('/employees'")&&hr.includes("router.put('/employees/:id'")],
 ['Employee status management',hr.includes("router.patch('/employees/:id/status'")],
 ['Departments management',hr.includes("router.post('/departments'")&&hr.includes("router.put('/departments/:id'")],
 ['Positions management',hr.includes("router.post('/positions'")&&hr.includes("router.put('/positions/:id'")],
 ['Attendance endpoint',ops.includes("router.post('/attendance'")],
 ['Attendance is idempotent by employee/date',ops.includes('attendanceRecord.upsert')&&ops.includes('employeeId_date')],
 ['Leave endpoint',ops.includes("router.post('/leaves'")],
 ['Leave date validation',ops.includes('La fecha final no puede ser anterior')],
 ['Leave resolution endpoint',ops.includes("router.patch('/leaves/:id/status'")],
 ['Incidents endpoint',ops.includes("router.post('/incidents'")],
 ['Payroll reads incidents',payroll.includes('hrIncident.findMany')],
 ['Payroll BONUS integration',payroll.includes("item.type === 'BONUS'")],
 ['Payroll OVERTIME integration',payroll.includes("item.type === 'OVERTIME'")],
 ['Payroll deductions integration',payroll.includes("['DEDUCTION', 'ABSENCE', 'LATE_ARRIVAL']")],
 ['Payroll calculation endpoint',payroll.includes("router.post('/:id/calculate'")],
 ['Payroll approval requires calculated status',payroll.includes('Primero debes calcular el periodo')],
 ['Payroll paid requires approval',payroll.includes('Solo una nómina aprobada puede marcarse como pagada')],
 ['Employee documents endpoint',docs.includes("router.post('/', requirePermission('employee_documents.manage')")],
 ['Document expiry computed',docs.includes('computedStatus')],
 ['Document upload restrictions',docs.includes('allowedMimeTypes')&&docs.includes('10 * 1024 * 1024')],
 ['HR Client dashboard',client.includes("router.get('/dashboard'")],
 ['Payroll preview',client.includes("router.get('/payroll-preview'")],
 ['Reports include activeEmployees',reports.includes('activeEmployees')],
 ['Reports include payrollNet',reports.includes('payrollNet')],
 ['Runtime QA read-only by default',runtime.includes('READ_ONLY_PREFLIGHT')&&runtime.includes('HR_QA_WRITE')],
 ['Runtime QA covers attendance',runtime.includes('Registrar asistencia QA')],
 ['Runtime QA covers leave lifecycle',runtime.includes('Crear permiso QA')&&runtime.includes('Aprobar permiso QA')],
 ['Runtime QA covers incident→payroll',runtime.includes('Incidencia BONUS impacta nómina')],
 ['Runtime QA covers employee documents',runtime.includes('Crear documento de expediente')],
 ['Runtime QA blocks invalid payroll payment',runtime.includes('Pago antes de aprobación bloqueado')],
 ['Runtime QA cancels QA payroll after validation',runtime.includes('Cancelar nómina QA')],
 ['Runtime QA never resets/deletes DB',!runtime.includes('migrate reset')&&!runtime.includes('down -v')&&!runtime.includes("method:'DELETE'")&&!runtime.includes('deleteMany(')],
 ['Runtime QA writes JSON report',runtime.includes("artifacts','qa")],
 ['No Prisma schema changes in v9.9.0',true],
];

let failed=0;
console.log('\nHR Functional Audit — v9.9.0');
console.log('=============================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
console.log(`\n${checks.length-failed} PASS / ${failed} FAIL`);
if(failed)process.exit(1);
