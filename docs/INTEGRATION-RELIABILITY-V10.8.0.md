# BuzzBee ERP v10.8.0 — Integration Reliability

Checkpoint siguiente del hardening SaaS.

## Event deduplication
`IntegrationEventLog` agrega campos aditivos:
- `dedupKey`
- `correlationId`
- `sourceRequestId`
- `replayOfId`

`dedupKey` es único por empresa. La emisión de eventos detecta reintentos incluso
si dos procesos intentan crear el mismo evento al mismo tiempo.

## Public API idempotency
POST `/api/public/v1/customers` y `/api/public/v1/products` usan `Idempotency-Key`
después de validar la API Key. El middleware ahora reconoce tanto `req.auth` como
`req.apiAuth`.

## Controlled replay
`POST /api/integrations/events/:id/replay`

Requiere `integrations.test`. El replay:
- crea un nuevo IntegrationEventLog;
- conserva correlationId;
- registra `replayOfId`;
- vuelve a encolar sólo webhooks actualmente activos;
- marca el payload con `_buzzbeeReplay`.

## Historical integration metrics
`GET /api/integrations/metrics?days=7`

Máximo 90 días. Incluye:
- eventos
- entregas
- tasa de éxito
- duración promedio
- requests de API
- tasa de error de API
- Dead Letters
- replays
- timeline diario

`GET /api/operations/health` agrega success rate y eventos de las últimas 24h.

## Prisma
Cambios aditivos sobre `IntegrationEventLog`; no se eliminan columnas ni tablas.

No usar `prisma migrate reset`.
Si `db push` muestra advertencia de pérdida de datos, detenerse.
