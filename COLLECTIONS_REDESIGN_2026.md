# Essenze — Rediseño de colecciones 2026

Esta actualización mejora las rutas:

- `/collections`
- `/collections/:handle`
- `/collections/all`

## Cambios principales

- Hero editorial inmersivo con navegación, CTAs y paneles de cristal.
- Biblioteca de colecciones en layout bento adaptable.
- Cards de colección con imagen full bleed, overlay y panel glass.
- Breadcrumbs y navegación cruzada entre colecciones, marcas, asesor y comparador.
- Página individual de colección con historia, accesos rápidos y catálogo mejor jerarquizado.
- Encabezado editorial para la grilla de productos.
- Responsive mobile-first con carrusel táctil para accesos de descubrimiento.
- Se conserva la paginación cursor-based, filtros, ordenamiento y Product Cards unificadas.

## Archivos modificados

- `app/routes/collections._index.jsx`
- `app/routes/collections.$handle.jsx`
- `app/routes/collections.all.jsx`
- `app/styles/CollectionsIndex.module.css`
- `app/styles/CollectionDetail.module.css` (nuevo)

## Validaciones realizadas

- Sintaxis JSX analizada con el parser de TypeScript.
- Llaves y bloques CSS balanceados.
- Todas las clases utilizadas por los CSS Modules tienen una definición.
- No se modificaron loaders de carrito, checkout, cuenta o producto.
