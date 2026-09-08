# BuzzBee ERP v8.3.0 — Order-to-Cash

**Track:** 🔵 ERP Cliente / 🟢 Compartido

Nuevo centro de ciclo comercial:

**Cotización → Pedido → Entrega → Factura → CxC → Cobranza**

Incluye:
- KPI estándar BuzzBee.
- Valor de pedidos activos.
- Cartera abierta y vencida.
- Cobranza del mes.
- Conversión de cotizaciones.
- Detección de pedidos pendientes de entrega.
- Detección de pedidos entregados sin facturar.
- Alertas de cartera vencida.
- Flujo visual de 6 etapas.
- Responsive para monitor dividido verticalmente.

## Hotfix incluido
Se corrigió un error real en `collections.js`: la creación del cobro utilizaba `tx.customerPayment.create()` con campos que pertenecen a `CollectionReceipt`. Ahora usa el modelo canónico `tx.collectionReceipt.create()`.

No cambia Prisma ni borra datos.
