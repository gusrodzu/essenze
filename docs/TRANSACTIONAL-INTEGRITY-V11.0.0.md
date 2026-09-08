# BuzzBee ERP v11.0.0 — Transactional Integrity

Este checkpoint endurece las operaciones concurrentes críticas del ERP.

- Transacciones de rutas ERP bajo aislamiento `Serializable`.
- Reintentos acotados para P2034, SQLSTATE 40001 y 40P01.
- Backoff exponencial con jitter.
- Conflictos persistentes regresan HTTP 409 `CONCURRENCY_CONFLICT`, no 500.
- 15+ rutas transaccionales reutilizan el mismo guard.
- Folios de Tesorería y Entregas se generan con el cliente `tx` cuando forman parte de la operación.
- No hay cambios Prisma en esta versión.
