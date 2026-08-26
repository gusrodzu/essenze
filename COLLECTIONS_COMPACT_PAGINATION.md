# Colecciones compactas + paginación numerada

## Cambios visuales

- Se redujo la altura del banner principal de `/collections`.
- Se ajustaron título, espaciados, CTAs y directorio lateral para conservar el impacto editorial sin ocupar casi toda la primera pantalla.
- Los banners de `/collections/:handle` y `/collections/all` también se compactaron para mantener consistencia.
- En móvil, el hero ocupa menos altura y muestra antes el contenido del catálogo.

## Paginación

`PaginatedResourceSection` ahora muestra:

- Botón **Anterior**.
- Índices numéricos de página.
- Página actual resaltada.
- Indicador `Página X de Y` cuando Shopify entrega `totalCount` (como en `/collections`).
- Acceso directo a la primera página cuando corresponde.
- Botón **Siguiente**.

La Storefront API de Shopify utiliza cursores y no siempre entrega un total global de páginas. Por eso el paginador muestra la primera página y las páginas navegables adyacentes: anterior, actual y siguiente.

Los números se guardan en el fragmento de la URL (`#page-2`) para no interferir con los parámetros cursor-based que Hydrogen necesita para consultar Shopify.
