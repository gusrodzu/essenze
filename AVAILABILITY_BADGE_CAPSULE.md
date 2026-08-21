# Indicador de disponibilidad en cápsula

Se agregó un componente reutilizable para mostrar la disponibilidad de producto como una cápsula premium de cristal.

## Componente

- `app/components/AvailabilityBadge.jsx`
- `app/components/AvailabilityBadge.module.css`

## Integrado en

- Página de producto y barra de compra móvil.
- Tarjetas unificadas de producto.
- Buscador predictivo.
- Resultados compactos del buscador.
- Comparador de fragancias.

## Estados

- Disponible: verde profundo con fondo cristal verde muy suave.
- Agotado: rojo vino con fondo cristal rosado muy suave.
- Variante compacta para tarjetas y resultados pequeños.

El indicador conserva el punto luminoso, pero ahora forma parte de una cápsula completa con borde, fondo, blur y sombra sutil.
