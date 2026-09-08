# BuzzBee ERP v10.1.0 — POS Functional QA

Checkpoint:
**Terminal → Apertura → Ticket → Pago → Inventario → Kardex → Anulación → Reentrada → Cierre de caja**

## Correcciones funcionales
- La venta POS ahora descuenta inventario cuando la terminal tiene almacén.
- Genera Kardex `SALE_OUT`.
- La anulación restaura inventario y genera `SALE_RETURN_IN`.
- Se bloquean productos duplicados en el mismo ticket.
- Se mantiene el bloqueo por stock insuficiente.
- Se corrige el cierre de caja: una venta CASH ya está representada por `PosCashMovement SALE`, por lo que no se vuelve a sumar desde `PosPayment`.
- Se emiten eventos de bajo stock después de la venta.

## QA
```powershell
npm run qa:pos:static
npm run qa:pos
```

`qa:pos` es read-only por defecto.

Para E2E:
```powershell
$env:POS_QA_WRITE="1"
npm run qa:pos
```

El E2E crea una terminal QA, abre caja con $100, vende una unidad, valida
`SALE_OUT`, anula la venta, valida `SALE_RETURN_IN`, comprueba que el stock
vuelva al valor inicial y cierra caja sin diferencia.

## Prisma
v10.1.0 agrega únicamente `SALE_RETURN_IN` al enum `InventoryMovementType`.
Es un cambio aditivo. No uses reset ni borres volúmenes.
