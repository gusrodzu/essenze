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
      {id: 'core-all', title: 'Todas las fragancias', url: '/collections/all', items: []},
      {id: 'core-collections', title: 'Colecciones', url: '/collections', items: []},
      {id: 'core-brands', title: 'Marcas', url: '/marcas', items: []},
      {id: 'core-notes', title: 'Familias olfativas', url: '/#familias-olfativas', items: []},
    ],
  },
  brands: {id: 'core-brands-main', title: 'MARCAS', url: '/marcas', items: []},
  collections: {id: 'core-collections-main', title: 'COLECCIONES', url: '/collections', items: []},
  advisor: {id: 'core-advisor', title: 'ASESOR', url: '/asesor', items: []},
};

const FALLBACK_EXTRA_ITEMS = [
  {id: 'comparator', title: 'COMPARADOR', url: '/comparador', items: []},
  {id: 'journal', title: 'JOURNAL', url: '/blogs', items: []},
  {id: 'search', title: 'BUSCAR', url: '/search', items: []},
  {id: 'account', title: 'MI CUENTA', url: '/account', items: []},
  {id: 'policies', title: 'POLÍTICAS', url: '/policies', items: []},
];

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
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

function resolveMenuUrl(item, primaryDomainUrl, publicStoreDomain) {
  if (!item?.url) return null;
  const title = normalizeText(item.title);

  if (title === 'MARCAS') return '/marcas';
  if (title === 'BUSQUEDA' || title === 'BÚSQUEDA' || title === 'SEARCH') return '/search';
  if (title === 'INICIO' || title === 'HOME') return '/';

  try {
    const internalDomains = [primaryDomainUrl, publicStoreDomain]
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(value.startsWith('http') ? value : `https://${value}`).host;
        } catch {
          return value.replace(/^https?:\/\//, '').split('/')[0];
        }
      });

    const url = new URL(item.url, primaryDomainUrl || 'https://essenze.mx');
    if (internalDomains.includes(url.host) || url.host.includes('myshopify.com')) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return item.url;
  } catch {
    return item.url;
  }
}

function normalizeMenuItem(item, primaryDomainUrl, publicStoreDomain) {
  const url = resolveMenuUrl(item, primaryDomainUrl, publicStoreDomain);
  if (!url) return null;
  return {
    ...item,
    url,
    items: (item.items || [])
      .map((child) => normalizeMenuItem(child, primaryDomainUrl, publicStoreDomain))
      .filter(Boolean),
  };
}

function buildNavigation(menu, primaryDomainUrl, publicStoreDomain) {
  const sourceItems = (menu?.items || [])
    .map((item) => normalizeMenuItem(item, primaryDomainUrl, publicStoreDomain))
    .filter(Boolean);

  const coreUrls = new Set(['/', '/collections/all', '/collections', '/marcas', '/asesor', '/search', '/account']);
  const coreTitles = new Set(['INICIO', 'HOME', 'PERFUMERIA', 'PERFUMERÍA', 'MARCAS', 'COLECCIONES', 'ASESOR', 'BUSQUEDA', 'BÚSQUEDA', 'SEARCH', 'CUENTA', 'MI CUENTA']);
  const extras = sourceItems.filter((item) => {
    const title = normalizeText(item.title);
    const cleanUrl = String(item.url || '').replace(/\/$/, '') || '/';
    return !coreTitles.has(title) && !coreUrls.has(cleanUrl);
  });

  const curatedExtras = extras.length ? extras : FALLBACK_EXTRA_ITEMS;

  return {
    left: [CORE_NAVIGATION.perfumery, CORE_NAVIGATION.brands, CORE_NAVIGATION.collections],
    right: [CORE_NAVIGATION.advisor],
    more: curatedExtras,
    mobile: [
      CORE_NAVIGATION.perfumery,
      CORE_NAVIGATION.brands,
      CORE_NAVIGATION.collections,
      CORE_NAVIGATION.advisor,
      ...curatedExtras.filter((item) => item.url !== '/search'),
    ],
  };
}

function TopBar() {
  return (
    <div className={styles.topBar} role="region" aria-label="Beneficios de compra">
      <div className={styles.topBarTrack}>
        <div className={styles.topBarItem}><span className={styles.topBarDot} />Envío gratis a partir de $1,200</div>
        <span className={styles.topBarDivider} aria-hidden="true" />
        <div className={styles.topBarItem}><span className={styles.topBarDot} />Pagos seguros con Mercado Pago</div>
        <span className={styles.topBarDivider} aria-hidden="true" />
        <div className={styles.topBarItem}><span className={styles.topBarDot} />Distribuidores oficiales en México</div>
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

          <NavLink prefetch="intent" to="/" className={styles.logo} end aria-label={`${shop.name}, inicio`}>
            <BrandLogo
              variant="wordmark"
              tone="dark"
              alt={shop.name}
              className={styles.headerLogo}
              eager
            />
            <span className={styles.logoDescriptor}>Parfumerie · México</span>
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
          <SmartNavLink to="/search" onClick={closeNavigation}>Buscar en el catálogo <b>→</b></SmartNavLink>
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
        <details name="essenze-desktop-navigation" className={`${styles.dropdown} ${styles.moreDropdown}`} data-essenze-dropdown>
          <summary className={`${styles.navItem} ${moreItems.some((item) => isNavigationActive(item, pathname, hash)) ? styles.active : ''}`}>Descubrir <span className={styles.chevron} aria-hidden="true" /></summary>
          <div className={`${styles.dropdownPanel} ${styles.dropdownPanelRight}`}>
            <p className={styles.dropdownEyebrow}>Essenze</p>
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
      <details name="essenze-desktop-navigation" className={styles.dropdown} data-essenze-dropdown>
        <summary className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>{item.title}<span className={styles.chevron} aria-hidden="true" /></summary>
        <div className={`${styles.dropdownPanel} ${alignRight ? styles.dropdownPanelRight : ''}`}>
          <p className={styles.dropdownEyebrow}>Explorar</p>
          <SmartNavLink to={item.url} className={styles.dropdownAll} onClick={onNavigate}>
            {item.id === 'core-perfumery' ? 'Ver toda la perfumería' : `Ver ${item.title.toLowerCase()}`} <span>→</span>
          </SmartNavLink>
          <div className={styles.dropdownLinks}>
            {item.items.map((child) => (
              <SmartNavLink key={child.id || child.url} to={child.url} className={styles.dropdownLink} onClick={onNavigate}>
                <span>{child.title}</span><b>→</b>
              </SmartNavLink>
            ))}
          </div>
          <div className={styles.dropdownFeature}>
            <span>Selección Essenze</span>
            <strong>Perfumes con carácter, curados para descubrir algo nuevo.</strong>
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
  return <button type="button" className={`${styles.iconLink} ${styles.reset}`} onClick={() => open('search')} aria-label="Buscar"><span className={`${styles.iconGlyph} ${styles.searchGlyph}`} aria-hidden="true" /><span className={styles.iconLabel}>Buscar</span></button>;
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
