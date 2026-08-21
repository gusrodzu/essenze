import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import Hero from '~/components/Hero';
import TrustBar from '~/components/TrustBar';
import AromaticNotes from '~/components/AromaticNotes';
import FeaturedFragrances from '~/components/FeaturedFragrances';
import FragranceComparator from '~/components/FragranceComparator';
import PersonalizedFragrance from '~/components/PersonalizedFragrance';
import {MockShopNotice} from '~/components/MockShopNotice';
import SeasonalLookbook from '~/components/SeasonalLookbook';
import {RECOMMENDATION_METAFIELD_IDENTIFIERS} from '~/lib/fragranceRecommendations';
import {
  COMPARATOR_METAFIELD_IDENTIFIERS,
  queueProductForComparison,
} from '~/lib/fragranceComparator';

const HOME_PRODUCT_METAFIELD_IDENTIFIERS = [
  ...new Map(
    [
      ...RECOMMENDATION_METAFIELD_IDENTIFIERS,
      ...COMPARATOR_METAFIELD_IDENTIFIERS,
    ].map((identifier) => [
      `${identifier.namespace}.${identifier.key}`,
      identifier,
    ]),
  ).values(),
];

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Essenze | Perfumería y fragancias seleccionadas'}, {name: 'description', content: 'Descubre fragancias, marcas y familias olfativas en una experiencia de perfumería curada por Essenze México.'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load critical data
 */
async function loadCriticalData({context}) {
  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
  };
}

/**
 * Load deferred data
 */
function loadDeferredData({context}) {
  const allCollections = context.storefront
    .query(ALL_COLLECTIONS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  const featuredProducts = context.storefront
    .query(FEATURED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY, {
      variables: {
        first: 100,
        metafieldIdentifiers: HOME_PRODUCT_METAFIELD_IDENTIFIERS,
      },
    })
    .catch((error) => {
      console.error('No fue posible cargar el catálogo del quiz:', error);
      return {products: {nodes: []}};
    });

  return {
    allCollections,
    featuredProducts,
    recommendedProducts,
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();

  return (
    <main className="home">
      {data.isShopLinked ? null : <MockShopNotice />}

      {/* ===== HERO SECTION ===== */}
      <Hero />
      <TrustBar />

      {/* ===== SEASONAL LOOKBOOK ===== */}
      <Suspense fallback={<HomeSectionSkeleton label="Cargando colecciones…" />}>
        <Await resolve={data.allCollections}>
          {(response) => (
            <SeasonalLookbook
              collections={response?.collections?.nodes || []}
            />
          )}
        </Await>
      </Suspense>

      {/* ===== AROMATIC NOTES LIBRARY ===== */}
      <Suspense fallback={<HomeSectionSkeleton label="Preparando familias olfativas…" />}>
        <Await resolve={data.allCollections}>
          {(response) => (
            <AromaticNotes collections={response?.collections?.nodes || []} />
          )}
        </Await>
      </Suspense>

      {/* ===== FEATURED FRAGRANCES ===== */}
      <Suspense fallback={<HomeSectionSkeleton label="Seleccionando fragancias destacadas…" />}>
        <Await resolve={data.featuredProducts}>
          {(response) => (
            <FeaturedFragrances
              products={response?.products?.nodes || []}
              onAddToCart={(product) => {
                window.location.href = `/products/${product.handle}`;
              }}
              onCompare={(product) => {
                queueProductForComparison(product.id);
              }}
            />
          )}
        </Await>
      </Suspense>

      {/* ===== PERSONALIZED FRAGRANCE QUIZ ===== */}
      <Suspense fallback={<LoadingQuiz />}>
        <Await resolve={data.recommendedProducts}>
          {(response) => (
            <PersonalizedFragrance products={response?.products?.nodes || []} />
          )}
        </Await>
      </Suspense>

      {/* ===== RECOMMENDED PRODUCTS ===== */}
      {/* <RecommendedProducts products={data.recommendedProducts} /> */}

      {/* ===== FRAGRANCE COMPARATOR ===== */}
      <Suspense fallback={<HomeSectionSkeleton label="Preparando el comparador…" compact />}>
        <Await resolve={data.recommendedProducts}>
          {(response) => (
            <FragranceComparator products={response?.products?.nodes || []} />
          )}
        </Await>
      </Suspense>
    </main>
  );
}


function HomeSectionSkeleton({label, compact = false}) {
  return (
    <section className={`home-section-skeleton ${compact ? 'is-compact' : ''}`} aria-live="polite" aria-busy="true">
      <div className="home-section-skeleton-copy">
        <span>Essenze</span>
        <div className="home-section-skeleton-title" />
        <div className="home-section-skeleton-text" />
        <p>{label}</p>
      </div>
      {!compact ? <div className="home-section-skeleton-cards" aria-hidden="true"><i /><i /><i /></div> : null}
    </section>
  );
}

/**
 * Loading state para el asesor olfativo.
 */
function LoadingQuiz() {
  return (
    <section className="home-loading-section" aria-live="polite">
      <div className="home-loading-quiz">
        <span className="home-loading-eyebrow">Scent concierge</span>
        <div className="home-loading-line home-loading-line-title" />
        <div className="home-loading-line" />
        <p>Preparando tu asesor olfativo…</p>
      </div>
    </section>
  );
}

/**
 * GraphQL Queries
 */


/**
 * Query para obtener TODAS las colecciones (hasta 50)
 * Necesario para AromaticNotes
 */
const ALL_COLLECTIONS_QUERY = `#graphql
  fragment CollectionInfo on Collection {
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
  query AllCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 50) {
      nodes {
        ...CollectionInfo
      }
    }
  }
`;

/**
 * Query para obtener productos destacados
 * Productos con tag "featured" o "bestseller"
 */
const FEATURED_PRODUCTS_QUERY = `#graphql
  fragment FeaturedProduct on Product {
    id
    title
    handle
    vendor
    productType
    availableForSale
    tags
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant {
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query FeaturedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedProduct
      }
    }
  }
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    vendor
    productType
    description
    availableForSale
    tags
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
    options {
      name
      optionValues {
        name
      }
    }
    selectedOrFirstAvailableVariant {
      id
      title
      availableForSale
      image {
        id
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
    metafields(identifiers: $metafieldIdentifiers) {
      id
      namespace
      key
      type
      value
    }
  }
  query RecommendedProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {import('storefrontapi.generated').FeaturedCollectionFragment} FeaturedCollectionFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductsQuery} RecommendedProductsQuery */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
