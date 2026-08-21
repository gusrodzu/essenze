# Corrección integral del buscador Essenze

Esta versión corrige la búsqueda predictiva del drawer y la ruta `/search`.

## Problemas corregidos

- Se eliminaron campos GraphQL inválidos en `Page` que podían hacer fallar por completo la búsqueda predictiva.
- Los artículos ahora incluyen el `blog.handle` necesario para construir rutas válidas.
- Se corrigió el doble encode de los términos de búsqueda en los enlaces con tracking de Shopify.
- El botón para ver todos los resultados ahora navega realmente a `/search?q=...`.
- La búsqueda predictiva ignora respuestas antiguas cuando el usuario continúa escribiendo.
- Se agregó debounce de 220 ms para evitar consultas innecesarias.
- La búsqueda comienza a partir de dos caracteres y muestra mensajes claros antes de consultar.
- Se agregó estado de carga, estado sin resultados y accesos rápidos al catálogo, marcas y asesor.
- El input se enfoca automáticamente al abrir el panel de búsqueda.
- El botón de limpiar restablece la consulta y mantiene el foco correctamente.
- Escape cierra las sugerencias y el drawer conserva su manejo de foco.
- Los resultados usan imagen y precio de respaldo cuando no existe una variante seleccionable.
- Se muestran disponibilidad, marca y precio reales.
- La búsqueda regular ahora admite coincidencia parcial sobre la última palabra mediante `prefix: LAST`.
- La ruta `/search` usa 12 productos por página y mantiene paginación por cursor de Hydrogen.
- Se mejoraron los estados iniciales y sin resultados para guiar al usuario.

## Archivos modificados

- `app/routes/search.jsx`
- `app/components/SearchFormPredictive.jsx`
- `app/components/SearchFormPredictive.module.css`
- `app/components/SearchResultsPredictive.jsx`
- `app/components/SearchResultsPredictive.module.css`
- `app/components/SearchResults.jsx`
- `app/components/SearchResults.module.css`
- `app/components/SearchForm.jsx`
- `app/components/PageLayout.jsx`
- `app/styles/PageLayout.module.css`
- `app/components/Aside.jsx`
- `app/lib/search.js`

## Validaciones realizadas

- Sintaxis de 86 archivos JavaScript/JSX.
- ESLint de todos los archivos modificados sin errores.
- Sintaxis de los cuatro archivos CSS modificados.
- Clases de CSS Modules utilizadas contra clases definidas.
- Sintaxis y validación de las consultas GraphQL regular y predictiva contra el schema Storefront incluido con Hydrogen.
- Prueba del helper de tracking para evitar términos doblemente codificados.

## Prueba local recomendada

```bash
rm -rf node_modules
npm ci
npm run codegen
npm run dev
```

Pruebas manuales sugeridas:

1. Abrir el buscador desde escritorio y móvil.
2. Buscar por marca, por ejemplo `Dior`.
3. Buscar por una nota, por ejemplo `vainilla` u `oud`.
4. Abrir un producto desde las sugerencias.
5. Abrir una colección desde las sugerencias.
6. Presionar Enter y confirmar que navega a `/search?q=...`.
7. Probar una consulta sin resultados.
8. Navegar con Anterior y Siguiente en la página de resultados.
