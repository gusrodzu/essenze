# BuzzBee ERP v7.8.0 — HR Client v1

**Track:** 🔵🟢 ERP Cliente + BuzzBee SaaS reutilizable  
**Hito 4:** RRHH para demo comercial.

## Incluye
- Centro operativo de RRHH.
- Empleados activos.
- Registro de asistencia.
- Presente, retardo, ausencia, remoto y permiso.
- Solicitudes de vacaciones/permisos.
- Aprobación o rechazo.
- Actividad reciente.
- Prenómina básica del mes.
- Salario base, presentes, ausencias, retardos, permisos e incidencias.
- Eventos de dominio para asistencia y permisos.
- KPI estándar BuzzBee.

## Base de datos
Agrega de forma aditiva:
- `HrAttendance`
- `HrLeaveRequest`

No elimina ni reemplaza información existente.

## Instalación segura
```powershell
npm install
npm run update
npm run hr:audit
npm run dev
```

Si Prisma advierte posible pérdida de datos, detenerse y revisar.

Nunca ejecutar:
- prisma migrate reset
- docker compose down -v
