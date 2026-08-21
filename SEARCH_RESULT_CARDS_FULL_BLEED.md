# Search Result Cards — Full Bleed

## Cambios

- Las imágenes de productos en `/search` ocupan el 100% del área visual de cada card.
- Se eliminaron padding, marco interno, degradado radial y badge sobre la imagen.
- La disponibilidad se muestra junto a la marca, debajo de la fotografía.
- Las cards comparten el mismo lenguaje visual que ProductItem: blanco, borde fino, sombra suave, full bleed y hover discreto.
- Los thumbnails del buscador predictivo también usan imagen full bleed.
- Se mantiene la información de marca, nombre, tipo, precio y enlace al producto.

## Archivos modificados

- `app/components/SearchResults.jsx`
- `app/components/SearchResults.module.css`
- `app/components/SearchResultsPredictive.module.css`
