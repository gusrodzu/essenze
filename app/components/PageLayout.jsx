import {Await, Link} from 'react-router';
import {Suspense, useId} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import MobileDock from '~/components/MobileDock';
import MotionEnhancer from '~/components/MotionEnhancer';
import ScrollLockRecovery from '~/components/ScrollLockRecovery';
import styles from '~/styles/PageLayout.module.css';

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}) {
  return (
    <Aside.Provider>
      <MotionEnhancer />
      <ScrollLockRecovery />
      <a className={styles.skipLink} href="#main-content">
        Saltar al contenido
      </a>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header ? (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
      ) : null}
      <div className={styles.mainContent} id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
      <MobileDock />
    </Aside.Provider>
  );
}

function CartAside({cart}) {
  return (
    <Aside type="cart" heading="Tu carrito">
      <Suspense
        fallback={<p className={styles.loadingText}>Preparando tu carrito…</p>}
      >
        <Await resolve={cart}>
          {(resolvedCart) => <CartMain cart={resolvedCart} layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();

  return (
    <Aside type="search" heading="Buscar en Essenze">
      <div className={styles.predictiveSearch}>
        <div className={styles.searchIntro}>
          <span>Descubre</span>
          <h3>Encuentra tu próxima fragancia.</h3>
          <p>Busca por perfume, marca, colección, nota u ocasión.</p>
        </div>

        <SearchFormPredictive className={styles.predictiveSearchForm}>
          {({
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
          }) => (
            <>
              <div className={styles.searchFormContainer}>
                <span className={styles.searchIcon} aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  name="q"
                  onChange={fetchResults}
                  onFocus={handleFocus}
                  onKeyDown={handleInputKeyDown}
                  role="combobox"
                  placeholder="Ej. Dior, oud, vainilla…"
                  type="search"
                  list={queriesDatalistId}
                  className={styles.searchInput}
                  data-essenze-search-input
                  data-autofocus
                  aria-label="Buscar fragancias"
                  aria-autocomplete="list"
                  aria-controls={resultsId}
                  aria-expanded={isOpen}
                  autoComplete="off"
                  enterKeyHint="search"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => resetInput({focus: true})}
                    className={styles.searchClear}
                    aria-label="Limpiar búsqueda"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}

                <button
                  onClick={goToSearch}
                  className={styles.searchButton}
                  type="submit"
                  aria-label="Buscar"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {!query ? (
                <div className={styles.searchQuickLinks}>
                  <p>Explora rápidamente</p>
                  <div>
                    <Link to="/collections/all" onClick={closeSearch}>
                      Todo el catálogo
                    </Link>
                    <Link to="/marcas" onClick={closeSearch}>
                      Marcas
                    </Link>
                    <Link to="/asesor" onClick={closeSearch}>
                      Asesor Essenze
                    </Link>
                  </div>
                </div>
              ) : null}

              {isOpen || query.length === 1 ? (
                <div
                  id={resultsId}
                  className={styles.searchResultsRegion}
                  aria-live="polite"
                >
                  <SearchResultsPredictive
                    closeSearch={closeSearch}
                    isSearching={isSearching}
                    query={query}
                    result={result}
                  >
                    {({items, total}) => {
                      const {articles, collections, pages, products, queries} =
                        items;

                      if (isSearching) {
                        return <SearchResultsPredictive.Loading />;
                      }

                      if (!total) {
                        return (
                          <SearchResultsPredictive.Empty
                            query={query}
                            closeSearch={closeSearch}
                          />
                        );
                      }

                      return (
                        <div className={styles.searchResults}>
                          <SearchResultsPredictive.Queries
                            queries={queries}
                            queriesDatalistId={queriesDatalistId}
                          />
                          <SearchResultsPredictive.Products
                            products={products}
                            closeSearch={closeSearch}
                            query={query}
                          />
                          <SearchResultsPredictive.Collections
                            collections={collections}
                            closeSearch={closeSearch}
                            query={query}
                          />
                          <SearchResultsPredictive.Pages
                            pages={pages}
                            closeSearch={closeSearch}
                            query={query}
                          />
                          <SearchResultsPredictive.Articles
                            articles={articles}
                            closeSearch={closeSearch}
                            query={query}
                          />

                          <Link
                            onClick={closeSearch}
                            to={`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`}
                            className={styles.searchViewAll}
                          >
                            <span>
                              Ver todos los resultados para <q>{query}</q>
                            </span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      );
                    }}
                  </SearchResultsPredictive>
                </div>
              ) : null}
            </>
          )}
        </SearchFormPredictive>
      </div>
    </Aside>
  );
}

function MobileMenuAside({header, publicStoreDomain}) {
  const primaryDomainUrl = header?.shop?.primaryDomain?.url;
  if (!primaryDomainUrl) return null;

  return (
    <Aside type="mobile" heading="ESSENZE">
      <HeaderMenu
        menu={header?.menu}
        viewport="mobile"
        primaryDomainUrl={primaryDomainUrl}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside>
  );
}

/** @typedef {Object} PageLayoutProps */
