/**
 * Shared configuration and matching helpers for the Essenze fragrance quiz.
 * The matcher accepts Shopify tags and custom product metafields so the quiz
 * keeps working even when catalog values use Spanish/English variants.
 */

export const RECOMMENDATION_METAFIELD_IDENTIFIERS = [
  {namespace: 'custom', key: 'sexo_objetivo'},
  {namespace: 'custom', key: 'genero'},
  {namespace: 'custom', key: 'familia_olfativa'},
  {namespace: 'custom', key: 'familias_olfativas'},
  {namespace: 'custom', key: 'fragancia'},
  {namespace: 'custom', key: 'forma_del_producto'},
  {namespace: 'custom', key: 'ocasion'},
  {namespace: 'custom', key: 'ocasion_y_temporadas'},
  {namespace: 'custom', key: 'recomendaciones_de_uso'},
  {namespace: 'custom', key: 'uso_dia'},
  {namespace: 'custom', key: 'uso_noche'},
  {namespace: 'custom', key: 'uso_otono'},
  {namespace: 'custom', key: 'uso_verano'},
  {namespace: 'custom', key: 'uso_primavera'},
  {namespace: 'custom', key: 'uso_invierno'},
  {namespace: 'custom', key: 'intensidad'},
];

export const FRAGRANCE_QUIZ_STEPS = [
  {
    id: 1,
    key: 'gender',
    eyebrow: 'Perfil',
    question: '¿Para quién buscas la fragancia?',
    options: [
      {
        label: 'Masculino',
        value: 'masculino',
        aliases: [
          'masculino',
          'hombre',
          'caballero',
          'male',
          'men',
          'masculine',
        ],
      },
      {
        label: 'Femenino',
        value: 'femenino',
        aliases: ['femenino', 'mujer', 'dama', 'female', 'women', 'feminine'],
      },
      {
        label: 'Unisex',
        value: 'unisex',
        aliases: ['unisex', 'sin genero', 'genderless', 'neutral'],
      },
      {
        label: 'Sin preferencia',
        value: 'indistinto',
        aliases: [],
        neutral: true,
      },
    ],
  },
  {
    id: 2,
    key: 'family',
    eyebrow: 'Acordes',
    question: '¿Qué familia olfativa te atrae más?',
    options: [
      {
        label: 'Floral',
        value: 'floral',
        aliases: [
          'floral',
          'flores',
          'flor',
          'flower',
          'rose',
          'rosa',
          'jazmin',
        ],
      },
      {
        label: 'Amaderada',
        value: 'amaderada',
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
        value: 'citrica',
        aliases: [
          'citrica',
          'citrico',
          'citrus',
          'bergamota',
          'limon',
          'naranja',
          'mandarina',
        ],
      },
      {
        label: 'Oriental / Ámbar',
        value: 'oriental',
        aliases: [
          'oriental',
          'ambar',
          'amber',
          'especiada',
          'especiado',
          'spicy',
        ],
      },
      {
        label: 'Aromática',
        value: 'aromatica',
        aliases: [
          'aromatica',
          'aromatico',
          'aromatic',
          'fougere',
          'lavanda',
          'herbal',
          'verde',
        ],
      },
      {
        label: 'Dulce / Gourmand',
        value: 'gourmand',
        aliases: [
          'gourmand',
          'dulce',
          'sweet',
          'vainilla',
          'caramelo',
          'cacao',
          'tonka',
        ],
      },
    ],
  },
  {
    id: 3,
    key: 'occasion',
    eyebrow: 'Momento',
    question: '¿En qué momento quieres usarla?',
    options: [
      {
        label: 'Todos los días',
        value: 'diario',
        aliases: [
          'diario',
          'dia',
          'daily',
          'cotidiano',
          'casual',
          'todos los dias',
        ],
      },
      {
        label: 'Trabajo u oficina',
        value: 'trabajo',
        aliases: ['trabajo', 'oficina', 'office', 'work', 'profesional'],
      },
      {
        label: 'Noche',
        value: 'noche',
        aliases: ['noche', 'night', 'nocturno', 'evening', 'salida nocturna'],
      },
      {
        label: 'Ocasión especial',
        value: 'especial',
        aliases: [
          'especial',
          'evento',
          'fiesta',
          'formal',
          'cita',
          'date',
          'occasion',
        ],
      },
    ],
  },
];

const CATEGORY_WEIGHTS = {
  gender: 2,
  family: 4,
  occasion: 3,
};

const FIELD_GROUPS = {
  gender: ['sexo_objetivo', 'genero'],
  family: ['familia_olfativa', 'familias_olfativas', 'fragancia'],
  occasion: [
    'ocasion',
    'ocasion_y_temporadas',
    'recomendaciones_de_uso',
    'uso_dia',
    'uso_noche',
    'uso_otono',
    'uso_verano',
    'uso_primavera',
    'uso_invierno',
  ],
};

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
    Object.values(value).forEach((entry) => flattenJson(entry, output));
    return output;
  }

  output.push(String(value));
  return output;
}

function metafieldValueToText(metafield) {
  if (!metafield?.value) return '';

  const rawValue = String(metafield.value).trim();
  const normalizedType = String(metafield.type || '').toLowerCase();

  if (normalizedType === 'boolean') {
    return rawValue === 'true' ? metafield.key.replaceAll('_', ' ') : '';
  }

  if (rawValue.startsWith('[') || rawValue.startsWith('{')) {
    try {
      return flattenJson(JSON.parse(rawValue)).join(' ');
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}

function getMetafieldMap(product) {
  return (product?.metafields || []).filter(Boolean).reduce((map, field) => {
    map[field.key] = metafieldValueToText(field);
    return map;
  }, {});
}

function createSearchText(values) {
  const normalized = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');

  return normalized ? ` ${normalized} ` : '';
}

function containsAlias(searchText, aliases = []) {
  if (!searchText || aliases.length === 0) return false;

  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) return false;
    return searchText.includes(` ${normalizedAlias} `);
  });
}

function optionForSelection(key, value) {
  const step = FRAGRANCE_QUIZ_STEPS.find((item) => item.key === key);
  return step?.options.find((option) => option.value === value) || null;
}

function buildProductSearchGroups(product) {
  const metafields = getMetafieldMap(product);
  const tags = product?.tags || [];
  const commonFallback = [
    tags,
    product?.title,
    product?.description,
    product?.productType,
    product?.vendor,
  ];

  return {
    gender: {
      direct: createSearchText(
        FIELD_GROUPS.gender.map((key) => metafields[key]),
      ),
      fallback: createSearchText(commonFallback),
    },
    family: {
      direct: createSearchText(
        FIELD_GROUPS.family.map((key) => metafields[key]),
      ),
      fallback: createSearchText(commonFallback),
    },
    occasion: {
      direct: createSearchText(
        FIELD_GROUPS.occasion.map((key) => metafields[key]),
      ),
      fallback: createSearchText(commonFallback),
    },
  };
}

function isLikelyFragrance(product) {
  const metafields = getMetafieldMap(product);
  const fragranceMetadata = [
    metafields.familia_olfativa,
    metafields.familias_olfativas,
    metafields.fragancia,
    metafields.forma_del_producto,
    metafields.ocasion,
    metafields.ocasion_y_temporadas,
  ].filter(Boolean);

  if (fragranceMetadata.length > 0) return true;

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
  ].some((term) => containsAlias(catalogText, [term]));
}

function scoreProduct(product, selections) {
  const groups = buildProductSearchGroups(product);
  const matchDetails = [];
  let earnedWeight = 0;
  let possibleWeight = 0;

  Object.entries(selections).forEach(([key, selectedValue]) => {
    const option = optionForSelection(key, selectedValue);
    if (!option || option.neutral) return;

    const weight = CATEGORY_WEIGHTS[key] || 1;
    possibleWeight += weight;

    const directMatch = containsAlias(groups[key]?.direct, option.aliases);
    const fallbackMatch =
      !directMatch && containsAlias(groups[key]?.fallback, option.aliases);

    if (directMatch || fallbackMatch) {
      const appliedWeight = directMatch ? weight : weight * 0.72;
      earnedWeight += appliedWeight;
      matchDetails.push({
        key,
        label: option.label,
        strength: directMatch ? 'direct' : 'contextual',
      });
    }
  });

  const percentage = possibleWeight
    ? Math.min(100, Math.round((earnedWeight / possibleWeight) * 100))
    : 100;

  return {
    product,
    score: earnedWeight,
    percentage,
    matchDetails,
    available: product?.availableForSale !== false,
    isFallback: false,
  };
}

/**
 * Returns the best matching products and fills any remaining slots with
 * available catalog alternatives, ensuring the result screen never breaks.
 */
export function rankFragranceProducts(
  products = [],
  selections = {},
  limit = 8,
) {
  const validProducts = products.filter(
    (product) => product?.id && product?.handle && product?.title,
  );
  const fragranceProducts = validProducts.filter(isLikelyFragrance);
  const candidates =
    fragranceProducts.length > 0 ? fragranceProducts : validProducts;

  const scored = candidates
    .map((product) => scoreProduct(product, selections))
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchDetails.length !== a.matchDetails.length) {
        return b.matchDetails.length - a.matchDetails.length;
      }
      return a.product.title.localeCompare(b.product.title, 'es');
    });

  const meaningfulMatches = scored.filter(
    (item) => item.score > 0 && item.matchDetails.length > 0,
  );
  const selected = meaningfulMatches.slice(0, limit);
  const selectedIds = new Set(selected.map((item) => item.product.id));

  if (selected.length < Math.min(4, limit)) {
    const alternatives = scored
      .filter((item) => !selectedIds.has(item.product.id))
      .slice(0, limit - selected.length)
      .map((item) => ({
        ...item,
        percentage: 0,
        matchDetails: [],
        isFallback: true,
      }));

    selected.push(...alternatives);
  }

  return {
    recommendations: selected.slice(0, limit),
    exactMatchCount: meaningfulMatches.length,
    usedFallback: selected.some((item) => item.isFallback),
    catalogSize: candidates.length,
  };
}

export function getSelectionLabels(selections = {}) {
  return Object.entries(selections)
    .map(([key, value]) => optionForSelection(key, value)?.label)
    .filter(Boolean);
}
