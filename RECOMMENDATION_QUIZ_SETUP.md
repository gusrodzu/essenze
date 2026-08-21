# Tus Recomendaciones Personalizadas — configuración

El módulo ahora utiliza una puntuación por afinidad basada en los tags y metacampos reales de cada producto. Ya no depende de coincidencias exactas en inglés y tampoco muestra tarjetas vacías.

## Archivos principales

- `app/components/PersonalizedFragrance.jsx`
- `app/styles/PersonalizedFragrance.module.css`
- `app/lib/fragranceRecommendations.js`
- `app/routes/_index.jsx`

## Metacampos consultados

Namespace esperado: `custom`

- `sexo_objetivo`
- `genero`
- `familia_olfativa`
- `familias_olfativas`
- `fragancia`
- `forma_del_producto`
- `ocasion`
- `ocasion_y_temporadas`
- `recomendaciones_de_uso`
- `uso_dia`
- `uso_noche`
- `uso_otono`
- `uso_verano`
- `uso_primavera`
- `uso_invierno`
- `intensidad`

## Requisitos en Shopify Admin

1. Publica los productos en el canal de venta usado por Hydrogen/Headless.
2. En **Configuración → Datos personalizados → Productos**, abre cada definición utilizada.
3. Confirma que el namespace y la key coincidan con la lista anterior.
4. Habilita lectura para Storefront en las definiciones que alimentan el quiz.
5. Completa al menos género, familia olfativa y ocasión/uso en cada perfume para obtener recomendaciones precisas.

## Cómo funciona la afinidad

- Familia olfativa: peso principal.
- Ocasión de uso: peso secundario.
- Género objetivo: peso complementario.
- Se normalizan mayúsculas, acentos, listas JSON y valores booleanos.
- También se reconocen equivalencias en español e inglés.
- Si no existe una coincidencia total, se muestran las opciones con mayor cercanía.
- Si faltan metadatos, el módulo completa la cuadrícula con una curaduría del catálogo y la identifica como `Selección Essenze`.
- Los productos que parecen accesorios se excluyen cuando existen perfumes identificables en el catálogo.

## Personalizar preguntas o equivalencias

Edita `FRAGRANCE_QUIZ_STEPS` en:

```text
app/lib/fragranceRecommendations.js
```

Cada opción contiene un arreglo `aliases`. Agrega ahí cualquier forma exacta en la que estés capturando el valor en Shopify.
