import {Suspense, useState} from 'react';
import {Await, NavLink} from 'react-router';
import {ESSENZE_SOCIAL_LINKS} from '~/content/socialLinks';
import {BrandLogo} from '~/components/BrandLogo';
import styles from './Footer.module.css';

const DISCOVER_LINKS = [
  {title: 'Todas las fragancias', url: '/collections/all'},
  {title: 'Marcas', url: '/marcas'},
  {title: 'Colecciones', url: '/collections'},
  {title: 'Asesor de fragancias', url: '/asesor'},
  {title: 'Comparador', url: '/comparador'},
];

const ESSENZE_LINKS = [
  {title: 'Journal', url: '/blogs'},
  {title: 'Mi cuenta', url: '/account'},
  {title: 'Búsqueda', url: '/search'},
  {title: 'Políticas y términos', url: '/policies'},
];

export function Footer({footer: footerPromise, header, publicStoreDomain}) {
  return (
    <Suspense fallback={<FooterShell footer={null} header={header} publicStoreDomain={publicStoreDomain} />}>
      <Await resolve={footerPromise}>
        {(footer) => <FooterShell footer={footer} header={header} publicStoreDomain={publicStoreDomain} />}
      </Await>
    </Suspense>
  );
}

function FooterShell({footer, header, publicStoreDomain}) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const year = new Date().getFullYear();
  const dynamicLinks = (footer?.menu?.items || footer?.items || []).slice(0, 6);
  const shopName = header?.shop?.name || 'Essenze';

  function handleInterest(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    const subject = encodeURIComponent('Suscripción a la lista privada de Essenze');
    const body = encodeURIComponent(`Hola, quiero suscribirme a las novedades de Essenze con este correo: ${address}`);
    setMessage('Confirma la solicitud desde tu aplicación de correo.');
    window.location.href = `mailto:contacto@essenze.mx?subject=${subject}&body=${body}`;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.aura} aria-hidden="true" />
      <div className={styles.container}>
        <div className={styles.topGrid}>
          <section className={styles.brandIntro}>
            <p className={styles.eyebrow}>Envíos a todo México</p>
            <NavLink to="/" className={styles.brand} aria-label="Essenze, inicio">
              <BrandLogo
                variant="wordmark"
                tone="light"
                alt="Essenze"
                className={styles.footerBrandLogo}
              />
            </NavLink>
            <p className={styles.brandCopy}>Una selección de perfumería para quienes buscan aromas con identidad, detalle y una historia que permanece.</p>
            <div className={styles.socials} aria-label="Redes sociales de Essenze">
              {ESSENZE_SOCIAL_LINKS.map((social) => (
                <a
                  key={social.title}
                  className={styles.socialLink}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Visitar Essenze en ${social.title}`}
                >
                  <SocialIcon name={social.icon} />
                  <span>{social.title}</span>
                  <b aria-hidden="true">↗</b>
                </a>
              ))}
            </div>
          </section>

          <section className={styles.newsletter} aria-labelledby="footer-newsletter">
            <p className={styles.eyebrow}>Lista privada</p>
            <h2 id="footer-newsletter">Descubre lo extraordinario antes que nadie.</h2>
            <p>Lanzamientos, nuevas casas y novedades de la comunidad de Essenze.</p>
            <form className={styles.newsletterForm} onSubmit={handleInterest}>
              <label className={styles.srOnly} htmlFor="footer-email">Correo electrónico</label>
              <input id="footer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required />
              <button type="submit" aria-label="Enviar correo">→</button>
            </form>
            {message ? (
              <p className={styles.status} role="status">{message}</p>
            ) : (
              <p className={styles.microcopy}>
                Al continuar aceptas recibir comunicaciones de Essenze. Consulta nuestro{' '}
                <NavLink to="/policies/privacy-policy">Aviso de Privacidad</NavLink> y los{' '}
                <NavLink to="/policies/terms-of-service">Términos de Servicio</NavLink>.
              </p>
            )}
          </section>
        </div>

        <div className={styles.linkGrid}>
          <FooterColumn title="Descubrir" links={DISCOVER_LINKS} publicStoreDomain={publicStoreDomain} />
          <FooterColumn title="Essenze" links={dynamicLinks.length ? dynamicLinks : ESSENZE_LINKS} publicStoreDomain={publicStoreDomain} />
          <section className={styles.column}>
            <h3>Atención Essenze</h3>
            <p>Atención en línea<br />Nuevo León, México</p>
            <a href="mailto:contacto@essenze.mx">contacto@essenze.mx</a>
            <small>Lun–Vie · 9:00 a 17:00<br />Sáb · 10:00 a 13:00</small>
          </section>
          <section className={styles.column}>
            <h3>Legal y ayuda</h3>
            <FooterLink item={{title: 'Términos de Servicio', url: '/policies/terms-of-service'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Aviso de Privacidad', url: '/policies/privacy-policy'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Envíos', url: '/policies/shipping-policy'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Cambios y reembolsos', url: '/policies/refund-policy'}} publicStoreDomain={publicStoreDomain} />
          </section>
        </div>

        <div className={styles.legalSummary}>
          <p>
            ESSENZE es operada por Carlos Alberto de la Fuente Calderón, persona física con actividad empresarial, con domicilio en el estado de Nuevo León, México.
          </p>
          <div>
            <NavLink to="/policies/terms-of-service">Términos</NavLink>
            <NavLink to="/policies/privacy-policy">Privacidad</NavLink>
            <NavLink to="/policies">Todas las políticas</NavLink>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p>© {year} {shopName} México</p>
          <div className={styles.trust}><span>Compra segura</span><i /> <span>Pago protegido</span><i /> <span>Envíos a todo México</span></div>
          <p className={styles.signature}>Fragancias de lujo, seleccionadas con intención.</p>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({name}) {
  if (name === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.7" r="1" className={styles.socialIconFill} />
      </svg>
    );
  }
  if (name === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 4v10.1a4.8 4.8 0 1 1-4.1-4.75" />
        <path d="M14.2 4c.55 2.35 2.1 3.75 4.3 4.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 20v-7h2.6l.4-3H14V8.1c0-.87.25-1.46 1.52-1.46H17V4.08A20 20 0 0 0 14.8 4C12.63 4 11 5.33 11 7.78V10H8.5v3H11v7" />
    </svg>
  );
}

function FooterColumn({title, links, publicStoreDomain}) {
  return (
    <section className={styles.column}>
      <h3>{title}</h3>
      {links.map((item) => <FooterLink key={item.id || item.url || item.title} item={item} publicStoreDomain={publicStoreDomain} />)}
    </section>
  );
}

function FooterLink({item, publicStoreDomain}) {
  if (!item?.url) return null;

  const normalizedTitle = String(item.title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (['buscar', 'busqueda', 'search'].includes(normalizedTitle)) {
    return <NavLink to="/search">{item.title}<span>→</span></NavLink>;
  }

  let url = item.url;
  try {
    const parsed = new URL(url, 'https://essenze.mx');
    let publicHost = '';
    try {
      publicHost = publicStoreDomain
        ? new URL(
            publicStoreDomain.startsWith('http')
              ? publicStoreDomain
              : `https://${publicStoreDomain}`,
          ).host
        : '';
    } catch {
      publicHost = String(publicStoreDomain || '')
        .replace(/^https?:\/\//, '')
        .split('/')[0];
    }

    const isStoreDomain =
      parsed.host.includes('myshopify.com') ||
      parsed.host === publicHost ||
      parsed.host === 'essenze.mx' ||
      parsed.host === 'www.essenze.mx';

    if (isStoreDomain) {
      url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {}

  if (/^https?:\/\//i.test(url)) {
    return <a href={url} target="_blank" rel="noreferrer">{item.title}<span>↗</span></a>;
  }
  return <NavLink to={url}>{item.title}<span>→</span></NavLink>;
}
