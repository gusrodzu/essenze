import {Link} from 'react-router';
import styles from './HomeDiscoveryNav.module.css';

const ITEMS = [
  {
    eyebrow: '01 · Explorar',
    title: 'Colecciones',
    copy: 'Universos curados para descubrir la tienda con intención.',
    to: '/collections',
  },
  {
    eyebrow: '02 · Descubrir',
    title: 'Familias olfativas',
    copy: 'Encuentra tu camino por acordes, perfiles y sensaciones.',
    to: '/#familias-olfativas',
  },
  {
    eyebrow: '03 · Personalizar',
    title: 'Asesor Essenze',
    copy: 'Tres respuestas para ordenar el catálogo según tu perfil.',
    to: '/asesor',
  },
  {
    eyebrow: '04 · Decidir',
    title: 'Comparador',
    copy: 'Contrasta hasta tres fragancias antes de elegir.',
    to: '/comparador',
  },
];

export default function HomeDiscoveryNav() {
  return (
    <nav className={styles.shell} aria-label="Explora Essenze">
      <div className={styles.inner}>
        {ITEMS.map((item) => (
          <Link key={item.title} className={styles.item} to={item.to} prefetch="intent">
            <span className={styles.eyebrow}>{item.eyebrow}</span>
            <span className={styles.titleRow}>
              <strong>{item.title}</strong>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </span>
            <span className={styles.copy}>{item.copy}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
