# Essenze — Implementación del preview premium

Esta versión convierte el preview conceptual aprobado en una implementación real sobre el proyecto Shopify Hydrogen. La interfaz conserva el sistema visual blanco, negro, cristal y oro discreto, pero todos los datos, imágenes, precios, disponibilidad, marcas y variantes continúan viniendo de Shopify.

## Experiencia implementada

### Home

- Hero editorial oscuro con contenido y CTAs orientados a colección y asesoría.
- Franja de confianza con envío, muestras, pago seguro y atención personalizada.
- Colecciones reales de Shopify en composición visual premium.
- Familias olfativas con accesos navegables.
- Productos destacados con acción para agregar al comparador.
- Presentación compacta del Asesor Essenze.
- Comparador integrado y nueva ruta dedicada.

### Navegación

- Header desktop reorganizado en Perfumería, Marcas, Colecciones, Asesor y Descubrir.
- Dropdowns con cierre por navegación, clic exterior y tecla Escape.
- Normalización de enlaces internos provenientes del menú de Shopify.
- Menú móvil oscuro de pantalla completa, buscador y accesos rápidos.
- Dock inferior móvil con Inicio, Buscar, Categorías, Asesor y Cuenta.
- Paneles de carrito, búsqueda y navegación con bloqueo de scroll y gestión de foco.

### Catálogo, colecciones y marcas

- Toolbar común con ordenamiento funcional y filtro de disponibilidad.
- Paginación cursor-based de Shopify/Hydrogen.
- Página de catálogo completa.
- Página de colección individual.
- Índice visual de marcas con conteo y producto representativo.
- Página individual por marca.
- Product cards renovadas con disponibilidad, rango de precio, tipo y comparador.

### Página de producto

- Galería con imágenes reales, miniaturas, contador y sincronización con la variante.
- Breadcrumbs hacia catálogo y marca.
- Panel de compra sticky en escritorio.
- Selector de variantes, disponibilidad y precio.
- Acción para agregar al comparador.
- Barra de compra fija en móvil.
- Dossier de metacampos y beneficios de compra.

### Herramientas dedicadas

- `/asesor`: quiz completo de recomendación personalizada.
- `/comparador`: comparación de hasta tres fragancias.
- Persistencia local de la selección del comparador.

## Nuevos archivos principales

- `app/components/TrustBar.jsx`
- `app/components/MobileDock.jsx`
- `app/components/CatalogToolbar.jsx`
- `app/lib/catalogSort.js`
- `app/routes/asesor.jsx`
- `app/routes/comparador.jsx`
- `app/styles/ToolPage.module.css`

## Parámetros de catálogo

- `?sort=featured`
- `?sort=newest`
- `?sort=price-asc`
- `?sort=price-desc`
- `?sort=title-asc`
- `?available=1`

Los parámetros se pueden combinar. Al cambiar filtros u ordenamiento se reinicia la paginación para evitar cursores incompatibles.

## Validación realizada

- Sintaxis de 91 archivos JavaScript/JSX validada con el parser de TypeScript.
- 53 archivos CSS revisados por balance estructural.
- 49 imports de CSS Modules comprobados sin clases faltantes.
- Imports locales verificados.
- Todos los botones JSX tienen `type` explícito.
- No se incluyen `.env`, tokens, secretos, `node_modules`, builds ni cachés.

## Verificación local recomendada

```bash
rm -rf node_modules
npm ci
npm run codegen
npm run build
npm run dev
```

La validación completa contra Storefront API requiere las credenciales locales de la tienda y acceso público a los metacampos utilizados.
