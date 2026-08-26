/**
 * Configuración y motor de afinidad del Asesor Olfativo Essenze.
 * Usa etiquetas y metacampos de Shopify, aceptando valores en español e inglés.
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
    key: 'recipient',
    eyebrow: 'Destino',
    question: '¿Para quién buscas la fragancia?',
    options: [
      {label: 'Para mí', value: 'self', aliases: [], neutral: true},
      {label: 'Para regalar', value: 'gift', aliases: [], neutral: true},
    ],
  },
  {
    id: 2,
    key: 'gender',
    eyebrow: 'Género',
    question: '¿Qué género buscas?',
    options: [
      {label: 'Masculino', value: 'masculino', aliases: ['masculino', 'hombre', 'caballero', 'male', 'men', 'masculine']},
      {label: 'Femenino', value: 'femenino', aliases: ['femenino', 'mujer', 'dama', 'female', 'women', 'feminine']},
      {label: 'Unisex', value: 'unisex', aliases: ['unisex', 'sin genero', 'genderless', 'neutral']},
      {label: 'Sin preferencia', value: 'indistinto', aliases: [], neutral: true},
    ],
  },
  {
    id: 3,
    key: 'personality',
    eyebrow: 'Personalidad',
    question: '¿Qué quieres transmitir cuando alguien perciba tu aroma?',
    options: [
      {label: 'Elegancia', value: 'elegancia', aliases: ['amaderado', 'amaderada', 'woody', 'cedro', 'sandalo', 'oud', 'cuero', 'ambar']},
      {label: 'Seguridad', value: 'seguridad', aliases: ['amaderado', 'cuero', 'aromatico', 'aromatica', 'vetiver', 'especiado']},
      {label: 'Sensualidad', value: 'sensualidad', aliases: ['ambar', 'oriental', 'vainilla', 'almizcle', 'musk', 'gourmand', 'dulce']},
      {label: 'Frescura', value: 'frescura', aliases: ['citrico', 'citrica', 'citrus', 'bergamota', 'acuatico', 'fresh', 'verde']},
      {label: 'Exclusividad', value: 'exclusividad', aliases: ['oud', 'nicho', 'niche', 'cuero', 'ambar', 'incienso', 'iris']},
      {label: 'Aventura', value: 'aventura', aliases: ['aromatico', 'aromatica', 'verde', 'marino', 'acuatico', 'especiado', 'fougere']},
      {label: 'No lo sé, asesórame', value: 'asesorar', aliases: [], neutral: true},
    ],
  },
  {
    id: 4,
    key: 'occasion',
    eyebrow: 'Momento',
    question: '¿En qué momento la usarás?',
    options: [
      {label: 'Diario', value: 'diario', aliases: ['diario', 'dia', 'daily', 'cotidiano', 'casual']},
      {label: 'Oficina', value: 'oficina', aliases: ['trabajo', 'oficina', 'office', 'work', 'profesional']},
      {label: 'Citas', value: 'citas', aliases: ['cita', 'date', 'romantico', 'romantica']},
      {label: 'Eventos', value: 'eventos', aliases: ['evento', 'fiesta', 'formal', 'occasion', 'especial']},
      {label: 'Noches especiales', value: 'noche', aliases: ['noche', 'night', 'nocturno', 'evening']},
      {label: 'Vacaciones', value: 'vacaciones', aliases: ['vacaciones', 'verano', 'summer', 'playa', 'viaje']},
      {label: 'Todo momento', value: 'todo', aliases: [], neutral: true},
    ],
  },
  {
    id: 5,
    key: 'intensity',
    eyebrow: 'Intensidad',
    question: '¿Qué intensidad prefieres?',
    options: [
      {label: 'Ligera', value: 'ligera', aliases: ['ligera', 'ligero', 'suave', 'soft', 'light', 'eau de toilette', 'edt']},
      {label: 'Balanceada', value: 'balanceada', aliases: ['balanceada', 'equilibrada', 'moderada', 'medium', 'eau de parfum', 'edp']},
      {label: 'Intensa', value: 'intensa', aliases: ['intensa', 'intenso', 'strong', 'potente', 'extracto', 'extrait', 'parfum']},
      {label: 'Sorpréndeme', value: 'sorprendeme', aliases: [], neutral: true},
    ],
  },
];

const CATEGORY_WEIGHTS = {gender: 2, personality: 4, occasion: 3, intensity: 2};
const FIELD_GROUPS = {
  gender: ['sexo_objetivo', 'genero'],
  personality: ['familia_olfativa', 'familias_olfativas', 'fragancia'],
  occasion: ['ocasion', 'ocasion_y_temporadas', 'recomendaciones_de_uso', 'uso_dia', 'uso_noche', 'uso_otono', 'uso_verano', 'uso_primavera', 'uso_invierno'],
  intensity: ['intensidad', 'forma_del_producto'],
};

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function flattenJson(value, output = []) {
  if (value == null) return output;
  if (Array.isArray(value)) { value.forEach((entry) => flattenJson(entry, output)); return output; }
  if (typeof value === 'object') { Object.values(value).forEach((entry) => flattenJson(entry, output)); return output; }
  output.push(String(value)); return output;
}
function metafieldValueToText(metafield) {
  if (!metafield?.value) return '';
  const rawValue = String(metafield.value).trim();
  if (String(metafield.type || '').toLowerCase() === 'boolean') return rawValue === 'true' ? metafield.key.replaceAll('_', ' ') : '';
  if (rawValue.startsWith('[') || rawValue.startsWith('{')) { try { return flattenJson(JSON.parse(rawValue)).join(' '); } catch { return rawValue; } }
  return rawValue;
}
function getMetafieldMap(product) {
  return (product?.metafields || []).filter(Boolean).reduce((map, field) => { map[field.key] = metafieldValueToText(field); return map; }, {});
}
function createSearchText(values) {
  const normalized = values.flatMap((value) => (Array.isArray(value) ? value : [value])).filter(Boolean).map(normalizeText).filter(Boolean).join(' ');
  return normalized ? ` ${normalized} ` : '';
}
function containsAlias(searchText, aliases = []) {
  return Boolean(searchText) && aliases.some((alias) => { const normalizedAlias = normalizeText(alias); return normalizedAlias && searchText.includes(` ${normalizedAlias} `); });
}
function optionForSelection(key, value) {
  return FRAGRANCE_QUIZ_STEPS.find((item) => item.key === key)?.options.find((option) => option.value === value) || null;
}
function buildProductSearchGroups(product) {
  const metafields = getMetafieldMap(product);
  const fallback = [product?.tags || [], product?.title, product?.description, product?.productType, product?.vendor];
  return Object.fromEntries(Object.entries(FIELD_GROUPS).map(([key, fields]) => [key, {direct: createSearchText(fields.map((field) => metafields[field])), fallback: createSearchText(fallback)}]));
}
function isLikelyFragrance(product) {
  const metafields = getMetafieldMap(product);
  if ([metafields.familia_olfativa, metafields.familias_olfativas, metafields.fragancia, metafields.forma_del_producto, metafields.ocasion].filter(Boolean).length) return true;
  const catalogText = createSearchText([product?.productType, product?.tags, product?.title, product?.description]);
  return ['perfume', 'perfumeria', 'fragancia', 'fragrance', 'parfum', 'eau de parfum', 'eau de toilette', 'cologne', 'edp', 'edt'].some((term) => containsAlias(catalogText, [term]));
}
function scoreProduct(product, selections) {
  const groups = buildProductSearchGroups(product); const matchDetails = []; let earnedWeight = 0; let possibleWeight = 0;
  Object.entries(selections).forEach(([key, selectedValue]) => {
    const option = optionForSelection(key, selectedValue); if (!option || option.neutral) return;
    const weight = CATEGORY_WEIGHTS[key] || 1; possibleWeight += weight;
    const directMatch = containsAlias(groups[key]?.direct, option.aliases);
    const fallbackMatch = !directMatch && containsAlias(groups[key]?.fallback, option.aliases);
    if (directMatch || fallbackMatch) { earnedWeight += directMatch ? weight : weight * 0.72; matchDetails.push({key, label: option.label, strength: directMatch ? 'direct' : 'contextual'}); }
  });
  return {product, score: earnedWeight, percentage: possibleWeight ? Math.min(100, Math.round((earnedWeight / possibleWeight) * 100)) : 100, matchDetails, available: product?.availableForSale !== false, isFallback: false};
}
export function rankFragranceProducts(products = [], selections = {}, limit = 8) {
  const validProducts = products.filter((product) => product?.id && product?.handle && product?.title);
  const fragranceProducts = validProducts.filter(isLikelyFragrance); const candidates = fragranceProducts.length ? fragranceProducts : validProducts;
  const scored = candidates.map((product) => scoreProduct(product, selections)).sort((a, b) => { if (a.available !== b.available) return a.available ? -1 : 1; if (b.score !== a.score) return b.score - a.score; if (b.matchDetails.length !== a.matchDetails.length) return b.matchDetails.length - a.matchDetails.length; return a.product.title.localeCompare(b.product.title, 'es'); });
  const meaningfulMatches = scored.filter((item) => item.score > 0 && item.matchDetails.length > 0); const selected = meaningfulMatches.slice(0, limit); const selectedIds = new Set(selected.map((item) => item.product.id));
  if (selected.length < Math.min(4, limit)) selected.push(...scored.filter((item) => !selectedIds.has(item.product.id)).slice(0, limit - selected.length).map((item) => ({...item, percentage: 0, matchDetails: [], isFallback: true})));
  return {recommendations: selected.slice(0, limit), exactMatchCount: meaningfulMatches.length, usedFallback: selected.some((item) => item.isFallback), catalogSize: candidates.length};
}
export function getSelectionLabels(selections = {}) {
  return Object.entries(selections).map(([key, value]) => optionForSelection(key, value)?.label).filter(Boolean);
}
