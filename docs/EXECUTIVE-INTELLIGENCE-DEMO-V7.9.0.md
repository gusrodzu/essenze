# BuzzBee ERP v7.9.0 — Executive Intelligence Demo

**Track:** 🔵🟢 ERP Cliente + BuzzBee reusable  
**Hito 5:** Dashboard + Reportes + BuzzBee AI.

## Nuevo
- `/reportes/demo` — vista ejecutiva para demo comercial.
- Business Health Score.
- Historia visual del proceso:
  SOLPED → Aprobación → OC → Recepción → Inventario → Administración → RRHH → Intelligence.
- Posición financiera.
- Compras e inventario.
- RRHH ejecutivo.
- Alertas prioritarias.
- Insights de BuzzBee Intelligence.
- Checklist de preparación comercial.
- Briefing ejecutivo generado por BuzzBee AI usando `context: executive`.
- El briefing continúa siendo read-only y basado en evidencia ERP.

## Correcciones
- BuzzBee AI para RRHH usa `employees.read`, permiso real del Core.
- Reportes ejecutivos respetan la moneda configurada de la empresa.
- Reportes migrados al componente compartido `KpiGrid`.

## Base de datos
No cambia `schema.prisma`.

## Instalación
```powershell
npm install
npm run db:generate
npm run db:seed
npm run demo:audit
npm run dev
```

Luego:
```powershell
npm run smoke
```
