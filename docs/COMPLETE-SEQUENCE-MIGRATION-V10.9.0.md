# BuzzBee ERP v10.9.0 — Complete Sequence Migration

Migra los generadores de folios `count()+1` restantes al servicio compartido `SequenceCounter`.

Incluye Recepciones, CxC, Conciliación, Entregas/Facturas de venta, Cobranza, Ventas, Activos, Contabilidad, Devoluciones/NC, Gastos, CxP, Nómina e Inventario.

La generación MOV de CxP y Cobranza comparte el scope canónico `treasury-mov` con Tesorería para evitar colisiones entre módulos.

No agrega cambios Prisma en v10.9.0; reutiliza `SequenceCounter` existente.
