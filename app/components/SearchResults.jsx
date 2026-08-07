import {Link} from 'react-router';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams} from '~/lib/search';
import styles from './SearchResults.module.css';

/**
 * SearchResults Component - Optimizado para SearchPage
 * @param {Omit<SearchResultsProps, 'error' | 'type'>}
 */
export function SearchResults({term, result, children}) {
  if (!result?.total) {
    return (
      <div className={styles.noResults}>
        <div className={styles.noResultsIcon}>🔍</div>
        <h2 className={styles.noResultsTitle}>Sin resultados</h2>
        <p className={styles.noResultsText}>
          No encontramos resultados para <strong>"{term}"</strong>
        </p>
        <p className={styles.noResultsSuggestion}>
          Intenta con otros términos de búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className={styles.searchResults}>
      {/* Mostrando X resultados */}
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          Se encontraron <strong>{result?.total || 0}</strong> resultado{result?.total !== 1 ? 's' : ''} para <strong>"{term}"</strong>
        </p>
      </div>

      {children({...result.items, term})}
    </div>
  );
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

/**
 * Search Results - Artículos
 * @param {PartialSearchResult<'articles'>}
 */
function SearchResultsArticles({term, articles}) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <section className={styles.searchResult}>
      <h2 className={styles.searchResultHeading}>
        Artículos
        <span className={styles.resultCount}>({articles.nodes.length})</span>
      </h2>
      <div className={styles.articlesList}>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <article key={article.id} className={styles.articlesItem}>
              <Link prefetch="intent" to={articleUrl}>
                <div className={styles.articleContent}>
                  <h3 className={styles.resultTitle}>{article.title}</h3>
                  <p className={styles.resultDescription}>
                    Lee nuestro artículo sobre este tema
                  </p>
                  <span className={styles.articleMeta}>Artículo →</span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Search Results - Páginas
 * @param {PartialSearchResult<'pages'>}
 */
function SearchResultsPages({term, pages}) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <section className={styles.searchResult}>
      <h2 className={styles.searchResultHeading}>
        Páginas
        <span className={styles.resultCount}>({pages.nodes.length})</span>
      </h2>
      <div className={styles.pagesList}>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <div key={page.id} className={styles.pagesItem}>
              <Link prefetch="intent" to={pageUrl}>
                <div className={styles.pageContent}>
                  <h3 className={styles.resultTitle}>{page.title}</h3>
                  <span className={styles.pageMeta}>Página →</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Search Results - Productos
 * @param {PartialSearchResult<'products'>}
 */
function SearchResultsProducts({term, products}) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <section className={styles.searchResult}>
      <h2 className={styles.searchResultHeading}>
        Productos
        <span className={styles.resultCount}>({products.nodes.length})</span>
      </h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });

            const price = product?.selectedOrFirstAvailableVariant?.price;
            const image = product?.selectedOrFirstAvailableVariant?.image;
            const available = product?.selectedOrFirstAvailableVariant?.availableForSale;

            return (
              <div key={product.id} className={styles.searchResultsItem}>
                <Link prefetch="intent" to={productUrl}>
                  <div className={styles.productImageContainer}>
                    {image && (
                      <Image
                        data={image}
                        alt={product.title}
                        className={styles.resultImage}
                        width={200}
                      />
                    )}
                    {!available && (
                      <div className={styles.outOfStockBadge}>Agotado</div>
                    )}
                  </div>
                  <div className={styles.resultContent}>
                    <h3 className={styles.resultTitle}>{product.title}</h3>
                    {price && (
                      <p className={styles.resultPrice}>
                        <Money data={price} />
                      </p>
                    )}
                    <span className={styles.productMeta}>Ver detalles →</span>
                  </div>
                </Link>
              </div>
            );
          });

          return (
            <div>
              <div className={styles.productsGrid}>
                {ItemsMarkup}
              </div>

              {/* Pagination Controls */}
              <ProductsPagination
                isLoading={isLoading}
                nodesLength={nodes.length}
                PreviousLink={PreviousLink}
                NextLink={NextLink}
              />
            </div>
          );
        }}
      </Pagination>
    </section>
  );
}

/**
 * Pagination Controls Component
 */
function ProductsPagination({isLoading, nodesLength, PreviousLink, NextLink}) {
  return (
    <div className={styles.paginationContainer}>
      <PreviousLink>
        {(link) => (
          <button
            className={styles.paginationButton}
            disabled={isLoading || !link}
            onClick={() => link?.click?.()}
          >
            ← Anterior
          </button>
        )}
      </PreviousLink>

      <span className={styles.paginationInfo}>
        {nodesLength > 0 ? `Mostrando ${nodesLength} producto${nodesLength !== 1 ? 's' : ''}` : 'Sin productos'}
      </span>

      <NextLink>
        {(link) => (
          <button
            className={styles.paginationButton}
            disabled={isLoading || !link}
            onClick={() => link?.click?.()}
          >
            Siguiente →
          </button>
        )}
      </NextLink>
    </div>
  );
}

/**
 * Empty State Component
 */
function SearchResultsEmpty() {
  return (
    <div className={styles.noResults}>
      <div className={styles.noResultsIcon}>✕</div>
      <h2 className={styles.noResultsTitle}>Sin resultados</h2>
      <p className={styles.noResultsText}>
        No encontramos lo que buscas. Intenta con otros términos.
      </p>
    </div>
  );
}

/** @typedef {RegularSearchReturn['result']['items']} SearchItems */
/**
 * @typedef {Pick<
 *   SearchItems,
 *   ItemType
 * > &
 *   Pick<RegularSearchReturn, 'term'>} PartialSearchResult
 * @template {keyof SearchItems} ItemType
 */
/**
 * @typedef {RegularSearchReturn & {
 *   children: (args: SearchItems & {term: string}) => React.ReactNode;
 * }} SearchResultsProps
 */

/** @typedef {import('~/lib/search').RegularSearchReturn} RegularSearchReturn */