# BuzzBee ERP v7.5.1 — Stabilization & Core Audit

**Track:** 🟢 Compartido — ERP Cliente + BuzzBee SaaS

## Hallazgos corregidos
- `/api/modules/dashboard` usaba helpers de facturación que no existían.
- BuzzBee AI consultaba estados de PurchaseOrder que no existen en Prisma.
- BuzzBee AI consultaba `HrIncident.status`, campo inexistente.
- BuzzBee AI consultaba `IntelligenceInsight.summary`; el campo real es `message`.
- Se agregó `/api/ready` para comprobar PostgreSQL.
- Se agregó `npm run core:audit`.
- Se agregó `npm run smoke`.

## Base de datos
No hay cambios de schema.
No requiere `db:sync`.
No usar reset ni borrar volúmenes.

## Instalación
```powershell
npm install
npm run db:seed
npm run core:audit
npm run dev
```

Con la API activa:
```powershell
npm run smoke
```

Si `/api/ready` devuelve 503:
```powershell
docker ps
docker start erp-cliente-postgres
```
