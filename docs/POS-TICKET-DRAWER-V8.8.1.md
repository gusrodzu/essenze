# BuzzBee ERP v8.8.1 — POS Ticket Drawer

El historial de Tickets POS adopta el patrón oficial de interacción de BuzzBee.

## Comportamiento

- Clic en cualquier ticket existente → drawer lateral derecho.
- Tabs del drawer:
  - Resumen
  - Partidas
  - Pagos
  - Trazabilidad
- La anulación permanece como acción destructiva con confirmación.
- El flujo de venta activa permanece en la vista POS principal para no interrumpir el checkout.

No hay cambios Prisma ni operaciones destructivas.
