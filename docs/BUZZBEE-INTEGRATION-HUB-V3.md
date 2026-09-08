# BuzzBee Integration Hub v3 — v6.5.0

## Cola durable de webhooks

Cada evento crea `WebhookDeliveryJob` persistente.

Estados:
- READY
- PROCESSING
- RETRY_WAIT
- COMPLETED
- DEAD_LETTER

Un reinicio del servidor no pierde las entregas pendientes.

## Reintentos

Backoff por defecto:
1. 1 minuto
2. 5 minutos
3. 15 minutos
4. 60 minutos

Al agotar 4 intentos, la entrega pasa a Dead Letter Queue.

El worker recupera automáticamente trabajos que quedaron en PROCESSING por más de 5 minutos.

## Worker

`IntegrationWorker` procesa la cola cada 30 segundos por defecto.

Variable opcional:
`INTEGRATION_WORKER_INTERVAL_MS=30000`

El intervalo mínimo permitido es 5 segundos.

## Dead Letter Queue

Desde Integration Hub se puede:
- ver errores;
- revisar número de intentos;
- procesar manualmente la cola;
- devolver una entrega DLQ a READY y reintentarla.

## Eventos conectados

Además de los eventos v2, v3 conecta:
- expense.submitted
- approval.required
- inventory.low_stock

`inventory.low_stock` se comprueba después de:
- remisiones de venta;
- ajustes de inventario;
- transferencias desde almacén origen.

## Arquitectura

Dominio -> Event Bus -> IntegrationEventLog -> WebhookDeliveryJob -> Worker -> WebhookDeliveryLog

La creación/modificación del registro de negocio no depende de que el receptor externo esté disponible.
