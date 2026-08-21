import {Image, Money} from '@shopify/hydrogen';
import {Link, useFetcher, useNavigate} from 'react-router';
import {useEffect, useId, useRef, useState} from 'react';
import {urlWithTrackingParams} from '~/lib/search';
import {useAside} from './Aside';
import AvailabilityBadge from './AvailabilityBadge';
import styles from './SearchFormPredictive.module.css';

export const SEARCH_ENDPOINT = '/search';
const MIN_PREDICTIVE_LENGTH = 2;
const DEBOUNCE_MS = 220;

export function SearchFormPredictive({
  children,
  className = styles.predictiveSearchForm,
  ...props
}) {
  const fetcher = useFetcher({key: 'search'});
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const aside = useAside();
  const resultsId = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const normalizedQuery = normalizeQuery(query);
  const responseTerm = normalizeQuery(fetcher.data?.term);
  const isCurrentResponse =
    Boolean(fetcher.data) && responseTerm === normalizedQuery;
  const result = isCurrentResponse ? fetcher.data?.result : null;
  const isSearching =
    normalizedQuery.length >= MIN_PREDICTIVE_LENGTH &&
    (fetcher.state !== 'idle' || !isCurrentResponse);

  function submitPredictiveSearch(value, {immediate = false} = {}) {
    const nextQuery = normalizeQuery(value);
    window.clearTimeout(debounceRef.current);

    if (nextQuery.length < MIN_PREDICTIVE_LENGTH) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    const submit = () => {
      void fetcher.submit(
        {q: nextQuery, limit: 6, predictive: 'true'},
        {method: 'GET', action: SEARCH_ENDPOINT},
      );
    };

    if (immediate) submit();
    else debounceRef.current = window.setTimeout(submit, DEBOUNCE_MS);
  }

  function fetchResults(eventOrValue) {
    const value =
      typeof eventOrValue === 'string'
        ? eventOrValue
        : (eventOrValue?.currentTarget?.value ??
          eventOrValue?.target?.value ??
          '');

    setQuery(value);
    submitPredictiveSearch(value);
  }

  function handleFocus() {
    if (normalizedQuery.length < MIN_PREDICTIVE_LENGTH) return;
    setIsOpen(true);

    if (!isCurrentResponse) {
      submitPredictiveSearch(normalizedQuery, {immediate: true});
    }
  }

  function resetInput({focus = true} = {}) {
    window.clearTimeout(debounceRef.current);
    setQuery('');
    setIsOpen(false);

    if (inputRef.current) {
      inputRef.current.value = '';
      if (focus) inputRef.current.focus({preventScroll: true});
      else inputRef.current.blur();
    }
  }

  function goToSearch(event) {
    event?.preventDefault?.();
    const term = normalizeQuery(inputRef.current?.value ?? query);

    if (!term) {
      resetInput({focus: true});
      return;
    }

    const params = new URLSearchParams({q: term});
    setIsOpen(false);
    aside.close();
    void navigate(`${SEARCH_ENDPOINT}?${params.toString()}`);
  }

  function closeResults() {
    setIsOpen(false);
  }

  function closeSearch() {
    resetInput({focus: false});
    aside.close();
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeResults();
      inputRef.current?.focus({preventScroll: true});
    }
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (aside.type !== 'search') {
      window.clearTimeout(debounceRef.current);
      setIsOpen(false);
      setQuery('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [aside.type]);

  useEffect(
    () => () => {
      window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const renderArgs = {
    closeResults,
    closeSearch,
    fetcher,
    fetchResults,
    goToSearch,
    handleFocus,
    handleInputKeyDown,
    inputRef,
    isOpen,
    isSearching,
    query,
    resetInput,
    result,
    resultsId,
    setIsOpen,
  };

  return (
    <form
      ref={wrapperRef}
      className={className}
      onSubmit={goToSearch}
      role="search"
      {...props}
    >
      {typeof children === 'function' ? (
        children(renderArgs)
      ) : (
        <DefaultPredictiveSearch {...renderArgs} />
      )}
    </form>
  );
}

function DefaultPredictiveSearch({
  closeSearch,
  fetchResults,
  goToSearch,
  handleFocus,
  handleInputKeyDown,
  inputRef,
  isOpen,
  isSearching,
  query,
  resetInput,
  result,
  resultsId,
}) {
  const items = result?.items;
  const hasResults = Boolean(result?.total);

  return (
    <div className={styles.defaultSearch}>
      <div className={styles.searchInputContainer}>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          placeholder="Buscar fragancias, marcas o notas…"
          className={styles.predictiveSearchInput}
          onChange={fetchResults}
          onFocus={handleFocus}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-controls={resultsId}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
        />

        {query ? (
          <button
            type="button"
            onClick={() => resetInput({focus: true})}
            className={styles.clearButton}
            aria-label="Limpiar búsqueda"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}

        <button
          type="submit"
          onClick={goToSearch}
          className={styles.searchButton}
          aria-label="Ver resultados"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {isOpen ? (
        <div
          id={resultsId}
          className={styles.predictiveResults}
          role="listbox"
          aria-label="Sugerencias de búsqueda"
        >
          {isSearching ? <SearchLoading /> : null}
          {!isSearching &&
          query.length >= MIN_PREDICTIVE_LENGTH &&
          !hasResults ? (
            <SearchEmpty query={query} />
          ) : null}
          {!isSearching && hasResults ? (
            <>
              {items?.products?.length ? (
                <div className={styles.resultsGroup}>
                  <p className={styles.resultsGroupTitle}>Fragancias</p>
                  {items.products.slice(0, 5).map((product) => (
                    <DefaultProductResult
                      key={product.id}
                      product={product}
                      query={query}
                      closeSearch={closeSearch}
                    />
                  ))}
                </div>
              ) : null}

              {items?.collections?.length ? (
                <div className={styles.resultsGroup}>
                  <p className={styles.resultsGroupTitle}>Colecciones</p>
                  {items.collections.slice(0, 3).map((collection) => (
                    <Link
                      key={collection.id}
                      className={styles.textResult}
                      onClick={closeSearch}
                      to={urlWithTrackingParams({
                        baseUrl: `/collections/${collection.handle}`,
                        trackingParams: collection.trackingParameters,
                        term: query,
                      })}
                    >
                      <span>{collection.title}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              ) : null}

              <button
                type="submit"
                className={styles.viewAllButton}
                onClick={goToSearch}
              >
                Ver todos los resultados
                <span aria-hidden="true">→</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DefaultProductResult({product, query, closeSearch}) {
  const variant = product?.selectedOrFirstAvailableVariant;
  const price = variant?.price ?? product?.priceRange?.minVariantPrice;
  const image = variant?.image ?? product?.featuredImage;
  const available = variant?.availableForSale ?? product?.availableForSale;
  const productUrl = urlWithTrackingParams({
    baseUrl: `/products/${product.handle}`,
    trackingParams: product.trackingParameters,
    term: query,
  });

  return (
    <Link className={styles.resultItem} onClick={closeSearch} to={productUrl}>
      <div className={styles.resultImageWrap}>
        {image ? (
          <Image
            data={image}
            alt={image.altText || product.title}
            className={styles.resultImage}
            sizes="72px"
          />
        ) : (
          <span className={styles.imageFallback} aria-hidden="true" />
        )}
      </div>
      <div className={styles.resultContent}>
        {product.vendor ? (
          <p className={styles.resultVendor}>{product.vendor}</p>
        ) : null}
        <h4 className={styles.resultTitle}>{product.title}</h4>
        <div className={styles.resultMeta}>
          {price ? <Money data={price} /> : <span>Consultar precio</span>}
          <AvailabilityBadge available={available !== false} compact />
        </div>
      </div>
    </Link>
  );
}

function SearchLoading() {
  return (
    <div className={styles.loadingState} role="status">
      <div className={styles.loadingSpinner} aria-hidden="true" />
      <p>Buscando en Essenze…</p>
    </div>
  );
}

function SearchEmpty({query}) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyStateTitle}>Sin coincidencias</p>
      <p className={styles.emptyStateText}>
        No encontramos resultados para <q>{query}</q>.
      </p>
    </div>
  );
}

function normalizeQuery(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
