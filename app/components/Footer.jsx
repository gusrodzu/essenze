import {Suspense, useState} from 'react';
import {Await, NavLink} from 'react-router';
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
  {title: 'Buscar', url: '/search'},
  {title: 'Políticas', url: '/policies'},
];

export function Footer({footer: footerPromise, header, publicStoreDomain}) {
  return (
    <Suspense fallback={<FooterShell footer={null} header={header} publicStoreDomain={publicStoreDomain} />}>
      <Await resolve={footerPromise}>{(footer) => <FooterShell footer={footer} header={header} publicStoreDomain={publicStoreDomain} />}</Await>
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
    window.location.href = `mailto:jose@essenze.mx?subject=${subject}&body=${body}`;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.aura} aria-hidden="true" />
      <div className={styles.container}>
        <div className={styles.topGrid}>
          <section className={styles.brandIntro}>
            <p className={styles.eyebrow}>Curaduría olfativa</p>
            <NavLink to="/" className={styles.brand}>{shopName}</NavLink>
            <p className={styles.brandCopy}>Una selección de perfumería para quienes buscan aromas con identidad, detalle y una historia que permanece.</p>
            <div className={styles.socials}>
              <a href="https://instagram.com/essenze.mx" target="_blank" rel="noreferrer">Instagram <span>↗</span></a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook <span>↗</span></a>
            </div>
          </section>

          <section className={styles.newsletter} aria-labelledby="footer-newsletter">
            <p className={styles.eyebrow}>Lista privada</p>
            <h2 id="footer-newsletter">Descubre lo extraordinario antes que nadie.</h2>
            <p>Lanzamientos, nuevas casas y selecciones editoriales de Essenze.</p>
            <form className={styles.newsletterForm} onSubmit={handleInterest}>
              <label className={styles.srOnly} htmlFor="footer-email">Correo electrónico</label>
              <input id="footer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required />
              <button type="submit" aria-label="Enviar correo">→</button>
            </form>
            {message ? <p className={styles.status} role="status">{message}</p> : <p className={styles.microcopy}>Al continuar aceptas recibir comunicaciones de Essenze. Puedes darte de baja cuando quieras.</p>}
          </section>
        </div>

        <div className={styles.linkGrid}>
          <FooterColumn title="Descubrir" links={DISCOVER_LINKS} publicStoreDomain={publicStoreDomain} />
          <FooterColumn title="Essenze" links={dynamicLinks.length ? dynamicLinks : ESSENZE_LINKS} publicStoreDomain={publicStoreDomain} />
          <section className={styles.column}>
            <h3>Boutique</h3>
            <p>Jardines de San Ignacio<br />Zapopan, Jalisco, México</p>
            <a href="tel:+523342052870">+52 33 4205 2870</a>
            <a href="mailto:jose@essenze.mx">jose@essenze.mx</a>
            <small>Lun – Dom · 11:00 a 19:00</small>
          </section>
          <section className={styles.column}>
            <h3>Atención</h3>
            <FooterLink item={{title: 'Envíos y devoluciones', url: '/policies/shipping-policy'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Privacidad', url: '/policies/privacy-policy'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Términos', url: '/policies/terms-of-service'}} publicStoreDomain={publicStoreDomain} />
            <FooterLink item={{title: 'Reembolsos', url: '/policies/refund-policy'}} publicStoreDomain={publicStoreDomain} />
          </section>
        </div>

        <div className={styles.bottomBar}>
          <p>© {year} {shopName} México</p>
          <div className={styles.trust}><span>Compra segura</span><i /> <span>Pago protegido</span><i /> <span>Curaduría Essenze</span></div>
          <p className={styles.signature}>Luxury fragrance, thoughtfully selected.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({title, links, publicStoreDomain}) {
  return <section className={styles.column}><h3>{title}</h3>{links.map((item) => <FooterLink key={item.id || item.url || item.title} item={item} publicStoreDomain={publicStoreDomain} />)}</section>;
}

function FooterLink({item, publicStoreDomain}) {
  if (!item?.url) return null;
  let url = item.url;
  try {
    const parsed = new URL(url, 'https://essenze.mx');
    if (parsed.host.includes('myshopify.com') || parsed.host === publicStoreDomain) url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {}
  if (/^https?:\/\//i.test(url)) return <a href={url} target="_blank" rel="noreferrer">{item.title}<span>↗</span></a>;
  return <NavLink to={url}>{item.title}<span>→</span></NavLink>;
}
