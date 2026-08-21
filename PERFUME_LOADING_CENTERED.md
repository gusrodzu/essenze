# Perfume Loading — Centered Screen Overlay

La experiencia de carga del asesor y del comparador ahora se muestra como un overlay modal centrado en el viewport.

## Cambios

- Posición fija con `inset: 0` y `z-index: 10000`.
- Botella, copy y progreso centrados en pantalla.
- Fondo oscurecido con blur para separar la carga del contenido de la página.
- Bloqueo temporal del scroll mientras la animación está visible.
- Restauración automática del scroll al terminar la carga.
- Panel responsive para desktop, móvil y orientación horizontal.
- Compatibilidad con safe areas de iPhone y `prefers-reduced-motion`.

## Archivos modificados

- `app/components/PerfumeLoadingExperience.jsx`
- `app/components/PerfumeLoadingExperience.module.css`
