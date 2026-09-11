import {Suspense, useEffect} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {ESSENZE_SOCIAL_LINKS} from '~/content/socialLinks';
import {BrandLogo} from '~/components/BrandLogo';
import styles from './Header.module.css';

const CORE_NAVIGATION = {
  perfumery: {
    id: 'core-perfumery',
    title: 'PERFUMERÍA',
    url: '/collections/all',
    items: [
      {id: 'core-collections', title: 'Colecciones', url: '/collections', items: []},
      {id: 'core-brands', title: 'Marcas', url: '/marcas', items: []},
      {id: 'core-available', title: 'Disponibles', url: '/collections/all?available=1', items: []},
      {id: 'core-bestsellers', title: 'Más vendidos', url: '/collections/mas-vendidos', items: []},
      {id: 'core-notes', title: 'Familias olfativas', url: '/collections#familias-olfativas', items: []},
    ],
  },
  brands: {id: 'core-brands-main', title: 'MARCAS', url: '/marcas', items: []},
  collections: {id: 'core-collections-main', title: 'COLECCIONES', url: '/collections', items: []},
  advisor: {id: 'core-advisor', title: 'ASESOR', url: '/asesor', items: []},
};


const DISCOVERY_EXPLORATION_ITEMS = [
  {id: 'seasonal', title: 'Perfumes por temporada', url: '/pages/perfumes-por-temporada', items: []},
  {id: 'request-fragrance', title: 'Solicita un perfume', url: '/pages/solicita-un-perfume', items: []},
  {id: 'about', title: 'Sobre nosotros', url: '/pages/sobre-nosotros', items: []},
  {id: 'testimonials', title: 'Testimonios', url: '/pages/testimonios', items: []},
];

const dropdownCloseTimers = new WeakMap();

function keepDropdownOpen(node) {
  if (!node) return;
  const timer = dropdownCloseTimers.get(node);
  if (timer) window.clearTimeout(timer);
  dropdownCloseTimers.delete(node);
  node.setAttribute('open', '');
}

function scheduleDropdownClose(node) {
  if (!node) return;
  const timer = dropdownCloseTimers.get(node);
  if (timer) window.clearTimeout(timer);
  const nextTimer = window.setTimeout(() => {
    node.removeAttribute('open');
    dropdownCloseTimers.delete(node);
  }, 520);
  dropdownCloseTimers.set(node, nextTimer);
}

function isNavigationActive(item, pathname, hash = '') {
  const url = String(item?.url || '');
  if (!url) return false;

  if (url === '/collections/all') {
    return pathname === '/collections/all' || pathname.startsWith('/products/');
  }
  if (url === '/collections') {
    return pathname === '/collections' || (pathname.startsWith('/collections/') && pathname !== '/collections/all');
  }
  if (url === '/marcas') return pathname === '/marcas' || pathname.startsWith('/marcas/');
  if (url.startsWith('/#')) return pathname === '/' && hash === url.slice(1);
  if (url === '/') return pathname === '/';
  return pathname === url || pathname.startsWith(`${url}/`);
}

function buildNavigation() {
  return {
    left: [CORE_NAVIGATION.perfumery, CORE_NAVIGATION.brands, CORE_NAVIGATION.collections],
    right: [CORE_NAVIGATION.advisor],
    more: DISCOVERY_EXPLORATION_ITEMS,
    mobile: [
      CORE_NAVIGATION.perfumery,
      CORE_NAVIGATION.brands,
      CORE_NAVIGATION.collections,
      CORE_NAVIGATION.advisor,
      ...DISCOVERY_EXPLORATION_ITEMS,
    ],
  };
}

function TopBar() {
  return (
    <div className={styles.topBar} role="region" aria-label="Beneficios de compra">
      <div className={styles.topBarTrack}>
        <div className={styles.topBarItem}>Envíos nacionales</div>
        <span className={styles.topBarDivider} aria-hidden="true" />
        <div className={styles.topBarItem}>Pagos seguros con Mercado Pago</div>
        <span className={styles.topBarDivider} aria-hidden="true" />
        <div className={styles.topBarItem}>Entregas locales en la Zona Metropolitana de Monterrey</div>
      </div>
    </div>
  );
}

/** @param {HeaderProps} */
export function Header({header, isLoggedIn, cart, publicStoreDomain}) {
  const {shop, menu} = header;
  const location = useLocation();
  const navigation = buildNavigation(menu, shop.primaryDomain?.url, publicStoreDomain);

  useEffect(() => {
    const closeDropdowns = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && event.target?.closest?.('[data-essenze-dropdown]')) return;
      document.querySelectorAll('[data-essenze-dropdown][open]').forEach((node) => node.removeAttribute('open'));
    };
    document.addEventListener('pointerdown', closeDropdowns);
    document.addEventListener('keydown', closeDropdowns);
    return () => {
      document.removeEventListener('pointerdown', closeDropdowns);
      document.removeEventListener('keydown', closeDropdowns);
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll('[data-essenze-dropdown][open]').forEach((node) => node.removeAttribute('open'));
  }, [location.pathname, location.hash]);

  return (
    <div className={styles.headerShell}>
      <TopBar />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <HeaderMenu items={navigation.left} viewport="desktop" side="left" moreItems={[]} currentPath={location.pathname} currentHash={location.hash} />

          <NavLink prefetch="intent" to="/" className={styles.logo} end aria-label="Essenze, inicio">
            <BrandLogo
              variant="wordmark"
              tone="dark"
              alt="Essenze"
              eager
              className={styles.headerBrandLogo}
            />
          </NavLink>

          <HeaderMenu items={navigation.right} viewport="desktop" side="right" moreItems={navigation.more} currentPath={location.pathname} currentHash={location.hash} />
          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
        </div>
      </header>
    </div>
  );
}

export function HeaderMenu({
  menu,
  items,
  primaryDomainUrl,
  viewport,
  side = 'left',
  publicStoreDomain,
  moreItems = [],
  currentPath,
  currentHash,
}) {
  const {close, open} = useAside();
  const location = useLocation();
  const pathname = currentPath ?? location.pathname;
  const hash = currentHash ?? location.hash;
  const navigation = items || buildNavigation(menu, primaryDomainUrl, publicStoreDomain).mobile;
  const navClassName = viewport === 'mobile' ? styles.mobileNav : side === 'left' ? styles.navLeft : styles.navRight;

  const closeNavigation = () => {
    close();
    document.querySelectorAll('[data-essenze-dropdown][open]').forEach((node) => node.removeAttribute('open'));
  };

  if (viewport === 'mobile') {
    return (
      <nav className={navClassName} aria-label="Navegación móvil">
        <button
          type="button"
          className={styles.mobileSearchTrigger}
          onClick={() => open('search')}
        >
          <span aria-hidden="true">⌕</span>
          Buscar fragancias…
        </button>
        <SmartNavLink to="/" onClick={closeNavigation} className={({isActive}) => `${styles.navItem} ${isActive ? styles.active : ''}`} end>
          Inicio
        </SmartNavLink>
        {navigation.map((item) => (
          <MobileMenuItem key={item.id || item.url} item={item} onNavigate={closeNavigation} active={isNavigationActive(item, pathname, hash)} />
        ))}
        <div className={styles.mobileDiscovery}>
          <span>Herramientas Essenze</span>
          <SmartNavLink to="/asesor" onClick={closeNavigation}>Encuentra tu fragancia <b>→</b></SmartNavLink>
          <SmartNavLink to="/comparador" onClick={closeNavigation}>Comparar fragancias <b>→</b></SmartNavLink>
          <SmartNavLink to="/search" onClick={closeNavigation}>Búsqueda en el catálogo <b>→</b></SmartNavLink>
        </div>
        <div className={styles.mobileSocials} aria-label="Redes sociales de Essenze">
          {ESSENZE_SOCIAL_LINKS.map((social) => (
            <a key={social.title} href={social.url} target="_blank" rel="noreferrer">
              {social.title}<span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
        <div className={styles.mobileLegalLinks}>
          <SmartNavLink to="/policies/terms-of-service" onClick={closeNavigation}>Términos</SmartNavLink>
          <SmartNavLink to="/policies/privacy-policy" onClick={closeNavigation}>Privacidad</SmartNavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className={navClassName} aria-label={side === 'left' ? 'Catálogo' : 'Descubrir'}>
      {navigation.map((item) => (
        <DesktopMenuItem key={item.id || item.url} item={item} onNavigate={closeNavigation} alignRight={side === 'right'} active={isNavigationActive(item, pathname, hash)} />
      ))}
      {side === 'right' && moreItems.length > 0 ? (
        <details
          name="essenze-desktop-navigation"
          className={`${styles.dropdown} ${styles.moreDropdown}`}
          data-essenze-dropdown
          onMouseEnter={(event) => keepDropdownOpen(event.currentTarget)}
          onMouseLeave={(event) => scheduleDropdownClose(event.currentTarget)}
        >
          <summary className={`${styles.navItem} ${moreItems.some((item) => isNavigationActive(item, pathname, hash)) ? styles.active : ''}`}>Descubrir <span className={styles.chevron} aria-hidden="true" /></summary>
          <div
            className={`${styles.dropdownPanel} ${styles.dropdownPanelRight}`}
            onMouseEnter={(event) => keepDropdownOpen(event.currentTarget.closest('[data-essenze-dropdown]'))}
          >
            <p className={styles.dropdownEyebrow}>Explorar</p>
            <div className={styles.dropdownLinks}>
              {moreItems.map((item) => (
                <SmartNavLink key={item.id || item.url} to={item.url} className={styles.dropdownLink} onClick={closeNavigation}>
                  <span>{item.title}</span><b>↗</b>
                </SmartNavLink>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </nav>
  );
}

function DesktopMenuItem({item, onNavigate, alignRight, active}) {
  if (item.items?.length) {
    return (
      <details
        name="essenze-desktop-navigation"
        className={styles.dropdown}
        data-essenze-dropdown
        onMouseEnter={(event) => keepDropdownOpen(event.currentTarget)}
        onMouseLeave={(event) => scheduleDropdownClose(event.currentTarget)}
      >
        <summary className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>{item.title}<span className={styles.chevron} aria-hidden="true" /></summary>
        <div
          className={`${styles.dropdownPanel} ${alignRight ? styles.dropdownPanelRight : ''}`}
          onMouseEnter={(event) => keepDropdownOpen(event.currentTarget.closest('[data-essenze-dropdown]'))}
        >
          <p className={styles.dropdownEyebrow}>Explorar</p>
          <SmartNavLink to={item.url} className={styles.dropdownAll} onClick={onNavigate}>
            {item.id === 'core-perfumery' ? 'Todas las fragancias' : `Ver ${item.title.toLowerCase()}`} <span>→</span>
          </SmartNavLink>
          <div className={styles.dropdownLinks}>
            {item.items.map((child) => (
              <SmartNavLink key={child.id || child.url} to={child.url} className={styles.dropdownLink} onClick={onNavigate}>
                <span>{child.title}</span><b>→</b>
              </SmartNavLink>
            ))}
          </div>
        </div>
      </details>
    );
  }

  return (
    <SmartNavLink
      to={item.url}
      onClick={onNavigate}
      prefetch="intent"
      className={({isActive, isPending}) => `${styles.navItem} ${(isActive || active) ? styles.active : ''} ${isPending ? styles.pending : ''}`}
    >
      {item.title}
    </SmartNavLink>
  );
}

function MobileMenuItem({item, onNavigate, active}) {
  if (item.items?.length) {
    return (
      <details className={`${styles.mobileGroup} ${active ? styles.mobileGroupActive : ''}`}>
        <summary className={styles.mobileGroupTitle}>{item.title}<span>+</span></summary>
        <div className={styles.mobileSubmenu}>
          <SmartNavLink to={item.url} onClick={onNavigate}>Ver todo</SmartNavLink>
          {item.items.map((child) => <SmartNavLink key={child.id || child.url} to={child.url} onClick={onNavigate}>{child.title}</SmartNavLink>)}
        </div>
      </details>
    );
  }
  return <SmartNavLink to={item.url} onClick={onNavigate} className={({isActive}) => `${styles.navItem} ${(isActive || active) ? styles.active : ''}`}>{item.title}</SmartNavLink>;
}

function SmartNavLink({to, children, className, prefetch, end, ...props}) {
  const isExternal = /^https?:\/\//i.test(to || '');
  if (isExternal) {
    const externalClass =
      typeof className === 'function'
        ? className({isActive: false, isPending: false})
        : className;
    return (
      <a href={to} className={externalClass} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <NavLink to={to} className={className} prefetch={prefetch} end={end} {...props}>
      {children}
    </NavLink>
  );
}

function HeaderCtas({isLoggedIn, cart}) {
  return (
    <nav className={styles.ctas} aria-label="Acciones">
      <HeaderMenuMobileToggle />
      <SearchToggle />
      <AccountToggle isLoggedIn={isLoggedIn} />
      <CartToggle cart={cart} />
    </nav>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return <button type="button" className={`${styles.iconLink} ${styles.reset}`} onClick={() => open('search')} aria-label="Buscar"><span className={`${styles.iconGlyph} ${styles.searchGlyph}`} aria-hidden="true" /><span className={styles.iconLabel}>Búsqueda</span></button>;
}

function AccountToggle({isLoggedIn}) {
  return (
    <NavLink prefetch="intent" to="/account" className={({isActive}) => `${styles.iconLink} ${isActive ? styles.activeIcon : ''}`} aria-label="Mi cuenta">
      <span className={`${styles.iconGlyph} ${styles.accountGlyph}`} aria-hidden="true" />
      <span className={styles.iconLabel}><Suspense fallback="Cuenta"><Await resolve={isLoggedIn} errorElement="Cuenta">{(loggedIn) => loggedIn ? 'Cuenta' : 'Entrar'}</Await></Suspense></span>
    </NavLink>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return <button className={`${styles.mobileToggle} ${styles.reset}`} type="button" onClick={() => open('mobile')} aria-label="Abrir menú"><span aria-hidden="true" /><span aria-hidden="true" /></button>;
}

function CartBadge({count}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();
  return (
    <a href="/cart" onClick={(event) => {event.preventDefault(); open('cart'); publish('cart_viewed', {cart, prevCart, shop, url: window.location.href || ''});}} className={styles.iconLink} aria-label={`Carrito con ${count} artículo${count === 1 ? '' : 's'}`}>
      <span className={`${styles.iconGlyph} ${styles.cartGlyph}`} aria-hidden="true" />
      {count > 0 ? <span className={styles.cartCounter}>{count}</span> : null}
      <span className={styles.iconLabel}>Carrito</span>
    </a>
  );
}

function CartToggle({cart}) {
  return <Suspense fallback={<CartBadge count={0} />}><Await resolve={cart}><CartBanner /></Await></Suspense>;
}

function CartBanner() {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

/** @typedef {'desktop' | 'mobile'} Viewport */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {{header: HeaderQuery; cart: Promise<CartApiQueryFragment|null>; isLoggedIn: Promise<boolean>; publicStoreDomain: string;}} HeaderProps */
