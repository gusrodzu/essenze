# BuzzBee Data Hub v2 — v6.2.0

## Capacidades nuevas

### 1. Dos estrategias de migración
- `CREATE_ONLY`: solo crea; coincidencias existentes quedan inválidas.
- `UPSERT`: crea registros nuevos y actualiza coincidencias existentes.

### 2. Comparación antes / después
Cada fila de actualización conserva `beforeData` y muestra diferencias antes del commit.

### 3. Rollback por lote
- Registros creados: Data Hub intenta eliminarlos.
- Registros actualizados: Data Hub restaura el snapshot anterior.
- Si una alta ya tiene dependencias que impiden su eliminación, la fila queda `ROLLBACK_ERROR`.
- El lote termina `ROLLED_BACK` o `ROLLBACK_PARTIAL`.

### 4. Trazabilidad
`DataImportJob` conserva:
- entidad;
- modo;
- mapping;
- conteos;
- estado;
- fecha de commit;
- fecha de rollback.

`DataImportRow` conserva:
- acción CREATE/UPDATE;
- rawData;
- normalizedData;
- beforeData;
- targetId;
- errores de importación;
- errores de rollback.

## Correcciones incluidas
v6.2.0 corrige dos problemas detectados en v6.1.0:
1. Los permisos `master_data.*` y `data_hub.*` no se habían insertado en `seed.js` porque el seed usa tuplas y el hotfix anterior buscaba objetos.
2. ProductCategory, Department y Position no tienen `@@unique([companyId, name])`; Data Hub v1 intentaba usar `companyId_name`. v2 usa búsqueda por nombre y genera códigos únicos válidos.

## Seguridad
El rollback es explícito y nunca se ejecuta automáticamente. No se usa reset de Prisma ni operaciones destructivas sobre la base completa.
