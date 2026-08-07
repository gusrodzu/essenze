import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import styles from './Header.module.css';

/**
 * TopBar Component - Solo agrega la barra negra (NUEVO)
 */
function TopBar() {
  return (
    <div className={styles.topBar}>
      <div className={styles.topBarItem}>
        ENVIOS GRATIS A PARTIR DE PEDIDOS DE $1,200.
      </div>
      <div className={styles.topBarItem}>
        PAGOS SEGUROS CON MERCADO PAGO.
      </div>
      <div className={styles.topBarItem}>
        DISTRIBUIDORES OFICIALES DE NUESTRAS MARCAS EN MÉXICO.
      </div>
    </div>
  );
}

/**
 * @param {HeaderProps}
 */
export function Header({header, isLoggedIn, cart, publicStoreDomain}) {
  const {shop, menu} = header;
  
  return (
    <>
      {/* NUEVO: Top Bar */}
      <TopBar />
      
      {/* ORIGINAL: Header */}
      <header className={styles.header}>
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          side="left"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        
        <NavLink 
          prefetch="intent" 
          to="/" 
          className={styles.logo}
          end
        >
          <strong>{shop.name}</strong>
        </NavLink>
        
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          side="right"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </header>
    </>
  );
}

/**
 * @param {{
 *   menu: HeaderProps['header']['menu'];
 *   primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
 *   viewport: Viewport;
 *   side?: 'left' | 'right';
 *   publicStoreDomain: HeaderProps['publicStoreDomain'];
 * }}
 */
export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  side = 'left',
  publicStoreDomain,
}) {
  const navClassName = viewport === 'mobile' ? styles.mobileNav : (side === 'left' ? styles.navLeft : styles.navRight);
  const {close} = useAside();
  
  const menuItems = menu || FALLBACK_HEADER_MENU;
  const itemsToShow = side === 'left' ? menuItems.items.slice(0, 4) : menuItems.items.slice(4);

  return (
    <nav className={navClassName} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          className={({isActive, isPending}) =>
            `${styles.navItem} ${isActive ? styles.active : ''} ${isPending ? 'pending' : ''}`
          }
          to="/"
        >
          Inicio
        </NavLink>
      )}
      
      {itemsToShow.map((item) => {
        if (!item.url) return null;

        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
            
        return (
          <NavLink
            className={({isActive, isPending}) =>
              `${styles.navItem} ${isActive ? styles.active : ''} ${isPending ? 'pending' : ''}`
            }
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * @param {Pick<HeaderProps, 'isLoggedIn' | 'cart'>}
 */
function HeaderCtas({isLoggedIn, cart}) {
  return (
    <nav className={styles.ctas} role="navigation">
      <HeaderMenuMobileToggle />
      <AccountToggle isLoggedIn={isLoggedIn} />
      <CartToggle cart={cart} />
    </nav>
  );
}

function AccountToggle({isLoggedIn}) {
  return (
    <NavLink 
      prefetch="intent" 
      to="/account" 
      className={({isActive, isPending}) =>
        `${styles.iconLink} ${isActive ? styles.active : ''}`
      }
      aria-label="Mi Cuenta"
    >
      <Suspense fallback="👤">
        <Await resolve={isLoggedIn} errorElement="👤">
          {(isLoggedIn) => '👤'}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className={`${styles.mobileToggle} ${styles.reset}`}
      onClick={() => open('mobile')}
      aria-label="Abrir menú"
    >
      ☰
    </button>
  );
}

/**
 * @param {{count: number}}
 */
function CartBadge({count}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        });
      }}
      className={styles.iconLink}
      aria-label={`Carrito con ${count} artículos`}
    >
      <span className={styles.cartIcon}>
        🛍️
        {count > 0 && <span className={styles.cartCounter}>{count}</span>}
      </span>
    </a>
  );
}

/**
 * @param {Pick<HeaderProps, 'cart'>}
 */
function CartToggle({cart}) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    // NAV LEFT
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'MARCAS',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'PERFUMERIA',
      type: 'HTTP',
      url: '/collections/perfumes',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'CORPORALES',
      type: 'HTTP',
      url: '/collections/corporales',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: null,
      tags: [],
      title: 'HOGAR',
      type: 'HTTP',
      url: '/collections/hogar',
      items: [],
    },
    // NAV RIGHT
    {
      id: 'gid://shopify/MenuItem/461609632800',
      resourceId: null,
      tags: [],
      title: 'BOUTIQUE',
      type: 'HTTP',
      url: '/pages/boutique',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609665568',
      resourceId: null,
      tags: [],
      title: 'BUSCA POR INGREDIENTE',
      type: 'HTTP',
      url: '/busca-ingrediente',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609698336',
      resourceId: null,
      tags: [],
      title: "FAQ'S",
      type: 'HTTP',
      url: '/pages/faqs',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609731104',
      resourceId: null,
      tags: [],
      title: 'BLOGS',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609763872',
      resourceId: null,
      tags: [],
      title: 'CONTACTO',
      type: 'HTTP',
      url: '/pages/contact',
      items: [],
    },
  ],
};

/** @typedef {'desktop' | 'mobile'} Viewport */
/**
 * @typedef {Object} HeaderProps
 * @property {HeaderQuery} header
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 */

/** @typedef {import('@shopify/hydrogen').CartViewPayload} CartViewPayload */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
