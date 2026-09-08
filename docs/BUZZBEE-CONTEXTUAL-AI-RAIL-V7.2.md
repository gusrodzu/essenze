# BuzzBee v7.2.0 — Contextual AI Rail

## Global UI rule

BuzzBee AI and the Application Launcher are global Business OS components.

Desktop >= 1280px:
- visible persistently on every protected route;
- sticky right rail;
- AI suggestions adapt to the current route;
- Applications respect CompanyModule when available.

Tablet / mobile:
- the persistent rail is replaced by a floating BuzzBee button;
- BuzzBee AI opens as a drawer/panel;
- module context is preserved.

## Contexts implemented

- Home
- Ventas
- Compras
- Inventario / Almacenes
- CRM / Clientes
- Finanzas / Gastos / Activos
- Recursos Humanos
- Producción
- Proyectos
- Marketing
- Intelligence / Reportes
- Sistema

## Application Launcher

Shows common apps:
Ventas, Compras, Inventario, POS, CRM, Finanzas, Facturación, RR.HH., Proyectos, Reportes and BuzzBee AI.

When `/api/modules/dashboard` is available, disabled company modules are removed from the launcher.

## AI scope

v7.2 implements contextual prompts and module-aware UI.

It does NOT yet call an external LLM. The existing assistant form remains prepared for a later BuzzBee AI backend/provider integration.
