import styles from './Input.module.css';

export function Input({
  label,
  hint,
  error,
  icon: Icon,
  id,
  className = '',
  ...props
}) {
  const inputId = id || props.name;

  return (
    <label className={`${styles.field} ${className}`.trim()} htmlFor={inputId} data-bb-input-field>
      {label ? <span className={styles.label}>{label}</span> : null}
      <span className={`${styles.control} ${error ? styles.hasError : ''}`} data-bb-input-shell>
        {Icon ? <Icon size={18} aria-hidden="true" /> : null}
        <input id={inputId} data-bb-input-control {...props} />
      </span>
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}
