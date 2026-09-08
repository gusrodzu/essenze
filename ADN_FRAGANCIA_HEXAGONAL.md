# ADN de la fragancia — radar hexagonal

Se agregó un radar SVG interactivo y responsive a la sección de metacampos de producto.

## Ejes

1. Intensidad (`custom.intensidad`)
2. Duración (`custom.duracion`)
3. Estela (`custom.estela`)
4. Noche (`custom.uso_noche`)
5. Versatilidad (cálculo con primavera, verano, otoño e invierno)
6. Día (`custom.uso_dia`)

Los valores vacíos permanecen visibles como **Información pendiente** y se representan en gris. Los puntos usan una escala de color rojo, naranja, dorado, lima y verde.

## Archivos

- `app/components/FragranceRadar.jsx`
- `app/components/FragranceRadar.module.css`
- `app/components/ProductMetafields.jsx`

No requiere librerías externas.
