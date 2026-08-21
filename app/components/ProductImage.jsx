import { Image } from '@shopify/hydrogen';

/**
 * @param {{
 *   image: ProductVariantFragment['image'];
 *   className?: string;
 * }}
 */
export function ProductImage({ image, className = '' }) {
  if (!image) {
    return <div className={`product-image ${className}`} />;
  }
  return (
    <div className={`product-image ${className}`}>
      <Image
        alt={image.altText || 'Imagen del producto'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */
