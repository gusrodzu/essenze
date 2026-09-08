# BuzzBee ERP v8.1.0 — QA End-to-End + Commercial Polish

**Track:** 🔵 ERP Cliente / 🟢 Compartido

## Objetivo
Convertir la Demo Company funcional en una demo comercial verificable antes de presentarla al cliente.

## Nuevo
- `npm run demo:e2e`
- Login visual actualizado a BuzzBee Business OS.
- Botón `Usar Demo Company`.
- Versión visible 8.1.0.
- Estados de carga y error más claros en Demo Company.
- Página 404 real para rutas inexistentes.
- Runtime E2E autenticado contra:
  - `/health`
  - `/ready`
  - `/auth/login`
  - `/auth/me`
  - `/reports/demo-readiness`
  - `/reports/demo`
  - `/procurement/dashboard`
  - `/hr-client/dashboard`
  - `/ai/context`

## Flujo recomendado
Con API y frontend levantados:

```powershell
npm run smoke
npm run demo:e2e
```

Un `demo:e2e` exitoso significa que los bloques técnicos principales de la historia comercial respondieron correctamente en runtime.

## Importante
Este paquete fue validado estáticamente. El E2E real debe ejecutarse en la PC que tiene PostgreSQL y Demo Company.
