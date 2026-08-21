# Essenze — Responsive & Product Polish

Esta iteración refina el diseño Modern Glass Luxury a partir de las capturas reales del proyecto en escritorio y móvil.

## Ajustes realizados

### Hero
- Elimina el espacio reservado para tarjetas cuando `categories` está vacío.
- Corrige la proporción vertical en móvil.
- Reduce el riesgo de que el título quede cortado.
- Ajusta tamaños, ancho del texto, descripción y botones por breakpoint.
- Corrige “Ver Colecciónes” y el doble punto del subtítulo.

### Header móvil
- Reduce ligeramente la altura de la barra informativa y del header.
- Mejora la transparencia de cristal y la escala del logotipo.
- Ajusta los iconos en pantallas muy estrechas.

### Colecciones
- Cambia la sección a una base blanca con un acento dorado muy tenue.
- Reduce el espacio vertical excesivo en móvil.
- Ajusta el título para evitar cortes y mejorar la jerarquía.

### Página de producto
- Corrige el conflicto del selector global `.product-image`, que estaba aplicando un segundo layout sticky dentro de la vitrina.
- Integra una clase específica para la imagen de producto.
- Reduce el tamaño excesivo de la vitrina y del panel de compra.
- Hace que el fondo blanco de las fotos se integre mejor con la interfaz.
- Aumenta visualmente el producto y mejora su sombra.
- Optimiza columnas, espacios, tarjetas de servicio y responsive.

### Metacampos
- Cambia el fondo gris por blanco.
- Convierte el bloque en un grid bento adaptable al número real de tarjetas.
- Evita columnas vacías cuando solo hay dos bloques principales.
- Reduce alturas y espacios excesivos.
- Corrige la numeración dinámica cuando no existe la imagen olfativa.
- Mejora móvil, tablet y escritorio.

## Instalación del parche

Copia el contenido de la carpeta del parche sobre la raíz del proyecto y conserva la estructura de carpetas.

Después ejecuta:

```bash
npm install
npm run dev
```

No se incluye `.env`, `node_modules` ni credenciales.
