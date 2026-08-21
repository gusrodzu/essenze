import {Image, Money, Pagination} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {urlWithTrackingParams} from '~/lib/search';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import UnifiedProductCard from './UnifiedProductCard';
import styles from './SearchResults.module.css';

export function SearchResults({term, result, children}) {
  if (!result?.total) return null;
  return (
    <div className={styles.searchResults}>
      {children({...result.items, term})}
    </div>
  );
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;
SearchResults.NoResults = SearchResultsNoResults;

function SearchResultsArticles({term, articles}) {
  if (!articles?.nodes?.length) return null;

  return (
    <section
      className={styles.searchResult}
      aria-labelledby="search-articles-title"
    >
      <div className={styles.resultSectionHeader}>
        <div>
          <p className={styles.resultEyebrow}>Inspiración</p>
          <h2 id="search-articles-title" className={styles.searchResultHeading}>
            Journal
          </h2>
        </div>
        <span className={styles.resultCount}>
          {articles.totalCount ?? articles.nodes.length} resultado
          {(articles.totalCount ?? articles.nodes.length) === 1 ? '' : 's'}
        </span>
      </div>

      <div className={styles.articlesList}>
        {articles.nodes.map((article) => {
          const blogHandle = article.blog?.handle;
          if (!blogHandle) return null;

          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${blogHandle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <article key={article.id} className={styles.articlesItem}>
              <Link prefetch="intent" to={articleUrl}>
                {article.image?.url ? (
                  <div className={styles.articleImage}>
                    <Image
                      data={article.image}
                      alt={article.image.altText || article.title}
                      sizes="(max-width: 700px) 100vw, 280px"
                    />
                  </div>
                ) : null}
                <div className={styles.articleContent}>
                  <p className={styles.resultVendor}>Journal Essenze</p>
                  <h3 className={styles.resultTitle}>{article.title}</h3>
                  {article.excerpt ? (
                    <p className={styles.resultDescription}>
                      {article.excerpt}
                    </p>
                  ) : null}
                  <span className={styles.articleMeta}>Leer artículo →</span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SearchResultsPages({term, pages}) {
  if (!pages?.nodes?.length) return null;

  return (
    <section
      className={styles.searchResult}
      aria-labelledby="search-pages-title"
    >
      <div className={styles.resultSectionHeader}>
        <div>
          <p className={styles.resultEyebrow}>Información</p>
          <h2 id="search-pages-title" className={styles.searchResultHeading}>
            Páginas
          </h2>
        </div>
        <span className={styles.resultCount}>
          {pages.totalCount ?? pages.nodes.length} resultado
          {(pages.totalCount ?? pages.nodes.length) === 1 ? '' : 's'}
        </span>
      </div>

      <div className={styles.pagesList}>
        {pages.nodes.map((page) => {
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
                  <span className={styles.pageMeta}>Abrir página →</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SearchResultsProducts({term, products}) {
  if (!products?.nodes?.length) return null;

  return (
    <section
      className={styles.searchResult}
      aria-labelledby="search-products-title"
    >
      <div className={styles.resultSectionHeader}>
        <div>
          <p className={styles.resultEyebrow}>Catálogo</p>
          <h2 id="search-products-title" className={styles.searchResultHeading}>
            Fragancias
          </h2>
        </div>
        <span className={styles.resultCount}>
          {products.totalCount ?? products.nodes.length} resultado
          {(products.totalCount ?? products.nodes.length) === 1 ? '' : 's'}
        </span>
      </div>

      <Pagination connection={products} namespace="search-products">
        {({nodes, isLoading, NextLink, PreviousLink}) => (
          <div>
            <div className={styles.productsGrid}>
              {nodes.map((product) => {
                const productUrl = urlWithTrackingParams({
                  baseUrl: `/products/${product.handle}`,
                  trackingParams: product.trackingParameters,
                  term,
                });

                const variant = product.selectedOrFirstAvailableVariant;
                const price = variant?.price ?? product.priceRange?.minVariantPrice;
                const image = variant?.image ?? product.featuredImage;
                const available =
                  variant?.availableForSale ?? product.availableForSale ?? false;

                return (
                  <UnifiedProductCard
                    available={available}
                    dataProductId={product.id}
                    image={image}
                    key={product.id}
                    loading="lazy"
                    onCompare={() => queueProductForComparison(product.id)}
                    price={price ? <Money data={price} /> : 'Consultar precio'}
                    productType={product.productType || 'Perfumería de autor'}
                    sizes="(max-width: 700px) 50vw, (max-width: 980px) 33vw, 25vw"
                    title={product.title}
                    to={productUrl}
                    vendor={product.vendor}
                  />
                );
              })}
            </div>

            <div
              className={styles.paginationContainer}
              aria-label="Paginación de resultados"
            >
              <PreviousLink
                className={`${styles.paginationButton} ${styles.paginationPrevious}`}
                preventScrollReset={false}
              >
                <span aria-hidden="true">←</span> Anterior
              </PreviousLink>

              <span className={styles.paginationInfo} aria-live="polite">
                {isLoading ? 'Cargando resultados…' : 'Explora más resultados'}
              </span>

              <NextLink
                className={`${styles.paginationButton} ${styles.paginationNext}`}
                preventScrollReset={false}
              >
                Siguiente <span aria-hidden="true">→</span>
              </NextLink>
            </div>
          </div>
        )}
      </Pagination>
    </section>
  );
}

function SearchResultsEmpty() {
  return (
    <div className={styles.noResults}>
      <div className={styles.noResultsIcon} aria-hidden="true">
        <span />
      </div>
      <p className={styles.resultEyebrow}>Explora Essenze</p>
      <h2 className={styles.noResultsTitle}>¿Qué aroma estás buscando?</h2>
      <p className={styles.noResultsText}>
        Escribe una marca, un perfume, una nota como vainilla u oud, o una
        familia olfativa como floral, amaderada o cítrica.
      </p>
      <div className={styles.emptyActions}>
        <Link to="/collections/all">Ver todo el catálogo</Link>
        <Link to="/asesor">Usar el asesor</Link>
      </div>
    </div>
  );
}

function SearchResultsNoResults({term}) {
  return (
    <div className={styles.noResults}>
      <div
        className={`${styles.noResultsIcon} ${styles.noResultsIconEmpty}`}
        aria-hidden="true"
      >
        <span />
      </div>
      <p className={styles.resultEyebrow}>Sin coincidencias</p>
      <h2 className={styles.noResultsTitle}>No encontramos “{term}”.</h2>
      <p className={styles.noResultsText}>
        Prueba con una palabra más corta, revisa la ortografía o busca por
        marca, familia olfativa o nota principal.
      </p>
      <div className={styles.emptyActions}>
        <Link to="/collections/all">Explorar catálogo</Link>
        <Link to="/marcas">Ver marcas</Link>
      </div>
    </div>
  );
}
