# BuzzBee Data Hub v1 — v6.1.0

Data Hub implementa la puerta de entrada controlada de información al Business OS.

## Flujo oficial
1. Selección de entidad: Clientes, Proveedores, Productos o Empleados.
2. Carga CSV/XLSX/XLS.
3. Detección de encabezados.
4. Sugerencia automática de mapeo.
5. Mapeo manual.
6. Normalización y validación.
7. Detección de registros existentes.
8. Staging en `DataImportJob` + `DataImportRow`.
9. Preview.
10. Commit de filas válidas.
11. Historial y trazabilidad.

## Seguridad de datos
- No borra registros existentes.
- No actualiza registros existentes en v1.
- Si una clave/RFC/SKU/número de empleado ya existe, la fila se marca inválida.
- Filas inválidas nunca se importan.
- Límite v1: 5,000 filas y 10 MB por archivo.

## Formatos
- CSV
- XLSX
- XLS

## Siguiente fase
- modo crear/actualizar;
- plantillas descargables;
- reglas de transformación configurables;
- importaciones en background;
- reversa/rollback por lote;
- conectores directos con Shopify, Google Sheets y APIs externas.
