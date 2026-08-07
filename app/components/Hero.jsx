import { Link } from 'react-router';
import styles from './Hero.module.css';

export default function Hero({
  backgroundImage,
  title = 'Descubre Tu Fragancia Perfecta',
  subtitle = 'Encuentra el aroma que define tu personalidad con nuestro asistente personalizado..',
  primaryText = 'Ver Colecciónes',
  secondaryText = 'Buscar Perfumes',
  primaryLink = '/collections',
  secondaryLink = '/search',
  categories = [],
}) {
  return (
    <section className={styles.hero}>
      <img
        src={"https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_32_39_a.m.png?v=1785429177"}
        alt={title}
        className={styles.background}
      />

      <div className={styles.overlay} />

      <div className={styles.content}>
        {/* <p className={styles.eyebrow}>
          Luxury Perfumes
        </p> */}

        <h1>{title}</h1>

        <p className={styles.description}>
          {subtitle}
        </p>

        <div className={styles.actions}>
          <Link
            to={primaryLink}
            className={styles.primaryButton}
          >
            {primaryText}
          </Link>

          <Link
            to={secondaryLink}
            className={styles.secondaryButton}
          >
            {secondaryText}
          </Link>
        </div>
      </div>

      <div className={styles.cards}>
        {categories.map((item) => (
          <Link
            key={item.title}
            to={item.link}
            className={styles.card}
          >
            <span>{item.category}</span>

            <h3>{item.title}</h3>

            <img
              src={item.image}
              alt={item.title}
            />

            <div className={styles.cardButton}>
              Ver productos →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}