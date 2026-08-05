/**
 * ProductImage_DS.jsx
 * Componente de Imagen de Producto con Design System
 * - Imagen responsiva
 * - Premium effects
 * - CSS Modules
 */

import {Image} from '@shopify/hydrogen';
import styles from '~/styles/ProductImage.module.css';

export function ProductImage({image}) {
  if (!image) {
    return <div className={styles.productImageEmpty} />;
  }

  return (
    <div className={styles.productImage}>
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
        className={styles.image}
      />
      <div className={styles.overlay} />
    </div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */