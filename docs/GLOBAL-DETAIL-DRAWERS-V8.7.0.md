# BuzzBee ERP v8.7.0 — Global Detail Drawers

A partir de esta versión, la regla visual oficial es:

> **Abrir/ver un registro existente = drawer lateral derecho.**
> **Crear, editar o ejecutar una acción con formulario = modal centrado.**

Esto evita interrumpir el contexto del usuario al consultar información.

## Comportamiento

- El detalle entra deslizando desde la derecha.
- Ocupa toda la altura disponible.
- El encabezado del detalle permanece visible.
- Las acciones inferiores permanecen visibles.
- Las tablas dentro del detalle tienen scroll local.
- En móvil el drawer ocupa todo el ancho.
- Respeta `prefers-reduced-motion`.

## Cobertura actual

La capa global adapta automáticamente los detail viewers legacy identificados por
`drawer` o `detailModal`, incluyendo:

- Cuentas por pagar
- Cuentas por cobrar
- Órdenes de compra
- Nómina
- Presupuestos

Las pantallas ya migradas a `DetailDrawer` conservan el componente nativo:

- Compras / Solicitudes
- Centro de Compras
- Ventas
- Productos
- Otros módulos ya migrados al Module Design System

Los formularios de alta, edición, cobro, pago y otras acciones siguen como modal
centrado porque no son consultas de detalle.

No hay cambios Prisma ni operaciones destructivas.
