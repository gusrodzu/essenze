import { Link } from 'react-router';
import styles from './Hero.module.css';

export default function Hero({
  backgroundImage,
  title = 'Descubre Tu Fragancia Perfecta',
  subtitle = 'Fragancias exclusivas que cuentan tu historia. Encuentra el aroma que te define.',
  primaryText = 'Fragancias Disponibles',
  secondaryText = 'Asesor personalizado',
  primaryLink = '/collections',
  secondaryLink = '/asesor',
  categories = [],
}) {
  const hasCategories = categories.length > 0;

  return (
    <section
      className={`${styles.hero} ${!hasCategories ? styles.heroNoCards : ''}`}
    >
      <img
        src={
          backgroundImage ||
          'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_32_39_a.m.png?v=1785429177'
        }
        alt={title}
        className={styles.background}
      />

      <div className={styles.overlay} />

      <div className={styles.content}>
        <h1>{title}</h1>

        <p className={styles.description}>{subtitle}</p>

        <div className={styles.actions}>
          <Link to={primaryLink} className={styles.primaryButton}>
            {primaryText}
          </Link>

          <Link to={secondaryLink} className={styles.secondaryButton}>
            {secondaryText}
          </Link>
        </div>
      </div>

      {hasCategories ? (
        <div className={styles.cards}>
          {categories.map((item) => (
            <Link key={item.title} to={item.link} className={styles.card}>
              <span>{item.category}</span>

              <h3>{item.title}</h3>

              <img src={item.image} alt={item.title} />

              <div className={styles.cardButton}>Ver productos →</div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
