# BuzzBee ERP v7.8.1 — HR Schema Hotfix

Corrige el error P1012 de v7.8.0:

`Field "leaveRequests" is already defined on model "Employee"`.

## Causa
El ERP ya tenía modelos funcionales:
- `AttendanceRecord`
- `LeaveRequest`
- `HrIncident`

v7.8.0 agregó por error modelos paralelos `HrAttendance` y `HrLeaveRequest`.

## Corrección
v7.8.1 elimina esa duplicación y reutiliza el Core de RRHH existente.

También alinea:
- `employeeNumber` en lugar de `code`
- `Employee.status` en lugar de `active`
- `AttendanceStatus` existente
- `LeaveRequest.createdAt`
- `LeaveRequest.resolution`
- permisos existentes de RRHH

## Base de datos
No requiere nuevos modelos ni cambios de schema funcionales.
La corrección restaura el schema previo y usa tablas existentes.

## Instalación
```powershell
npm install
npm run db:generate
npm run hr:hotfix:audit
npm run dev
```

No ejecutar `prisma migrate reset` ni borrar volúmenes.
