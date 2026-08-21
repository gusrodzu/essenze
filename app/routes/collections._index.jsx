import {useLoaderData, Link} from 'react-router';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import styles from '~/styles/CollectionsIndex.module.css';

export const meta = () => [
  {title: 'Colecciones | Essenze'},
  {
    name: 'description',
    content:
      'Explora las colecciones curadas de Essenze por universo olfativo, ocasión y estilo.',
  },
];

export async function loader({context, request}) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 9});
  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables,
  });

  return {collections};
}

export default function Collections() {
  const {collections} = useLoaderData();

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="collections-title">
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <nav className={styles.breadcrumbs} aria-label="Migas de pan">
            <Link to="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span>Colecciones</span>
          </nav>

          <p className={styles.eyebrow}>Biblioteca olfativa Essenze</p>
          <h1 id="collections-title" className={styles.title}>
            Encuentra una fragancia para <em>cada versión de ti.</em>
          </h1>
          <p className={styles.lede}>
            Explora selecciones construidas alrededor de familias olfativas,
            momentos, estilos y descubrimientos que merecen un lugar en tu
            colección.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} to="/collections/all">
              Ver todas las fragancias
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.secondaryAction} to="/asesor">
              Encontrar mi fragancia
            </Link>
          </div>
        </div>

        <aside className={styles.heroDirectory} aria-label="Formas de explorar">
          <p className={styles.directoryLabel}>Explora a tu manera</p>
          <Link to="/#familias-olfativas" className={styles.directoryItem}>
            <span>01</span>
            <strong>Por familia olfativa</strong>
            <i aria-hidden="true">↗</i>
          </Link>
          <Link to="/marcas" className={styles.directoryItem}>
            <span>02</span>
            <strong>Por maison o marca</strong>
            <i aria-hidden="true">↗</i>
          </Link>
          <Link to="/asesor" className={styles.directoryItem}>
            <span>03</span>
            <strong>Con asesoría personalizada</strong>
            <i aria-hidden="true">↗</i>
          </Link>
        </aside>
      </section>

      <section className={styles.content}>
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Colecciones seleccionadas</p>
            <h2>Universos para descubrir</h2>
          </div>
          <p>
            Cada colección es una puerta de entrada distinta al catálogo:
            elige una y comienza a explorar.
          </p>
        </header>

        <nav className={styles.utilityBar} aria-label="Explorar catálogo">
          <div className={styles.utilityCopy}>
            <span className={styles.utilityLabel}>Directorio Essenze</span>
            <strong>Encuentra la ruta que mejor se adapte a ti.</strong>
          </div>
          <div className={styles.utilityLinks}>
            <Link to="/collections/all">Todas las fragancias</Link>
            <Link to="/marcas">Marcas</Link>
            <Link to="/search">Buscar</Link>
          </div>
        </nav>

        <PaginatedResourceSection
          connection={collections}
          resourcesClassName={styles.grid}
          ariaLabel="Colecciones Essenze"
          totalCount={collections.totalCount}
          pageSize={9}
        >
          {({node: collection, index}) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              index={index}
            />
          )}
        </PaginatedResourceSection>
      </section>
    </main>
  );
}

function CollectionItem({collection, index}) {
  const number = String(index + 1).padStart(2, '0');

  return (
    <Link
      className={styles.card}
      to={`/collections/${collection.handle}`}
      prefetch="intent"
      aria-label={`Explorar colección ${collection.title}`}
    >
      <div className={styles.media}>
        {collection.image ? (
          <Image
            className={styles.image}
            alt={collection.image.altText || collection.title}
            data={collection.image}
            loading={index < 4 ? 'eager' : 'lazy'}
            sizes="(min-width: 1100px) 50vw, (min-width: 700px) 50vw, 100vw"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            {collection.title.slice(0, 1)}
          </div>
        )}
        <div className={styles.mediaShade} aria-hidden="true" />
      </div>

      <div className={styles.cardTopline}>
        <span>{number}</span>
        <span>Colección Essenze</span>
      </div>

      <div className={styles.glass}>
        <div className={styles.cardCopy}>
          <h3 className={styles.cardTitle}>{collection.title}</h3>
          <p className={styles.cardDescription}>
            {collection.description ||
              'Descubre una selección de fragancias reunidas bajo un mismo universo.'}
          </p>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          ↗
        </span>
      </div>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    description
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
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      sortKey: TITLE
    ) {
      totalCount
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
