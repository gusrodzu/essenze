# Essenze — Mobile UX 2026

Esta versión convierte el proyecto en una experiencia responsive centrada en móvil, sin modificar loaders, consultas GraphQL, carrito, variantes, metacampos ni rutas.

## Alcance

- Sistema global de espaciado, tipografía, áreas seguras y objetivos táctiles.
- Header móvil compacto y menú de pantalla completa.
- Dock inferior con Inicio, Buscar, Categorías, Asesor y Carrito.
- Hero, beneficios, colecciones, familias olfativas y productos destacados adaptados a scroll táctil.
- Product cards compactas y consistentes para grids de dos columnas.
- Catálogo, colecciones y marcas con toolbar sticky, filtros táctiles y paginación móvil.
- Página de producto con galería full bleed, compra fija inferior, variantes y acordeones.
- Asesor personalizado y resultados optimizados para una sola columna.
- Comparador 3D adaptado a pantallas pequeñas con detalles comparativos apilados.
- Buscador predictivo y resultados de búsqueda mejorados para teclado móvil.
- Carrito, cuenta, páginas editoriales, artículos, políticas y footer responsivos.

## Breakpoints principales

- `760px`: navegación móvil, dock, drawers y estructura principal.
- `700px`: catálogos, producto, comparador y módulos editoriales.
- `620px`: colecciones, formularios y layouts compactos.
- `560px`: carrito, buscador, footer y controles táctiles.
- `360px`: fallback de una columna para grids estrechos.

## Mejoras de UX

- Botones y controles con objetivo táctil mínimo de 44px.
- Inputs en 16px para evitar zoom automático en iOS.
- Soporte para `env(safe-area-inset-*)`.
- Carruseles con `scroll-snap` y barras ocultas.
- Toolbars sticky sin bloquear contenido.
- Menú y buscador en drawer de ancho completo.
- Dock inferior oculto en producto y carrito para evitar conflicto con compra rápida.
- Respeto a `prefers-reduced-motion` existente.

## Archivos principales

Se modificaron 40 archivos entre componentes y estilos. La única modificación de lógica está en `MobileDock.jsx`, para incluir acceso directo al carrito y administrar el espacio inferior solo cuando el dock está visible.

## Pruebas recomendadas

1. Ejecutar `npm ci`.
2. Ejecutar `npm run codegen`.
3. Ejecutar `npm run build`.
4. Revisar en 320px, 360px, 390px, 430px, 768px y 1024px.
5. Probar menú, buscador, carrito, filtros, paginación, comparador y compra rápida.
6. Validar iPhone con notch y Android con barra de navegación inferior.
