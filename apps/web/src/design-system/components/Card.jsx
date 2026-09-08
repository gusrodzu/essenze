import styles from './Card.module.css';

export function Card({children, className = '', padding = 'md', ...props}) {
  return (
    <section
      className={`${styles.card} ${styles[padding]} ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}
