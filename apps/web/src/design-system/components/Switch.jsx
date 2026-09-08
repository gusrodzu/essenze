import styles from './Switch.module.css';

export function Switch({checked, onChange, label, description}) {
  return (
    <label className={styles.wrapper}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${styles.switch} ${checked ? styles.checked : ''}`}
        onClick={() => onChange?.(!checked)}
      >
        <span />
      </button>
      <span className={styles.copy}>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}
