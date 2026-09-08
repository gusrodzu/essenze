# BuzzBee Flow v2 — v6.6.0

BuzzBee Flow convierte el Event Bus en un motor de automatización de procesos.

## Arquitectura

Evento -> Condiciones -> Acciones -> Run Log

Los eventos provienen del mismo Event Bus que alimenta Integration Hub.

## Condiciones

Modos:
- ALL
- ANY

Operadores:
- eq
- neq
- gt
- gte
- lt
- lte
- contains
- exists
- in

Las rutas se evalúan sobre el contexto:
`event.data.*`

## Acciones v2

### NOTIFY
Crea una notificación interna.

### CREATE_PURCHASE_REQUEST
Crea una solicitud de compra desde una automatización.

Ejemplo para low stock:
- warehouseId: `{{event.data.warehouse.id}}`
- productId: `{{event.data.product.id}}`
- quantity: `{{event.data.minStock}}`

### CREATE_APPROVAL
Inicia un ApprovalWorkflow existente.

Las acciones posteriores pueden usar salidas anteriores:
`{{actions.restock.id}}`
`{{actions.restock.folio}}`

## Trazabilidad

AutomationFlowRun registra cada ejecución.
AutomationFlowActionRun registra cada acción, input resuelto, output y error.

## Seguridad

Cada Flow tiene:
- createdById
- runAsUserId

Las acciones se ejecutan con un usuario explícito de la misma empresa.

## Ejemplo

Evento:
`inventory.low_stock`

Condición:
`event.data.quantity <= event.data.minStock`

Acciones:
1. CREATE_PURCHASE_REQUEST
2. CREATE_APPROVAL usando `{{actions.restock.id}}`
3. NOTIFY

Esto permite construir automatizaciones de negocio sin acoplar Inventario, Compras y Aprobaciones.
