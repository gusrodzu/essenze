/**
 * collections.$handle.jsx
 * Página de Colección - Essenze
 * Filtros avanzados: Precio, Marca, Género, Familia Aromática, Intensidad, Ocasión, Temporada, Disponibilidad
 * Grid 4 columnas responsive
 */

import { redirect, useLoaderData } from 'react-router';
import { getPaginationVariables, Analytics } from '@shopify/hydrogen';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { ProductItem } from '~/components/ProductItem';
import { FilterBar } from '~/components/FilterBar';
import { useState, useMemo } from 'react';
import styles from '~/styles/CollectionDetail.module.css';

export const meta = ({ data }) => {
  return [
    { title: `Essenze | ${data?.collection.title ?? 'Colección'}` },
    {
      name: 'description',
      content: data?.collection.description || 'Explora nuestra colección de fragancias luxury',
    },
  ];
};

export async function loader(args) {
  const criticalData = await loadCriticalData(args);
  const deferredData = loadDeferredData(args);
  return { ...criticalData, ...deferredData };
}

async function loadCriticalData({ context, params, request }) {
  const { handle } = params;
  const { storefront } = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 48,
  });

  if (!handle) {
    throw redirect('/collections');
  }

  const { collection } = await storefront.query(COLLECTION_QUERY, {
    variables: { handle, ...paginationVariables },
  });

  if (!collection) {
    throw new Response(`Colección "${handle}" no encontrada`, {
      status: 404,
    });
  }

  redirectIfHandleIsLocalized(request, { handle, data: collection });

  return { collection };
}

function loadDeferredData() {
  return {};
}

export default function Collection() {
  const { collection } = useLoaderData();
  
  // Estado de filtros
  const [showFilters, setShowFilters] = useState(true); // Siempre visible por defecto
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedIntensities, setSelectedIntensities] = useState([]);
  const [selectedOccasions, setSelectedOccasions] = useState([]);
  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Extraer datos únicos de metafields
  const filterOptions = useMemo(() => {
    const brands = new Set();
    const genders = new Set();
    const families = new Set();
    const intensities = new Set();
    const occasions = new Set();
    const seasons = new Set();

    collection.products.nodes.forEach(product => {
      if (product?.vendor) brands.add(product.vendor);
      
      // Metafields - Agregar verificaciones defensivas
      const metafields = product?.metafields || [];
      if (Array.isArray(metafields)) {
        metafields.forEach(meta => {
          if (!meta || !meta.key) return; // Skip null/invalid metafields
          
          try {
            if (meta.key === 'genero' && meta.value) {
              genders.add(meta.value);
            }
            if (meta.key === 'familias_olfativas' && meta.value) {
              meta.value.split(',').forEach(f => families.add(f.trim()));
            }
            if (meta.key === 'intensidad' && meta.value) {
              intensities.add(meta.value);
            }
            if (meta.key === 'ocasion_y_temporadas' && meta.value) {
              try {
                const parsed = JSON.parse(meta.value);
                if (Array.isArray(parsed)) {
                  parsed.forEach(o => occasions.add(o));
                }
              } catch (e) {
                occasions.add(meta.value);
              }
            }
            // Temporadas
            if (meta.key === 'uso_primavera' && meta.value === 'true') seasons.add('Primavera');
            if (meta.key === 'uso_verano' && meta.value === 'true') seasons.add('Verano');
            if (meta.key === 'uso_otono' && meta.value === 'true') seasons.add('Otoño');
            if (meta.key === 'uso_invierno' && meta.value === 'true') seasons.add('Invierno');
          } catch (err) {
            console.warn('Error procesando metafield:', err);
          }
        });
      }
    });

    return {
      brands: Array.from(brands).sort(),
      genders: Array.from(genders).sort(),
      families: Array.from(families).sort(),
      intensities: Array.from(intensities).sort(),
      occasions: Array.from(occasions).sort(),
      seasons: Array.from(seasons).sort(),
    };
  }, [collection.products.nodes]);

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    let filtered = [...collection.products.nodes];

    // Filtro de disponibilidad
    if (availableOnly) {
      filtered = filtered.filter(product =>
        product?.variants?.nodes?.[0]?.availableForSale ?? true
      );
    }

    // Filtro de precio
    filtered = filtered.filter(product => {
      const price = parseFloat(product?.priceRange?.minVariantPrice?.amount ?? 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Filtro de marca
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product =>
        selectedBrands.includes(product?.vendor)
      );
    }

    // Filtro de género, familia, intensidad, ocasión, temporada
    if (selectedGenders.length > 0 || selectedFamilies.length > 0 || 
        selectedIntensities.length > 0 || selectedOccasions.length > 0 || 
        selectedSeasons.length > 0) {
      filtered = filtered.filter(product => {
        const metafields = product?.metafields || [];
        if (!Array.isArray(metafields)) return true;
        
        let matches = true;

        // Género
        if (selectedGenders.length > 0) {
          const generoMeta = metafields.find(m => m?.key === 'genero');
          matches = matches && selectedGenders.includes(generoMeta?.value);
        }

        // Familia aromática
        if (selectedFamilies.length > 0) {
          const familiasMeta = metafields.find(m => m?.key === 'familias_olfativas');
          const productFamilies = familiasMeta?.value?.split(',').map(f => f.trim()) || [];
          matches = matches && selectedFamilies.some(f => productFamilies.includes(f));
        }

        // Intensidad
        if (selectedIntensities.length > 0) {
          const intensidadMeta = metafields.find(m => m?.key === 'intensidad');
          matches = matches && selectedIntensities.includes(intensidadMeta?.value);
        }

        // Ocasión
        if (selectedOccasions.length > 0) {
          const ocasionMeta = metafields.find(m => m?.key === 'ocasion_y_temporadas');
          let productOccasions = [];
          try {
            productOccasions = JSON.parse(ocasionMeta?.value || '[]');
          } catch {
            productOccasions = ocasionMeta?.value ? [ocasionMeta.value] : [];
          }
          matches = matches && selectedOccasions.some(o => productOccasions.includes(o));
        }

        // Temporada
        if (selectedSeasons.length > 0) {
          let hasSelectedSeason = false;
          selectedSeasons.forEach(season => {
            const seasonKey = season === 'Primavera' ? 'uso_primavera' :
                             season === 'Verano' ? 'uso_verano' :
                             season === 'Otoño' ? 'uso_otono' : 'uso_invierno';
            const seasonMeta = metafields.find(m => m?.key === seasonKey);
            if (seasonMeta?.value === 'true') hasSelectedSeason = true;
          });
          matches = matches && hasSelectedSeason;
        }

        return matches;
      });
    }

    // Ordenamiento
    switch (sortBy) {
      case 'price-asc':
        filtered.sort(
          (a, b) =>
            parseFloat(a?.priceRange?.minVariantPrice?.amount ?? 0) -
            parseFloat(b?.priceRange?.minVariantPrice?.amount ?? 0)
        );
        break;
      case 'price-desc':
        filtered.sort(
          (a, b) =>
            parseFloat(b?.priceRange?.minVariantPrice?.amount ?? 0) -
            parseFloat(a?.priceRange?.minVariantPrice?.amount ?? 0)
        );
        break;
      case 'title':
        filtered.sort((a, b) => (a?.title ?? '').localeCompare(b?.title ?? ''));
        break;
      default:
        break;
    }

    return filtered;
  }, [collection.products.nodes, priceRange, selectedBrands, selectedGenders, 
      selectedFamilies, selectedIntensities, selectedOccasions, selectedSeasons, 
      availableOnly, sortBy]);

  const handleResetFilters = () => {
    setPriceRange([0, 100000]);
    setSelectedBrands([]);
    setSelectedGenders([]);
    setSelectedFamilies([]);
    setSelectedIntensities([]);
    setSelectedOccasions([]);
    setSelectedSeasons([]);
    setAvailableOnly(false);
    setSortBy('newest');
  };

  const toggleFilter = (filter, value, setter) => {
    setter(prev =>
      prev.includes(value)
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  return (
    <main className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{collection?.title}</h1>
          {collection?.description && (
            <p className={styles.heroDescription}>{collection.description}</p>
          )}
        </div>
      </section>

      {/* FILTER BAR */}
      <FilterBar
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        productCount={filteredProducts.length}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* PRODUCTS SECTION */}
      <section className={styles.productsSection}>
        <div className={styles.contentWrapper}>
          {/* SIDEBAR FILTERS */}
          {showFilters && (
            <aside className={styles.sidebar}>
              {/* DISPONIBILIDAD */}
              <div className={styles.filterGroup}>
                <label className={styles.availabilityLabel}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  Solo disponibles
                </label>
              </div>

              {/* PRECIO */}
              <div className={styles.filterGroup}>
                <h3 className={styles.filterTitle}>Precio</h3>
                <div className={styles.priceRangeWrapper}>
                  <div className={styles.priceInputs}>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                      }
                      className={styles.priceInput}
                    />
                    <span className={styles.priceHyphen}>-</span>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])
                      }
                      className={styles.priceInput}
                    />
                  </div>
                  <div className={styles.priceSliderWrapper}>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                      }
                      className={styles.priceSlider}
                    />
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])
                      }
                      className={styles.priceSlider}
                    />
                  </div>
                </div>
              </div>

              {/* MARCA */}
              {filterOptions.brands.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Marca</h3>
                  <div className={styles.brandList}>
                    {filterOptions.brands.map(brand => {
                      const count = collection.products.nodes.filter(
                        p => p?.vendor === brand
                      ).length;
                      return (
                        <label key={brand} className={styles.brandItem}>
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() =>
                              toggleFilter(selectedBrands, brand, setSelectedBrands)
                            }
                            className={styles.brandCheckbox}
                          />
                          <span className={styles.brandName}>{brand}</span>
                          <span className={styles.brandCount}>({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GÉNERO */}
              {filterOptions.genders.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Género</h3>
                  <div className={styles.filterOptions}>
                    {filterOptions.genders.map(gender => (
                      <label key={gender} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedGenders.includes(gender)}
                          onChange={() =>
                            toggleFilter(selectedGenders, gender, setSelectedGenders)
                          }
                        />
                        <span>{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* FAMILIA AROMÁTICA */}
              {filterOptions.families.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Familia Aromática</h3>
                  <div className={styles.filterOptions}>
                    {filterOptions.families.map(family => (
                      <label key={family} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedFamilies.includes(family)}
                          onChange={() =>
                            toggleFilter(selectedFamilies, family, setSelectedFamilies)
                          }
                        />
                        <span>{family}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* INTENSIDAD */}
              {filterOptions.intensities.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Intensidad</h3>
                  <div className={styles.filterOptions}>
                    {filterOptions.intensities.map(intensity => (
                      <label key={intensity} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedIntensities.includes(intensity)}
                          onChange={() =>
                            toggleFilter(selectedIntensities, intensity, setSelectedIntensities)
                          }
                        />
                        <span>{intensity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* OCASIÓN */}
              {filterOptions.occasions.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Ocasión</h3>
                  <div className={styles.filterOptions}>
                    {filterOptions.occasions.map(occasion => (
                      <label key={occasion} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedOccasions.includes(occasion)}
                          onChange={() =>
                            toggleFilter(selectedOccasions, occasion, setSelectedOccasions)
                          }
                        />
                        <span>{occasion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* TEMPORADA */}
              {filterOptions.seasons.length > 0 && (
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterTitle}>Temporada</h3>
                  <div className={styles.filterOptions}>
                    {filterOptions.seasons.map(season => (
                      <label key={season} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedSeasons.includes(season)}
                          onChange={() =>
                            toggleFilter(selectedSeasons, season, setSelectedSeasons)
                          }
                        />
                        <span>{season}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* RESET BUTTON */}
              <button
                onClick={handleResetFilters}
                className={styles.resetButton}
              >
                Limpiar Filtros
              </button>
            </aside>
          )}

          {/* PRODUCTS GRID */}
          <div className={styles.productsContainer}>
            {filteredProducts.length > 0 ? (
              <div className={styles.productsGrid}>
                {filteredProducts.map((product, index) => (
                  <ProductItem
                    key={product?.id}
                    product={product}
                    loading={index < 12 ? 'eager' : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.noProducts}>
                <p>No se encontraron productos con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection?.id,
            handle: collection?.handle,
          },
        }}
      />
    </main>
  );
}

// ===== GRAPHQL QUERIES =====

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }

  fragment ProductItem on Product {
    id
    handle
    title
    vendor
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    variants(first: 1) {
      nodes {
        id
        availableForSale
      }
    }
    metafields(identifiers: [
      {namespace: "custom", key: "genero"}
      {namespace: "custom", key: "familias_olfativas"}
      {namespace: "custom", key: "intensidad"}
      {namespace: "custom", key: "ocasion_y_temporadas"}
      {namespace: "custom", key: "uso_primavera"}
      {namespace: "custom", key: "uso_verano"}
      {namespace: "custom", key: "uso_otono"}
      {namespace: "custom", key: "uso_invierno"}
    ]) {
      key
      value
    }
  }
`;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}

  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */