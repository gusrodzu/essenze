import {useLoaderData} from 'react-router';
import PersonalizedFragrance from '~/components/PersonalizedFragrance';
import {RECOMMENDATION_METAFIELD_IDENTIFIERS} from '~/lib/fragranceRecommendations';
import styles from '~/styles/ToolPage.module.css';

export const meta = () => [
  {title: 'Asesor de fragancias | Essenze'},
  {name: 'description', content: 'Encuentra fragancias alineadas con tu perfil, familia olfativa y ocasión de uso.'},
];

export async function loader({context}) {
  const {products} = await context.storefront.query(ADVISOR_PRODUCTS_QUERY, {
    variables: {
      first: 100,
      metafieldIdentifiers: RECOMMENDATION_METAFIELD_IDENTIFIERS,
    },
  });
  return {products: products?.nodes || []};
}

export default function AdvisorPage() {
  const {products} = useLoaderData();
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Scent concierge</p>
        <h1>Encuentra una fragancia que se sienta tuya.</h1>
        <p>Tres respuestas bastan para ordenar el catálogo de Essenze según tu personalidad, tus acordes favoritos y el momento en que deseas usarla.</p>
      </section>
      <PersonalizedFragrance products={products} initiallyOpen />
    </main>
  );
}

const ADVISOR_PRODUCTS_QUERY = `#graphql
  fragment AdvisorProduct on Product {
    id title handle vendor productType description availableForSale tags
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    featuredImage { id url altText width height }
    options { name optionValues { name } }
    selectedOrFirstAvailableVariant {
      id title availableForSale
      image { id url altText width height }
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
    metafields(identifiers: $metafieldIdentifiers) {
      id namespace key type value
    }
  }
  query AdvisorProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) { nodes { ...AdvisorProduct } }
  }
`;
