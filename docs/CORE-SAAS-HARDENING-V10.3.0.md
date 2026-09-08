# BuzzBee ERP v10.3.0 — Core SaaS Hardening

Checkpoint:
**Tenant Security → Request Traceability → API Keys → SSRF Protection → Modules → Usage/Limits → Billing Audit → Integrations**

## Hardening
- JWT no sólo se verifica criptográficamente: también confirma que `sub` pertenece al `companyId` del token, que el usuario está activo y que la empresa está activa.
- Cada request recibe `x-request-id`; se propaga y se devuelve también en errores internos/auth.
- API keys ahora se buscan por prefijo y el hash se compara con `timingSafeEqual`.
- API keys de empresas inactivas son rechazadas.
- Webhooks/conexiones bloquean localhost, IP privadas, link-local y metadata hosts; producción exige HTTPS.
- `/api/modules/usage` expone consumo, límites, override, porcentaje y exceso.
- `/api/modules/saas-status` resume suscripción, módulos, límites, API keys, webhooks y DLQ.
- Cambios de plan, cambios programados y métodos de pago quedan auditados.

## QA
```powershell
npm run qa:core-saas:static
npm run qa:core-saas
```

El runtime QA es read-only.

No hay cambios Prisma en v10.3.0.
