# BuzzBee ERP v9.3.0 — Purchase Request Modal Redesign

Rediseño visual del modal de detalle de Solicitudes de Compra, basado en el
mockup aprobado.

Incluye:
- encabezado con folio, título, estado, prioridad y metadatos;
- tabs Resumen / Partidas / Aprobaciones;
- tarjeta de Información general;
- tarjeta de Justificación;
- tarjeta de Resolución;
- visualización del flujo de aprobación;
- tabla de partidas con total estimado;
- footer con las acciones funcionales existentes;
- responsive para split-screen y móvil.

No se inventan datos que el backend no entrega: la vista usa únicamente campos
existentes del registro de solicitud.

No hay cambios Prisma.
