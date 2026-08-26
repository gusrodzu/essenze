import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import CatalogToolbar from '~/components/CatalogToolbar';
import {getCatalogOptions} from '~/lib/catalogSort';
import styles from '~/styles/CatalogPage.module.css';

export const meta = ({data}) => [
  {title: `${data?.vendor ?? 'Marca'} | Essenze`},
  {name: 'description', content: `Descubre fragancias de ${data?.vendor ?? 'esta marca'} en Essenze.`},
];

export async function loader({context, request, params}) {
  const vendor = decodeURIComponent(params.vendor || '');
  if (!vendor) throw new Response('Marca no encontrada', {status: 404});

  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const catalogOptions = getCatalogOptions(request);
  const escapedVendor = vendor.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const query = [
    `vendor:"${escapedVendor}"`,
    catalogOptions.availableOnly ? 'available_for_sale:true' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const {products, productCount} = await context.storefront.query(BRAND_PRODUCTS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      sortKey: catalogOptions.sortKey,
      reverse: catalogOptions.reverse,
    },
  });

  if (!products.nodes.length && !products.pageInfo.hasPreviousPage) {
    throw new Response(`No encontramos productos de ${vendor}`, {status: 404});
  }

  return {vendor, products, totalCount: productCount?.nodes?.length || products.nodes.length, ...catalogOptions};
}

export default function BrandPage() {
  const {vendor, products, totalCount, sort, availableOnly} = useLoaderData();
  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroPlain}`}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Casa perfumista</p>
          <h1 className={styles.title}>{vendor}</h1>
          <p className={styles.description}>Una selección Essenze de la casa {vendor}. Descubre sus perfiles, concentraciones y presentaciones disponibles.</p>
        </div>
      </section>

      <section className={styles.content}>
        <CatalogToolbar
          sort={sort}
          availableOnly={availableOnly}
          currentCount={products.nodes.length}
          contextLabel={vendor}
        />

        <PaginatedResourceSection connection={products} resourcesClassName={styles.grid} ariaLabel={`Fragancias de ${vendor}`} totalCount={totalCount} pageSize={12}>
          {({node: product, index}) => <ProductItem key={product.id} product={product} loading={index < 8 ? 'eager' : 'lazy'} />}
        </PaginatedResourceSection>
      </section>
    </main>
  );
}

const PRODUCT_FRAGMENT = `#graphql
  fragment MoneyBrandProduct on MoneyV2 { amount currencyCode }
  fragment BrandProduct on Product {
    id handle title vendor productType availableForSale
    featuredImage { id altText url width height }
    priceRange {
      minVariantPrice { ...MoneyBrandProduct }
      maxVariantPrice { ...MoneyBrandProduct }
    }
  }
`;

const BRAND_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query BrandProducts(
    $query: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    productCount: products(first: 250, query: $query) { nodes { id } }
    products(
      query: $query
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes { ...BrandProduct }
      pageInfo { hasPreviousPage hasNextPage startCursor endCursor }
    }
  }
`;
