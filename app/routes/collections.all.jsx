import {useLoaderData, Link} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import CatalogToolbar from '~/components/CatalogToolbar';
import {getCatalogOptions} from '~/lib/catalogSort';
import styles from '~/styles/CollectionDetail.module.css';

export const meta = () => [
  {title: 'Todas las fragancias | Essenze'},
  {
    name: 'description',
    content:
      'Explora el catálogo completo de fragancias y perfumería de autor en Essenze.',
  },
];

export async function loader(args) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context, request}) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const catalogOptions = getCatalogOptions(request);
  const {products} = await context.storefront.query(CATALOG_QUERY, {
    variables: {
      ...paginationVariables,
      sortKey: catalogOptions.sortKey,
      reverse: catalogOptions.reverse,
      query: catalogOptions.availableOnly ? 'available_for_sale:true' : null,
    },
  });

  return {products, ...catalogOptions};
}

export default function AllProducts() {
  const {products, sort, availableOnly} = useLoaderData();

  return (
    <main className={styles.page}>
      <section
        className={`${styles.hero} ${styles.heroPlain} ${styles.catalogHero}`}
        aria-labelledby="catalog-title"
      >
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />

        <div className={styles.heroContent}>
          <nav className={styles.breadcrumbs} aria-label="Migas de pan">
            <Link to="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link to="/collections">Colecciones</Link>
            <span aria-hidden="true">/</span>
            <span>Todas las fragancias</span>
          </nav>

          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>El catálogo completo</p>
            <h1 id="catalog-title" className={styles.title}>
              Todas las fragancias
            </h1>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#collection-products">
                Explorar catálogo
                <span aria-hidden="true">↓</span>
              </a>
              <Link className={styles.secondaryAction} to="/asesor">
                Encontrar mi fragancia
              </Link>
            </div>
          </div>

          <aside className={styles.heroStory}>
            <span className={styles.storyIndex}>01 · La selección Essenze</span>
            <p>
              Casas icónicas, perfumería de autor y descubrimientos para cada
              estilo reunidos en una experiencia de exploración más clara.
            </p>
            <div className={styles.storyLinks}>
              <Link to="/marcas">Explorar marcas</Link>
              <Link to="/collections">Ver colecciones</Link>
            </div>
          </aside>
        </div>
      </section>

      <nav className={styles.discoveryStrip} aria-label="Continuar explorando">
        <Link to="/collections">
          <span>01</span>
          <strong>Colecciones</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/marcas">
          <span>02</span>
          <strong>Marcas</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/asesor">
          <span>03</span>
          <strong>Asesor personalizado</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/comparador">
          <span>04</span>
          <strong>Comparador</strong>
          <i aria-hidden="true">↗</i>
        </Link>
      </nav>

      <section id="collection-products" className={styles.content}>
        <header className={styles.catalogIntro}>
          <div>
            <p className={styles.sectionEyebrow}>Biblioteca de fragancias</p>
            <h2>Encuentra tu próxima esencia</h2>
          </div>
          <p>
            Ordena, filtra por disponibilidad y navega entre nuestras rutas de
            descubrimiento para encontrar el perfume indicado.
          </p>
        </header>

        <CatalogToolbar
          sort={sort}
          availableOnly={availableOnly}
          currentCount={products.nodes.length}
          contextLabel="Catálogo Essenze"
        />

        <PaginatedResourceSection
          connection={products}
          resourcesClassName={styles.grid}
          ariaLabel="Todos los productos"
        >
          {({node: product, index}) => (
            <ProductItem
              key={product.id}
              product={product}
              loading={index < 8 ? 'eager' : 'lazy'}
            />
          )}
        </PaginatedResourceSection>
      </section>
    </main>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    vendor
    productType
    availableForSale
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
`;

const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $query: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      nodes {
        ...CollectionItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_ITEM_FRAGMENT}
`;
