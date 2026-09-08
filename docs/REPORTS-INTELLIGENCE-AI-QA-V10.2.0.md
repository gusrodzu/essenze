# BuzzBee ERP v10.2.0 — Reports + Intelligence + AI Functional QA

Checkpoint:
**P2P + O2C + Inventario + Finanzas + RRHH + CRM + POS → Reportes → Intelligence → BuzzBee AI**

Cambios:
- `sales.revenue_30d` ahora usa facturas de venta (`SalesInvoice.issueDate`) para representar ingresos facturados de forma consistente.
- Compras 30d usa `PurchaseOrder.orderDate`.
- Intelligence devuelve moneda de empresa.
- UI Intelligence queda en el estándar de 4 KPI compartidos.
- BuzzBee AI reconoce contexto `/pos` y usa un dataset POS permitido por `pos.read`.
- AI sigue siendo `READ_ONLY`, con fuentes y fallback determinístico.

QA:
```powershell
npm run qa:intelligence-ai:static
npm run qa:intelligence-ai
```

El QA normal es read-only.

Scan seguro opcional:
```powershell
$env:INTEL_QA_SCAN="1"
npm run qa:intelligence-ai
```

El scan crea/actualiza snapshots e insights del motor Intelligence. No elimina datos ni hace reset.

No hay cambios Prisma en v10.2.0.
