# BuzzBee ERP v9.8.0 — Administration & Finance Functional QA

Checkpoint:
**CxP → pagos → Tesorería → CxC → cobranza → Gastos → Presupuestos → Activos → Centro Administrativo → Reportes**

Correcciones incluidas:
- CxP puede asociar un pago a una cuenta de tesorería y generar `EXPENSE`.
- Se bloquea el pago si la cuenta de tesorería no tiene saldo suficiente.
- Cobranza corrige el modelo usado al aplicar saldo no aplicado (`CollectionReceipt`).
- Centro Administrativo calcula el valor neto de activos en vivo, igual que Activos Fijos.

QA:
```powershell
npm run qa:admin-finance:static
npm run qa:admin-finance
```

`qa:admin-finance` es read-only por defecto.

Prueba segura de tesorería:
```powershell
$env:ADMIN_QA_WRITE="1"
npm run qa:admin-finance
```

El modo WRITE registra un ingreso de $1 y una salida compensatoria de $1 para
comprobar que el saldo final sea exactamente el inicial.

No hay cambios Prisma en v9.8.0.
