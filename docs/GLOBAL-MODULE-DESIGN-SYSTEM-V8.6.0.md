# BuzzBee ERP v8.6.0 — Global Module Design System

Esta versión convierte el diseño aprobado de Compras en el lenguaje visual global del ERP.

## Cobertura

El sistema global se carga desde `main.jsx`, por lo que aplica automáticamente a las 54 pantallas funcionales del proyecto, incluyendo:

- Ventas, CRM y Marketing
- Compras y proveedores
- Inventario, almacenes y movimientos
- Administración, CxP, CxC, Tesorería, Presupuestos y Contabilidad
- RR. HH., expedientes y prenómina
- Gastos y Activos fijos
- Producción y POS
- Proyectos
- Facturación fiscal
- Reportes e Inteligencia
- Flow, Integraciones, Data Hub y Master Data
- Configuración, módulos, usuarios y billing
- Demos ejecutivas

## Patrón global

1. Encabezado compacto y jerarquía uniforme.
2. Máximo 4 KPI por fila en desktop.
3. KPI a 2 columnas en monitor dividido y 1 en móvil.
4. Navegación interna estilo underline.
5. Cards/paneles empresariales con el mismo radio, borde y densidad.
6. Toolbars y búsquedas consistentes.
7. Tablas empresariales con encabezado sticky y scroll local.
8. Modales consistentes.
9. Sidebar Business OS oscuro con activo azul.
10. Responsive para monitor dividido vertical.

## Componentes nativos

Las pantallas que ya usan `ModuleHeader`, `ModuleTabs`, `ModuleToolbar`,
`DataTableFrame`, `AttentionPanel` y `DetailDrawer` conservan el patrón nativo.
Las pantallas legacy reciben el mismo lenguaje mediante `module-global.css`,
permitiendo migración progresiva sin reescribir la lógica funcional.

Compras y Ventas permanecen como implementaciones de referencia completas con
Requiere atención, gráfica, tabla y drawer lateral.

No hay cambios de Prisma ni operaciones destructivas.
