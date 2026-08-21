import {Image, Money} from '@shopify/hydrogen';
import UnifiedProductCard from './UnifiedProductCard';
import EssenzeIcon, {getContextIconName} from './EssenzeIcon';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import styles from './ProductMetafields.module.css';

/**
 * Metafields solicitados para la ficha de producto.
 * Si alguna definición usa otro namespace o key en Shopify,
 * ajusta únicamente este arreglo.
 */
export const PRODUCT_METAFIELD_DEFINITIONS = [
  {
    namespace: 'custom',
    key: 'sexo_objetivo',
    label: 'Sexo objetivo',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'forma_del_producto',
    label: 'Forma del producto',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'tipo_de_dispensador',
    label: 'Tipo de dispensador',
    group: 'profile',
  },
  { namespace: 'custom', key: 'ocasion', label: 'Ocasión', group: 'profile' },
  {
    namespace: 'custom',
    key: 'fragancia',
    label: 'Fragancia',
    group: 'profile',
  },
  {
    namespace: 'custom',
    key: 'familia_olfativa',
    label: 'Familia olfativa',
    group: 'profile',
  },
  { namespace: 'custom', key: 'material', label: 'Material', group: 'profile' },
  { namespace: 'custom', key: 'color', label: 'Color', group: 'profile' },
  { namespace: 'custom', key: 'genero', label: 'Género', group: 'profile' },
  {
    namespace: 'custom',
    key: 'intensidad',
    label: 'Intensidad',
    group: 'profile',
  },

  {
    namespace: 'custom',
    key: 'ocasion_y_temporadas',
    label: 'Ocasión y temporadas',
    group: 'season',
  },
  { namespace: 'custom', key: 'uso_noche', label: 'Noche', group: 'usage' },
  { namespace: 'custom', key: 'uso_dia', label: 'Día', group: 'usage' },
  { namespace: 'custom', key: 'uso_otono', label: 'Otoño', group: 'usage' },
  { namespace: 'custom', key: 'uso_verano', label: 'Verano', group: 'usage' },
  {
    namespace: 'custom',
    key: 'uso_primavera',
    label: 'Primavera',
    group: 'usage',
  },
  {
    namespace: 'custom',
    key: 'uso_invierno',
    label: 'Invierno',
    group: 'usage',
  },

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

  {
    namespace: 'custom',
    key: 'recomendaciones_de_uso',
    label: 'Recomendaciones de uso',
    group: 'editorial',
  },
  {
    namespace: 'custom',
    key: 'notas_base',
    label: 'Notas base',
    group: 'editorial',
  },
  {
    namespace: 'custom',
    key: 'familias_olfativas',
    label: 'Familias olfativas',
    group: 'editorial',
  },
  {
    namespace: 'custom',
    key: 'notas_olfativas_imagen',
    label: 'Notas olfativas',
    group: 'image',
  },

  // Shopify Search & Discovery suele guardar este campo en este namespace.
  {
    namespace: 'shopify--discovery--product_recommendation',
    key: 'complementary_products',
    label: 'Productos complementarios',
    group: 'products',
  },
  // Respaldo por si la definición fue creada manualmente en el namespace custom.
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

function renderValue(field) {
  const value = getDisplayValue(field);

  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.join(' · ');
  if (value && typeof value === 'object')
    return Object.values(value).join(' · ');
  return value;
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

export function ProductMetafields({ metafields = [] }) {
  const fieldMap = getFieldMap(metafields);

  const definitionsWithFields = PRODUCT_METAFIELD_DEFINITIONS.map(
    (definition) => ({
      ...definition,
      field: getDefinitionField(definition, fieldMap),
    }),
  );

  const profileFields = definitionsWithFields.filter(
    ({ group, field }) => group === 'profile' && hasVisibleValue(field),
  );

  const usageFields = definitionsWithFields.filter(
    ({ group, field }) => group === 'usage' && hasVisibleValue(field),
  );

  const seasonField = definitionsWithFields.find(
    ({ group, field }) => group === 'season' && hasVisibleValue(field),
  );

  const benefitFields = definitionsWithFields.filter(
    ({ group, field }) => group === 'benefit' && hasVisibleValue(field),
  );

  const editorialFields = definitionsWithFields.filter(
    ({ group, field }) => group === 'editorial' && hasVisibleValue(field),
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

  const hasContent =
    profileFields.length ||
    usageFields.length ||
    seasonField ||
    benefitFields.length ||
    editorialFields.length ||
    notesImage ||
    complementaryProducts.length;

  if (!hasContent) return null;

  return (
    <section className={styles.section} aria-labelledby="product-details-title" data-motion-reveal>
      <div className={styles.container}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Perfil de la fragancia</span>
          <h2 id="product-details-title" className={styles.heading}>
            Una esencia, todos sus detalles
          </h2>
          <p className={styles.intro}>
            Conoce su carácter, los mejores momentos para usarla y las notas que
            construyen su identidad.
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

        {(profileFields.length > 0 ||
          usageFields.length > 0 ||
          seasonField) && (
          <div className={styles.overviewGrid}>
            {profileFields.length > 0 && (
              <article className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name="fingerprint" size={22} />
                </span>
                <h3 className={styles.cardTitle}>Identidad</h3>
                <dl className={styles.specList}>
                  {profileFields.map(({ namespace, key, label, field }) => (
                    <div key={`${namespace}.${key}`} className={styles.specRow}>
                      <dt>{label}</dt>
                      <dd>
                        {isColorValue(field) && (
                          <span
                            className={styles.colorSwatch}
                            style={{
                              backgroundColor: String(getDisplayValue(field)),
                            }}
                            aria-hidden="true"
                          />
                        )}
                        {renderValue(field)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            )}

            {(usageFields.length > 0 || seasonField) && (
              <article className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <EssenzeIcon name="sunMoon" size={22} />
                </span>
                <h3 className={styles.cardTitle}>Cuándo usarla</h3>

                {seasonField && (
                  <div className={styles.seasonSummary}>
                    <span>{seasonField.label}</span>
                    <strong>{renderValue(seasonField.field)}</strong>
                  </div>
                )}

                {usageFields.length > 0 && (
                  <div className={styles.usageChips}>
                    {usageFields.map(({ namespace, key, label }) => (
                      <span
                        key={`${namespace}.${key}`}
                        className={styles.usageChip}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )}

            {notesImage && (
              <figure className={`${styles.card} ${styles.imageCard}`}>
                <Image
                  data={notesImage}
                  sizes="(min-width: 990px) 33vw, 100vw"
                  className={styles.notesImage}
                />
                <figcaption>
                  <span className={styles.cardIcon} aria-hidden="true">
                    <EssenzeIcon name="map" size={22} />
                  </span>
                  <strong>Mapa olfativo</strong>
                  <span>Una lectura visual de sus notas principales.</span>
                </figcaption>
              </figure>
            )}
          </div>
        )}

        {editorialFields.length > 0 && (
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
        )}

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
                  productType={product.productType || 'Perfumería de autor'}
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
