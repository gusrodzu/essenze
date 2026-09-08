# BuzzBee ERP v9.1.0 — Procure-to-Pay Functional QA

Checklist oficial del flujo ERP Cliente:

**SOLPED → Aprobación → Orden de Compra → Aprobación OC → Emisión → Recepción → Inventario/Kardex → CxP → Pago → Dashboard**

## Seguridad

El comando `npm run qa:p2p` es **read-only por defecto**.

Para ejecutar el flujo transaccional completo hay que habilitarlo explícitamente:

```powershell
$env:P2P_WRITE="1"
npm run qa:p2p
```

El modo WRITE:
- crea registros QA con prefijo `QA-P2P-...`;
- no ejecuta `prisma migrate reset`;
- no elimina volúmenes;
- no elimina registros existentes;
- no hace rollback destructivo;
- genera un reporte JSON en `artifacts/qa/`.

## Comandos

```powershell
npm run qa:p2p:static
npm run qa:p2p

$env:P2P_WRITE="1"
npm run qa:p2p
```

Credenciales por defecto para QA:
- `P2P_EMAIL=admin@erp.local`
- `P2P_PASSWORD=Admin123!`

Se pueden reemplazar con variables de entorno.

## Criterios PASS

1. API y PostgreSQL listos.
2. Login y tenant válidos.
3. Endpoints de SOLPED, OC, aprobaciones, recepciones, inventario, Kardex y CxP responden.
4. SOLPED DRAFT → PENDING → APPROVED.
5. OC DRAFT → APPROVED → ISSUED.
6. Recepción incrementa inventario.
7. Recepción crea movimiento `PURCHASE_RECEIPT`.
8. Documento del proveedor genera CxP.
9. Pago total deja la CxP en `PAID` con saldo cero.
10. Dashboard de Procure-to-Pay sigue respondiendo al finalizar.

No hay cambios de Prisma en v9.1.0.
