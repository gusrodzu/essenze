import styles from './FragranceRadar.module.css';

const AXIS_LABELS = [
  'Intensidad',
  'Duración',
  'Estela',
  'Noche',
  'Versatilidad',
  'Día',
];

const CENTER = 170;
const RADIUS = 112;
const LEVELS = 5;

function polarPoint(index, radius) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXIS_LABELS.length;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function pointsForRadius(radius) {
  return AXIS_LABELS.map((_, index) => {
    const point = polarPoint(index, radius);
    return `${point.x},${point.y}`;
  }).join(' ');
}

function scorePoint(index, score) {
  const normalized = Math.max(0.7, Math.min(5, Number(score) || 0.7));
  return polarPoint(index, (RADIUS * normalized) / LEVELS);
}

function getTone(score, available) {
  if (!available) return 'neutral';
  if (score <= 1.5) return 'red';
  if (score <= 2.5) return 'orange';
  if (score <= 3.5) return 'gold';
  if (score <= 4.5) return 'lime';
  return 'green';
}

export default function FragranceRadar({metrics = []}) {
  const normalizedMetrics = AXIS_LABELS.map((label, index) => ({
    label,
    score: metrics[index]?.score ?? 0.7,
    available: metrics[index]?.available ?? false,
    display: metrics[index]?.display || 'Información pendiente',
  }));

  const dataPoints = normalizedMetrics
    .map((metric, index) => {
      const point = scorePoint(index, metric.score);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <article className={styles.radarCard} aria-labelledby="fragrance-radar-title">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Radiografía olfativa</span>
          <h3 id="fragrance-radar-title">ADN de la fragancia</h3>
        </div>
        <p>
          Una lectura visual de su rendimiento y de los momentos en los que
          mejor expresa su carácter.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.chartWrap}>
          <svg
            className={styles.chart}
            viewBox="0 0 340 340"
            role="img"
            aria-label="Gráfica hexagonal de intensidad, duración, estela, uso de noche, versatilidad y uso de día"
          >
            <defs>
              <linearGradient id="essenzeRadarFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d9b66f" stopOpacity="0.76" />
                <stop offset="100%" stopColor="#8da638" stopOpacity="0.34" />
              </linearGradient>
              <filter id="essenzeRadarGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {Array.from({length: LEVELS}).map((_, level) => (
              <polygon
                className={styles.gridPolygon}
                key={level}
                points={pointsForRadius((RADIUS * (level + 1)) / LEVELS)}
              />
            ))}

            {AXIS_LABELS.map((_, index) => {
              const outer = polarPoint(index, RADIUS);
              return (
                <line
                  className={styles.axisLine}
                  key={index}
                  x1={CENTER}
                  y1={CENTER}
                  x2={outer.x}
                  y2={outer.y}
                />
              );
            })}

            <polygon
              className={styles.dataPolygon}
              points={dataPoints}
              filter="url(#essenzeRadarGlow)"
            />

            {normalizedMetrics.map((metric, index) => {
              const point = scorePoint(index, metric.score);
              const labelPoint = polarPoint(index, RADIUS + 31);
              const tone = getTone(metric.score, metric.available);

              return (
                <g className={styles.metricPoint} key={metric.label} tabIndex="0">
                  <title>{`${metric.label}: ${metric.display}`}</title>
                  <circle
                    className={`${styles.dot} ${styles[tone]}`}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                  />
                  <text
                    className={styles.axisLabel}
                    x={labelPoint.x}
                    y={labelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {metric.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className={styles.metricList}>
          {normalizedMetrics.map((metric) => {
            const tone = getTone(metric.score, metric.available);
            return (
              <div className={styles.metricRow} key={metric.label}>
                <span className={`${styles.metricColor} ${styles[tone]}`} aria-hidden="true" />
                <div>
                  <span>{metric.label}</span>
                  <strong className={!metric.available ? styles.pending : undefined}>
                    {metric.display}
                  </strong>
                </div>
                <span className={styles.metricScore}>
                  {metric.available ? `${Math.round(metric.score)}/5` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
