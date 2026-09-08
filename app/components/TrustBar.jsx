import styles from './TrustBar.module.css';

const BENEFITS = [
  {
    icon: 'truck',
    title: 'Envíos a todo México',
    copy: 'Cobertura nacional',
  },
  {
    icon: 'gift',
    title: 'Muestras de regalo',
    copy: 'En compras seleccionadas',
  },
  {
    icon: 'shield',
    title: 'Pagos seguros',
    copy: 'Protección en cada compra',
  },
  {
    icon: 'spark',
    title: 'Atención personalizada',
    copy: 'Asesoría experta Essenze',
  },
];

export default function TrustBar() {
  return (
    <section className={styles.shell} aria-label="Beneficios Essenze" data-motion-reveal>
      <div className={styles.grid}>
        {BENEFITS.map((benefit) => (
          <article className={styles.item} key={benefit.title} data-motion-surface>
            <span className={styles.icon} aria-hidden="true">
              <BenefitIcon name={benefit.icon} />
            </span>
            <span className={styles.copy}>
              <strong>{benefit.title}</strong>
              <small>{benefit.copy}</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function BenefitIcon({name}) {
  if (name === 'truck') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6.5h11v10H3zM14 10h3.5l3 3v3.5H14z" />
        <circle cx="7" cy="18" r="1.7" />
        <circle cx="17.5" cy="18" r="1.7" />
      </svg>
    );
  }
  if (name === 'gift') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
        <path d="M12 7c-3.2 0-5-1.2-5-3 0-1.1.8-2 2-2 2 0 3 3 3 5ZM12 7c3.2 0 5-1.2 5-3 0-1.1-.8-2-2-2-2 0-3 3-3 5Z" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2.8 19 6v5.4c0 4.5-2.8 8-7 9.8-4.2-1.8-7-5.3-7-9.8V6z" />
        <path d="m9.2 12 1.8 1.8 3.9-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M8.5 8.5 6 6M18 18l-2.5-2.5M15.5 8.5 18 6M6 18l2.5-2.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
