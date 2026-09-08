# BuzzBee ERP v8.5.0 — Module Design System Rollout

Implementación visual del diseño aprobado dentro del proyecto real.

## Compras
La ruta `/compras` ahora replica el patrón visual aprobado:
- Encabezado compacto.
- Navegación interna.
- 4 KPI.
- Requiere atención.
- Actividad de los últimos 6 meses.
- Solicitudes recientes con búsqueda y exportación CSV.
- Drawer lateral con Resumen, Partidas, Historial, Aprobaciones y Documentos.
- Aprobar / Rechazar desde el drawer.

## Solicitudes de compra
`/compras/solicitudes` migra al mismo sistema:
- ModuleHeader.
- ModuleTabs.
- KpiGrid compartido.
- ModuleToolbar + DataTableFrame.
- DetailDrawer.

## Navegación
Se aplica la variante Business OS de sidebar oscuro del mockup aprobado, con selección activa azul.

## Responsive
Se conserva el comportamiento para monitor dividido vertical y móvil.

No se modifica Prisma ni se elimina información.
