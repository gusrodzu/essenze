/**
 * AddToCartButton_DS.jsx
 * Botón "Add to Cart" con Design System Essenze
 * - Premium styling
 * - Loading state con spinner
 * - Disabled state
 * - Hover effects
 * - CSS Modules
 */

import {CartForm} from '@shopify/hydrogen';
import styles from '~/styles/AddToCartButton.module.css';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  variant = 'primary', // 'primary', 'secondary', 'outline'
  size = 'md', // 'sm', 'md', 'lg'
  fullWidth = false,
  className = '',
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => {
        const isLoading = fetcher.state !== 'idle';
        const isDisabled = disabled ?? isLoading;

        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            
            <button
              className={`
                ${styles.button}
                ${styles[variant]}
                ${styles[size]}
                ${fullWidth ? styles.fullWidth : ''}
                ${isLoading ? styles.loading : ''}
                ${isDisabled ? styles.disabled : ''}
                ${className}
              `}
              type="submit"
              onClick={onClick}
              disabled={isDisabled}
              aria-busy={isLoading}
              aria-label={isLoading ? 'Adding to cart...' : 'Add to cart'}
            >
              {/* Spinner Loading */}
              {isLoading && (
                <span className={styles.spinner}>
                  <span className={styles.spinnerDot} />
                </span>
              )}

              {/* Button Text */}
              <span className={styles.text}>
                {isLoading ? 'Adding...' : children}
              </span>

              {/* Check Icon on Success (opcional) */}
              {!isLoading && (
                <span className={styles.icon} aria-hidden="true">
                  →
                </span>
              )}
            </button>
          </>
        );
      }}
    </CartForm>
  );
}

/**
 * USAGE EXAMPLES:
 * 
 * // Primary button (default)
 * <AddToCartButton
 *   lines={[{ merchandiseId: id, quantity: 1 }]}
 * >
 *   Add to Cart
 * </AddToCartButton>
 * 
 * // Secondary variant
 * <AddToCartButton
 *   lines={lines}
 *   variant="secondary"
 * >
 *   Add to Bag
 * </AddToCartButton>
 * 
 * // Outline variant
 * <AddToCartButton
 *   lines={lines}
 *   variant="outline"
 * >
 *   Add to Wishlist
 * </AddToCartButton>
 * 
 * // Large full width
 * <AddToCartButton
 *   lines={lines}
 *   size="lg"
 *   fullWidth
 * >
 *   Add to Cart
 * </AddToCartButton>
 * 
 * // Disabled
 * <AddToCartButton
 *   lines={[]}
 *   disabled={true}
 * >
 *   Out of Stock
 * </AddToCartButton>
 * 
 * // With custom class
 * <AddToCartButton
 *   lines={lines}
 *   className="custom-class"
 *   onClick={() => console.log('Added!')}
 * >
 *   Buy Now
 * </AddToCartButton>
 */

/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */