# Bloque 8 · QA UX/UI + Responsive

Fecha: 08-09-2026

## Ajustes aplicados

- Protección global contra desbordes horizontales causados por textos dinámicos de Shopify.
- Encabezados y copies largos ahora pueden envolver sin cortar módulos.
- Medios responsivos (`img`, `picture`, `video`, `svg`) limitados al ancho de su contenedor.
- Inputs, selects y botones no pueden crecer fuera de sus cards/formularios.
- Elementos hijos de grids principales reciben `min-width: 0` para evitar traslapes.
- Estados `focus-visible` unificados con acento dorado para navegación por teclado.
- Se eliminó la línea decorativa residual del header y el subrayado animado decorativo del footer para respetar la dirección de no usar guiones/líneas ornamentales.
- En móvil, inputs/selects/textarea usan 16px para evitar zoom automático de iOS.
- Tablas en móvil ahora permiten scroll horizontal controlado en lugar de quedar cortadas.
- Acciones principales en móvil reciben objetivos táctiles mínimos de 44px.
- Botones con labels largos pueden envolver texto sin romper las cards.
- En pantallas de 390px o menos, grids genéricos de productos/colecciones/blog pasan a una sola columna.
- Se añadió soporte para `prefers-reduced-motion`.

## Archivos tocados

- `app/styles/app.css`
- `app/components/Header.module.css`
- `app/components/Footer.module.css`

## Nota de validación

Este bloque es un pase de robustez transversal y responsive. No altera consultas de Shopify, loaders, carrito, autenticación ni lógica comercial.
