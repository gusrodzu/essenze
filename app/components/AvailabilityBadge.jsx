import styles from './AvailabilityBadge.module.css';

/**
 * Indicador de disponibilidad reutilizable de Essenze.
 * Presenta el estado como una cápsula de cristal con acento contextual.
 */
export function AvailabilityBadge({
  available = true,
  label,
  compact = false,
  className = '',
}) {
  const text = label || (available ? 'Disponible' : 'Agotado');

  return (
    <span
      aria-label={`Disponibilidad: ${text}`}
      className={`${styles.badge} ${
        available ? styles.available : styles.unavailable
      } ${compact ? styles.compact : ''} ${className}`.trim()}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{text}</span>
    </span>
  );
}

export default AvailabilityBadge;
