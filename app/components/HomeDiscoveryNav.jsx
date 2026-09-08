import {Link} from 'react-router';
import EssenzeIcon from './EssenzeIcon';
import styles from './HomeDiscoveryNav.module.css';

const ITEMS = [
  {
    eyebrow: 'Explorar',
    icon: 'layers',
    title: 'Colecciones',
    copy: 'Universos curados para descubrir la tienda con intención.',
    to: '/collections',
  },
  {
    eyebrow: 'Descubrir',
    icon: 'flower',
    title: 'Familias olfativas',
    copy: 'Encuentra tu camino por acordes, perfiles y sensaciones.',
    to: '/collections#familias-olfativas',
  },
  {
    eyebrow: 'Personalizar',
    icon: 'sparkles',
    title: 'Asesor Essenze',
    copy: 'Tres respuestas para ordenar el catálogo según tu perfil.',
    to: '/asesor',
  },
  {
    eyebrow: 'Decidir',
    icon: 'compare',
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
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowIcon} aria-hidden="true">
                <EssenzeIcon name={item.icon} size={17} />
              </span>
              {item.eyebrow}
            </span>
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
