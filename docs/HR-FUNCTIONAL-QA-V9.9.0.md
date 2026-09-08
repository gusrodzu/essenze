# BuzzBee ERP v9.9.0 — HR Functional QA

Checkpoint:
**Empleados → Asistencia → Permisos → Incidencias → Expediente → Nómina → Reportes**

Valida:
- empleados/departamentos/puestos;
- asistencia idempotente por empleado/fecha;
- permisos y resolución;
- incidencias;
- documentos de expediente;
- integración BONUS/OVERTIME/DEDUCTION/ABSENCE/LATE_ARRIVAL con nómina;
- cálculo, aprobación y reglas de pago;
- payroll preview;
- integración con reportes ejecutivos.

## Modo seguro

```powershell
npm run qa:hr:static
npm run qa:hr
```

`qa:hr` es read-only por defecto.

Para E2E:
```powershell
$env:HR_QA_WRITE="1"
npm run qa:hr
```

La prueba utiliza fechas históricas aisladas para no alterar la operación actual.
El periodo de nómina QA se cancela al terminar, por lo que no entra al cálculo
normal de reportes financieros.

No borra registros y no hay cambios Prisma en v9.9.0.
