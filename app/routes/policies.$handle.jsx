import {Link, useLoaderData} from 'react-router';
import {getLocalPolicy} from '~/content/legalPolicies';
import styles from '~/styles/EditorialPage.module.css';

export const meta = ({data}) => [
  {title: `${data?.policy?.title || 'Política'} | Essenze`},
  ...(data?.policy?.updatedAt
    ? [{name: 'description', content: `${data.policy.title} de ESSENZE, actualizado el ${data.policy.updatedAt}.`}]
    : []),
];

export async function loader({params, context}) {
  if (!params.handle) throw new Response('No encontrado', {status: 404});

  const localPolicy = getLocalPolicy(params.handle);
  if (localPolicy) return {policy: localPolicy, isLocal: true};

  const policyName = params.handle.replace(/-([a-z])/g, (_, match) => match.toUpperCase());
  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });
  const policy = data.shop?.[policyName];
  if (!policy) throw new Response('No se encontró la política', {status: 404});
  return {policy, isLocal: false};
}

export default function Policy() {
  const {policy, isLocal} = useLoaderData();

  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroLight} ${styles.legalHero}`}>
        <div className={styles.heroContent}>
          <Link className={styles.backLink} to="/policies">
            ← Todas las políticas
          </Link>
          <p className={styles.eyebrow}>Información legal Essenze</p>
          <h1 className={styles.title}>{policy.title}</h1>
          {isLocal ? (
            <div className={styles.legalMeta}>
              <span>ESSENZE · essenze.mx</span>
              <span>Última actualización: {policy.updatedAt}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${styles.content} ${isLocal ? styles.legalContent : ''}`}>
        {isLocal ? <LocalPolicy policy={policy} /> : <div className={styles.richText} dangerouslySetInnerHTML={{__html: policy.body}} />}
      </section>
    </main>
  );
}

function LocalPolicy({policy}) {
  return (
    <div className={styles.legalLayout}>
      <aside className={styles.legalAside} aria-label="Índice del documento">
        <p>Contenido</p>
        <nav className={styles.legalNav}>
          {policy.sections.map((section, index) => (
            <a key={section.title} href={`#legal-section-${index + 1}`}>
              <span aria-hidden="true">§</span>
              {section.title.replace(/^\d+\.\s*/, '')}
            </a>
          ))}
        </nav>
        <a className={styles.legalContact} href="mailto:contacto@essenze.mx">
          <small>Contacto oficial</small>
          contacto@essenze.mx
        </a>
      </aside>

      <article className={styles.legalArticle}>
        {policy.sections.map((section, index) => (
          <section className={styles.legalSection} id={`legal-section-${index + 1}`} key={section.title}>
            <span className={styles.legalSectionIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 3.5h7l3 3V20.5H7z" />
                <path d="M14 3.5v3h3M9.5 11h5M9.5 14h5M9.5 17h3.5" />
              </svg>
            </span>
            <div>
              <h2>{section.title}</h2>
              {section.blocks.map((block, blockIndex) => {
                if (block.type === 'list') {
                  return (
                    <ul key={`${section.title}-list-${blockIndex}`}>
                      {block.items.map((item) => (
                        <li key={item}>{renderLinkedText(item)}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={`${section.title}-paragraph-${blockIndex}`}>{renderLinkedText(block.text)}</p>;
              })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}

function renderLinkedText(text) {
  const pattern = /(contacto@essenze\.mx|www\.gob\.mx\/profeco|essenze\.mx)/g;
  return String(text)
    .split(pattern)
    .filter(Boolean)
    .map((part, index) => {
      if (part === 'contacto@essenze.mx') {
        return <a key={`${part}-${index}`} href="mailto:contacto@essenze.mx">{part}</a>;
      }
      if (part === 'www.gob.mx/profeco') {
        return <a key={`${part}-${index}`} href="https://www.gob.mx/profeco" target="_blank" rel="noreferrer">{part}</a>;
      }
      if (part === 'essenze.mx') {
        return <a key={`${part}-${index}`} href="https://essenze.mx">{part}</a>;
      }
      return part;
    });
}

const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) { ...Policy }
      shippingPolicy @include(if: $shippingPolicy) { ...Policy }
      termsOfService @include(if: $termsOfService) { ...Policy }
      refundPolicy @include(if: $refundPolicy) { ...Policy }
    }
  }
`;

/** @typedef {import('./+types/policies.$handle').Route} Route */
