# BuzzBee ERP v9.2.1 — All Modals Centered

Se aplica un override global final para que todos los patrones de modal del
frontend aparezcan centrados, como en la UX original.

Patrones cubiertos:
- modal
- largeModal
- smallModal
- paymentModal
- duplicatesModal
- detailModal
- drawer/DetailDrawer de compatibilidad
- overlay
- backdrop
- customizerOverlay
- drawerLayer

La regla se importa al final de `main.jsx` para ganar sobre estilos legacy.

Se conservan:
- sidebar blanca;
- Design System v9;
- KPI estándar;
- tabs, tablas y controles;
- responsive;
- lógica funcional de cada módulo.

No hay cambios Prisma.
