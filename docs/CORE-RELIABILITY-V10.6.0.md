# BuzzBee ERP v10.6.0 — Idempotencia + Observabilidad + Concurrencia

Checkpoint 10 del hardening funcional.

## Idempotencia persistente
Se agrega `IdempotencyRecord`, aislado por empresa + scope + key.

Los endpoints críticos soportan `Idempotency-Key`:
- la primera ejecución procesa normalmente;
- repetir la misma key + mismo payload devuelve la respuesta persistida;
- misma key + payload diferente devuelve 409;
- una segunda solicitud concurrente con la misma key devuelve `IDEMPOTENCY_IN_PROGRESS`.

La key es opcional para no romper el frontend actual.

## Concurrencia de folios
Se agrega `SequenceCounter`, con incremento atómico por empresa + scope + periodo.

Migrados inicialmente:
- Solicitudes de compra
- Órdenes de compra
- Movimientos de Tesorería
- Solicitudes automáticas creadas por BuzzBee Flow

El contador se inicializa desde la cantidad existente para evitar volver a `0001`
en instalaciones que ya tienen datos.

## Observabilidad
Todas las respuestas HTTP generan un evento estructurado `request.completed` con:
- requestId
- companyId
- userId
- método
- ruta
- statusCode
- durationMs
- estado de idempotencia

No se registra body ni secretos.

## Base de datos
Cambios Prisma exclusivamente aditivos:
- `IdempotencyRecord`
- `SequenceCounter`

No usar `prisma migrate reset`.
Si `db push` muestra advertencia de pérdida de datos, detenerse.
