# BuzzBee v7.4.1 — Fixed Business OS Shell

## Comportamiento oficial

La pantalla funciona como un Business OS:

- Sidebar: permanece visible.
- Topbar: permanece visible.
- BuzzBee AI: permanece visible.
- Aplicaciones: permanece visible.
- Explora todo el poder de BuzzBee: permanece visible en la parte inferior.
- Solo el contenido del módulo/ruta se desplaza verticalmente.

## Implementación

`AppShell.workspace` ocupa `100vh` y usa tres filas:

1. Topbar
2. Business layout
3. Power Banner

El `main.content` es el único contenedor con `overflow-y:auto`.

El Power Banner no usa `position: fixed` ni se superpone al contenido:
forma parte de la fila inferior fija del shell.

No hay cambios de base de datos.
