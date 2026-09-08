# BuzzBee ERP v10.7.0 — Worker Reliability + Event Traceability

Siguiente checkpoint del hardening técnico.

- Health registry para Integration Worker e Intelligence Worker.
- `GET /api/operations/health` protegido por autenticación.
- Estado de cola: READY, RETRY_WAIT, PROCESSING, stale, Dead Letter y fallos 24h.
- Graceful shutdown para SIGINT/SIGTERM.
- Webhooks propagan `x-buzzbee-request-id`, `x-buzzbee-correlation-id` y número de intento.
- BuzzBee Flow conserva `eventLogId` en `context.trace`.
- No hay cambios Prisma en v10.7.0.
