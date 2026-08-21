import {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router';
import PerfumeLoadingExperience from './PerfumeLoadingExperience';
import EssenzeIcon from './EssenzeIcon';
import AvailabilityBadge from './AvailabilityBadge';
import {
  buildComparatorCatalog,
  COMPARISON_ROWS,
  COMPARATOR_ADD_EVENT,
  COMPARATOR_PENDING_KEY,
  COMPARATOR_STORAGE_KEY,
} from '~/lib/fragranceComparator';
import estilos from './ComparadorFragancias.module.css';

const MAX_PRODUCTS = 3;
const SLOT_ICONS = ['bottle', 'flower', 'sparkles'];

function getSlotIcon(slotIndex) {
  return SLOT_ICONS[slotIndex] || 'bottle';
}
const DETAIL_ROWS = COMPARISON_ROWS.filter((row) => row.key !== 'vendor');

function padSelection(ids = []) {
  return [...ids.filter(Boolean).slice(0, MAX_PRODUCTS), '', '', ''].slice(
    0,
    MAX_PRODUCTS,
  );
}

function formatMoney(money) {
  if (!money?.amount) return 'No disponible';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: money.currencyCode || 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(money.amount));
}

function displayValue(product, row) {
  if (!product) return 'No especificado';

  const value = product[row.key];

  if (row.type === 'money') return formatMoney(value);
  if (row.type === 'availability') {
    return value ? 'Disponible' : 'Agotado';
  }

  return value || 'No especificado';
}

function getCardPosition(index, activeIndex) {
  const difference = (index - activeIndex + MAX_PRODUCTS) % MAX_PRODUCTS;

  if (difference === 0) return 'active';
  if (difference === 1) return 'next';
  return 'previous';
}

/**
 * Comparador interactivo de hasta tres fragancias del catálogo Shopify.
 * Presenta cada producto como una card dentro de un carrusel 3D accesible.
 * Acepta tanto `products` como `productos` para mantener compatibilidad.
 */
export default function FragranceComparator({
  products,
  productos,
  alSeleccionar,
  onSelect,
  titulo = 'Compara Nuestras Fragancias',
  subtitulo = 'Elige hasta tres perfumes y descubre sus diferencias en una experiencia visual, clara y envolvente.',
}) {
  const sectionRef = useRef(null);
  const selectedIdsRef = useRef([]);
  const pointerStartXRef = useRef(null);
  const comparisonTimerRef = useRef(null);
  const hasPreparedComparisonRef = useRef(false);
  const catalog = useMemo(
    () => buildComparatorCatalog(products || productos || []),
    [products, productos],
  );
  const catalogById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );
  const [selectedIds, setSelectedIds] = useState(() =>
    padSelection(catalog.slice(0, MAX_PRODUCTS).map((product) => product.id)),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const [isPreparingComparison, setIsPreparingComparison] = useState(true);

  const selectedProducts = selectedIds.map(
    (productId) => catalogById.get(productId) || null,
  );
  const selectedCount = selectedProducts.filter(Boolean).length;
  const activeProduct = selectedProducts[activeIndex];

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es-MX');
    if (!query) return catalog;

    return catalog.filter((product) =>
      [
        product.title,
        product.vendor,
        product.family,
        product.gender,
        product.concentration,
        product.occasion,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-MX')
        .includes(query),
    );
  }, [catalog, searchQuery]);

  useEffect(() => {
    if (catalog.length === 0) {
      setSelectedIds(padSelection());
      setStorageReady(true);
      return;
    }

    let persistedIds = [];
    let hasPersistedSelection = false;

    try {
      const storedSelection = window.localStorage.getItem(
        COMPARATOR_STORAGE_KEY,
      );
      hasPersistedSelection = storedSelection !== null;
      persistedIds = JSON.parse(storedSelection || '[]');
    } catch {
      persistedIds = [];
      hasPersistedSelection = false;
    }

    const validPersistedIds = Array.isArray(persistedIds)
      ? persistedIds.filter((id) => catalogById.has(id))
      : [];
    const fallbackIds = catalog
      .slice(0, MAX_PRODUCTS)
      .map((product) => product.id);
    const initialIds = hasPersistedSelection ? validPersistedIds : fallbackIds;

    setSelectedIds(padSelection(initialIds));
    setStorageReady(true);
  }, [catalog, catalogById]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (!storageReady) return;

    try {
      window.localStorage.setItem(
        COMPARATOR_STORAGE_KEY,
        JSON.stringify(selectedIds.filter(Boolean)),
      );
    } catch {
      // El comparador continúa funcionando aunque storage esté bloqueado.
    }
  }, [selectedIds, storageReady]);

  useEffect(() => {
    if (!storageReady) return undefined;

    window.clearTimeout(comparisonTimerRef.current);

    if (selectedCount === 0) {
      setIsPreparingComparison(false);
      return undefined;
    }

    setIsPreparingComparison(true);
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;
    const preparationTime = reduceMotion
      ? 420
      : hasPreparedComparisonRef.current
        ? 1150
        : 1900;

    comparisonTimerRef.current = window.setTimeout(() => {
      setIsPreparingComparison(false);
      hasPreparedComparisonRef.current = true;
    }, preparationTime);

    return () => window.clearTimeout(comparisonTimerRef.current);
  }, [selectedCount, selectedIds, storageReady]);

  useEffect(() => {
    if (!storageReady) return;

    let statusTimer;

    const announce = (message) => {
      window.clearTimeout(statusTimer);
      setStatusMessage(message);
      statusTimer = window.setTimeout(() => setStatusMessage(''), 3500);
    };

    const clearPendingProduct = (productId) => {
      try {
        if (window.localStorage.getItem(COMPARATOR_PENDING_KEY) === productId) {
          window.localStorage.removeItem(COMPARATOR_PENDING_KEY);
        }
      } catch {
        // No se bloquea la experiencia si storage no está disponible.
      }
    };

    const addProductById = (productId) => {
      const product = catalogById.get(productId);
      if (!product) return false;

      const currentIds = selectedIdsRef.current;
      const existingIndex = currentIds.indexOf(productId);

      if (existingIndex >= 0) {
        setActiveIndex(existingIndex);
        announce(`${product.title} ya está en la comparación.`);
        clearPendingProduct(productId);
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return true;
      }

      const nextIds = [...currentIds];
      const emptyIndex = nextIds.findIndex((id) => !id);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : MAX_PRODUCTS - 1;
      const replacedProduct = catalogById.get(nextIds[targetIndex]);
      nextIds[targetIndex] = productId;
      const normalizedIds = padSelection(nextIds);

      selectedIdsRef.current = normalizedIds;
      setSelectedIds(normalizedIds);
      setActiveIndex(targetIndex);
      announce(
        replacedProduct
          ? `${product.title} reemplazó a ${replacedProduct.title} en la comparación.`
          : `${product.title} se agregó al comparador.`,
      );
      clearPendingProduct(productId);
      sectionRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
      return true;
    };

    const addProductToComparison = (event) => {
      const productId = event.detail?.productId || event.detail?.product?.id;
      if (productId) addProductById(productId);
    };

    window.addEventListener(COMPARATOR_ADD_EVENT, addProductToComparison);

    try {
      const pendingProductId = window.localStorage.getItem(
        COMPARATOR_PENDING_KEY,
      );
      if (pendingProductId) addProductById(pendingProductId);
    } catch {
      // El comparador seguirá disponible aunque no haya persistencia local.
    }

    return () => {
      window.removeEventListener(COMPARATOR_ADD_EVENT, addProductToComparison);
      window.clearTimeout(statusTimer);
    };
  }, [catalogById, storageReady]);

  const changeSlot = (slotIndex, productId) => {
    setSelectedIds((currentIds) => {
      const nextIds = [...currentIds];

      if (!productId) {
        nextIds[slotIndex] = '';
        return padSelection(nextIds);
      }

      const duplicateIndex = nextIds.findIndex(
        (id, index) => index !== slotIndex && id === productId,
      );

      if (duplicateIndex >= 0) {
        nextIds[duplicateIndex] = nextIds[slotIndex] || '';
      }

      nextIds[slotIndex] = productId;
      return padSelection(nextIds);
    });

    setActiveIndex(slotIndex);

    const selectedProduct = catalogById.get(productId);
    const callback = onSelect || alSeleccionar;
    if (selectedProduct && callback) callback(selectedProduct.source);
  };

  const removeFromSlot = (slotIndex) => {
    setSelectedIds((currentIds) => {
      const nextIds = [...currentIds];
      nextIds[slotIndex] = '';
      return padSelection(nextIds);
    });
  };

  const clearComparison = () => {
    setSelectedIds(padSelection());
    setActiveIndex(0);
    setStatusMessage('La comparación se limpió.');
  };

  const moveCarousel = (direction) => {
    setActiveIndex(
      (currentIndex) =>
        (currentIndex + direction + MAX_PRODUCTS) % MAX_PRODUCTS,
    );
  };

  const handleCarouselKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveCarousel(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveCarousel(1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(MAX_PRODUCTS - 1);
    }
  };

  const handlePointerDown = (event) => {
    pointerStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event) => {
    if (pointerStartXRef.current == null) return;

    const distance = event.clientX - pointerStartXRef.current;
    pointerStartXRef.current = null;

    if (Math.abs(distance) < 48) return;
    moveCarousel(distance > 0 ? -1 : 1);
  };

  if (catalog.length === 0) {
    return (
      <section className={estilos.seccion} id="comparador-fragancias">
        <div className={estilos.contenedor}>
          <div className={estilos.sinProductos}>
            <span className={estilos.eyebrow}>Comparador Essenze</span>
            <p className={estilos.textoSinProductos}>
              No encontramos fragancias disponibles para comparar en este
              momento.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={estilos.seccion}
      id="comparador-fragancias"
      ref={sectionRef}
      aria-labelledby="fragrance-comparator-title"
      aria-busy={isPreparingComparison}
    >
      <div className={estilos.contenedor}>
        <div className={estilos.encabezado}>
          <div className={estilos.encabezadoTitulo}>
            <span className={estilos.eyebrow}>Comparador Essenze</span>
            <h2 className={estilos.titulo} id="fragrance-comparator-title">
              {titulo}
            </h2>
          </div>

          <div className={estilos.encabezadoInfo}>
            <p className={estilos.subtitulo}>{subtitulo}</p>
            <div className={estilos.headerActions}>
              <span className={estilos.counter}>
                {selectedCount} de {MAX_PRODUCTS} seleccionadas
              </span>
              <button
                className={estilos.clearButton}
                type="button"
                onClick={clearComparison}
                disabled={selectedCount === 0}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className={estilos.selectorPanel}>
          <div className={estilos.searchField}>
            <label htmlFor="fragrance-comparator-search">
              Buscar en el catálogo
            </label>
            <div className={estilos.searchControl}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                id="fragrance-comparator-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nombre, marca o familia olfativa"
              />
            </div>
          </div>

          <div className={estilos.selectors}>
            {selectedProducts.map((product, slotIndex) => (
              <div
                className={estilos.selectorSlot}
                key={`slot-${slotIndex + 1}`}
              >
                <div className={estilos.slotHeading}>
                  <span>
                    <EssenzeIcon name={getSlotIcon(slotIndex)} size={16} />
                    Fragancia
                  </span>
                  {product ? (
                    <button
                      type="button"
                      onClick={() => removeFromSlot(slotIndex)}
                      aria-label={`Quitar ${product.title} de la comparación`}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <select
                  aria-label={`Seleccionar fragancia ${slotIndex + 1}`}
                  value={selectedIds[slotIndex]}
                  onChange={(event) =>
                    changeSlot(slotIndex, event.target.value)
                  }
                >
                  <option value="">Selecciona una fragancia</option>
                  {[
                    ...(product &&
                    !filteredCatalog.some(
                      (catalogProduct) => catalogProduct.id === product.id,
                    )
                      ? [product]
                      : []),
                    ...filteredCatalog,
                  ].map((catalogProduct) => {
                    const selectedInAnotherSlot = selectedIds.some(
                      (id, index) =>
                        index !== slotIndex && id === catalogProduct.id,
                    );

                    return (
                      <option
                        key={catalogProduct.id}
                        value={catalogProduct.id}
                        disabled={selectedInAnotherSlot}
                      >
                        {catalogProduct.vendor} — {catalogProduct.title}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
        </div>

        <p className={estilos.status} aria-live="polite">
          {statusMessage}
        </p>

        {isPreparingComparison ? (
          <PerfumeLoadingExperience
            compact
            eyebrow="Laboratorio comparativo"
            title="Equilibrando tus fragancias"
            messages={[
              'Leyendo familias, intensidad y concentración',
              'Contrastando ocasiones y temporadas de uso',
              'Preparando tus detalles comparativos',
            ]}
          />
        ) : (
          <>
        <div className={estilos.carouselHeader}>
          <div>
            <span className={estilos.carouselEyebrow}>Vista comparativa 3D</span>
            <p className={estilos.carouselStatus} aria-live="polite">
              {activeProduct
                ? `${activeProduct.vendor} — ${activeProduct.title}`
                : `Espacio ${activeIndex + 1} disponible`}
            </p>
          </div>
        </div>

        <div className={estilos.carouselShell}>
          <button
            type="button"
            className={`${estilos.carouselArrow} ${estilos.carouselArrowLeft}`}
            onClick={() => moveCarousel(-1)}
            aria-label="Ver fragancia anterior"
          >
            <span aria-hidden="true">←</span>
          </button>

          <div
            className={estilos.carouselViewport}
            role="region"
            aria-roledescription="carrusel"
            aria-label="Comparación visual de fragancias"
            tabIndex={0}
            onKeyDown={handleCarouselKeyDown}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              pointerStartXRef.current = null;
            }}
          >
            <div className={estilos.carouselStage}>
              {selectedProducts.map((product, slotIndex) => {
                const position = getCardPosition(slotIndex, activeIndex);
                const positionClass =
                  position === 'active'
                    ? estilos.cardActive
                    : position === 'next'
                      ? estilos.cardNext
                      : estilos.cardPrevious;

                return (
                  <ComparisonCard
                    key={`comparison-card-${slotIndex + 1}`}
                    product={product}
                    slotIndex={slotIndex}
                    position={position}
                    positionClass={positionClass}
                    onActivate={() => setActiveIndex(slotIndex)}
                    onRemove={() => removeFromSlot(slotIndex)}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className={`${estilos.carouselArrow} ${estilos.carouselArrowRight}`}
            onClick={() => moveCarousel(1)}
            aria-label="Ver siguiente fragancia"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className={estilos.carouselFooter}>
          <span className={estilos.carouselCounter}>
            {String(activeIndex + 1).padStart(2, '0')} / 03
          </span>

          <div className={estilos.carouselDots} aria-label="Elegir fragancia">
            {selectedProducts.map((product, index) => (
              <button
                key={`dot-${index + 1}`}
                type="button"
                className={`${estilos.carouselDot} ${
                  activeIndex === index ? estilos.carouselDotActive : ''
                }`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Mostrar ${product?.title || `espacio ${index + 1}`}`}
                aria-current={activeIndex === index ? 'true' : undefined}
              >
                <span />
              </button>
            ))}
          </div>
        </div>

        <ComparisonDetails products={selectedProducts} />

        <p className={estilos.carouselHint}>
          Usa las flechas laterales, desliza o presiona ← → para recorrer las
          fragancias.
        </p>
          </>
        )}
      </div>
    </section>
  );
}

function ComparisonCard({
  product,
  slotIndex,
  position,
  positionClass,
  onActivate,
  onRemove,
}) {
  const cardLabel = product
    ? `${product.vendor}, ${product.title}`
    : `Espacio ${slotIndex + 1} disponible`;

  return (
    <article
      className={`${estilos.comparisonCard} ${positionClass}`}
      aria-label={cardLabel}
      aria-current={position === 'active' ? 'true' : undefined}
    >
      {position !== 'active' ? (
        <button
          type="button"
          className={estilos.cardFocusButton}
          onClick={onActivate}
          aria-label={`Colocar ${cardLabel} al frente`}
        >
          Ver al frente
        </button>
      ) : null}

      {product ? (
        <>
          <div className={estilos.cardMedia}>
            {product.image?.url ? (
              <img
                src={product.image.url}
                alt={product.image.altText || product.title}
                loading="lazy"
              />
            ) : (
              <span>Sin imagen</span>
            )}
            <span className={estilos.cardNumber} aria-hidden="true">
              <EssenzeIcon name={getSlotIcon(slotIndex)} size={19} />
            </span>
          </div>

          <div className={estilos.cardBody}>
            <div className={estilos.cardMetaRow}>
              <span className={estilos.productVendor}>{product.vendor}</span>
              <AvailabilityBadge
                available={product.availableForSale}
                compact
              />
            </div>

            <h3>{product.title}</h3>

            <div className={estilos.cardChips}>
              {product.family ? <span>{product.family}</span> : null}
              {product.concentration ? (
                <span>{product.concentration}</span>
              ) : null}
              {product.gender ? <span>{product.gender}</span> : null}
            </div>

            <div className={estilos.cardFooter}>
              <div>
                <span>Precio desde</span>
                <strong>{formatMoney(product.price)}</strong>
              </div>

              <div className={estilos.cardFooterActions}>
                <button
                  type="button"
                  className={estilos.removeButton}
                  onClick={onRemove}
                  aria-label={`Quitar ${product.title} de la comparación`}
                >
                  Quitar
                </button>
                <Link
                  className={estilos.productLink}
                  to={`/products/${product.handle}`}
                >
                  Ver perfume
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={estilos.emptyCard}>
          <span className={estilos.cardNumber} aria-hidden="true">
            <EssenzeIcon name={getSlotIcon(slotIndex)} size={19} />
          </span>
          <div className={estilos.emptyIcon} aria-hidden="true">
            +
          </div>
          <span>Espacio disponible</span>
          <h3>Elige otra fragancia</h3>
          <p>
            Usa el selector superior para completar esta posición y comparar
            sus atributos.
          </p>
          {position !== 'active' ? (
            <button type="button" onClick={onActivate}>
              Seleccionar este espacio
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

function ComparisonDetails({products}) {
  const hasProfiles = products.some(
    (product) =>
      product?.notes || product?.recommendation || product?.description,
  );

  return (
    <section
      className={estilos.comparisonDetails}
      aria-labelledby="comparison-details-title"
    >
      <div className={estilos.detailsHeader}>
        <div>
          <span className={estilos.detailsEyebrow}>Lectura comparativa</span>
          <h3 id="comparison-details-title">Detalles de cada fragancia</h3>
        </div>
        <p>
          Revisa atributo por atributo sin perder la vista editorial del
          carrusel.
        </p>
      </div>

      <div className={estilos.detailsLegend}>
        {products.map((product, index) => (
          <div
            className={`${estilos.legendItem} ${
              product ? '' : estilos.legendItemEmpty
            }`}
            key={`legend-${index + 1}`}
          >
            <span aria-hidden="true">
              <EssenzeIcon name={getSlotIcon(index)} size={17} />
            </span>
            <div>
              <small>{product?.vendor || 'Espacio disponible'}</small>
              <strong>{product?.title || 'Selecciona una fragancia'}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className={estilos.detailsGrid}>
        {DETAIL_ROWS.map((row) => {
          const values = products.map((product) => displayValue(product, row));
          const comparableValues = values
            .filter(
              (value, index) =>
                products[index] && value !== 'No especificado',
            )
            .map((value) =>
              String(value).trim().toLocaleLowerCase('es-MX'),
            );
          const valuesMatch =
            comparableValues.length > 1 &&
            new Set(comparableValues).size === 1;

          return (
            <article
              className={`${estilos.detailCard} ${
                valuesMatch
                  ? estilos.detailCardMatch
                  : estilos.detailCardDifference
              }`}
              key={row.key}
            >
              <div className={estilos.detailCardHeader}>
                <span>{row.label}</span>
                <small>{valuesMatch ? 'Coinciden' : 'Comparar'}</small>
              </div>

              <div className={estilos.detailValues}>
                {products.map((product, index) => (
                  <div
                    className={`${estilos.detailValue} ${
                      product ? '' : estilos.detailValueEmpty
                    }`}
                    key={`${row.key}-${index + 1}`}
                  >
                    <span aria-hidden="true">
                      <EssenzeIcon name={getSlotIcon(index)} size={17} />
                    </span>
                    <div>
                      <small>{product?.vendor || 'Sin seleccionar'}</small>
                      <strong>
                        {product ? displayValue(product, row) : '—'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {hasProfiles ? (
        <div className={estilos.profileComparison}>
          {products.map((product, index) => (
            <article
              className={`${estilos.profileCard} ${
                product ? '' : estilos.profileCardEmpty
              }`}
              key={`profile-${index + 1}`}
            >
              <span>
                <EssenzeIcon name={getSlotIcon(index)} size={16} />
                Perfil olfativo
              </span>
              <h4>{product?.title || 'Espacio disponible'}</h4>
              <p>
                {product
                  ? product.notes ||
                    product.recommendation ||
                    product.description ||
                    'Sin descripción olfativa disponible.'
                  : 'Añade una fragancia para consultar su perfil olfativo.'}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

