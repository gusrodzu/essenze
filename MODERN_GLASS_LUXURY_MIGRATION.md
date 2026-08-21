# Essenze — Modern Glass Luxury

Rediseño visual integral para Shopify Hydrogen inspirado en las referencias compartidas: composición editorial contemporánea, fondos blancos, secciones negras, superficies de cristal, líneas finas y acentos dorados discretos.

## Dirección visual

- Base blanca y gris neutro, sin tonos marfil.
- Negro profundo para contraste y secciones editoriales.
- Dorado envejecido reservado para etiquetas, líneas y estados premium.
- Paneles `glassmorphism` con transparencias, desenfoque y sombras suaves.
- Tipografías `Playfair Display` para títulos y `DM Sans` para interfaz.
- Botones tipo cápsula, bordes finos y animaciones sutiles.
- Diseño responsive con carruseles táctiles y navegación móvil.

## Archivos principales

- `app/styles/essenze-design-system.css`: tokens, colores, tipografía y utilidades globales.
- `app/styles/app.css`: rutas, colecciones, producto base, drawers, cuenta y blog.
- `app/components/Header.jsx`: agrega acceso visual al buscador desde el header.
- `app/components/Header.module.css`: header de cristal, navegación y nuevos iconos CSS.
- `app/components/Footer.module.css`: footer editorial negro con newsletter y datos de boutique.
- `app/components/Hero.module.css`: hero cinematográfico con marco editorial y tarjetas flotantes.
- `app/components/product.module.css`: ficha de producto moderna y panel de compra sticky.
- `app/components/ProductMetafields.module.css`: dossier olfativo modular.

## Aplicación del parche

Copia el contenido del parche sobre la raíz del proyecto conservando la misma estructura de carpetas. Reemplaza los archivos cuando el sistema lo solicite.

Después ejecuta localmente:

```bash
rm -rf node_modules
npm install
npm run dev
```

## Validaciones realizadas

- 62 archivos JSX analizados correctamente con Babel Parser.
- 42 archivos CSS analizados correctamente con Prettier CSS Parser.
- Todas las clases CSS Modules utilizadas por los componentes tienen una definición.

No fue posible completar `npm install` en el entorno de entrega por un fallo temporal de resolución de red hacia npm (`EAI_AGAIN`). No se incluyeron `node_modules`, `.env` ni credenciales.

## Seguridad

Regenera el token privado de Shopify y `SESSION_SECRET` que fueron compartidos en el chat antes de publicar o continuar el desarrollo. Mantén el archivo `.env` fuera del repositorio y de cualquier ZIP compartido.
