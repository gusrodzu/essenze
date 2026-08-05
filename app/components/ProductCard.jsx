/**
 * ProductCard_DS.jsx
 * Componente de Tarjeta de Producto con Design System
 * - 3 variantes: default, compact, featured
 * - CSS Modules con Design System
 * - Premium hover effects
 * - Responsive
 */

import styles from '~/styles/ProductCard.module.css';

export default function ProductCard({
  product,
  isLoading,
  onClick,
  variant = 'default',
}) {
  // Estado de carga
  if (isLoading) {
    return (
      <div className={styles.cardSkeleton}>
        <div className={styles.imageSkeleton} />
        <div className={styles.contentSkeleton}>
          <div className={styles.lineSkeleton} style={{ width: '100%', height: '16px' }} />
          <div className={styles.lineSkeleton} style={{ width: '80%', height: '12px' }} />
          <div className={styles.lineSkeleton} style={{ width: '60%', height: '16px' }} />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const {
    id,
    title,
    handle,
    featuredImage,
    priceRange,
    tags = [],
    vendor = 'Essenze',
    availableForSale = true,
  } = product;

  const price = priceRange?.minVariantPrice?.amount || 0;
  const compareAtPrice = priceRange?.maxVariantPrice?.amount;
  const onSale = compareAtPrice && compareAtPrice > price;

  const isNew = tags.includes('new');
  const isBestseller = tags.includes('bestseller');
  const isLimited = tags.includes('limited');

  const imageUrl = featuredImage?.url || null;

  const handleClick = () => {
    if (onClick) onClick(product);
  };

  // COMPACT VARIANT
  if (variant === 'compact') {
    return (
      <div className={styles.cardCompact} onClick={handleClick}>
        <div className={styles.imageWrapper}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder}>No Image</div>
          )}
          <div className={styles.badgesTop}>
            {isNew && <span className={styles.badge}>New</span>}
            {!availableForSale && <span className={styles.badgeSoldOut}>Sold Out</span>}
            {onSale && <span className={styles.badgeSale}>Sale</span>}
          </div>
        </div>

        <div className={styles.contentCompact}>
          <p className={styles.vendor}>{vendor}</p>
          <h4 className={styles.titleCompact}>{title}</h4>
          <p className={styles.priceCompact}>
            ${parseFloat(price).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }

  // FEATURED VARIANT
  if (variant === 'featured') {
    return (
      <div className={styles.cardFeatured} onClick={handleClick}>
        <div className={styles.imageFeatured}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className={styles.imageFeaturedImg} />
          ) : (
            <div className={styles.imagePlaceholder}>No Image</div>
          )}

          {!availableForSale && (
            <div className={styles.badgeCorner}>
              <span className={styles.badgeSoldOut}>Sold Out</span>
            </div>
          )}

          <div className={styles.overlayFeatured}>
            <div className={styles.badgesList}>
              {isBestseller && <span className={styles.badge}>Bestseller</span>}
              {isLimited && <span className={styles.badgeWarning}>Limited</span>}
              {isNew && <span className={styles.badgeNew}>New</span>}
            </div>
          </div>
        </div>

        <div className={styles.contentFeatured}>
          <div>
            <p className={styles.vendor}>{vendor}</p>
            <h3 className={styles.titleFeatured}>{title}</h3>
          </div>

          <p className={styles.description}>
            Luxury fragrance crafted for distinction
          </p>

          <div className={styles.priceGroup}>
            <span className={styles.priceFeatured}>
              ${parseFloat(price).toFixed(2)}
            </span>
            {onSale && (
              <span className={styles.comparePrice}>
                ${parseFloat(compareAtPrice).toFixed(2)}
              </span>
            )}
          </div>

          <div className={styles.buttonsFeatured}>
            <button 
              className={styles.buttonPrimary}
              disabled={!availableForSale}
            >
              {availableForSale ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button className={styles.buttonSecondary} title="Add to Wishlist">
              ♡
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VARIANT
  return (
    <div className={styles.cardDefault} onClick={handleClick}>
      <div className={styles.imageWrapperDefault}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className={styles.imageDefault} />
        ) : (
          <div className={styles.imagePlaceholder}>No Image</div>
        )}

        <div className={styles.badgesTop}>
          {isNew && <span className={styles.badgeNew}>New</span>}
          {onSale && <span className={styles.badgeSale}>Sale</span>}
          {!availableForSale && <span className={styles.badgeSoldOut}>Sold Out</span>}
        </div>

        <div className={styles.overlayDefault}>
          <button 
            className={styles.buttonAdd}
            disabled={!availableForSale}
            onClick={(e) => e.stopPropagation()}
          >
            {availableForSale ? 'Add' : 'Out'}
          </button>
          <button 
            className={styles.buttonWishlist}
            onClick={(e) => e.stopPropagation()}
            title="Wishlist"
          >
            ♡
          </button>
        </div>
      </div>

      <div className={styles.contentDefault}>
        <p className={styles.vendor}>{vendor}</p>
        <h4 className={styles.titleDefault}>{title}</h4>

        <div className={styles.priceRow}>
          <span className={styles.priceDefault}>
            ${parseFloat(price).toFixed(2)}
          </span>
          {onSale && (
            <span className={styles.comparePrice}>
              ${parseFloat(compareAtPrice).toFixed(2)}
            </span>
          )}
        </div>

        <div className={styles.rating}>
          <span>⭐ 4.8</span>
          {isBestseller && <span className={styles.badgeBest}>⭐ Best</span>}
        </div>
      </div>
    </div>
  );
}