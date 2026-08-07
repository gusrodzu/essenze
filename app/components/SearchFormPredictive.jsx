import {useFetcher, useNavigate} from 'react-router';
import React, {useRef, useEffect, useState} from 'react';
import {useAside} from './Aside';
import {Image, Money} from '@shopify/hydrogen';
import styles from './SearchFormPredictive.module.css';

export const SEARCH_ENDPOINT = '/search';

/**
 * Search form component that sends search requests to the `/search` route
 * with predictive/autocomplete results
 * @param {SearchFormPredictiveProps}
 */
export function SearchFormPredictive({
  children,
  className = styles.predictiveSearchForm,
  ...props
}) {
  const fetcher = useFetcher({key: 'search'});
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const aside = useAside();
  const [showResults, setShowResults] = useState(false);

  /** Reset the input value and blur the input */
  function resetInput(event) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef?.current?.value) {
      inputRef.current.value = '';
      setShowResults(false);
      inputRef.current.blur();
    }
  }

  /** Navigate to the search page with the current input value */
  function goToSearch() {
    const term = inputRef?.current?.value;
    void navigate(SEARCH_ENDPOINT + (term ? `?q=${term}` : ''));
    aside.close();
  }

  /** Fetch search results based on the input value */
  function fetchResults(event) {
    const value = event.target.value;
    if (value.trim()) {
      setShowResults(true);
      void fetcher.submit(
        {q: value || '', limit: 8, predictive: true},
        {method: 'GET', action: SEARCH_ENDPOINT},
      );
    } else {
      setShowResults(false);
    }
  }

  // ensure the passed input has a type of search
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowResults(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (typeof children === 'function') {
    return (
      <div className={className} {...props}>
        {children({inputRef, fetcher, fetchResults, goToSearch, showResults, setShowResults})}
      </div>
    );
  }

  // Default predictive search UI
  return (
    <div className={className} {...props}>
      <div className={styles.searchInputContainer}>
        <input
          ref={inputRef}
          type="search"
          name="q"
          placeholder="Buscar productos..."
          className={styles.predictiveSearchInput}
          onInput={fetchResults}
          onFocus={() => inputRef.current?.value && setShowResults(true)}
        />
        {inputRef?.current?.value && (
          <button
            type="button"
            onClick={resetInput}
            className={styles.clearButton}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}

        {/* Predictive Results Dropdown */}
        {showResults && (
          <PredictiveSearchResults
            fetcher={fetcher}
            goToSearch={goToSearch}
            term={inputRef?.current?.value}
            onItemClick={() => setShowResults(false)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={goToSearch}
        className={styles.searchButton}
      >
        Ver Todos los Resultados →
      </button>
    </div>
  );
}

/**
 * Predictive Search Results Display
 */
function PredictiveSearchResults({fetcher, goToSearch, term, onItemClick}) {
  const {data} = fetcher;

  if (fetcher.state === 'loading') {
    return (
      <div className={`${styles.predictiveResults} ${styles.visible}`}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Buscando...</p>
        </div>
      </div>
    );
  }

  if (!data?.result?.items) {
    return (
      <div className={`${styles.predictiveResults} ${styles.visible}`}>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Sin resultados</p>
          <p className={styles.emptyStateText}>
            Intenta con otros términos de búsqueda
          </p>
        </div>
      </div>
    );
  }

  const {products, articles, pages} = data.result.items;
  const hasResults = Boolean(
    (products?.nodes?.length > 0) ||
    (articles?.nodes?.length > 0) ||
    (pages?.nodes?.length > 0)
  );

  if (!hasResults) {
    return (
      <div className={`${styles.predictiveResults} ${styles.visible}`}>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Sin resultados</p>
          <p className={styles.emptyStateText}>
            Intenta con otros términos de búsqueda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.predictiveResults} ${styles.visible}`}>
      {/* Products */}
      {products?.nodes?.length > 0 && (
        <div className={styles.resultsGroup}>
          <p className={styles.resultsGroupTitle}>Productos</p>
          {products.nodes.slice(0, 5).map((product) => (
            <PredictiveProductItem
              key={product.id}
              product={product}
              term={term}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}

      {/* Articles */}
      {articles?.nodes?.length > 0 && (
        <div className={styles.resultsGroup}>
          <p className={styles.resultsGroupTitle}>Artículos</p>
          {articles.nodes.slice(0, 3).map((article) => (
            <PredictiveArticleItem
              key={article.id}
              article={article}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}

      {/* Pages */}
      {pages?.nodes?.length > 0 && (
        <div className={styles.resultsGroup}>
          <p className={styles.resultsGroupTitle}>Páginas</p>
          {pages.nodes.slice(0, 3).map((page) => (
            <PredictivePageItem
              key={page.id}
              page={page}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}

      {/* View All Button */}
      <button
        type="button"
        onClick={onItemClick}
        className={styles.viewAllButton}
      >
        Ver todos los resultados →
      </button>
    </div>
  );
}

/**
 * Predictive Product Item
 */
function PredictiveProductItem({product, term, onItemClick}) {
  const price = product?.selectedOrFirstAvailableVariant?.price;
  const image = product?.selectedOrFirstAvailableVariant?.image;

  return (
    <a
      href={`/products/${product.handle}`}
      className={styles.resultItem}
      onClick={onItemClick}
    >
      {image && (
        <Image
          data={image}
          alt={product.title}
          width={50}
          className={styles.resultImage}
        />
      )}
      <div className={styles.resultContent}>
        <h4 className={styles.resultTitle}>{product.title}</h4>
        {price && (
          <span className={styles.resultPrice}>
            <Money data={price} />
          </span>
        )}
      </div>
    </a>
  );
}

/**
 * Predictive Article Item
 */
function PredictiveArticleItem({article, onItemClick}) {
  return (
    <a
      href={`/blogs/${article.handle}`}
      className={styles.resultItem}
      onClick={onItemClick}
    >
      <div className={styles.resultContent}>
        <h4 className={styles.resultTitle}>{article.title}</h4>
        <p className={styles.resultDescription}>Artículo</p>
      </div>
    </a>
  );
}

/**
 * Predictive Page Item
 */
function PredictivePageItem({page, onItemClick}) {
  return (
    <a
      href={`/pages/${page.handle}`}
      className={styles.resultItem}
      onClick={onItemClick}
    >
      <div className={styles.resultContent}>
        <h4 className={styles.resultTitle}>{page.title}</h4>
        <p className={styles.resultDescription}>Página</p>
      </div>
    </a>
  );
}

/**
 * @typedef {(args: {
 *   fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
 *   goToSearch: () => void;
 *   inputRef: React.MutableRefObject<HTMLInputElement | null>;
 *   fetcher: Fetcher<PredictiveSearchReturn>;
 *   showResults: boolean;
 *   setShowResults: (show: boolean) => void;
 * }) => React.ReactNode} SearchFormPredictiveChildren
 */
/**
 * @typedef {Omit<FormProps, 'children'> & {
 *   children?: SearchFormPredictiveChildren | null;
 * }} SearchFormPredictiveProps
 */

/** @typedef {import('react-router').FormProps} FormProps */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */