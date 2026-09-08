# BuzzBee ERP v10.0.0 — CRM & Business Party Functional QA

Checkpoint:
**Prospectos → Clientes → Proveedores → Terceros → Contactos → Direcciones → Duplicados → Marketing**

Cambios funcionales:
- Cliente creado/actualizado sincroniza automáticamente Business Party.
- Proveedor creado/actualizado sincroniza automáticamente Business Party.
- Una entidad con el mismo RFC/email puede consolidar roles CUSTOMER + SUPPLIER.
- Se conserva compatibilidad con módulos operativos Customer/Supplier.
- Contactos y direcciones siguen administrándose desde Business Party.
- El merge conserva historial y bloquea fusiones que romperían trazabilidad operativa.

QA:
```powershell
npm run qa:crm-parties:static
npm run qa:crm-parties
```

`qa:crm-parties` es read-only por defecto.

E2E:
```powershell
$env:CRM_QA_WRITE="1"
npm run qa:crm-parties
```

El E2E crea cliente y proveedor QA con la misma identidad, valida que converjan
en un Business Party, agrega contacto y dirección, y conserva los registros para trazabilidad.

No hay cambios Prisma en v10.0.0.
