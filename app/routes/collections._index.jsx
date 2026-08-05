/**
 * collections._index.jsx
 * Listado de colecciones con Design System
 * Versión SIMPLE sin dependencias externas
 */

import {useLoaderData, Link} from 'react-router';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import styles from '~/styles/CollectionsGrid.module.css';

export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY, {
      variables: paginationVariables,
    }),
  ]);

  return {collections};
}

function loadDeferredData({context}) {
  return {};
}

export default function Collections() {
  const {collections} = useLoaderData();

  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Colecciones</h1>
          <p className={styles.heroSubtitle}>
            Explora nuestras colecciones curadas de fragancias de nicho
          </p>
        </div>
      </section>

      <section className={styles.collectionsSection}>
        <div className={styles.collectionsContainer}>
          <PaginatedResourceSection
            connection={collections}
            resourcesClassName={styles.collectionsGrid}
          >
            {({node: collection, index}) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                index={index}
              />
            )}
          </PaginatedResourceSection>
        </div>
      </section>
    </main>
  );
}

function CollectionItem({collection, index}) {
  return (
    <Link
      className={styles.collectionCard}
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      <div className={styles.collectionImageWrapper}>
        {collection?.image && (
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="1/1"
            data={collection.image}
            loading={index < 8 ? 'eager' : undefined}
            sizes="(min-width: 45em) 400px, 100vw"
            className={styles.collectionImage}
          />
        )}
        <div className={styles.overlay} />
      </div>

      <div className={styles.collectionContent}>
        <h3 className={styles.collectionTitle}>{collection.title}</h3>
      </div>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/** @typedef {import('./+types/collections._index').Route} Route */
/** @typedef {import('storefrontapi.generated').CollectionFragment} CollectionFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */