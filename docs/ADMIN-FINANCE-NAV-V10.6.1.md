# BuzzBee ERP v10.6.1 — Administración + Finanzas Navigation Cleanup

## Problema detectado

`Centro Administrativo` estaba actuando simultáneamente como dashboard y como
segundo menú para varias rutas de Finanzas. Eso hacía que Cuentas por pagar,
Cuentas por cobrar, Tesorería y Presupuestos aparecieran conceptualmente en dos
lugares.

## Arquitectura definitiva

### Centro administrativo — `/administracion`
Dashboard transversal y punto de control. No posee tabs que dupliquen otras apps.
Sus tarjetas enlazan a las aplicaciones canónicas.

### Finanzas — `/finanzas/*`
Módulo transaccional con tabs canónicas:
- Cuentas por pagar
- Cuentas por cobrar
- Tesorería
- Presupuestos
- Conciliación bancaria
- Flujo de efectivo
- Contabilidad

`/finanzas` redirige a `/finanzas/cuentas-por-pagar`.

### Aplicaciones administrativas independientes
- Facturación Fiscal
- Gastos
- Activos fijos

No se mezclan dentro de las rutas de Finanzas.

## Contabilidad
Sus vistas internas (Pólizas, Catálogo, Balanza, Periodos) ahora usan `ModuleTabs`,
por lo que se muestran en el Topbar como segunda fila contextual.

## Compatibilidad
Se agregaron redirects desde aliases `/administracion/...` hacia sus rutas
canónicas de `/finanzas/...`.

No hay cambios Prisma en v10.6.1. Los modelos aditivos de v10.6.0 permanecen.
