import * as React from 'react';
import {Link, useLocation, useNavigation} from 'react-router';
import {Pagination} from '@shopify/hydrogen';
import styles from './PaginatedResourceSection.module.css';

/**
 * Paginación cursor-based de Hydrogen con navegación por páginas visibles.
 *
 * Shopify no expone un número total de páginas en todas sus conexiones, por lo
 * que los índices muestran siempre la primera página y las páginas adyacentes
 * que sí cuentan con un cursor navegable (anterior, actual y siguiente).
 */
export function PaginatedResourceSection({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
  namespace = '',
  totalCount,
  pageSize,
}) {
  const location = useLocation();
  const navigation = useNavigation();
  const wrapperRef = React.useRef(null);
  const previousCursorRef = React.useRef(null);
  const namespacePrefix = namespace ? `${namespace}_` : '';
  const cursorParam = `${namespacePrefix}cursor`;
  const directionParam = `${namespacePrefix}direction`;
  const pageHashPrefix = namespace ? `${namespace}-page-` : 'page-';

  const totalPages =
    Number.isFinite(totalCount) && Number.isFinite(pageSize) && pageSize > 0
      ? Math.max(1, Math.ceil(totalCount / pageSize))
      : null;

  const currentPage = React.useMemo(
    () => getPageIndex(location.hash, pageHashPrefix),
    [location.hash, pageHashPrefix],
  );

  const cursorState = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return `${params.get(cursorParam) || ''}:${
      params.get(directionParam) || ''
    }:${currentPage}`;
  }, [currentPage, cursorParam, directionParam, location.search]);

  React.useEffect(() => {
    if (previousCursorRef.current === null) {
      previousCursorRef.current = cursorState;
      return;
    }
    if (previousCursorRef.current === cursorState) return;
    previousCursorRef.current = cursorState;

    window.requestAnimationFrame(() => {
      wrapperRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
    });
  }, [cursorState]);

  return (
    <Pagination connection={connection} namespace={namespace}>
      {({
        nodes,
        isLoading,
        previousPageUrl,
        nextPageUrl,
        hasPreviousPage,
        hasNextPage,
      }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );
        const routeIsLoading =
          navigation.state !== 'idle' &&
          navigation.location?.pathname === location.pathname;
        const paginationIsLoading = isLoading || routeIsLoading;
        const previousPage = Math.max(1, currentPage - 1);
        const nextPage = currentPage + 1;
        const firstPageUrl = buildFirstPageUrl(
          location.search,
          cursorParam,
          directionParam,
          pageHashPrefix,
        );
        const previousUrl = addPageIndex(
          previousPageUrl,
          previousPage,
          pageHashPrefix,
        );
        const nextUrl = addPageIndex(
          nextPageUrl,
          nextPage,
          pageHashPrefix,
        );

        return (
          <div ref={wrapperRef} className={styles.wrapper}>
            <span className={styles.srOnly} aria-live="polite">
              {paginationIsLoading
                ? 'Actualizando resultados'
                : `Página ${currentPage}${
                    totalPages ? ` de ${totalPages}` : ''
                  }. ${nodes.length} elementos visibles`}
            </span>

            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
                aria-busy={paginationIsLoading || undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}

            {(hasPreviousPage || hasNextPage) && (
              <nav
                className={styles.pagination}
                aria-label={
                  ariaLabel
                    ? `Paginación: ${ariaLabel}`
                    : 'Paginación del catálogo'
                }
                aria-busy={paginationIsLoading || undefined}
              >
                <div className={styles.side}>
                  {hasPreviousPage ? (
                    <Link
                      className={styles.button}
                      to={previousUrl}
                      preventScrollReset
                      aria-label={`Ir a la página ${previousPage}`}
                    >
                      <span aria-hidden="true">←</span>
                      {paginationIsLoading ? 'Cargando' : 'Anterior'}
                    </Link>
                  ) : (
                    <span
                      className={`${styles.button} ${styles.disabled}`}
                      aria-disabled="true"
                    >
                      <span aria-hidden="true">←</span> Anterior
                    </span>
                  )}
                </div>

                <div className={styles.pageIndex}>
                  <span className={styles.pageLabel}>
                    Página {currentPage}
                    {totalPages ? ` de ${totalPages}` : ''}
                  </span>
                  <div className={styles.pageNumbers}>
                    {totalPages
                      ? Array.from({length: totalPages}, (_, index) => index + 1).map((pageNumber) => {
                          if (pageNumber === currentPage) {
                            return (
                              <span
                                className={`${styles.pageNumber} ${styles.pageNumberCurrent}`}
                                aria-current="page"
                                aria-label={`Página actual, ${currentPage}`}
                                key={pageNumber}
                              >
                                {pageNumber}
                              </span>
                            );
                          }
                          if (pageNumber === 1) {
                            return (
                              <Link className={styles.pageNumber} to={firstPageUrl} preventScrollReset key={pageNumber}>
                                {pageNumber}
                              </Link>
                            );
                          }
                          if (pageNumber === previousPage && hasPreviousPage) {
                            return <Link className={styles.pageNumber} to={previousUrl} preventScrollReset key={pageNumber}>{pageNumber}</Link>;
                          }
                          if (pageNumber === nextPage && hasNextPage) {
                            return <Link className={styles.pageNumber} to={nextUrl} preventScrollReset key={pageNumber}>{pageNumber}</Link>;
                          }
                          return <span className={`${styles.pageNumber} ${styles.disabledPage}`} aria-disabled="true" key={pageNumber}>{pageNumber}</span>;
                        })
                      : (
                        <>
                          {hasPreviousPage ? <Link className={styles.pageNumber} to={previousUrl} preventScrollReset>{previousPage}</Link> : null}
                          <span className={`${styles.pageNumber} ${styles.pageNumberCurrent}`} aria-current="page">{currentPage}</span>
                          {hasNextPage ? <Link className={styles.pageNumber} to={nextUrl} preventScrollReset>{nextPage}</Link> : null}
                        </>
                      )}
                  </div>
                </div>

                <div className={`${styles.side} ${styles.sideRight}`}>
                  {hasNextPage ? (
                    <Link
                      className={`${styles.button} ${styles.buttonDark}`}
                      to={nextUrl}
                      preventScrollReset
                      aria-label={`Ir a la página ${nextPage}`}
                    >
                      {paginationIsLoading ? 'Cargando' : 'Siguiente'}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span
                      className={`${styles.button} ${styles.disabled}`}
                      aria-disabled="true"
                    >
                      Siguiente <span aria-hidden="true">→</span>
                    </span>
                  )}
                </div>
              </nav>
            )}
          </div>
        );
      }}
    </Pagination>
  );
}

function getPageIndex(hash, pageHashPrefix) {
  const match = hash.match(
    new RegExp(`^#${escapeRegExp(pageHashPrefix)}(\\d+)$`),
  );
  const page = Number.parseInt(match?.[1] || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function addPageIndex(url, page, pageHashPrefix) {
  const baseUrl = url.split('#')[0];
  return `${baseUrl}#${pageHashPrefix}${Math.max(1, page)}`;
}

function buildFirstPageUrl(
  search,
  cursorParam,
  directionParam,
  pageHashPrefix,
) {
  const params = new URLSearchParams(search);
  params.delete(cursorParam);
  params.delete(directionParam);

  const query = params.toString();
  return `${query ? `?${query}` : '?'}#${pageHashPrefix}1`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
