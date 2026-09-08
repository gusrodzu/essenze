import {useLoaderData} from 'react-router';
import FragranceComparator from '~/components/FragranceComparator';
import {COMPARATOR_METAFIELD_IDENTIFIERS} from '~/lib/fragranceComparator';
import styles from '~/styles/ToolPage.module.css';

export const meta = () => [
  {title: 'Comparador de fragancias | Essenze'},
  {name: 'description', content: 'Compara hasta tres fragancias por familia, intensidad, uso, presentación y precio.'},
];

export async function loader({context}) {
  const catalog = [];
  let after = null;
  let hasNextPage = true;

  while (hasNextPage && catalog.length < 1000) {
    const {products} = await context.storefront.query(COMPARATOR_PRODUCTS_QUERY, {
      variables: {
        first: 250,
        after,
        metafieldIdentifiers: COMPARATOR_METAFIELD_IDENTIFIERS,
      },
    });

    catalog.push(...(products?.nodes || []));
    hasNextPage = Boolean(products?.pageInfo?.hasNextPage);
    after = products?.pageInfo?.endCursor || null;
  }

  return {products: catalog};
}

export default function ComparatorPage() {
  const {products} = useLoaderData();
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Decide con claridad</p>
        <h1>Compara tus fragancias favoritas.</h1>
        <p>Contrasta perfiles, concentraciones, intensidad, ocasiones, tamaños y precio antes de elegir.</p>
      </section>
      <FragranceComparator products={products} />
    </main>
  );
}

const COMPARATOR_PRODUCTS_QUERY = `#graphql
  fragment ComparatorProduct on Product {
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
    metafields(identifiers: $metafieldIdentifiers) { id namespace key type value }
  }
  query ComparatorProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, sortKey: TITLE) {
      nodes { ...ComparatorProduct }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
