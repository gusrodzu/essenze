# BuzzBee Integration Hub v2 — v6.4.0

## Public API v1
Las API Keys emitidas por BuzzBee ahora autentican requests externos reales.

Base:
`/api/public/v1`

Autenticación:
- `Authorization: Bearer bb_live_...`
- o `x-api-key: bb_live_...`

Endpoints iniciales:
- GET /customers — customers.read
- POST /customers — customers.write
- GET /products — products.read
- POST /products — products.write
- GET /suppliers — purchases.read
- GET /sales/orders — sales.read
- GET /inventory/stock — inventory.read

Cada request autenticado genera `ApiAccessLog`.

## Event Bus v1
Servicio `emitIntegrationEventAsync()` registra eventos de dominio y despacha webhooks suscritos sin bloquear el request principal.

Eventos conectados automáticamente:
- customer.created
- customer.updated
- supplier.created
- supplier.updated
- product.created
- product.updated
- sales.order.created
- purchase.order.created
- datahub.import.completed

Cada evento genera `IntegrationEventLog` con endpoints, entregas correctas y fallidas.

## Seguridad
- API Keys siguen almacenándose solo como hash SHA-256.
- Scopes se validan antes de acceder a Public API.
- Credenciales revocadas o expiradas devuelven 401.
- Webhooks conservan firma HMAC SHA-256.
- Signing secrets permanecen cifrados AES-256-GCM.

## Pendiente
Inventory low_stock, expense.submitted y approval.required permanecen en el catálogo pero todavía deben conectarse a sus puntos exactos de dominio en una siguiente iteración.
