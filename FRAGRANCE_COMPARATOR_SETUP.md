# Comparador de fragancias Essenze

El módulo **Compara Nuestras Fragancias** ahora trabaja directamente con los productos reales de Shopify y permite comparar hasta tres perfumes.

## Funciones incluidas

- Selección independiente de tres fragancias.
- Buscador por nombre, marca, familia, género, concentración u ocasión.
- Prevención de productos duplicados.
- Intercambio automático cuando una fragancia ya ocupa otro espacio.
- Botón para retirar una fragancia o limpiar toda la comparación.
- Persistencia de la selección mediante `localStorage`.
- Integración con el botón **Comparar** de Productos Destacados.
- Respaldo para clics realizados antes de que termine de cargar el comparador.
- Carrusel 3D responsive con tres tarjetas, navegación táctil, teclado, flechas e indicadores.
- Enlace directo a la ficha de cada producto.
- Manejo seguro de productos con información incompleta.

## Información comparada

El módulo muestra, cuando existe:

- Marca.
- Familia olfativa.
- Perfil o género.
- Concentración.
- Intensidad.
- Uso recomendado.
- Temporadas.
- Presentaciones o tamaños.
- Tipo de dispensador.
- Disponibilidad.
- Precio.
- Notas base o recomendaciones de uso.

## Metacampos consultados

El comparador usa el namespace `custom` y las siguientes claves:

```text
sexo_objetivo
genero
forma_del_producto
tipo_de_dispensador
ocasion
ocasion_y_temporadas
fragancia
familia_olfativa
familias_olfativas
recomendaciones_de_uso
notas_base
intensidad
uso_dia
uso_noche
uso_otono
uso_verano
uso_primavera
uso_invierno
```

Si un producto no tiene todos los metacampos, el módulo intenta inferir algunos valores desde `tags`, `productType`, título y descripción. Los valores faltantes se presentan como **No especificado**, sin romper la interfaz.

## Integración desde otros componentes

Para enviar cualquier producto al comparador se puede importar:

```js
import {queueProductForComparison} from '~/lib/fragranceComparator';

queueProductForComparison(product.id);
```

La función guarda temporalmente el producto y dispara el evento global del comparador. Esto permite usar el mismo comportamiento desde tarjetas, colecciones o páginas de producto.

## Archivos modificados

```text
app/components/FragranceComparator.jsx
app/components/ComparadorFragancias.module.css
app/components/FeaturedFragrances.jsx
app/components/FeaturedFragrances.module.css
app/lib/fragranceComparator.js
app/routes/_index.jsx
```

## Prueba recomendada

1. Ejecuta `npm run dev`.
2. Abre la Home.
3. Busca una fragancia dentro del comparador.
4. Cambia cada uno de los tres selectores.
5. Comprueba que no permita repetir el mismo producto.
6. Recarga la página y confirma que conserva la selección.
7. Haz clic en **Comparar** desde Productos Destacados.
8. Recorre las tarjetas con flechas, teclado y gesto horizontal en escritorio y móvil.

## Acceso de Storefront

Los metacampos que quieras mostrar deben tener acceso de lectura para Storefront. Si algún dato aparece como **No especificado**, revisa el namespace, la clave y el acceso de la definición en Shopify.
