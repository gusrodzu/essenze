# Essenze — migración Ultra Luxury

Esta versión eleva la interfaz editorial existente sin modificar el flujo de carrito, variantes, loaders ni consultas principales de Hydrogen.

## Cambios principales

- Sistema visual marfil, espresso y oro envejecido.
- Tipografías Cormorant Garamond + Manrope.
- Header con cristal cálido, líneas doradas y navegación refinada.
- Hero con marco editorial, composición cinematográfica y CTAs premium.
- Página de producto reconstruida con:
  - breadcrumb;
  - galería tipo vitrina;
  - panel de compra sticky;
  - disponibilidad;
  - selectores de variantes;
  - beneficios de compra;
  - acordeones de descripción, envíos y asesoría;
  - integración de metacampos debajo del bloque principal.
- Metacampos convertidos en dossier olfativo modular.
- Mejoras visuales en colecciones, familias aromáticas, destacados, quiz, tarjetas y footer.
- Responsive para escritorio, tablet y móvil.
- Textos de compra traducidos a español.
- `lang` actualizado a `es-MX`.

## Archivos principales modificados

- `app/styles/essenze-design-system.css`
- `app/routes/products.$handle.jsx`
- `app/components/product.module.css`
- `app/components/Header.module.css`
- `app/components/Hero.module.css`
- `app/components/ProductMetafields.module.css`
- `app/components/AddToCartButton.module.css`
- `app/components/FeaturedFragrances.module.css`
- `app/components/AromaticNotes.module.css`
- `app/components/LookbookEstacional.module.css`
- `app/styles/PersonalizedFragrance.module.css`
- `app/components/ProductCard.module.css`
- `app/components/Footer.module.css`
- `app/components/ProductForm.jsx`
- `app/components/ProductImage.jsx`
- `app/root.jsx`

## Instalación

1. Conserva tu `.env` únicamente en tu equipo local.
2. Copia el proyecto o aplica el parche respetando la estructura de carpetas.
3. Elimina instalaciones anteriores si dan problemas:

```bash
rm -rf node_modules
npm install
npm run dev
```

## Seguridad

No se incluyó ningún archivo `.env` ni credencial en esta entrega. Como credenciales privadas fueron compartidas en una conversación, regenera el token privado y el secreto de sesión antes de desplegar.
