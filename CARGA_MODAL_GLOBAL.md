# Carga modal global

La experiencia de carga ahora se renderiza mediante `createPortal` directamente en `document.body`.

Esto evita que quede limitada por el módulo que la activa, por contenedores con `overflow`, por transformaciones CSS o por contextos de apilamiento locales.

Características:

- Posición fija sobre toda la ventana.
- Centrada sin importar la ubicación del usuario en la página.
- Sin botón de cerrar.
- Bloqueo de scroll y de interacción con el contenido inferior.
- Compatible con escritorio, móvil y orientación horizontal.
- Atributos accesibles de diálogo modal y estado ocupado.
