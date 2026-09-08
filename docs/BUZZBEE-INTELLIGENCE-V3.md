# BuzzBee Intelligence v3 — v6.9.0

## Business Health Score
Score 0–100 con cuatro dimensiones:
- Comercial 30%
- Operaciones 25%
- Finanzas 30%
- Plataforma 15%

Niveles:
- HEALTHY >=85
- WATCH >=70
- RISK >=50
- CRITICAL <50

## Intelligence → BuzzBee Flow
Eventos:
- intelligence.insight.created
- intelligence.insight.escalated

Los eventos están disponibles en Flow e Integration Hub.

## Scanner automático
Por defecto se ejecuta cada 6 horas.

Variables:
- INTELLIGENCE_SCAN_INTERVAL_MS
- INTELLIGENCE_SCAN_STARTUP_DELAY_MS

Mínimo de intervalo: 15 minutos.

## Safe Update
Se mantiene:
`npm run update`
