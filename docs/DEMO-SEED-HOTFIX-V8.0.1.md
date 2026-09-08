# BuzzBee ERP v8.0.1 — Demo Seed Hotfix

Corrige el seed de Demo Company de v8.0.0 contra el schema Prisma real.

## Error principal
`Company.slug` no existe. La empresa demo ahora se identifica con el `taxId` único:

`BBD260904D01`

## Otras correcciones
- Role es global, no tiene `companyId`.
- Warehouse usa `@@unique([branchId, code])`.
- Position requiere `companyId`.
- PurchaseRequestItem no tiene `description`.
- PurchaseOrderItem requiere `subtotal`, `taxAmount` y `total`.
- GoodsReceipt usa `createdById`.
- HrIncident usa `LATE_ARRIVAL`, `amount`, `description` y `notes`.
- Eliminados `impactType` / `impactAmount`.
- Seed sin `deleteMany`: no elimina datos demo ni datos de otras empresas.
- Mantiene upserts/find-or-create para poder ejecutarlo repetidamente.

## Instalación
```powershell
npm install
npm run db:generate
npm run db:seed
npm run demo:seed:audit
npm run db:seed:demo-company
npm run dev
```

No ejecutar `db:sync`, `migrate reset` ni eliminar volúmenes.
