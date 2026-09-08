import styles from './KpiCard.module.css';

export default function KpiCard({children, className = ''}) {
  return (
    <article
      data-kpi-card="true"
      className={`${styles.card} ${className}`.trim()}
    >
      {children}
    </article>
  );
}
