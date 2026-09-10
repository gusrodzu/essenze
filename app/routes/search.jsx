import {useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import {SearchForm} from '~/components/SearchForm';
import {SearchResults} from '~/components/SearchResults';
import {getEmptyPredictiveSearchResult} from '~/lib/search';
import styles from '~/styles/EditorialPage.module.css';

const MAX_SEARCH_TERM_LENGTH = 120;
const PREDICTIVE_LIMIT = 6;

/** @type {Route.MetaFunction} */
export const meta = ({data}) => {
  const term = data?.term?.trim();
  return [
    {
      title: term ? `Resultados para “${term}” | Essenze` : 'Buscar | Essenze',
    },
    {
      name: 'description',
      content:
        'Busca fragancias, marcas, colecciones, páginas y artículos en Essenze.',
    },
  ];
};

/** @param {Route.LoaderArgs} args */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');

  try {
    return isPredictive
      ? await predictiveSearch({request, context})
      : await regularSearch({request, context});
  } catch (error) {
    console.error('[Essenze search]', error);

    const term = sanitizeTerm(url.searchParams.get('q'));
    return {
      type: isPredictive ? 'predictive' : 'regular',
      term,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos completar la búsqueda.',
      result: isPredictive
        ? getEmptyPredictiveSearchResult()
        : getEmptyRegularSearchResult(),
    };
  }
}

export default function SearchPage() {
  const {type, term, result, error} = useLoaderData();
  if (type === 'predictive') return null;

  const hasTerm = Boolean(term?.trim());
  const hasResults = Boolean(result?.total);

  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroDark}`}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Catálogo Essenze</p>
          <h1 className={styles.title}>
            Encuentra una fragancia que hable de ti.
          </h1>
          <p className={styles.lede}>
            Busca por perfume, casa, familia olfativa, ocasión o una nota que te
            inspire.
          </p>

          <SearchForm role="search" aria-label="Buscar en Essenze">
            {({inputRef}) => (
              <div className={styles.searchPanel}>
                <input
                  autoComplete="off"
                  defaultValue={term}
                  enterKeyHint="search"
                  name="q"
                  placeholder="Ej. Dior, oud, floral, vainilla…"
                  ref={inputRef}
                  type="search"
                  aria-label="Buscar en Essenze"
                />
                <button type="submit">Buscar</button>
              </div>
            )}
          </SearchForm>
        </div>
      </section>

      <section className={styles.content} aria-live="polite">
        {error ? (
          <p className={styles.error} role="alert">
            No pudimos completar la búsqueda en este momento. Intenta de nuevo.
          </p>
        ) : null}

        {!hasTerm ? (
          <SearchResults.Empty />
        ) : !hasResults ? (
          <SearchResults.NoResults term={term} />
        ) : (
          <>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Resultados</p>
                <h2>“{term}”</h2>
              </div>
              <p>
                {result.total} coincidencia{result.total === 1 ? '' : 's'} en el
                catálogo y contenido editorial.
              </p>
            </div>

            <SearchResults result={result} term={term}>
              {({articles, pages, products, term: searchTerm}) => (
                <div>
                  <SearchResults.Products
                    products={products}
                    term={searchTerm}
                  />
                  <SearchResults.Pages pages={pages} term={searchTerm} />
                  <SearchResults.Articles
                    articles={articles}
                    term={searchTerm}
                  />
                </div>
              )}
            </SearchResults>
          </>
        )}
      </section>

      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </main>
  );
}

const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    id
    handle
    title
    vendor
    productType
    availableForSale
    featuredImage {
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
    }
  }
`;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
    __typename
    id
    handle
    title
  }
`;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    id
    handle
    title
    excerpt
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
  }
`;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment SearchPageInfo on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export const SEARCH_QUERY = `#graphql
  query RegularProductSearch(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $term: String!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, query: $term, sortKey: TITLE) {
      nodes {
        ...SearchProduct
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
`;

async function regularSearch({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = sanitizeTerm(url.searchParams.get('q'));

  if (!term) {
    return {
      type: 'regular',
      term: '',
      error: undefined,
      result: getEmptyRegularSearchResult(),
    };
  }

  const products = [];
  let after = null;
  let hasNextPage = true;

  while (hasNextPage && products.length < 250) {
    const response = await storefront.query(SEARCH_QUERY, {
      variables: {
        first: 100,
        after,
        term,
      },
    });

    products.push(...(response?.products?.nodes || []));
    hasNextPage = Boolean(response?.products?.pageInfo?.hasNextPage);
    after = response?.products?.pageInfo?.endCursor || null;
  }

  const productConnection = {
    nodes: products,
    totalCount: products.length,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };

  return {
    type: 'regular',
    term,
    error: undefined,
    result: {
      total: products.length,
      items: {
        articles: {nodes: [], totalCount: 0},
        pages: {nodes: [], totalCount: 0},
        products: productConnection,
      },
    },
  };
}

const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
  }
`;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
  }
`;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
  }
`;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    vendor
    productType
    availableForSale
    featuredImage {
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
`;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
  }
`;

const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit
      limitScope: $limitScope
      query: $term
      types: $types
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
`;

async function predictiveSearch({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = sanitizeTerm(url.searchParams.get('q'));
  const requestedLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 10)
    : PREDICTIVE_LIMIT;
  const type = 'predictive';

  if (term.length < 2) {
    return {type, term, result: getEmptyPredictiveSearchResult()};
  }

  const {predictiveSearch: items, errors} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {
        limit,
        limitScope: 'EACH',
        term,
        types: ['PRODUCT', 'COLLECTION', 'PAGE', 'ARTICLE', 'QUERY'],
      },
    },
  );

  if (!items) {
    return {
      type,
      term,
      error: errors?.map(({message}) => message).join(', ') || undefined,
      result: getEmptyPredictiveSearchResult(),
    };
  }

  const normalizedItems = {
    articles: items.articles ?? [],
    collections: items.collections ?? [],
    pages: items.pages ?? [],
    products: items.products ?? [],
    queries: items.queries ?? [],
  };

  const total = Object.values(normalizedItems).reduce(
    (acc, item) => acc + item.length,
    0,
  );

  return {
    type,
    term,
    error: errors?.map(({message}) => message).join(', ') || undefined,
    result: {items: normalizedItems, total},
  };
}

function sanitizeTerm(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}

function getEmptyRegularSearchResult() {
  return {
    total: 0,
    items: {
      articles: {nodes: [], totalCount: 0},
      pages: {nodes: [], totalCount: 0},
      products: {
        nodes: [],
        totalCount: 0,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    },
  };
}

/** @typedef {import('./+types/search').Route} Route */
