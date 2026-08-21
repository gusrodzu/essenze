# Tarjetas de producto unificadas

Se creó `app/components/UnifiedProductCard.jsx` como la única base visual para las tarjetas que muestran productos.

## Módulos conectados

- Productos destacados de Home.
- Catálogo general.
- Colecciones.
- Páginas por marca.
- Resultados de búsqueda.
- Resultados de “Tus recomendaciones personalizadas”.
- Productos complementarios de la ficha de producto.
- Componente genérico `ProductCard`.

## Diseño estándar

Todas las tarjetas comparten:

- Imagen full bleed con proporción `4 / 5`.
- Fondo blanco, borde fino, radio de 22 px y sombra suave.
- Marca en acento dorado.
- Estado de disponibilidad en la misma posición.
- Título de hasta dos líneas.
- Área estable para tipo de producto o chips contextuales.
- Precio y CTA alineados en el pie.
- Botón inferior “Comparar” unificado en destacados, catálogo, colecciones, marcas, búsqueda, recomendaciones y complementarios.
- Mismas alturas, hover, focus visible y comportamiento responsive.

## Datos especiales

Los módulos pueden añadir chips sin alterar la estructura:

- Descuento en Productos Destacados.
- Porcentaje de afinidad y coincidencias en recomendaciones.
- Rating o badge en el componente genérico.

## Consultas GraphQL

Se añadió `productType` a Productos Destacados y `productType`/`availableForSale` a productos complementarios referenciados, para que la tarjeta mantenga la misma información en todas las rutas.
