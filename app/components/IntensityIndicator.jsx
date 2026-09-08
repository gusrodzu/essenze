import styles from './IntensityIndicator.module.css';

const LEVEL_LABELS = {
  1: 'Muy suave',
  2: 'Suave',
  3: 'Moderada',
  4: 'Intensa',
  5: 'Muy intensa',
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX');
}

export function getIntensityLevel(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(5, Math.max(1, Math.round(value)));
  }

  const normalized = normalizeText(value);
  if (!normalized) return 3;

  const numericMatch = normalized.match(/\b([1-5])(?:\s*\/\s*5)?\b/);
  if (numericMatch) return Number(numericMatch[1]);

  if (/muy alta|muy intensa|extrema|maxima|potente|excelente|enorme/.test(normalized)) return 5;
  if (/media alta|alta|intensa|fuerte|marcada|duradera|lasting|bold/.test(normalized)) return 4;
  if (/muy baja|muy suave|delicada|minima|tenue|corta/.test(normalized)) return 1;
  if (/media baja|baja|suave|ligera|sutil|moderada baja/.test(normalized)) return 2;
  if (/media|moderada|equilibrada|intermedia|promedio/.test(normalized)) return 3;

  // Duraciones expresadas en horas.
  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hora|horas)/);
  if (hourMatch) {
    const hours = Number(hourMatch[1].replace(',', '.'));
    if (hours >= 10) return 5;
    if (hours >= 7) return 4;
    if (hours >= 5) return 3;
    if (hours >= 3) return 2;
    return 1;
  }

  return 3;
}

export default function IntensityIndicator({
  value,
  labelPrefix = 'Intensidad',
  compact = false,
  showLabel = true,
  className = '',
}) {
  const level = getIntensityLevel(value);
  const label = LEVEL_LABELS[level];

  return (
    <span
      aria-label={`${labelPrefix}: ${label}`}
      className={`${styles.indicator} ${compact ? styles.compact : ''} ${className}`.trim()}
      role="img"
      title={`${labelPrefix}: ${label}`}
    >
      <span className={styles.bars} aria-hidden="true">
        {Array.from({length: 5}, (_, index) => (
          <span
            className={`${styles.bar} ${styles[`barLevel${index + 1}`]} ${
              index < level ? styles.barActive : styles.barInactive
            }`}
            key={index}
          />
        ))}
      </span>
      {showLabel ? <span className={styles.visibleLabel}>{label}</span> : null}
    </span>
  );
}
