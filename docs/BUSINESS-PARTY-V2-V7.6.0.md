# BuzzBee ERP v7.6.0 — Business Party v2

**Track:** 🟢 Compartido — ERP Cliente + BuzzBee SaaS  
**Roadmap:** Hito 2 — Terceros / Business Party Core v2

## Incluye
- Contactos múltiples por tercero.
- Cargo y departamento por contacto.
- Contacto principal.
- Direcciones múltiples.
- Tipos Fiscal, Facturación, Envío, Oficina y Otro.
- Dirección principal.
- Tags empresariales.
- Score de completitud de perfil.
- Terceros 360 ampliado.
- Centro de deduplicación.
- Matching por RFC, correo, teléfono y nombre.
- Confianza de coincidencia.
- Merge manual seguro.
- Historial de fusiones.
- Bloqueo de merge cuando existen dos clientes operativos distintos.
- Bloqueo de merge cuando existen dos proveedores operativos distintos.
- Sincronización compatible con Customer/Supplier existentes.
- Sincronización crea contacto/dirección inicial a partir de datos legacy cuando existen.

## Filosofía
Esta versión NO reemplaza Customer ni Supplier.
Business Party sigue siendo la capa de identidad maestra y se integra de forma progresiva.

## Base de datos
Esta versión agrega:
- `BusinessPartyContact`
- `BusinessPartyAddress`
- `BusinessPartyMergeHistory`
- `BusinessParty.tags`
- `BusinessPartyAddressType`

Son cambios aditivos. No se elimina información existente.

## Instalación segura
Con PostgreSQL/Docker activo:

```powershell
npm install
npm run update
npm run party:audit
npm run dev
```

`npm run update` ejecuta Prisma generate, db push y seed sin flags destructivos.

Si Prisma muestra una advertencia de posible pérdida de datos:
**DETENERSE** y revisar antes de aceptar.

Nunca ejecutar:
- `prisma migrate reset`
- `docker compose down -v`
- eliminar volúmenes PostgreSQL
