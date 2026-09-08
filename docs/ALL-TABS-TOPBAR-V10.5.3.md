# BuzzBee ERP v10.5.3 — All Tabs in Topbar

Nueva regla UX oficial:

- Toda pestaña de navegación de página/módulo se presenta dentro del área superior de navegación.
- `ModuleTabBar` mantiene las rutas principales del módulo.
- `ModuleTabs` de las páginas se renderiza por portal dentro de `ModuleTabBar`.
- Si una página tiene tabs locales, aparecen como una segunda fila contextual debajo de las rutas principales, siempre en el Topbar.
- Los tabs de modales permanecen dentro del modal y no suben al Topbar.

Ejemplos:
- Ventas: rutas principales arriba + Resumen / Pipeline / Cotizaciones y pedidos como contexto superior.
- RRHH: rutas principales arriba + Empleados / Departamentos / Puestos.
- Operación RRHH: Asistencias / Vacaciones y permisos / Incidencias.
- Inventario Operaciones: Transferencias / Ajustes.

No hay cambios Prisma.
