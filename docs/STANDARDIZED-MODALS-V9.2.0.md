# BuzzBee ERP v9.2.0 — Standardized Modals

BuzzBee vuelve al patrón de modal centrado como superficie principal para
consultar, crear y editar registros.

## Regla UX oficial

- Consultar registro → modal centrado.
- Crear registro → modal centrado.
- Editar registro → modal centrado.
- Acciones contextuales → modal cuando requieren una superficie de trabajo.
- Confirmaciones y acciones destructivas → confirmación explícita.

## Compatibilidad

El componente `DetailDrawer` se conserva como wrapper de compatibilidad para no
romper módulos ya migrados. Internamente renderiza el nuevo `RecordModal`.

Esto permite cambiar la interacción global sin tocar la lógica funcional de
Compras, Terceros, Proveedores, Recepciones, POS y otros módulos.

## Diseño estandarizado

- Backdrop uniforme.
- Modal centrado.
- Header, body y footer consistentes.
- Tamaños `sm`, `md` y `lg`.
- Altura máxima con scroll interno.
- Mobile con margen de 12 px.
- Reduced-motion.
- Tablas y tabs siguen funcionando dentro del modal.
- Sidebar blanca y Design System v9 se conservan.

No hay cambios Prisma.
