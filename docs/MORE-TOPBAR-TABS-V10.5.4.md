# BuzzBee ERP v10.5.4 — More Topbar Tabs

Migrados al Topbar:
- Producción
- Marketing
- Facturación Fiscal
- Proyectos
- CRM

Sus pestañas ya no se renderizan dentro del contenido. Se reutiliza `ModuleTabs`,
que mediante portal se presenta dentro de `ModuleTabBar`.

Para módulos de una sola ruta, `ModuleTabBar` ahora actúa como la superficie
superior de tabs aunque no exista una fila de rutas principales.

No hay cambios Prisma.
