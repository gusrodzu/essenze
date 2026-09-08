# BuzzBee ERP v9.4.0 — Global Modal Format

El formato visual aprobado en Solicitudes de Compra se convierte en estándar
global de modales.

## Regla

Cada modal conserva su propia información y lógica. El sistema normaliza:
- encabezado visual;
- jerarquía título / contexto;
- estado y metadatos cuando el componente los proporciona;
- tabs;
- tarjetas de información;
- grupos label/value;
- notas, resoluciones y balances;
- tablas internas;
- formularios de crear/editar;
- footer de acciones;
- backdrop y centrado;
- responsive.

No se inventan campos. Un modal de CxP muestra información financiera; uno de
RRHH muestra datos del empleado; uno de POS muestra ticket, partidas y pagos;
uno de Compras muestra folios, estados y aprobación.

## Cobertura

El audit detecta y cubre 36 páginas funcionales con modales mediante el layer
global, además del modal SOLPED custom aprobado.

No hay cambios Prisma.
