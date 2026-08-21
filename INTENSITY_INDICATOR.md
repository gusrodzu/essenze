# Indicador visual de intensidad

Se reemplazaron los textos visibles `Alta`, `Media` y `Baja` por un medidor gráfico de cinco barras.

## Archivos nuevos

- `app/components/IntensityIndicator.jsx`
- `app/components/IntensityIndicator.module.css`

## Integraciones

- Dossier de metacampos en la página de producto.
- Cards del carrusel 3D del comparador.
- Detalles comparativos inferiores.

El texto original se conserva únicamente como etiqueta accesible y tooltip. El componente reconoce valores en español, sinónimos y escalas numéricas del 1 al 5.
