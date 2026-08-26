# Asesor Olfativo: badge y navegación por género

Cambios incluidos:

- Badge de afinidad verde sobre la imagen de cada tarjeta recomendada.
- Eliminación del botón Comparar en las recomendaciones del asesor.
- Un solo botón `Ver más productos`.
- El botón dirige a una colección según el género seleccionado.

Mapeo actual en `app/components/PersonalizedFragrance.jsx`:

- `masculino` → `/collections/masculino`
- `femenino` → `/collections/femenino`
- `unisex` → `/collections/unisex`
- `sin preferencia` → `/collections/perfumes`

Si los handles reales de Shopify son diferentes, cambia únicamente `GENDER_COLLECTION_URLS`.
