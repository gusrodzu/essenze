# BuzzBee ERP v10.5.0 — Global UI Refresh

La referencia visual aprobada se aplica como sistema global a todo el proyecto.

## Shell
- Sidebar blanco compacto de 220 px.
- Topbar blanco de 62 px.
- Navegación interna por pestañas de 50 px.
- Workspace gris claro.
- Rail BuzzBee AI de 276 px.
- Power Banner compacto al pie.

## Módulos
- Jerarquía de títulos unificada.
- 4 KPI compartidos como estándar.
- Cards blancas con borde suave y radio 14 px.
- Tablas densas y limpias.
- Inputs y selects uniformes.
- Estados, badges y modales armonizados.
- Responsive para split-screen y móvil.

## Arquitectura
`global-ui-v10.5.css` se carga al final de la cascada para que el lenguaje visual
sea consistente incluso en páginas legacy, sin reescribir la lógica funcional.

No hay cambios Prisma.
