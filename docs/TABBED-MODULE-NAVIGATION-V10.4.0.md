# BuzzBee ERP v10.4.0 — Navegación por pestañas

Nueva regla UX oficial:

- El sidebar contiene sólo módulos principales.
- No se muestran submenús desplegables para secciones internas.
- Al entrar a un módulo compuesto aparece una barra de pestañas debajo del Topbar.
- Las pestañas usan el mismo mapa de rutas de `navigation.js`.
- En pantallas angostas se desplazan horizontalmente.

Aplicado automáticamente a los módulos que ya tienen subsecciones:
Ventas, Compras, Inventario, Finanzas, RR. HH. y Reportes.

No hay cambios Prisma.
