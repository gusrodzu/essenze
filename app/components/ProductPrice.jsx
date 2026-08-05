/**
 * ProductPrice_DS.jsx
 * Componente de Precio de Producto con Design System
 * - Precio y compareAtPrice
 * - Premium styling
 * - CSS Modules
 */

import {Money} from '@shopify/hydrogen';
import styles from '~/styles/ProductPrice.module.css';

export function ProductPrice({price, compareAtPrice}) {
  return (
    <div 
      aria-label="Price" 
      className={styles.priceContainer} 
      role="group"
    >
      {compareAtPrice ? (
        <div className={styles.priceOnSale}>
          <span className={styles.currentPrice}>
            {price ? <Money data={price} /> : null}
          </span>
          <span className={styles.comparePriceText}>
            <Money data={compareAtPrice} />
          </span>
          <span className={styles.saleBadge}>Sale</span>
        </div>
      ) : price ? (
        <span className={styles.regularPrice}>
          <Money data={price} />
        </span>
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').MoneyV2} MoneyV2 */