# BuzzBee ERP v9.5.0 — Modal Architecture Migration

Esta versión inicia la migración estructural, no sólo visual, al formato aprobado.

## Componentes compartidos

- `RecordModal`
- `ModalSection`
- `ModalInfoGrid`
- `ModalNote`
- `ModalFormSection`

## Migraciones estructurales incluidas

- Cuentas por pagar: detalle financiero.
- Cuentas por cobrar: detalle financiero.
- Recursos Humanos: crear/editar empleado, departamento y puesto.
- Centro de Compras: modal de SOLPED usa el header enriquecido del RecordModal.
- Todos los módulos que ya usan `DetailDrawer` heredan automáticamente el nuevo `RecordModal`.

El resto de modales legacy permanece bajo la capa visual global de v9.4.0 y se
puede migrar progresivamente al mismo JSX compartido sin cambiar su lógica.

No hay cambios Prisma.
