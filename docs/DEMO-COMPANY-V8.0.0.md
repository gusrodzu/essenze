# BuzzBee ERP v8.0.0 — Demo Company

**Track:** 🔵 ERP Cliente / 🟢 Compartido  
**Hito 6:** Demo Company — ERP Cliente Demo Ready.

## Objetivo
Preparar una empresa aislada con datos realistas y una historia operativa end-to-end.

## Incluye
- Empresa `BuzzBee Demo Company`.
- Usuario demo interno.
- Sucursal Monterrey.
- Almacén.
- 6 productos.
- 3 proveedores.
- 3 clientes.
- 5 empleados.
- Inventario con un caso de stock crítico.
- SOLPED demo.
- Orden de Compra demo.
- Recepción parcial.
- Cuenta por Pagar.
- Cuenta por Cobrar vencida.
- Asistencia del día.
- Permiso pendiente.
- Incidencia RH.
- Business Party para clientes/proveedores.
- Demo Readiness 0–100%.
- Pantalla `Reportes → Demo Company`.
- Guion comercial de 8 pasos.
- Demo Ejecutiva muestra también el Demo Readiness.

## Seed
```powershell
npm run db:seed:demo-company
```

El script usa upsert/find-or-create y está acotado a la empresa demo. No elimina empresas ni datos de terceros.

## Credenciales internas
- Usuario: `demo@buzzbee.mx`
- Contraseña inicial: `BuzzBee2026!`

Cambiar contraseña antes de exponer un entorno públicamente.

## Instalación
```powershell
npm install
npm run db:generate
npm run db:seed
npm run db:seed:demo-company
npm run demo:company:audit
npm run dev
```

Luego:
```powershell
npm run smoke
```

No requiere `db:sync`. No cambia schema Prisma.
