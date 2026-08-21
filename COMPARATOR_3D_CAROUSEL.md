# Comparador 3D de fragancias

La sección **Compara Nuestras Fragancias** dejó de utilizar una tabla horizontal. Ahora presenta las tres selecciones como tarjetas dentro de un carrusel 3D.

## Experiencia incluida

- Tres tarjetas visibles con perspectiva real mediante CSS 3D.
- Fragancia activa al centro y tarjetas laterales inclinadas.
- Flechas anterior/siguiente.
- Navegación con teclado mediante `←`, `→`, `Home` y `End`.
- Deslizamiento horizontal con mouse, touch o trackpad.
- Indicadores inferiores para ir directamente a cualquier tarjeta.
- La tarjeta lateral puede llevarse al frente con el botón **Ver al frente**.
- Diseño responsive y soporte para `prefers-reduced-motion`.
- Persistencia de productos seleccionados mediante `localStorage`.
- Integración intacta con todos los botones **Comparar** de la tienda.

## Contenido de cada tarjeta

Cada fragancia muestra:

- Imagen principal.
- Marca y disponibilidad.
- Nombre del producto.
- Familia olfativa, concentración y perfil.
- Intensidad.
- Uso recomendado.
- Temporadas.
- Presentaciones.
- Dispensador.
- Perfil olfativo o recomendación.
- Precio.
- Acciones para quitar el producto o abrir su ficha.

## Archivos modificados

```text
app/components/FragranceComparator.jsx
app/components/ComparadorFragancias.module.css
FRAGRANCE_COMPARATOR_SETUP.md
COMPARATOR_3D_CAROUSEL.md
```

No se modificaron loaders, consultas Storefront, metacampos ni la lógica compartida de selección.
