import {Image, Money} from '@shopify/hydrogen';
import UnifiedProductCard from './UnifiedProductCard';
import EssenzeIcon, {getContextIconName} from './EssenzeIcon';
import IntensityIndicator from './IntensityIndicator';
import FragranceRadar from './FragranceRadar';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import styles from './ProductMetafields.module.css';

/**
 * Metafields solicitados para la ficha de producto.
 * Si alguna definición usa otro namespace o key en Shopify,
 * ajusta únicamente este arreglo.
 */
export const PRODUCT_METAFIELD_DEFINITIONS = [
  // Identidad de la fragancia
  {
    namespace: 'custom',
    key: 'concentracion',
    label: 'Concentración',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'perfumista',
    label: 'Perfumista',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'ano_de_lanzamiento',
    label: 'Año de lanzamiento',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'genero',
    label: 'Género',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'familias_olfativas',
    label: 'Familias olfativas',
    group: 'profile',
  },

  // Rendimiento
  {
    namespace: 'custom',
    key: 'intensidad',
    label: 'Intensidad',
    group: 'performance',
  },
  {
    namespace: 'custom',
    key: 'duracion',
    label: 'Duración',
    group: 'performance',
  },
  {
    namespace: 'custom',
    key: 'estela',
    label: 'Estela',
    group: 'performance',
  },

  // Uso y temporalidad
  {
    namespace: 'custom',
    key: 'ocasion_y_temporadas',
    label: 'Ocasión y temporadas',
    group: 'season',
  },
  {namespace: 'custom', key: 'uso_noche', label: 'Noche', group: 'usage'},
  {namespace: 'custom', key: 'uso_dia', label: 'Día', group: 'usage'},
  {namespace: 'custom', key: 'uso_invierno', label: 'Invierno', group: 'usage'},
  {namespace: 'custom', key: 'uso_otono', label: 'Otoño', group: 'usage'},
  {namespace: 'custom', key: 'uso_verano', label: 'Verano', group: 'usage'},
  {
    namespace: 'custom',
    key: 'uso_primavera',
    label: 'Primavera',
    group: 'usage',
  },

  // Beneficios comerciales
  {
    namespace: 'custom',
    key: 'envio_gratis',
    label: 'Envío gratis',
    group: 'benefit',
  },
  {
    namespace: 'custom',
    key: 'coleccion_privada',
    label: 'Colección privada',
    group: 'benefit',
  },

  // Contenido editorial y pirámide olfativa
  {
    namespace: 'custom',
    key: 'recomendaciones_de_uso',
    label: 'Recomendaciones de uso',
    group: 'editorial',
  },
  {
    namespace: 'custom',
    key: 'notas_de_salida',
    label: 'Notas de salida',
    group: 'notes',
  },
  {
    namespace: 'custom',
    key: 'notas_de_corazon',
    label: 'Notas de corazón',
    group: 'notes',
  },
  {
    namespace: 'custom',
    key: 'notas_base',
    label: 'Notas de fondo',
    group: 'notes',
  },
  {
    namespace: 'custom',
    key: 'notas_olfativas_imagen',
    label: 'Notas olfativas',
    group: 'image',
  },

  // Productos complementarios
  {
    namespace: 'shopify--discovery--product_recommendation',
    key: 'complementary_products',
    label: 'Productos complementarios',
    group: 'products',
  },
  {
    namespace: 'custom',
    key: 'complementary_products',
    label: 'Productos complementarios',
    group: 'products',
  },
];

export const PRODUCT_METAFIELD_IDENTIFIERS = PRODUCT_METAFIELD_DEFINITIONS.map(
  ({ namespace, key }) => ({ namespace, key }),
);

function getFieldMap(metafields = []) {
  return new Map(
    metafields
      .filter(Boolean)
      .map((field) => [`${field.namespace}.${field.key}`, field]),
  );
}

function getDefinitionField(definition, fieldMap) {
  return fieldMap.get(`${definition.namespace}.${definition.key}`) || null;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractRichText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node))
    return node.map(extractRichText).filter(Boolean).join(' ');
  if (typeof node === 'object') {
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) return extractRichText(node.children);
  }
  return '';
}

function getDisplayValue(field) {
  if (!field?.value) return null;

  if (field.type === 'boolean') {
    return field.value === 'true';
  }

  if (field.type?.startsWith('list.')) {
    const parsed = parseJson(field.value);
    return Array.isArray(parsed) ? parsed : [field.value];
  }

  if (field.type === 'json') {
    return parseJson(field.value) ?? field.value;
  }

  if (field.type === 'rich_text_field') {
    const parsed = parseJson(field.value);
    return extractRichText(parsed) || field.value;
  }

  return field.value;
}

function hasVisibleValue(field) {
  const value = getDisplayValue(field);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value && String(value).trim());
}

function renderValue(field, fallback = 'Información no disponible') {
  const value = getDisplayValue(field);

  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(' · ') : fallback;
  if (value && typeof value === 'object') {
    const values = Object.values(value).filter(Boolean);
    return values.length ? values.join(' · ') : fallback;
  }

  return value && String(value).trim() ? value : fallback;
}

function isUnavailable(field) {
  return !hasVisibleValue(field);
}

function isColorValue(field) {
  const value = getDisplayValue(field);
  return (
    field?.type === 'color' ||
    (typeof value === 'string' &&
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))
  );
}

function getMediaImage(field) {
  if (field?.reference?.__typename === 'MediaImage')
    return field.reference.image;

  return field?.references?.nodes?.find(
    (reference) => reference?.__typename === 'MediaImage',
  )?.image;
}

function getReferencedProducts(field) {
  const references = [
    field?.reference,
    ...(field?.references?.nodes || []),
  ].filter(Boolean);

  return references.filter(
    (reference, index, products) =>
      reference.__typename === 'Product' &&
      products.findIndex((item) => item?.id === reference.id) === index,
  );
}


function getFieldByKey(fieldMap, key) {
  return fieldMap.get(`custom.${key}`) || null;
}

function getBooleanMetric(field) {
  if (!field?.value) return {score: 0.7, available: false, display: 'Información pendiente'};
  const value = String(field.value).trim().toLowerCase();
  const active = ['true', '1', 'sí', 'si', 'yes', 'recomendado'].includes(value);
  return {
    score: active ? 5 : 1,
    available: true,
    display: active ? 'Recomendado' : 'Uso limitado',
  };
}

function parseMetricScore(field, kind = 'generic') {
  const raw = getDisplayValue(field);
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return {score: 0.7, available: false, display: 'Información pendiente'};
  }

  const display = Array.isArray(raw) ? raw.join(' · ') : String(raw);
  const normalized = display.toLowerCase().replace(',', '.');
  const fraction = normalized.match(/([1-5](?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    return {score: Math.max(1, Math.min(5, Number(fraction[1]))), available: true, display};
  }

  const number = normalized.match(/\d+(?:\.\d+)?/);
  if (kind === 'duration' && number) {
    const hours = Number(number[0]);
    const score = hours >= 10 ? 5 : hours >= 8 ? 4 : hours >= 6 ? 3 : hours >= 4 ? 2 : 1;
    return {score, available: true, display};
  }

  const wordScores = [
    [['muy intensa', 'muy alto', 'muy alta', 'potente', 'excelente', 'enorme'], 5],
    [['intensa', 'alto', 'alta', 'larga', 'fuerte', 'amplia'], 4],
    [['moderada', 'moderado', 'media', 'medio', 'equilibrada', 'equilibrado'], 3],
    [['suave', 'baja', 'bajo', 'corta', 'ligera', 'ligero'], 2],
    [['muy suave', 'muy baja', 'muy bajo', 'íntima', 'intima'], 1],
  ];

  for (const [words, score] of wordScores) {
    if (words.some((word) => normalized.includes(word))) {
      return {score, available: true, display};
    }
  }

  if (number) {
    const numeric = Number(number[0]);
    return {score: Math.max(1, Math.min(5, numeric)), available: true, display};
  }

  return {score: 3, available: true, display};
}

function getVersatilityMetric(fieldMap) {
  const keys = ['uso_primavera', 'uso_verano', 'uso_otono', 'uso_invierno'];
  const fields = keys.map((key) => getFieldByKey(fieldMap, key));
  const availableFields = fields.filter((field) => field?.value);
  if (!availableFields.length) {
    return {score: 0.7, available: false, display: 'Información pendiente'};
  }

  const activeCount = fields.filter((field) => getBooleanMetric(field).score === 5).length;
  const score = Math.max(1, Math.min(5, activeCount + 1));
  return {
    score,
    available: true,
    display: activeCount >= 4 ? 'Todo el año' : `${activeCount} temporadas recomendadas`,
  };
}

export function ProductMetafields({ metafields = [] }) {
  const fieldMap = getFieldMap(metafields);

  const definitionsWithFields = PRODUCT_METAFIELD_DEFINITIONS.map(
    (definition) => ({
      ...definition,
      field: getDefinitionField(definition, fieldMap),
    }),
  );

  const profileFields = definitionsWithFields.filter(
    ({ group }) => group === 'profile',
  );

  const usageFields = definitionsWithFields.filter(
    ({ group }) => group === 'usage',
  );

  const performanceFields = definitionsWithFields.filter(
    ({ group }) => group === 'performance',
  );

  const noteFields = definitionsWithFields.filter(
    ({ group }) => group === 'notes',
  );

  const seasonField = definitionsWithFields.find(
    ({ group }) => group === 'season',
  );

  const benefitFields = definitionsWithFields.filter(
    ({ group, field }) => group === 'benefit' && hasVisibleValue(field),
  );

  const editorialFields = definitionsWithFields.filter(
    ({ group }) => group === 'editorial',
  );

  const imageField = definitionsWithFields.find(
    ({ group, field }) => group === 'image' && getMediaImage(field),
  );
  const notesImage = getMediaImage(imageField?.field);

  const productsField = definitionsWithFields.find(
    ({ group, field }) =>
      group === 'products' && getReferencedProducts(field).length,
  );
  const complementaryProducts = getReferencedProducts(productsField?.field);

  const radarMetrics = [
    parseMetricScore(getFieldByKey(fieldMap, 'intensidad')),
    parseMetricScore(getFieldByKey(fieldMap, 'duracion'), 'duration'),
    parseMetricScore(getFieldByKey(fieldMap, 'estela')),
    getBooleanMetric(getFieldByKey(fieldMap, 'uso_noche')),
    getVersatilityMetric(fieldMap),
    getBooleanMetric(getFieldByKey(fieldMap, 'uso_dia')),
  ];

  return (
    <section className={styles.section} aria-labelledby="product-details-title" data-motion-reveal>
      <div className={styles.container}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>ADN de la fragancia</span>
          <h2 id="product-details-title" className={styles.heading}>
            Una esencia, todos sus detalles
          </h2>
          <p className={styles.intro}>
            Descubre cómo evoluciona esta creación a través de sus notas,
            rendimiento y carácter.
          </p>
        </header>

        {benefitFields.length > 0 && (
          <div className={styles.benefits}>
            {benefitFields.map(({ namespace, key, label }) => (
              <span key={`${namespace}.${key}`} className={styles.benefitBadge}>
                <span aria-hidden="true">✓</span>
                {label}
              </span>
            ))}
          </div>
        )}

        <div className={styles.overviewGrid}>
              <FragranceRadar metrics={radarMetrics} />

              <article className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name="fingerprint" size={22} />
                </span>
                <h3 className={styles.cardTitle}>Identidad</h3>
                <dl className={styles.specList}>
                  {profileFields.map(({ namespace, key, label, field }) => (
                    <div key={`${namespace}.${key}`} className={styles.specRow}>
                      <dt>{label}</dt>
                      <dd className={isUnavailable(field) ? styles.unavailableValue : undefined}>
                        {key === 'intensidad' && !isUnavailable(field) ? (
                          <IntensityIndicator value={renderValue(field)} />
                        ) : (
                          <>
                            {!isUnavailable(field) && isColorValue(field) && (
                              <span
                                className={styles.colorSwatch}
                                style={{
                                  backgroundColor: String(getDisplayValue(field)),
                                }}
                                aria-hidden="true"
                              />
                            )}
                            {renderValue(field)}
                          </>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>

              <article className={`${styles.card} ${styles.performanceCard}`}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name="sparkles" size={22} />
                </span>
                <h3 className={styles.cardTitle}>Rendimiento</h3>
                <div className={styles.performanceList}>
                  {performanceFields.map(({namespace, key, label, field}) => (
                    <div className={styles.performanceRow} key={`${namespace}.${key}`}>
                      <div className={styles.performanceCopy}>
                        <span>{label}</span>
                        <strong className={isUnavailable(field) ? styles.unavailableValue : undefined}>
                          {renderValue(field)}
                        </strong>
                      </div>
                      {isUnavailable(field) ? (
                        <div className={styles.emptyIndicator} aria-label={`${label}: información no disponible`}>
                          {Array.from({length: 5}).map((_, index) => (
                            <span key={index} />
                          ))}
                        </div>
                      ) : (
                        <IntensityIndicator
                          labelPrefix={label}
                          showLabel={false}
                          value={renderValue(field)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name="sunMoon" size={22} />
                </span>
                <h3 className={styles.cardTitle}>Cuándo usarla</h3>

                <div className={styles.seasonSummary}>
                  <span>{seasonField?.label || 'Ocasión y temporadas'}</span>
                  <strong className={isUnavailable(seasonField?.field) ? styles.unavailableValue : undefined}>
                    {renderValue(seasonField?.field)}
                  </strong>
                </div>

                <div className={styles.usageChips}>
                  {usageFields.map(({ namespace, key, label, field }) => {
                    const available = hasVisibleValue(field);
                    return (
                      <span
                        key={`${namespace}.${key}`}
                        className={`${styles.usageChip} ${!available ? styles.usageChipUnavailable : ''}`}
                        title={available ? label : `${label}: información no disponible`}
                      >
                        {label}
                        {!available && <small>No disponible</small>}
                      </span>
                    );
                  })}
                </div>
              </article>

              <figure className={`${styles.card} ${styles.imageCard} ${!notesImage ? styles.imageCardUnavailable : ''}`}>
                {notesImage ? (
                  <Image
                    data={notesImage}
                    sizes="(min-width: 990px) 33vw, 100vw"
                    className={styles.notesImage}
                  />
                ) : (
                  <div className={styles.imagePlaceholder} aria-hidden="true">
                    <EssenzeIcon name="map" size={38} />
                  </div>
                )}
                <figcaption>
                  <span className={styles.cardIcon} aria-hidden="true">
                    <EssenzeIcon name="map" size={22} />
                  </span>
                  <strong>Mapa olfativo</strong>
                  <span>{notesImage ? 'Una lectura visual de sus notas principales.' : 'Información visual no disponible.'}</span>
                </figcaption>
              </figure>
          </div>

          <section className={styles.notesSection} aria-labelledby="olfactory-pyramid-title">
            <div className={styles.notesHeading}>
              <span className={styles.eyebrow}>Composición olfativa</span>
              <h3 id="olfactory-pyramid-title">Pirámide de notas</h3>
            </div>
            <div className={styles.notesGrid}>
              {noteFields.map(({namespace, key, label, field}, index) => (
                <article className={styles.noteCard} key={`${namespace}.${key}`}>
                  <span className={styles.noteIndex}>0{index + 1}</span>
                  <div>
                    <h4>{label}</h4>
                    <p className={isUnavailable(field) ? styles.unavailableValue : undefined}>
                      {renderValue(field)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.editorialGrid}>
            {editorialFields.map(({ namespace, key, label, field }) => (
              <article
                key={`${namespace}.${key}`}
                className={styles.editorialCard}
              >
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name={getContextIconName(label)} size={22} />
                </span>
                <h3>{label}</h3>
                <p>{renderValue(field)}</p>
              </article>
            ))}
          </div>

        {complementaryProducts.length > 0 && (
          <div className={styles.complementarySection}>
            <div className={styles.complementaryHeader}>
              <div>
                <span className={styles.eyebrow}>Completa el ritual</span>
                <h3>Productos complementarios</h3>
              </div>
              <span className={styles.productCount}>
                {complementaryProducts.length}{' '}
                {complementaryProducts.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            <div className={styles.productGrid}>
              {complementaryProducts.map((product) => (
                <UnifiedProductCard
                  available={product.availableForSale !== false}
                  ctaLabel="Comprar"
                  dataProductId={product.id}
                  image={product.featuredImage}
                  key={product.id}
                  onCompare={() => queueProductForComparison(product.id)}
                  price={
                    product.priceRange?.minVariantPrice ? (
                      <Money data={product.priceRange.minVariantPrice} />
                    ) : (
                      'Consultar precio'
                    )
                  }
                  productType={product.productType || ''}
                  sizes="(min-width: 990px) 25vw, 50vw"
                  title={product.title}
                  to={`/products/${product.handle}`}
                  vendor={product.vendor}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
