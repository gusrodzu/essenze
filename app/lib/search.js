/**
 * Returns the empty state of a predictive search result.
 */
export function getEmptyPredictiveSearchResult() {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

/**
 * Appends Shopify tracking parameters and the search term to an internal URL.
 * URLSearchParams performs the encoding, so the term must be passed unencoded.
 * @param {UrlWithTrackingParams} options
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}) {
  const [pathname, existingSearch = ''] = String(baseUrl).split('?');
  const searchParams = new URLSearchParams(existingSearch);

  Object.entries(extraParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const normalizedTerm = String(term ?? '').trim();
  if (normalizedTerm) searchParams.set('q', normalizedTerm);

  if (trackingParams) {
    const tracking = new URLSearchParams(trackingParams);
    tracking.forEach((value, key) => searchParams.set(key, value));
  }

  const search = searchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * @typedef {{
 *   type: Type;
 *   term: string;
 *   error?: string;
 *   result: {total: number; items: Items};
 * }} ResultWithItems
 * @template {'predictive' | 'regular'} Type
 * @template Items
 */

/** @typedef {ResultWithItems<'regular', RegularSearchQuery>} RegularSearchReturn */
/** @typedef {ResultWithItems<'predictive', NonNullable<PredictiveSearchQuery['predictiveSearch']>>} PredictiveSearchReturn */

/**
 * @typedef {Object} UrlWithTrackingParams
 * @property {string} baseUrl
 * @property {string|null} [trackingParams]
 * @property {Record<string,string|number|boolean|null|undefined>} [params]
 * @property {string} [term]
 */

/** @typedef {import('storefrontapi.generated').PredictiveSearchQuery} PredictiveSearchQuery */
/** @typedef {import('storefrontapi.generated').RegularSearchQuery} RegularSearchQuery */
