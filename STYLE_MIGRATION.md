# Migración visual Essenze — Editorial Luxury

Se aplicó una primera migración de estilos inspirada en las referencias compartidas, conservando la estructura y lógica actual de Shopify Hydrogen.

## Dirección visual

- Fondos marfil, beige cálido y negro profundo.
- Tipografía editorial serif para títulos y sans serif para interfaz.
- Acentos dorado champaña discretos.
- Tarjetas modulares con bordes suaves y sombras ligeras.
- Hero editorial, carruseles premium y página de producto tipo boutique.
- Responsive para escritorio, tableta y móvil.

## Archivos modificados

- `app/styles/essenze-design-system.css`
- `app/styles/app.css`
- `app/styles/PageLayout.module.css`
- `app/styles/PersonalizedFragrance.module.css`
- `app/components/Header.module.css`
- `app/components/Hero.module.css`
- `app/components/LookbookEstacional.module.css`
- `app/components/AromaticNotes.module.css`
- `app/components/FeaturedFragrances.module.css`
- `app/components/ProductCard.module.css`
- `app/components/Footer.module.css`
- `app/components/ComparadorFragancias.module.css`
- `app/components/AddToCartButton.module.css`
- `app/components/ProductDetails.module.css`
- `app/components/ProductImageGallery.module.css`
- `app/components/QuantitySelector.module.css`

Los nuevos bloques están marcados con comentarios `ESSENZE EDITORIAL ...` para facilitar su localización y ajuste.

## Validación

Se verificó el balance de llaves, comentarios y comillas en los CSS modificados. No fue posible completar el build dentro del entorno de revisión porque el ZIP original contenía `node_modules` instalado en Windows y sus binarios no son compatibles con Linux. En tu equipo, conserva tu `.env`, elimina `node_modules`, ejecuta `npm install` y después `npm run dev`.
