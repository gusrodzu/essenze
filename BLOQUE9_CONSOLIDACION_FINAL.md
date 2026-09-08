# Bloque 9 — Consolidación final Essenze

Fecha: 08-09-2026

Esta versión consolida los Bloques 1–8 y añade un último pase de consistencia antes de pruebas en Hydrogen.

## Estado del checklist

### Header y hero
- Logo centrado en desktop.
- Barra superior sin bullets y con: Envíos nacionales / Pagos seguros con Mercado Pago / Entregas locales en la Zona Metropolitana de Monterrey.
- Se eliminó “Curaduría olfativa · México”.
- CTA principal estandarizado a “Fragancias Disponibles”.
- Ajuste de tracking del H1 para evitar traslapes.

### Descubrir y colecciones
- Accesos destacados a Disponibles y Más vendidos.
- Exploración reducida a Perfumes por temporada, Solicita un perfume, Sobre nosotros y Testimonios.
- Se eliminó el uso visual de Curated / Essenze Selection en destacados.
- Directorio y colecciones ampliados a 60 elementos por carga.
- “Familias olfativas” permanece dentro de Hydrogen.

### Product cards y producto
- CTA principal: Comprar.
- Comparar queda como acción secundaria.
- Comparar no recarga la página y conserva la selección.
- “Perfumería de autor” ya no aparece como etiqueta automática en product cards ni como categoría hardcodeada de la ficha de producto.

### Comparador
- Catálogo paginado de Shopify (250 por lote, hasta 1000 productos en el loader actual).
- Búsqueda visual con miniatura, nombre y marca.
- Selección sin recarga.
- Eliminada la etiqueta “3D”.
- Imágenes con object-fit: contain.
- Loader comparativo de 7 segundos, respetando reduced-motion.
- Perfil olfativo consistente y Estela integrada.
- Copy: “Revisa atributo por atributo sin perder la vista editorial del carrusel.”

### Biblioteca
- 60 productos por carga/página.
- 60 productos por colección.
- 60 colecciones por carga.
- Filtros y disponibilidad se resuelven desde Shopify.

### Login, búsqueda y footer
- Sesión inválida redirige a login en lugar de mostrar error técnico.
- Búsqueda normal usa `/search` dentro de Hydrogen.
- Enlaces internos del footer se normalizan a rutas Hydrogen.
- Footer en español y con “Envíos a todo México”.
- Newsletter: “novedades de la comunidad de Essenze”.
- Redes sociales y enlaces legales conservados.

### Beneficios y navegación
- Beneficio “Envío gratis” de interfaz sustituido por “Envíos a todo México”; el metacampo de producto “Envío gratis” se conserva porque es dato individual del producto.
- Dropdowns desktop cierran al salir con el cursor, al navegar, al hacer click fuera o al presionar Escape.

### QA responsive
- Protección contra overflow horizontal y textos cortados.
- Inputs a 16px en móvil para evitar zoom involuntario en iOS.
- Objetivos táctiles mínimos de 44px en acciones principales.
- Tablas con scroll horizontal controlado.
- Grids críticos pasan a una columna en pantallas muy estrechas.
- Focus visible y prefers-reduced-motion.

## Limpieza final del Bloque 9
- Eliminado subrayado decorativo del menú principal.
- Eliminada línea decorativa antes de “Lectura comparativa”.
- Eliminadas líneas ornamentales de HomeDiscoveryNav, MobileDock, destacados y tarjetas editoriales de metacampos.
- “La selección Essenze” del hero del catálogo se sustituyó por “Catálogo Essenze”.
- Se mantienen bordes estructurales, separadores funcionales y barras de progreso.

## Pendientes externos / de contenido
- Las rutas de Envíos y Cambios/Reembolsos están preparadas. El contenido legal definitivo debe validarse/publicarse en Shopify antes de producción.
- Conviene ejecutar `npm ci`, `npm run lint` y `npm run build` en el entorno local/CI con Shopify CLI disponible antes del deploy.
- Hacer smoke test conectado al Storefront real: búsqueda, login, carrito, checkout, comparador, filtros y productos sin inventario.

## Seguridad del paquete
El ZIP final no incluye `.env`, `.git`, `node_modules` ni `dist`.
