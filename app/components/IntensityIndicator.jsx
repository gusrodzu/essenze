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

  if (
    /muy alta|muy intensa|extrema|maxima|potente|fuerte extrema/.test(
      normalized,
    )
  ) {
    return 5;
  }

  if (
    /media alta|alta|intensa|fuerte|marcada|potente moderada/.test(normalized)
  ) {
    return 4;
  }

  if (/muy baja|muy suave|delicada|minima|tenue/.test(normalized)) {
    return 1;
  }

  if (/media baja|baja|suave|ligera|sutil/.test(normalized)) {
    return 2;
  }

  if (/media|moderada|equilibrada|intermedia|promedio/.test(normalized)) {
    return 3;
  }

  return 3;
}

export default function IntensityIndicator({
  value,
  compact = false,
  className = '',
}) {
  const level = getIntensityLevel(value);
  const label = LEVEL_LABELS[level];

  return (
    <span
      aria-label={`Intensidad: ${label}`}
      className={`${styles.indicator} ${
        compact ? styles.compact : ''
      } ${className}`.trim()}
      role="img"
      title={`Intensidad: ${label}`}
    >
      <span className={styles.bars} aria-hidden="true">
        {Array.from({length: 5}, (_, index) => (
          <span
            className={`${styles.bar} ${
              index < level ? styles.barActive : ''
            }`}
            key={index}
          />
        ))}
      </span>
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}
