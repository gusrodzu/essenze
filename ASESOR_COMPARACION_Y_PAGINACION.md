# Asesor Essenze: comparación, afinidad y paginación

## Cambios incluidos

- Cada recomendación del Asesor conserva el botón **Comparar** y envía la fragancia al comparador global.
- El badge principal ahora comunica **Elegida para ti · XX% afinidad**.
- Se añadió el botón **Ver más productos**.
- Nueva ruta `/asesor/resultados` con todas las fragancias ordenadas según las respuestas del quiz.
- La página de resultados conserva las respuestas en la URL, permite comparar productos y pagina 12 productos por vista.
- Los paginadores muestran `Página X de Y` cuando el catálogo conoce el total.
- Se añadieron conteos para catálogo general, colección individual y páginas de marca.

## Nota

El conteo auxiliar contempla hasta 250 productos por catálogo o colección, que es el máximo solicitado en una sola consulta Storefront. Para catálogos mayores conviene implementar un índice persistente o una consulta de conteo dedicada.
