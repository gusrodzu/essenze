# Corrección del hero de Colecciones

## Problema detectado

Los estilos globales del drawer estaban aplicándose a cualquier etiqueta HTML `aside` de la tienda. La portada de Colecciones usa un `aside` editorial para su directorio, por lo que heredaba accidentalmente `height: 100dvh`, desplazamiento lateral, fondo blanco y comportamiento de panel. Esto obligaba al grid del hero a crecer casi a la altura completa de la pantalla y dejaba el directorio recortado en el borde derecho.

## Corrección

- Los estilos del drawer ahora están limitados a `.overlay > aside`.
- Los `aside` editoriales vuelven a participar normalmente en sus layouts.
- El hero ocupa casi todo el ancho disponible, con menos margen blanco.
- Altura, padding, tipografía y separación vertical del hero fueron compactados.
- El contenido del hero queda centrado verticalmente en lugar de acumular espacio vacío arriba.
