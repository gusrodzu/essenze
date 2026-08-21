# Metacampos de producto — Essenze

La página `app/routes/products.$handle.jsx` consulta los metacampos mediante el arreglo exportado desde:

- `app/components/ProductMetafields.jsx`

El diseño visual se encuentra en:

- `app/components/ProductMetafields.module.css`

## Namespace y keys utilizados

El componente supone que los campos personalizados usan el namespace `custom`:

- `sexo_objetivo`
- `forma_del_producto`
- `tipo_de_dispensador`
- `ocasion`
- `fragancia`
- `familia_olfativa`
- `material`
- `color`
- `ocasion_y_temporadas`
- `uso_noche`
- `uso_dia`
- `uso_otono`
- `uso_verano`
- `uso_primavera`
- `uso_invierno`
- `envio_gratis`
- `recomendaciones_de_uso`
- `notas_olfativas_imagen`
- `coleccion_privada`
- `genero`
- `notas_base`
- `intensidad`
- `familias_olfativas`

Para productos complementarios se consultan estas dos posibilidades:

- `shopify--discovery--product_recommendation.complementary_products`
- `custom.complementary_products`

## Importante

Revisa en Shopify Admin cada definición y confirma su `namespace` y `key`. Si uno es distinto, modifica solamente `PRODUCT_METAFIELD_DEFINITIONS`.

Cada definición que deba mostrarse en Hydrogen necesita acceso de Storefront configurado como lectura pública (`PUBLIC_READ`).
