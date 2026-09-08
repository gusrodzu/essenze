import styles from './Button.module.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {!loading && Icon && iconPosition === 'left' ? (
        <Icon size={17} aria-hidden="true" />
      ) : null}
      <span>{loading ? 'Procesando…' : children}</span>
      {!loading && Icon && iconPosition === 'right' ? (
        <Icon size={17} aria-hidden="true" />
      ) : null}
    </button>
  );
}
