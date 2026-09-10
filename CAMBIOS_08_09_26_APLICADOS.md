# Cambios sitio web 08_09_26 — aplicados

- Menú Perfumería: título principal “Todas las fragancias”; accesos Colecciones, Marcas, Disponibles, Más vendidos y Familias olfativas.
- Menú Descubrir: se eliminaron las dos tarjetas negras; quedan únicamente Perfumes por temporada, Solicita un perfume, Sobre nosotros y Testimonios.
- Navegación desktop: dropdowns con zona puente y cierre retardado para no perder el menú al mover el cursor hacia el panel.
- Hero: eliminado el marco/línea interior sobre la imagen.
- Comparador: catálogo completo paginado hasta 1000 productos tanto en /comparador como en Home; búsqueda por nombre/marca; más resultados visibles; selección mantiene la posición de scroll; el loader no reinicia en cada selección.
- Comparador: imágenes mantienen object-fit contain para mostrar la botella completa.
- Buscar: flujo regular simplificado a consulta de productos Shopify para evitar el error 500 y mantener la ruta interna /search.
- Familias olfativas: renombrado desde “Biblioteca de Notas Aromáticas”; contador dinámico; incorpora automáticamente las colecciones olfativas detectadas en Shopify, además de los fallbacks existentes.
- Product cards: Comprar es la acción primaria; Comparar queda como secundaria.
- Ficha de producto: imagen principal con object-fit contain; miniaturas con scroll para 5 o más imágenes.
- Todas las fragancias: carga todas las páginas del catálogo (hasta 1000 productos), orden inicial por marca y luego nombre, sin limitarse a 60/250.
- Colecciones: carga todas las colecciones (hasta 500) y las páginas de colección cargan hasta 1000 productos.
