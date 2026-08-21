# Essenze — Sistema tipográfico Google Fonts

## Tipografías activas

- **Títulos y elementos editoriales:** Playfair Display
- **Cuerpo, navegación, botones, formularios y UI:** Plus Jakarta Sans

## Implementación

Las fuentes se cargan desde Google Fonts en `app/root.jsx` con `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`.

Los tokens globales se encuentran en:

```css
--font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
--font-body: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;
```

El cuerpo del sitio hereda `--font-body`, mientras que los encabezados `h1` a `h6` heredan `--font-display`.

También se sustituyeron declaraciones antiguas de Cormorant Garamond y DM Sans por los tokens globales para mantener consistencia en:

- Producto y variantes
- Precio
- Filtros
- Productos destacados
- Formularios
- Estilos globales heredados

## Pesos cargados

- Playfair Display: 400–900, normal e itálica
- Plus Jakarta Sans: 200–800, normal e itálica

No se incluyen archivos de fuente locales dentro del proyecto.
