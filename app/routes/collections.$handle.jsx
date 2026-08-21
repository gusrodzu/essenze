import {redirect, useLoaderData, Link} from 'react-router';
import {getPaginationVariables, Analytics, Image} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import CatalogToolbar from '~/components/CatalogToolbar';
import {getCatalogOptions} from '~/lib/catalogSort';
import styles from '~/styles/CollectionDetail.module.css';

export const meta = ({data}) => [
  {title: `${data?.collection.title ?? 'Colección'} | Essenze`},
  {
    name: 'description',
    content:
      data?.collection.description ||
      'Descubre una selección de fragancias curada por Essenze.',
  },
];

export async function loader(args) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const catalogOptions = getCatalogOptions(request, 'collection');

  if (!handle) throw redirect('/collections');

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      ...paginationVariables,
      sortKey: catalogOptions.sortKey,
      reverse: catalogOptions.reverse,
      filters: catalogOptions.availableOnly ? [{available: true}] : [],
    },
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection, ...catalogOptions};
}

export default function Collection() {
  const {collection, sort, availableOnly} = useLoaderData();
  const hasImage = Boolean(collection.image);
  const description =
    collection.description ||
    'Una selección de fragancias reunidas para descubrir nuevos matices, casas y formas de expresar tu estilo.';

  return (
    <main className={styles.page}>
      <section
        className={`${styles.hero} ${
          hasImage ? styles.heroWithImage : styles.heroPlain
        }`}
        aria-labelledby="collection-title"
      >
        {collection.image ? (
          <Image
            className={styles.heroImage}
            data={collection.image}
            alt={collection.image.altText || collection.title}
            sizes="100vw"
            loading="eager"
          />
        ) : null}
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />

        <div className={styles.heroContent}>
          <nav className={styles.breadcrumbs} aria-label="Migas de pan">
            <Link to="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link to="/collections">Colecciones</Link>
            <span aria-hidden="true">/</span>
            <span>{collection.title}</span>
          </nav>

          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>Colección Essenze</p>
            <h1 id="collection-title" className={styles.title}>
              {collection.title}
            </h1>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#collection-products">
                Ver la selección
                <span aria-hidden="true">↓</span>
              </a>
              <Link className={styles.secondaryAction} to="/asesor">
                Recibir asesoría
              </Link>
            </div>
          </div>

          <aside className={styles.heroStory}>
            <span className={styles.storyIndex}>01 · El universo</span>
            <p>{description}</p>
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
          <strong>Todas las colecciones</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/marcas">
          <span>02</span>
          <strong>Descubrir por marca</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/#familias-olfativas">
          <span>03</span>
          <strong>Familias olfativas</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/comparador">
          <span>04</span>
          <strong>Comparar fragancias</strong>
          <i aria-hidden="true">↗</i>
        </Link>
      </nav>

      <section id="collection-products" className={styles.content}>
        <header className={styles.catalogIntro}>
          <div>
            <p className={styles.sectionEyebrow}>Selección disponible</p>
            <h2>Fragancias de {collection.title}</h2>
          </div>
          <p>
            Explora la colección, ordena los resultados y abre cada fragancia
            para conocer su perfil olfativo completo.
          </p>
        </header>

        <CatalogToolbar
          sort={sort}
          availableOnly={availableOnly}
          currentCount={collection.products.nodes.length}
          contextLabel={collection.title}
        />

        <PaginatedResourceSection
          connection={collection.products}
          resourcesClassName={styles.grid}
          ariaLabel={`Productos de ${collection.title}`}
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

      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
    </main>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
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
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
`;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        id
        url
        altText
        width
        height
      }
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;
