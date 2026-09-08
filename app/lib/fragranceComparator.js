/**
 * Normalización de productos Shopify para el comparador de fragancias.
 * Lee datos nativos, tags, opciones y metacampos custom sin exigir que todos
 * los productos tengan exactamente la misma estructura.
 */

export const COMPARATOR_STORAGE_KEY = 'essenze:fragrance-comparison';
export const COMPARATOR_PENDING_KEY = 'essenze:pending-comparison-product';
export const COMPARATOR_ADD_EVENT = 'essenze:add-to-compare';

/**
 * Envía un producto al comparador. El ID queda en localStorage como respaldo
 * por si el comparador todavía no terminó de cargar cuando se hace clic.
 */
export function queueProductForComparison(productId) {
  if (!productId || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(COMPARATOR_PENDING_KEY, productId);
  } catch {
    // El evento sigue funcionando aunque el navegador bloquee localStorage.
  }

  window.dispatchEvent(
    new CustomEvent(COMPARATOR_ADD_EVENT, {
      detail: {productId},
    }),
  );

  const comparatorSection = document.getElementById('comparador-fragancias');
  if (comparatorSection) {
    window.requestAnimationFrame(() => {
      comparatorSection.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
    return;
  }

  if (window.location.pathname !== '/comparador') {
    window.location.assign('/comparador');
  }
}

export const COMPARATOR_METAFIELD_IDENTIFIERS = [
  {namespace: 'custom', key: 'genero'},
  {namespace: 'custom', key: 'concentracion'},
  {namespace: 'custom', key: 'ocasion'},
  {namespace: 'custom', key: 'ocasion_y_temporadas'},
  {namespace: 'custom', key: 'familia_olfativa'},
  {namespace: 'custom', key: 'familias_olfativas'},
  {namespace: 'custom', key: 'recomendaciones_de_uso'},
  {namespace: 'custom', key: 'notas_de_salida'},
  {namespace: 'custom', key: 'notas_de_corazon'},
  {namespace: 'custom', key: 'notas_base'},
  {namespace: 'custom', key: 'intensidad'},
  {namespace: 'custom', key: 'estela'},
  {namespace: 'custom', key: 'perfumista'},
  {namespace: 'custom', key: 'ano_de_lanzamiento'},
  {namespace: 'custom', key: 'uso_dia'},
  {namespace: 'custom', key: 'uso_noche'},
  {namespace: 'custom', key: 'uso_otono'},
  {namespace: 'custom', key: 'uso_verano'},
  {namespace: 'custom', key: 'uso_primavera'},
  {namespace: 'custom', key: 'uso_invierno'},
];

const FAMILY_ALIASES = [
  {label: 'Floral', aliases: ['floral', 'flores', 'rosa', 'jazmin']},
  {
    label: 'Amaderada',
    aliases: [
      'amaderada',
      'amaderado',
      'woody',
      'madera',
      'cedro',
      'sandalo',
      'oud',
    ],
  },
  {
    label: 'Cítrica',
    aliases: [
      'citrica',
      'citrico',
      'citrus',
      'bergamota',
      'limon',
      'mandarina',
    ],
  },
  {
    label: 'Oriental / Ámbar',
    aliases: ['oriental', 'ambar', 'amber', 'especiada', 'especiado', 'spicy'],
  },
  {
    label: 'Aromática',
    aliases: [
      'aromatica',
      'aromatico',
      'aromatic',
      'fougere',
      'lavanda',
      'herbal',
    ],
  },
  {
    label: 'Gourmand',
    aliases: [
      'gourmand',
      'dulce',
      'sweet',
      'vainilla',
      'caramelo',
      'tonka',
      'cacao',
    ],
  },
  {
    label: 'Fresca',
    aliases: ['fresca', 'fresco', 'fresh', 'acuatico', 'marino'],
  },
  {label: 'Frutal', aliases: ['frutal', 'fruity', 'fruta']},
];

const GENDER_ALIASES = [
  {
    label: 'Masculino',
    aliases: ['masculino', 'hombre', 'caballero', 'male', 'men'],
  },
  {
    label: 'Femenino',
    aliases: ['femenino', 'mujer', 'dama', 'female', 'women'],
  },
  {label: 'Unisex', aliases: ['unisex', 'sin genero', 'genderless', 'neutral']},
];

const CONCENTRATION_ALIASES = [
  {
    label: 'Extrait de Parfum',
    aliases: ['extrait de parfum', 'parfum extract'],
  },
  {label: 'Parfum', aliases: ['parfum', 'perfume']},
  {label: 'Eau de Parfum', aliases: ['eau de parfum', 'edp']},
  {label: 'Eau de Toilette', aliases: ['eau de toilette', 'edt']},
  {label: 'Eau de Cologne', aliases: ['eau de cologne', 'edc', 'colonia']},
  {label: 'Body Mist', aliases: ['body mist', 'bruma corporal']},
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenJson(value, output = []) {
  if (value == null) return output;

  if (Array.isArray(value)) {
    value.forEach((entry) => flattenJson(entry, output));
    return output;
  }

  if (typeof value === 'object') {
    if (typeof value.value === 'string') output.push(value.value);
    if (Array.isArray(value.children)) flattenJson(value.children, output);
    if (!('value' in value) && !('children' in value)) {
      Object.values(value).forEach((entry) => flattenJson(entry, output));
    }
    return output;
  }

  output.push(String(value));
  return output;
}

function parseMetafieldValue(field) {
  if (!field || field.value == null) return null;

  const raw = String(field.value).trim();
  const type = String(field.type || '').toLowerCase();

  if (!raw) return null;
  if (type === 'boolean') return raw === 'true';

  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const values = flattenJson(JSON.parse(raw)).filter(Boolean);
      return values.length > 1 ? values : values[0] || null;
    } catch {
      return raw;
    }
  }

  return raw;
}

function getMetafieldMap(product) {
  return (product?.metafields || []).filter(Boolean).reduce((map, field) => {
    map[field.key] = parseMetafieldValue(field);
    return map;
  }, {});
}

function toDisplayText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' · ');
  if (value === true) return 'Sí';
  if (value === false || value == null) return '';
  return String(value).trim();
}

function firstVisible(...values) {
  for (const value of values) {
    const text = toDisplayText(value);
    if (text) return text;
  }
  return '';
}

function createSearchText(values) {
  return normalizeText(
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => value !== false && value != null)
      .join(' '),
  );
}

function inferLabel(searchText, groups) {
  if (!searchText) return '';

  return (
    groups.find((group) =>
      group.aliases.some((alias) => {
        const normalizedAlias = normalizeText(alias);
        return (
          searchText === normalizedAlias ||
          searchText.includes(` ${normalizedAlias} `) ||
          searchText.startsWith(`${normalizedAlias} `) ||
          searchText.endsWith(` ${normalizedAlias}`)
        );
      }),
    )?.label || ''
  );
}

function getUsageLabels(fields) {
  const usageMap = [
    ['uso_dia', 'Día'],
    ['uso_noche', 'Noche'],
    ['uso_otono', 'Otoño'],
    ['uso_verano', 'Verano'],
    ['uso_primavera', 'Primavera'],
    ['uso_invierno', 'Invierno'],
  ];

  return usageMap
    .filter(
      ([key]) => fields[key] === true || normalizeText(fields[key]) === 'si',
    )
    .map(([, label]) => label);
}

function getSeasonLabels(fields) {
  return getUsageLabels(fields).filter((label) =>
    ['Otoño', 'Verano', 'Primavera', 'Invierno'].includes(label),
  );
}

function getDaypartLabels(fields) {
  return getUsageLabels(fields).filter((label) =>
    ['Día', 'Noche'].includes(label),
  );
}

function getSizeValues(product) {
  const optionValues = (product?.options || [])
    .filter((option) =>
      /tamano|tamaño|size|volumen|volume|ml/i.test(option?.name || ''),
    )
    .flatMap((option) => option?.optionValues || option?.values || [])
    .map((value) => (typeof value === 'string' ? value : value?.name))
    .filter(Boolean);

  const selectedValues = (
    product?.selectedOrFirstAvailableVariant?.selectedOptions || []
  )
    .filter((option) =>
      /tamano|tamaño|size|volumen|volume|ml/i.test(option?.name || ''),
    )
    .map((option) => option.value)
    .filter(Boolean);

  const unique = [...new Set([...optionValues, ...selectedValues])];
  return unique.join(' · ');
}

function isLikelyFragrance(product, fields) {
  if (
    firstVisible(
      fields.familia_olfativa,
      fields.familias_olfativas,
    )
  ) {
    return true;
  }

  const catalogText = createSearchText([
    product?.productType,
    product?.tags,
    product?.title,
    product?.description,
  ]);

  return [
    'perfume',
    'perfumeria',
    'fragancia',
    'fragrance',
    'parfum',
    'eau de parfum',
    'eau de toilette',
    'cologne',
    'edp',
    'edt',
  ].some((term) => catalogText.includes(normalizeText(term)));
}

function normalizeProduct(product) {
  const fields = getMetafieldMap(product);
  const searchText = createSearchText([
    product?.title,
    product?.vendor,
    product?.productType,
    product?.description,
    product?.tags,
    Object.values(fields),
  ]);

  const family = firstVisible(
    fields.familia_olfativa,
    fields.familias_olfativas,
    inferLabel(searchText, FAMILY_ALIASES),
  );
  const gender = firstVisible(
    fields.genero,
    inferLabel(searchText, GENDER_ALIASES),
  );
  const concentration = firstVisible(
    fields.concentracion,
    inferLabel(searchText, CONCENTRATION_ALIASES),
  );
  const dayparts = getDaypartLabels(fields);
  const seasons = getSeasonLabels(fields);
  const occasion = firstVisible(
    fields.ocasion,
    fields.ocasion_y_temporadas,
    fields.recomendaciones_de_uso,
    dayparts,
  );

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    vendor: product.vendor || 'Essenze',
    productType: product.productType || '',
    description: product.description || '',
    availableForSale: product.availableForSale !== false,
    image:
      product.featuredImage ||
      product.selectedOrFirstAvailableVariant?.image ||
      null,
    price:
      product.priceRange?.minVariantPrice ||
      product.selectedOrFirstAvailableVariant?.price ||
      null,
    compareAtPrice:
      product.selectedOrFirstAvailableVariant?.compareAtPrice || null,
    family,
    gender,
    concentration,
    occasion,
    seasons: firstVisible(seasons),
    intensity: firstVisible(fields.intensidad),
    sizes: getSizeValues(product),
    topNotes: firstVisible(fields.notas_de_salida),
    heartNotes: firstVisible(fields.notas_de_corazon),
    baseNotes: firstVisible(fields.notas_base),
    notes: firstVisible(
      fields.notas_de_salida,
      fields.notas_de_corazon,
      fields.notas_base,
    ),
    recommendation: firstVisible(fields.recomendaciones_de_uso),
    sillage: firstVisible(fields.estela),
    perfumer: firstVisible(fields.perfumista),
    launchYear: firstVisible(fields.ano_de_lanzamiento),
    isFragrance: isLikelyFragrance(product, fields),
    source: product,
  };
}

/**
 * Convierte el catálogo de Shopify en un arreglo seguro para el comparador.
 * Las fragancias aparecen primero y los demás productos quedan como respaldo.
 */
export function buildComparatorCatalog(products = []) {
  const uniqueProducts = products
    .filter((product) => product?.id && product?.handle && product?.title)
    .filter(
      (product, index, list) =>
        list.findIndex((candidate) => candidate.id === product.id) === index,
    )
    .map(normalizeProduct);

  const fragrances = uniqueProducts.filter((product) => product.isFragrance);
  return fragrances.length > 0 ? fragrances : uniqueProducts;
}

export const COMPARISON_ROWS = [
  {key: 'vendor', label: 'Marca'},
  {key: 'family', label: 'Familia olfativa'},
  {key: 'gender', label: 'Perfil'},
  {key: 'concentration', label: 'Concentración'},
  {key: 'intensity', label: 'Intensidad'},
  {key: 'occasion', label: 'Uso recomendado'},
  {key: 'seasons', label: 'Temporadas'},
  {key: 'sizes', label: 'Presentaciones'},
  {key: 'sillage', label: 'Estela'},
  {key: 'availableForSale', label: 'Disponibilidad', type: 'availability'},
  {key: 'price', label: 'Precio', type: 'money'},
];
