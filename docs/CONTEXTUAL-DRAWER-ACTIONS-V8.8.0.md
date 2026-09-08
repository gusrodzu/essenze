# BuzzBee ERP v8.8.0 — Contextual Drawer Actions

Nueva regla oficial de UX de BuzzBee:

- **Consultar un registro → drawer lateral derecho**
- **Crear un registro → drawer lateral derecho**
- **Editar un registro → drawer lateral derecho**
- **Acciones contextuales relacionadas → drawer lateral derecho**
- **Confirmaciones, decisiones rápidas o acciones destructivas → modal/confirmación**

## Aplicado en esta versión

### `/terceros`
- Consultar tercero: drawer.
- Crear tercero: drawer.
- Editar tercero: drawer.
- Agregar contacto: drawer.
- Agregar dirección: drawer.
- Centro de deduplicación: permanece modal por ser una decisión de consolidación.

### `/compras/proveedores`
- Consultar: drawer.
- Crear: drawer.
- Editar: drawer.
- Eliminar: mantiene confirmación destructiva.

### `/compras/recepciones`
- Consultar recepción: drawer.
- Registrar nueva recepción: drawer.
- Seleccionar una OC pendiente abre directamente el drawer de captura.
- Partidas, cantidades y documento del proveedor se capturan sin abandonar el contexto.

No hay cambios de Prisma ni operaciones destructivas de base de datos.
