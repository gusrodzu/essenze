import {useEffect} from 'react';
import {NavLink, useLocation} from 'react-router';
import {useAside} from '~/components/Aside';
import styles from './MobileDock.module.css';

export default function MobileDock() {
  const {open} = useAside();
  const {pathname} = useLocation();
  const hidden = pathname.startsWith('/products/') || pathname === '/cart';

  useEffect(() => {
    document.documentElement.classList.toggle('has-mobile-dock', !hidden);
    return () => document.documentElement.classList.remove('has-mobile-dock');
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav className={styles.dock} aria-label="Navegación rápida móvil">
      <NavLink to="/" end className={({isActive}) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <DockIcon name="home" />
        <span>Inicio</span>
      </NavLink>
      <button type="button" className={styles.item} onClick={() => open('search')}>
        <DockIcon name="search" />
        <span>Buscar</span>
      </button>
      <NavLink to="/collections" className={({isActive}) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <DockIcon name="grid" />
        <span>Categorías</span>
      </NavLink>
      <NavLink to="/asesor" className={({isActive}) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <DockIcon name="spark" />
        <span>Asesor</span>
      </NavLink>
      <button type="button" className={styles.item} onClick={() => open('cart')} aria-label="Abrir carrito">
        <DockIcon name="cart" />
        <span>Carrito</span>
      </button>
    </nav>
  );
}

function DockIcon({name}) {
  const common = {viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.55};
  if (name === 'home') return <svg {...common}><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>;
  if (name === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3" /></svg>;
  if (name === 'cart') return <svg {...common}><path d="M4 7h16l-1.5 13h-13z" /><path d="M8 7a4 4 0 0 1 8 0" /></svg>;
  return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3" /></svg>;
}
