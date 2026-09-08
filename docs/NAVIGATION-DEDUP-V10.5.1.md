# BuzzBee ERP v10.5.1 — Navigation Dedup

## Hallazgos corregidos

1. `/inteligencia` aparecía tres veces en el menú:
   - Principal → BuzzBee AI
   - Inteligencia → Analytics & Forecast
   - Inteligencia → BuzzBee AI

   Ahora existe una sola entrada canónica: **Inteligencia → Inteligencia**.
   BuzzBee AI permanece como asistente en el rail/CTA, no como menú duplicado.

2. `BuzzBee AI` también aparecía dentro de la tarjeta **Aplicaciones** del rail,
   inmediatamente debajo del propio módulo BuzzBee AI. Se eliminó ese acceso redundante.

3. Existían dos pantallas/rutas para clientes:
   - `/terceros` → BusinessParty (actual)
   - `/finanzas/clientes` → Customers (legacy)

   `/finanzas/clientes` ahora redirige a `/terceros`.

4. Existían dos accesos de RRHH:
   - `/recursos-humanos` → actual
   - `/rrhh` → HR Client legacy

   `/rrhh` ahora redirige a `/recursos-humanos`.

5. Command Palette deduplica destinos de navegación exactos.
   Las acciones rápidas conservan destinos repetidos intencionalmente porque
   representan acciones, no entradas de menú.

## Regla nueva
Una ruta funcional debe tener una sola entrada canónica en navegación.
Aliases históricos se conservan únicamente mediante redirects.

No hay cambios Prisma.
