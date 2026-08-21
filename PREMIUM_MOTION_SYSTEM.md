# Essenze — Premium Motion System 2026

## Objetivo

Añadir movimiento elegante y profesional sin convertir la tienda en una interfaz pesada o distractora. Las animaciones priorizan jerarquía, profundidad, respuesta al usuario y continuidad entre rutas.

## Sistema global

- `MotionEnhancer.jsx` observa módulos visibles y aplica revelados progresivos.
- Detecta contenido diferido de Hydrogen mediante `MutationObserver`.
- Reinicia suavemente la entrada visual al navegar entre rutas.
- Las superficies con `data-motion-surface` reaccionan a la posición del cursor mediante variables CSS.
- Todo el sistema respeta `prefers-reduced-motion`.
- No se añadió ninguna dependencia externa.

## Efectos incluidos

### Navegación y páginas

- Entrada suave entre rutas.
- Revelado con desenfoque y desplazamiento al entrar en viewport.
- Stagger progresivo para headers, grids, tracks y módulos.
- Microinteracciones en header, dropdowns, botones y footer.

### Home

- Hero con movimiento cinematográfico de fondo.
- Barrido de luz muy sutil.
- Entrada escalonada de título, descripción y CTAs.
- Trust bar con reflejo de cristal e iconos reactivos.
- Colecciones, notas aromáticas y destacados con profundidad y brillos controlados.

### Catálogo y producto

- Product Cards con luz reactiva al cursor, glow inferior y zoom refinado.
- Stock disponible con pulso discreto.
- Colecciones con barrido de luz y panel glass dinámico.
- Marcas con productos flotantes y tarjetas con halo dorado.
- Galerías, dossier olfativo y metacampos con elevación y transiciones.

### Asesor y comparador

- Barra de progreso animada.
- Opciones con brillo y estados seleccionados más claros.
- Carrusel 3D con glow controlado en la card activa.
- Detalles comparativos con interacción por celda.

## Archivos principales

- `app/components/MotionEnhancer.jsx`
- `app/styles/motion.css`
- `app/components/PageLayout.jsx`
- `app/styles/app.css`

Además se refinaron los CSS Modules de Hero, Header, Footer, Product Cards, Colecciones, Marcas, Catálogo, Asesor, Comparador y metacampos.

## Accesibilidad y rendimiento

- Compatible con teclado y navegación existente.
- Desactiva animaciones automáticamente cuando el sistema operativo solicita reducción de movimiento.
- Usa `IntersectionObserver` y deja de observar los elementos después de mostrarlos.
- No ejecuta bucles de animación en listas completas salvo efectos ambientales específicos y ligeros.
- No altera loaders, consultas GraphQL, carrito, variantes ni Storefront API.
