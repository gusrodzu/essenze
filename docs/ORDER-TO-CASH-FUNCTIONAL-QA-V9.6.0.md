# BuzzBee ERP v9.6.0 — Order-to-Cash Functional QA

Checklist funcional oficial:

**Cotización → Envío/Aceptación → Pedido → Confirmación → Entrega/Remisión → Inventario/Kardex → Factura comercial → CxC → Cobranza → Tesorería → Dashboard**

## Corrección funcional incluida

Durante el QA estático se detectó una incompatibilidad real entre Ventas e Inventario:

- `salesFulfillment.js` intentaba crear `InventoryMovement` con campos inexistentes (`userId`, `referenceType`, `referenceId`, `referenceFolio`).
- El enum `InventoryMovementType` tampoco contenía `SALE_OUT`.

v9.6.0 corrige el route para usar el modelo canónico:
- `createdById`
- `reference`
- `occurredAt`

y agrega **únicamente** el valor `SALE_OUT` al enum `InventoryMovementType`.

Este es un cambio de schema aditivo, no destructivo.

## Ejecución segura

Primero actualiza schema con el updater seguro:

```powershell
npm run update
```

Si Prisma llegara a advertir pérdida de datos, **detén el proceso**. No uses reset.

Después:

```powershell
npm run qa:o2c:static
npm run qa:o2c
```

`qa:o2c` es read-only por defecto.

Para ejecutar el flujo real completo:

```powershell
$env:O2C_WRITE="1"
npm run qa:o2c
```

El modo WRITE crea registros QA y no elimina información existente.

El reporte se guarda en `artifacts/qa/`.
