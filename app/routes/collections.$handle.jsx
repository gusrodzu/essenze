import {redirect, useLoaderData, Link} from 'react-router';
import {Analytics, Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import CatalogToolbar from '~/components/CatalogToolbar';
import EssenzeIcon from '~/components/EssenzeIcon';
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
  const catalogOptions = getCatalogOptions(request, 'collection');

  if (!handle) throw redirect('/collections');

  const products = [];
  let after = null;
  let hasNextPage = true;
  let collectionMeta = null;

  while (hasNextPage && products.length < 1000) {
    const response = await storefront.query(COLLECTION_QUERY, {
      variables: {
        handle,
        first: 250,
        after,
        filters: catalogOptions.availableOnly ? [{available: true}] : [],
      },
    });

    const collection = response?.collection;
    if (!collection) break;
    if (!collectionMeta) {
      collectionMeta = {
        id: collection.id,
        handle: collection.handle,
        title: collection.title,
        description: collection.description,
        image: collection.image,
      };
    }

    products.push(...(collection.products?.nodes || []));
    hasNextPage = Boolean(collection.products?.pageInfo?.hasNextPage);
    after = collection.products?.pageInfo?.endCursor || null;
  }

  if (!collectionMeta) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  const collection = {
    ...collectionMeta,
    products: {
      nodes: products,
      pageInfo: {hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null},
    },
  };

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection, ...catalogOptions};
}
export default function Collection() {
  const {collection, sort, availableOnly} = useLoaderData();
  const totalCount = collection.products.nodes.length;
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
            <span className={styles.storyIndex}>
              <EssenzeIcon name="sparkles" size={17} />
              El universo
            </span>
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
          <span className={styles.discoveryIcon} aria-hidden="true">
            <EssenzeIcon name="layers" size={18} />
          </span>
          <strong>Todas las colecciones</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/marcas">
          <span className={styles.discoveryIcon} aria-hidden="true">
            <EssenzeIcon name="building" size={18} />
          </span>
          <strong>Descubrir por marca</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/collections#familias-olfativas">
          <span className={styles.discoveryIcon} aria-hidden="true">
            <EssenzeIcon name="flower" size={18} />
          </span>
          <strong>Familias olfativas</strong>
          <i aria-hidden="true">↗</i>
        </Link>
        <Link to="/comparador">
          <span className={styles.discoveryIcon} aria-hidden="true">
            <EssenzeIcon name="compare" size={18} />
          </span>
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
          totalCount={totalCount}
          contextLabel={collection.title}
        />

        <div className={styles.grid} aria-label={`Productos de ${collection.title}`}>
          {collection.products.nodes.map((product, index) => (
            <ProductItem
              key={product.id}
              product={product}
              loading={index < 8 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
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
  query CollectionAllProducts(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image { id url altText width height }
      products(first: $first, after: $after, filters: $filters) {
        nodes { ...ProductItem }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;
