# BuzzBee Intelligence v1 — v6.7.0

BuzzBee Intelligence crea una capa transversal de métricas e insights explicables.

## Métricas oficiales v1
- sales.revenue_30d
- purchases.total_30d
- inventory.value
- inventory.low_stock
- expenses.pending
- receivables.balance
- payables.balance
- flow.error_rate
- integration.dead_letters

Estas métricas se registran en `IntelligenceMetricDefinition` para comenzar a construir un catálogo semántico compartido.

## Insights v1
Tipos:
- ALERT
- ANOMALY
- RECOMMENDATION
- OPPORTUNITY

Severidades:
- INFO
- LOW
- MEDIUM
- HIGH
- CRITICAL

Estados:
- OPEN
- ACKNOWLEDGED
- RESOLVED
- DISMISSED

## Reglas iniciales
- stock crítico por producto/almacén;
- caída de ventas >=20% contra los 30 días anteriores;
- cuentas por cobrar >75% de ventas recientes;
- error rate de BuzzBee Flow >=20% con al menos 5 ejecuciones;
- entregas detenidas en Dead Letter Queue.

## Diseño
Intelligence v1 es deliberadamente explicable y determinístico.

No usa un modelo externo de IA ni presenta inferencias probabilísticas como hechos. Esto permite validar primero:
1. calidad de datos;
2. semántica de KPI;
3. trazabilidad;
4. utilidad de las recomendaciones.

Una capa predictiva/LLM podrá consumir estas métricas e insights posteriormente.
