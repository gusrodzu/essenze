# BuzzBee ERP v7.7.0 — Procure-to-Pay Flow v1

**Track:** 🔵🟢 ERP Cliente + BuzzBee Core reutilizable  
**Objetivo comercial:** convertir Compras en un flujo demostrable de punta a punta.

## Flujo
SOLPED → BuzzBee Aprobaciones → Orden de Compra → Aprobación OC → Emisión → Recepción → Inventario/Kardex → Cuentas por Pagar.

## Correcciones importantes
- Se eliminó la dependencia inválida de `prisma.companyUser` en Aprobaciones.
- Los aprobadores ahora se resuelven con `UserRole` + `RolePermission`, que sí existen en el schema real.
- Las decisiones finales de Aprobaciones sincronizan la SOLPED.
- Una SOLPED con workflow ya no puede saltarse la aprobación usando el endpoint manual.

## Administración
Cuando una recepción incluye `supplierDocument`, BuzzBee:
1. registra la recepción;
2. incrementa inventario;
3. registra Kardex;
4. calcula subtotal e impuestos de la recepción;
5. genera una CxP ligada a la OC;
6. calcula vencimiento con `paymentTerms`.

Si no se captura documento del proveedor, no inventa una factura y no crea CxP automática.

## Workflows demo
El seed crea de forma idempotente:
- `purchase_request_default`
- `purchase_order_default`

Ambos son configurables después desde Aprobaciones.

## Base de datos
No hay cambios en `schema.prisma`.

Instalación:
```powershell
npm install
npm run db:seed
npm run procurement:audit
npm run dev
```

Con API y PostgreSQL activos:
```powershell
npm run smoke
```
