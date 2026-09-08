# BuzzBee Intelligence v2 — v6.8.0

## Nuevas capacidades

### Snapshots históricos
Cada ejecución del scanner guarda una fotografía diaria de las métricas oficiales en `IntelligenceMetricSnapshot`.

Esto permite separar:
- valor actual;
- evolución histórica;
- comparación;
- tendencia.

### Tendencias
El dashboard de Intelligence incluye una vista de Tendencias con las series disponibles.

### Proyección operativa
Cuando hay al menos 3 snapshots, BuzzBee puede calcular una tendencia lineal simple de 7 puntos.

La proyección devuelve:
- número de muestras;
- pendiente;
- R²;
- cambio proyectado;
- próximos valores estimados.

No se presenta como una predicción garantizada ni como una salida de IA.

### Insights por tendencia
Con al menos 5 muestras y una señal suficientemente consistente, BuzzBee puede generar una recomendación por tendencia descendente de ventas.

## Safe Update

A partir de esta versión:

```powershell
npm run update
```

ejecuta:
1. `npm install`
2. `npm run db:generate`
3. `prisma db push` en modo no interactivo/CI
4. `npm run db:seed`

El script:
- no ejecuta `prisma migrate reset`;
- no usa `--force-reset`;
- no usa `--accept-data-loss`;
- no elimina volúmenes;
- se detiene si un paso falla.

También está disponible:

```powershell
npm run update:check
```

para comprobar `Prisma Client` sin sincronizar la base.

## Desarrollo sin reinicios manuales

El API usa nodemon en `npm run dev`, por lo que cambios JS reinician automáticamente el proceso API.
Vite conserva su hot reload para Web.
