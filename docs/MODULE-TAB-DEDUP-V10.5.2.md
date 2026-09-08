# BuzzBee ERP v10.5.2 — Module Tab Dedup

Se corrigieron los duplicados visuales que aparecían dentro de:

- Ventas
- Compras
- Inventario
- Recursos Humanos

## Causa

Desde v10.4 existe un `ModuleTabBar` global debajo del Topbar.
Varias páginas todavía conservaban sus antiguos `ModuleTabs`, por lo que la misma
navegación se mostraba dos veces: una en el shell y otra dentro del contenido.

## Regla definitiva

La navegación que cambia de ruta vive únicamente en `ModuleTabBar`.

Las pestañas internas de una página sólo se conservan cuando cambian estado local
y no representan otra ruta.

### Ventas
Se conservan:
- Resumen
- Pipeline
- Cotizaciones y pedidos

Se elimina del tab interno:
- Order-to-Cash (ya existe arriba en ModuleTabBar)

### Compras
Se elimina por completo el segundo menú de:
- Resumen
- Solicitudes
- Órdenes
- Recepciones
- Proveedores

Las rutas principales quedan en ModuleTabBar. Proveedores mantiene su entrada
canónica en Relaciones.

### Inventario
Se elimina el segundo menú de Productos/Existencias/Movimientos/Operaciones/Almacenes.

### Recursos Humanos
Se conservan los tabs locales:
- Empleados
- Departamentos
- Puestos

Se elimina el acceso interno duplicado a Operación RR. HH.

También se elimina el archivo legacy `HrClientCenter.jsx`; `/rrhh` sigue existiendo
únicamente como redirect a `/recursos-humanos`.

No hay cambios Prisma.
