# BuzzBee ERP v8.4.0 — Module Design System

Nuevo estándar visual para presentar información dentro de los módulos.

## Componentes compartidos
- `ModuleHeader`: encabezado compacto y consistente.
- `ModuleTabs`: navegación interna del módulo.
- `ModuleToolbar`: título de tabla, búsqueda y espacio para filtros/acciones.
- `DataTableFrame`: tablas con scroll local y footer.
- `AttentionPanel`: bloque reutilizable de pendientes críticos.
- `DetailDrawer`: detalle lateral sin abandonar la pantalla.

## Módulos migrados en esta versión
- Compras / Procure-to-Pay
- Ventas / Centro comercial
- Order-to-Cash
- Inventario / Existencias
- Inventario / Productos
- RR. HH. operativo
- Recursos Humanos maestro
- Centro Administrativo

## Principios
1. Encabezado compacto.
2. Máximo 4 KPI principales visibles.
3. Navegación interna por módulo.
4. Tablas densas y legibles.
5. Detalle lateral para registros.
6. Responsive real para monitor dividido y móvil.
7. Componentes reutilizables para todos los módulos futuros.

No hay cambios Prisma ni operaciones destructivas sobre la base de datos.
