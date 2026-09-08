# BuzzBee ERP v9.7.0 — Inventory Functional QA

Checklist:
**Existencias → Ajustes → Transferencias → Kardex → Costos → Consistencia final**

Valida stock negativo, ajustes IN/OUT, transferencias, TRANSFER_OUT/TRANSFER_IN,
integración PURCHASE_RECEIPT, integración SALE_OUT, historial y restauración del
stock neto durante el QA.

`npm run qa:inventory` es read-only por defecto.

Para E2E:
```powershell
$env:INVENTORY_QA_WRITE="1"
npm run qa:inventory
```

Si sólo existe un almacén, el QA crea un almacén secundario QA sin borrar datos.
No hay cambios Prisma adicionales sobre v9.6.0.
