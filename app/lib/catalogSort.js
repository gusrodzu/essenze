const PRODUCT_SORTS = {
  featured: {sortKey: 'BEST_SELLING', reverse: false},
  newest: {sortKey: 'CREATED_AT', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'title-asc': {sortKey: 'TITLE', reverse: false},
};

const COLLECTION_SORTS = {
  featured: {sortKey: 'BEST_SELLING', reverse: false},
  newest: {sortKey: 'CREATED', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'title-asc': {sortKey: 'TITLE', reverse: false},
};

export function getCatalogOptions(request, type = 'products') {
  const url = new URL(request.url);
  const requestedSort = url.searchParams.get('sort') || 'featured';
  const availableOnly = url.searchParams.get('available') === '1';
  const table = type === 'collection' ? COLLECTION_SORTS : PRODUCT_SORTS;
  const sort = table[requestedSort] ? requestedSort : 'featured';
  return {sort, availableOnly, ...table[sort]};
}
