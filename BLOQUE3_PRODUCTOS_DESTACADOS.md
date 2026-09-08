# Bloque 3 — Productos Destacados + Product Cards

Cambios aplicados:

- Productos destacados muestran una acción de compra clara (`Comprar`) además de `Comparar`.
- `Comparar` queda como acción secundaria visual.
- Se eliminó `Perfumería de autor` como fallback/etiqueta automática en las product cards.
- Si Shopify realmente devuelve ese texto como `productType`, la tarjeta lo oculta para evitar información inexacta.
- El botón `Comparar` agrega la fragancia sin recargar la página.
- Si el comparador existe en la página actual, se desplaza suavemente hacia él.
- Si no existe en la página actual, la selección se conserva y se abre `/comparador`.
- Se eliminó el texto decorativo `CURATED` y `ESSENZE SELECTION` del módulo de productos destacados.
- Se aplicó la etiqueta `Comprar` a cards de catálogo, búsqueda y productos complementarios para mantener coherencia.
