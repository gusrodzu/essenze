# BuzzBee KPI Design System

Desde v5.10.1, todos los KPI deben usar:

```jsx
<KpiGrid>
  <KpiCard>
    <Icon />
    <span>Nombre del KPI</span>
    <KpiInfo title="Nombre del KPI">Descripción clara del indicador.</KpiInfo>
    <strong>Valor</strong>
    <small>Contexto / comparación / periodo</small>
  </KpiCard>
</KpiGrid>
```

## Contrato visual
- `KpiGrid`: 4 columnas desktop, 2 tablet, 1 móvil.
- `KpiCard`: misma superficie, borde, radio, sombra y hover.
- Icono: 20px, color primario.
- Título: 0.75rem, semibold.
- Valor: 1.28–1.6rem, peso 850.
- Contexto: 0.67rem, máximo dos líneas.
- `KpiInfo`: esquina superior derecha con explicación del indicador.
- Sin colores arbitrarios por tarjeta.
- Misma estructura para moneda, conteos, porcentajes, fechas y texto.

## Regla
Los nuevos módulos de BuzzBee no deben crear estilos KPI locales. Deben reutilizar `KpiGrid`, `KpiCard` y `KpiInfo`.
