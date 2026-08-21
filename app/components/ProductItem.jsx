import {Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import UnifiedProductCard from './UnifiedProductCard';

/**
 * Product card reutilizable para colecciones, marcas y catálogo.
 * Utiliza la tarjeta estándar de Essenze para mantener el mismo diseño.
 */
export function ProductItem({product, loading}) {
  const variantUrl = useVariantUrl(product.handle);
  const minPrice = product.priceRange?.minVariantPrice;
  const maxPrice = product.priceRange?.maxVariantPrice;
  const hasRange =
    minPrice && maxPrice && Number(maxPrice.amount) > Number(minPrice.amount);
  const isUnavailable = product.availableForSale === false;

  return (
    <UnifiedProductCard
      available={!isUnavailable}
      dataProductId={product.id}
      image={product.featuredImage}
      loading={loading}
      onCompare={() => queueProductForComparison(product.id)}
      price={minPrice ? <Money data={minPrice} /> : 'Consultar precio'}
      pricePrefix={hasRange ? 'Desde' : undefined}
      productType={product.productType || 'Perfumería de autor'}
      title={product.title}
      to={variantUrl}
      vendor={product.vendor}
    />
  );
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').MoneyProductItemFragment} MoneyProductItem */
