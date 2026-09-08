import styles from './KpiGrid.module.css';

export default function KpiGrid({children, className = ''}) {
  return (
    <section
      data-kpi-grid="true"
      className={`${styles.grid} ${className}`.trim()}
    >
      {children}
    </section>
  );
}
