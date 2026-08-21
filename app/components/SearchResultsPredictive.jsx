import {Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {
  getEmptyPredictiveSearchResult,
  urlWithTrackingParams,
} from '~/lib/search';
import styles from './SearchResultsPredictive.module.css';

export function SearchResultsPredictive({
  children,
  closeSearch,
  isSearching = false,
  query = '',
  result,
}) {
  const empty = getEmptyPredictiveSearchResult();
  const items = result?.items ?? empty.items;
  const total = result?.total ?? 0;

  return children({
    items,
    closeSearch,
    isSearching,
    query,
    total,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;
SearchResultsPredictive.Loading = SearchResultsPredictiveLoading;

function SearchResultsPredictiveArticles({query, articles, closeSearch}) {
  if (!articles?.length) return null;

  return (
    <section
      className={styles.group}
      aria-labelledby="predictive-articles-title"
    >
      <h5 id="predictive-articles-title" className={styles.groupTitle}>
        Journal
      </h5>
      <ul className={styles.list}>
        {articles.map((article) => {
          const blogHandle = article.blog?.handle;
          if (!blogHandle) return null;

          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${blogHandle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term: query,
          });

          return (
            <li className={styles.item} key={article.id}>
              <Link onClick={closeSearch} to={articleUrl}>
                <ResultImage image={article.image} title={article.title} />
                <div className={styles.itemCopy}>
                  <span className={styles.itemType}>Artículo</span>
                  <p className={styles.itemTitle}>{article.title}</p>
                </div>
                <span className={styles.itemArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SearchResultsPredictiveCollections({query, collections, closeSearch}) {
  if (!collections?.length) return null;

  return (
    <section
      className={styles.group}
      aria-labelledby="predictive-collections-title"
    >
      <h5 id="predictive-collections-title" className={styles.groupTitle}>
        Colecciones
      </h5>
      <ul className={styles.list}>
        {collections.map((collection) => {
          const collectionUrl = urlWithTrackingParams({
            baseUrl: `/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term: query,
          });

          return (
            <li className={styles.item} key={collection.id}>
              <Link onClick={closeSearch} to={collectionUrl}>
                <ResultImage
                  image={collection.image}
                  title={collection.title}
                />
                <div className={styles.itemCopy}>
                  <span className={styles.itemType}>Colección</span>
                  <p className={styles.itemTitle}>{collection.title}</p>
                </div>
                <span className={styles.itemArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SearchResultsPredictivePages({query, pages, closeSearch}) {
  if (!pages?.length) return null;

  return (
    <section className={styles.group} aria-labelledby="predictive-pages-title">
      <h5 id="predictive-pages-title" className={styles.groupTitle}>
        Páginas
      </h5>
      <ul className={styles.compactList}>
        {pages.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term: query,
          });

          return (
            <li key={page.id}>
              <Link onClick={closeSearch} to={pageUrl}>
                <span>{page.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SearchResultsPredictiveProducts({query, products, closeSearch}) {
  if (!products?.length) return null;

  return (
    <section
      className={styles.group}
      aria-labelledby="predictive-products-title"
    >
      <h5 id="predictive-products-title" className={styles.groupTitle}>
        Fragancias
      </h5>
      <ul className={styles.list}>
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: query,
          });

          const variant = product.selectedOrFirstAvailableVariant;
          const price = variant?.price ?? product.priceRange?.minVariantPrice;
          const image = variant?.image ?? product.featuredImage;
          const available =
            variant?.availableForSale ?? product.availableForSale ?? false;

          return (
            <li className={styles.item} key={product.id}>
              <Link to={productUrl} onClick={closeSearch}>
                <ResultImage image={image} title={product.title} product />
                <div className={styles.itemCopy}>
                  {product.vendor ? (
                    <span className={styles.itemType}>{product.vendor}</span>
                  ) : null}
                  <p className={styles.itemTitle}>{product.title}</p>
                  <div className={styles.productMeta}>
                    <small>
                      {price ? <Money data={price} /> : 'Consultar precio'}
                    </small>
                    <small
                      className={
                        available ? styles.available : styles.unavailable
                      }
                    >
                      {available ? 'Disponible' : 'Agotado'}
                    </small>
                  </div>
                </div>
                <span className={styles.itemArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SearchResultsPredictiveQueries({queries, queriesDatalistId}) {
  if (!queries?.length) return null;

  return (
    <datalist id={queriesDatalistId}>
      {queries.map((suggestion) =>
        suggestion?.text ? (
          <option key={suggestion.text} value={suggestion.text} />
        ) : null,
      )}
    </datalist>
  );
}

function SearchResultsPredictiveLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <p>Buscando fragancias y colecciones…</p>
    </div>
  );
}

function SearchResultsPredictiveEmpty({query, closeSearch}) {
  if (!query) {
    return (
      <div className={styles.initialState}>
        <span className={styles.searchGlyph} aria-hidden="true" />
        <p>Escribe una marca, fragancia o nota olfativa.</p>
      </div>
    );
  }

  if (query.trim().length < 2) {
    return (
      <div className={styles.initialState}>
        <span className={styles.searchGlyph} aria-hidden="true" />
        <p>Escribe al menos dos caracteres para buscar.</p>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <span className={styles.emptyMark} aria-hidden="true">
        ×
      </span>
      <h4>Sin coincidencias</h4>
      <p>
        No encontramos resultados para <q>{query}</q>. Prueba con una marca,
        familia olfativa o nota distinta.
      </p>
      <div className={styles.suggestions}>
        <Link to="/collections/all" onClick={closeSearch}>
          Ver todo el catálogo
        </Link>
      </div>
    </div>
  );
}

function ResultImage({image, title, product = false}) {
  return (
    <div
      className={`${styles.imageWrap} ${product ? styles.productImage : ''}`}
    >
      {image?.url ? (
        <Image
          alt={image.altText || title}
          data={image}
          sizes="72px"
          className={styles.image}
        />
      ) : (
        <span className={styles.imageFallback} aria-hidden="true" />
      )}
    </div>
  );
}
