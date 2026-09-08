# Metacampos integrados en Perfil de la fragancia

El proyecto consulta y muestra estos metacampos de producto del namespace `custom`:

- `custom.perfumista`
- `custom.ano_de_lanzamiento`
- `custom.notas_olfativas_imagen`
- `custom.envio_gratis`
- `custom.coleccion_privada`
- `custom.uso_noche`
- `custom.uso_dia`
- `custom.uso_invierno`
- `custom.uso_otono`
- `custom.uso_verano`
- `custom.uso_primavera`
- `custom.ocasion_y_temporadas`
- `custom.recomendaciones_de_uso`
- `custom.notas_base`
- `custom.notas_de_corazon`
- `custom.notas_de_salida`
- `custom.intensidad`
- `custom.genero`
- `custom.familias_olfativas`

También conserva:

- `custom.concentracion`
- `custom.duracion`
- `custom.estela`
- `custom.familia_olfativa`

## Comportamiento

Todos los módulos de Perfil de la fragancia permanecen visibles. Cuando un dato no está cargado, aparece `Información no disponible`, `No disponible` o un indicador neutral según el tipo de módulo.

La imagen de notas olfativas acepta un metacampo de tipo archivo con referencia a una imagen.

> Verifica en Shopify que el namespace y la clave coincidan exactamente. El nombre visible de una definición puede ser distinto de su clave interna.
