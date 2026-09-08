# BuzzBee ERP v9.0.0 — Interface Standardization

Esta versión actualiza el lenguaje visual global de BuzzBee para que los módulos
se sientan como una sola aplicación.

## Dirección visual

- Sidebar blanca.
- Estado activo azul suave, sin gradientes oscuros.
- Workspace gris muy claro.
- Cards blancas con borde fino y sombra mínima.
- Radios consistentes: 16 px en panels, 11 px en controles.
- Encabezados más compactos.
- Tabs con estado activo azul.
- Inputs/search/select con el mismo tratamiento.
- Tablas con encabezados claros, hover suave y densidad consistente.
- Drawers como superficie primaria de consulta/alta/edición.
- Topbar blanca compacta.
- Responsive preservado para split-screen, tablet y móvil.

## Alcance

La capa `interface-v9.css` se importa al final del stack global para homogeneizar
módulos legacy y módulos ya migrados al Design System, sin reemplazar la lógica
funcional existente.

No hay cambios Prisma ni operaciones destructivas.
