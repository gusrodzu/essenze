import {useMemo, useState} from 'react';
import {useLoaderData, Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import EssenzeIcon, {getCollectionIconName} from '~/components/EssenzeIcon';
import styles from '~/styles/CollectionsIndex.module.css';

export const meta = () => [
  {title: 'Colecciones | Essenze'},
  {
    name: 'description',
    content:
      'Explora las colecciones de Essenze por universo olfativo, ocasión y estilo.',
  },
];

const QUICK_FILTERS = [
  {label: 'Todas', value: 'all'},
  {label: 'Perfumería de nicho', value: 'nicho'},
  {label: 'Corporales', value: 'corporal'},
  {label: 'Velas', value: 'vela'},
  {label: 'Accesorios', value: 'accesorio'},
];

export async function loader({context}) {
  const nodes = [];
  let after = null;
  let hasNextPage = true;

  while (hasNextPage && nodes.length < 500) {
    const response = await context.storefront.query(COLLECTIONS_QUERY, {
      variables: {first: 250, after},
    });
    nodes.push(...(response?.collections?.nodes || []));
    hasNextPage = Boolean(response?.collections?.pageInfo?.hasNextPage);
    after = response?.collections?.pageInfo?.endCursor || null;
  }

  return {collections: {nodes, totalCount: nodes.length}};
}
export default function Collections() {
  const {collections} = useLoaderData();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const sortedCollections = useMemo(
    () => [...collections.nodes].sort(compareCollectionPriority),
    [collections.nodes],
  );

  const visibleIds = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return new Set(
      sortedCollections
        .filter((collection) => {
          const searchableText = normalizeText(
            `${collection.title} ${collection.description || ''}`,
          );
          const matchesQuery =
            !normalizedQuery || searchableText.includes(normalizedQuery);
          const matchesFilter =
            activeFilter === 'all' || searchableText.includes(activeFilter);

          return matchesQuery && matchesFilter;
        })
        .map((collection) => collection.id),
    );
  }, [activeFilter, query, sortedCollections]);

  const resultCount = visibleIds.size;

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
            Navega por categorías, busca una colección por nombre o explora el
            catálogo completo desde un mismo lugar.
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
          <Link to="#familias-olfativas" className={styles.directoryItem}>
            <span className={styles.directoryIcon} aria-hidden="true">
              <EssenzeIcon name="flower" size={18} />
            </span>
            <strong>Por familia olfativa</strong>
            <i aria-hidden="true">↗</i>
          </Link>
          <Link to="/marcas" className={styles.directoryItem}>
            <span className={styles.directoryIcon} aria-hidden="true">
              <EssenzeIcon name="building" size={18} />
            </span>
            <strong>Por maison o marca</strong>
            <i aria-hidden="true">↗</i>
          </Link>
          <Link to="/asesor" className={styles.directoryItem}>
            <span className={styles.directoryIcon} aria-hidden="true">
              <EssenzeIcon name="sparkles" size={18} />
            </span>
            <strong>Con asesoría personalizada</strong>
            <i aria-hidden="true">↗</i>
          </Link>
        </aside>
      </section>

      <section id="familias-olfativas" className={styles.content}>
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Colecciones</p>
            <h2>Elige cómo quieres explorar</h2>
          </div>
          <p>
            Usa el buscador o los accesos rápidos para encontrar una categoría
            sin recorrer toda la página.
          </p>
        </header>

        <div className={styles.navigator}>
          <div className={styles.searchBox}>
            <EssenzeIcon name="search" size={19} />
            <label className={styles.srOnly} htmlFor="collection-search">
              Buscar una colección
            </label>
            <input
              id="collection-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una colección..."
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className={styles.quickFilters} aria-label="Filtrar colecciones">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  activeFilter === filter.value ? styles.activeFilter : ''
                }
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={activeFilter === filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className={styles.resultSummary} aria-live="polite">
            <strong>{resultCount}</strong>
            <span>{resultCount === 1 ? 'colección' : 'colecciones'}</span>
          </div>
        </div>

        {resultCount === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <EssenzeIcon name="search" size={28} />
            </span>
            <h3>No encontramos esa colección</h3>
            <p>
              Prueba con otro término o vuelve a mostrar todas las categorías.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveFilter('all');
              }}
            >
              Ver todas las colecciones
            </button>
          </div>
        ) : (
          <div className={styles.grid} aria-label="Colecciones Essenze">
            {sortedCollections.map((collection, index) =>
              visibleIds.has(collection.id) ? (
                <CollectionItem
                  key={collection.id}
                  collection={collection}
                  index={index}
                />
              ) : null
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function CollectionItem({collection, index}) {
  const iconName = getCollectionIconName(collection.title);

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
            loading={index < 6 ? 'eager' : 'lazy'}
            sizes="(min-width: 1200px) 33vw, (min-width: 700px) 50vw, 100vw"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            {collection.title.slice(0, 1)}
          </div>
        )}
        <div className={styles.mediaShade} aria-hidden="true" />
      </div>

      <div className={styles.cardTopline}>
        <span className={styles.cardIcon} aria-hidden="true">
          <EssenzeIcon name={iconName} size={18} />
        </span>
        <span>Explorar</span>
      </div>

      <div className={styles.glass}>
        <div className={styles.cardCopy}>
          <h3 className={styles.cardTitle}>{collection.title}</h3>
          <p className={styles.cardDescription}>
            {collection.description ||
              'Descubre una selección de fragancias reunidas bajo un mismo universo.'}
          </p>
          <span className={styles.cardCta}>Explorar colección</span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

function compareCollectionPriority(a, b) {
  const priorities = [
    ['disponible', 'available'],
    ['mas vendido', 'best seller', 'bestseller'],
    ['nicho', 'niche'],
    ['disenador', 'designer'],
    ['arabe', 'arab'],
    ['influencer', 'collab', 'colab'],
  ];
  const rank = (collection) => {
    const value = normalizeText(`${collection?.title || ''} ${collection?.handle || ''}`);
    const index = priorities.findIndex((keywords) =>
      keywords.some((keyword) => value.includes(keyword)),
    );
    return index === -1 ? priorities.length : index;
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  return String(a?.title || '').localeCompare(String(b?.title || ''), 'es-MX', {sensitivity: 'base'});
}

function normalizeText(value = '') {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    description
    image { id url altText width height }
  }
  query StoreCollections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, after: $after, sortKey: TITLE) {
      totalCount
      nodes { ...Collection }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
