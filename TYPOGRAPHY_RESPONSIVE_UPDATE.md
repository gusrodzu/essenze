# Ajuste tipográfico responsive

Se agregó una capa global de seguridad tipográfica en `app/styles/responsive-typography.css` y se importó al final de `app/styles/app.css`.

Incluye:
- Escala fluida con `clamp()` para títulos, subtítulos, cuerpo y microcopy.
- Límites de tamaño específicos para tablet, móvil y teléfonos estrechos.
- `text-wrap: balance` en títulos y `text-wrap: pretty` en párrafos.
- Protección contra desbordamiento de nombres largos de productos y colecciones.
- Inputs y botones con mínimo de 16 px en móvil para evitar zoom involuntario en navegadores.
- Ajustes específicos del Asesor Olfativo para mantener títulos en dos líneas naturales sin insertar `<br>` rígidos.

No se utilizaron `<br>` forzados porque el balanceo CSS se adapta mejor a diferentes idiomas, nombres y tamaños de pantalla.
