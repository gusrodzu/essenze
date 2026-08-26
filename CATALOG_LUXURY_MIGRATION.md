# Essenze — Catálogo Modern Glass Luxury

## Cambios de esta iteración

- Product cards rediseñadas con vitrina blanca, cristal, sombras suaves y acentos dorados.
- `ProductItem` ahora muestra marca, disponibilidad, tipo de producto, rango de precio y CTA.
- Página de colecciones convertida a composición editorial/bento.
- Página de colección individual con hero visual, toolbar de cristal y grid premium.
- Catálogo completo `/collections/all` actualizado al mismo lenguaje visual.
- Nueva biblioteca de marcas en `/marcas` construida desde `product.vendor`.
- Nueva página de marca `/marcas/:vendor` con productos filtrados por vendor.
- El enlace `MARCAS` del Header redirige automáticamente a `/marcas`, incluso si el menú Shopify aún apunta a `/collections`.
- Paginación de Hydrogen rediseñada con controles Anterior/Siguiente y estados deshabilitados.
- Tamaño por página incrementado a 12 productos y 9 colecciones para reducir clics sin sobrecargar la vista.

## Archivos principales

- `app/components/ProductItem.jsx`
- `app/components/ProductItem.module.css`
- `app/components/ProductCard.module.css`
- `app/components/PaginatedResourceSection.jsx`
- `app/components/PaginatedResourceSection.module.css`
- `app/routes/collections._index.jsx`
- `app/routes/collections.$handle.jsx`
- `app/routes/collections.all.jsx`
- `app/routes/marcas._index.jsx`
- `app/routes/marcas.$vendor.jsx`
- `app/styles/CatalogPage.module.css`
- `app/styles/CollectionsIndex.module.css`
- `app/styles/Brands.module.css`
- `app/components/Header.jsx`

## Nota sobre marcas

La página de marcas obtiene las marcas desde `Product.vendor`. Para que el resultado sea correcto, conviene mantener el campo Vendor/Proveedor de Shopify normalizado (por ejemplo, evitar tener simultáneamente `Montblanc`, `Mont Blanc` y `MONTBLANC`).
