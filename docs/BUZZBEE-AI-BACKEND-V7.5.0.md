# BuzzBee v7.5.0 — AI Backend v1

## Qué cambia
BuzzBee AI deja de ser únicamente una interfaz. `/api/ai/ask` consulta datos reales del ERP con aislamiento por `companyId` y permisos del usuario.

## Seguridad
- Solo lectura.
- El cliente nunca envía `companyId`; se toma del JWT.
- No existe SQL libre ni Prisma generado por el modelo.
- Las fuentes están allowlisted en `buzzbeeAI.js`.
- Cada consulta queda en `AuditLog`.
- Las respuestas incluyen fuentes/evidencia de ERP.

## Proveedor
Sin `OPENAI_API_KEY`, BuzzBee genera una respuesta determinística a partir de los datos estructurados.
Con `OPENAI_API_KEY`, usa la Responses API para redactar una respuesta ejecutiva usando exclusivamente la evidencia recopilada.

Variables opcionales:
OPENAI_API_KEY=
BUZZBEE_AI_MODEL=gpt-5.6-sol

## Instalación
Esta versión agrega el permiso `ai.read` al seed, pero no agrega modelos/tablas Prisma.
Ejecutar `npm run db:seed` después de instalar para registrar el permiso.

No requiere `db:sync`.
