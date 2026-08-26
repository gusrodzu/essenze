# Essenze — Corrección de scroll móvil

## Problema

La página podía quedar bloqueada en móvil por una combinación de:

- Bloqueos de scroll independientes en drawers y animaciones de carga.
- Restauraciones fuera de orden cuando dos overlays coincidían.
- La regla `html:has(.overlay.expanded) { overflow: hidden; }`.
- `overflow-x: hidden` aplicado simultáneamente a `html` y `body` en Safari móvil.
- El contenido interno del menú móvil dependía de alturas calculadas rígidas.

## Corrección

- Nuevo administrador centralizado y reference-counted en `app/lib/scrollLock.js`.
- Restauración exacta de la posición de scroll al cerrar el último overlay.
- Recuperación automática después de navegación, HMR y bfcache.
- Eliminación de la regla global basada en `:has()`.
- Uso de `overflow-x: clip` con fallback.
- Drawer móvil convertido a layout flex con scroll táctil interno real.
- Cierre automático del Aside al cambiar de ruta.

## Archivos modificados

- `app/components/Aside.jsx`
- `app/components/PerfumeLoadingExperience.jsx`
- `app/components/PageLayout.jsx`
- `app/styles/app.css`

## Archivos nuevos

- `app/lib/scrollLock.js`
- `app/components/ScrollLockRecovery.jsx`
