import {Await, useLoaderData, Link} from 'react-router';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import Hero from '~/components/Hero';
import AromaticNotes from '~/components/AromaticNotes';
import FeaturedFragrances from '~/components/FeaturedFragrances';
import FragranceComparator from '~/components/FragranceComparator';
import PersonalizedFragrance from '~/components/PersonalizedFragrance';
import ProductCard from '~/components/ProductCard';
import {MockShopNotice} from '~/components/MockShopNotice';
import SeasonalLookbook from '~/components/SeasonalLookbook';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Essenze | Luxury Niche Fragrance'}];
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
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
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
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
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
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      
      {/* ===== HERO SECTION ===== */}
      <Hero
        backgroundImage={data.featuredCollection?.image?.url}
        title="Essenze"
        subtitle="Discover Luxury Niche Fragrances"
        ctaText="Explore Collections"
        ctaLink="/collections"
        onSearch={(query) => {
          window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }}
      />

            
      {/* ===== PERSONALIZED FRAGRANCE QUIZ ===== */}
      <Suspense fallback={<LoadingQuiz />}>
        <Await resolve={data.recommendedProducts}>
          {(response) => (
            <PersonalizedFragrance 
              products={response?.products?.nodes || []}
            />
          )}
        </Await>
      </Suspense>
      
      {/* ===== AROMATIC NOTES LIBRARY ===== */}
      <Suspense fallback={null}>
        <Await resolve={data.allCollections}>
          {(response) => (
            <AromaticNotes 
              collections={response?.collections?.nodes || []}
            />
          )}
        </Await>
      </Suspense>
      
      {/* ===== FEATURED FRAGRANCES ===== */}
      <Suspense fallback={null}>
        <Await resolve={data.featuredProducts}>
          {(response) => (
            <FeaturedFragrances 
              products={response?.products?.nodes || []}
              onAddToCart={(product) => {
                window.location.href = `/products/${product.handle}`;
              }}
              onCompare={(product) => {
                console.log('Comparar:', product.title);
              }}
            />
          )}
        </Await>
      </Suspense>


      
      {/* ===== RECOMMENDED PRODUCTS ===== */}
      {/* <RecommendedProducts products={data.recommendedProducts} /> */}

      
      {/* ===== FRAGRANCE COMPARATOR ===== */}
      <Suspense fallback={null}>
        <Await resolve={data.recommendedProducts}>
          {(response) => (
            <FragranceComparator 
              products={response?.products?.nodes || []}
            />
          )}
        </Await>
      </Suspense>



      {/* ===== SEASONAL LOOKBOOK ===== */}
<Suspense fallback={null}>
  <Await resolve={data.allCollections}>
    {(response) => (
      <SeasonalLookbook 
        collections={response?.collections?.nodes || []}
      />
    )}
  </Await>
</Suspense>
    </div>
  );
}

/**
 * Loading skeleton para el quiz
 */
function LoadingQuiz() {
  return (
    <section className="personalized-fragrance-section">
      <div className="container">
        <div className="quiz-container" style={{
          padding: 'var(--space-8)',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          Cargando quiz...
        </div>
      </div>
    </section>
  );
}

/**
 * Recommended Products
 */
function RecommendedProducts({products}) {
  return (
    <section
      className="recommended-products"
      aria-labelledby="recommended-products"
    >
      <div className="container py-10">
        <h2 
          id="recommended-products"
          className="text-h2 text-center mb-10"
        >
          Luxury Collections
        </h2>

        <Suspense fallback={<LoadingSkeletons />}>
          <Await resolve={products}>
            {(response) => (
              <div className="grid grid-4 gap-6">
                {response
                  ? response.products.nodes.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={(prod) => {
                          window.location.href = `/products/${prod.handle}`;
                        }}
                      />
                    ))
                  : null}
              </div>
            )}
          </Await>
        </Suspense>
      </div>
    </section>
  );
}

/**
 * Loading Skeletons
 */
function LoadingSkeletons() {
  return (
    <div className="grid grid-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProductCard
          key={`skeleton-${i}`}
          isLoading={true}
        />
      ))}
    </div>
  );
}

/**
 * GraphQL Queries
 */
const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
`;

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
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 12, sortKey: UPDATED_AT, reverse: true) {
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