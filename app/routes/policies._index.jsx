import {Link, useLoaderData} from 'react-router';
import {getLocalPolicySummaries} from '~/content/legalPolicies';
import styles from '~/styles/EditorialPage.module.css';

export const meta = () => [
  {title: 'Políticas y términos | Essenze'},
  {name: 'description', content: 'Consulta el Aviso de Privacidad, Términos de Servicio y políticas de compra de Essenze.'},
];

export async function loader({context}) {
  let shopPolicies = [];
  try {
    const data = await context.storefront.query(POLICIES_QUERY);
    const shop = data.shop;
    shopPolicies = [shop?.shippingPolicy, shop?.refundPolicy, shop?.subscriptionPolicy].filter(Boolean);
  } catch {
    shopPolicies = [];
  }

  const localPolicies = getLocalPolicySummaries();
  const seen = new Set();
  const policies = [...localPolicies, ...shopPolicies].filter((policy) => {
    if (!policy?.handle || seen.has(policy.handle)) return false;
    seen.add(policy.handle);
    return true;
  });

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData();
  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroDark} ${styles.policyIndexHero}`}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Transparencia Essenze</p>
          <h1 className={styles.title}>Información clara, antes y después de comprar.</h1>
          <p className={styles.lede}>Consulta nuestros términos, aviso de privacidad y políticas de compra.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.cards}>
          {policies.map((policy) => (
            <Link className={styles.card} key={policy.id || policy.handle} to={`/policies/${policy.handle}`}>
              <small>{policy.local ? 'Documento legal Essenze' : 'Política de compra'}</small>
              <h2>{policy.title}</h2>
              {policy.updatedAt ? <p>Actualizado el {policy.updatedAt}</p> : null}
              <span className={styles.cardArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      shippingPolicy { ...PolicyItem }
      refundPolicy { ...PolicyItem }
      subscriptionPolicy { id title handle }
    }
  }
`;

/** @typedef {import('./+types/policies._index').Route} Route */
