/**
 * ProductCard.jsx - Essenze Product Card
 * Ejemplo de componente escalable con CSS Module
 * ✅ Reutilizable en colecciones y búsqueda
 * ✅ Variantes de layout
 * ✅ Accesibilidad
 */

import { useState } from 'react';
import styles from './ProductCard.module.css';

export default function ProductCard({
  id,
  image,
  category,
  name,
  description,
  price,
  originalPrice,
  rating,
  reviewCount,
  badge,
  isDisabled = false,
  onAddToCart,
  onBuyNow,
  variant = 'default',
}) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    await onAddToCart?.({ id, name, price });
    setIsAdding(false);
  };

  const handleBuyNow = () => {
    onBuyNow?.({ id, name, price });
  };

  const cardClass = `${styles.card} ${
    isDisabled ? styles.cardDisabled : ''
  }`;

  return (
    <article className={cardClass} data-product-id={id}>
      {/* Image Section */}
      <div className={styles.imageWrapper}>
        <img
          src={image}
          alt={name}
          className={styles.image}
          loading="lazy"
        />
        {badge && (
          <span className={styles.badge} aria-label={badge}>
            {badge}
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Product Info */}
        <div className={styles.info}>
          {category && (
            <p className={styles.category}>{category}</p>
          )}

          <h3 className={styles.name}>{name}</h3>

          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>

        {/* Price & Rating */}
        <div>
          <div className={styles.priceWrapper}>
            <span className={styles.price}>
              ${price.toFixed(2)}
            </span>
            {originalPrice && (
              <span className={styles.originalPrice}>
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {rating && (
            <div className={styles.rating}>
              <span className={styles.stars}>
                {'★'.repeat(Math.floor(rating))}
                {'☆'.repeat(5 - Math.floor(rating))}
              </span>
              {reviewCount && (
                <span>({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.buttonPrimary} ${
              isDisabled ? styles.buttonDisabled : ''
            }`}
            onClick={handleAddToCart}
            disabled={isDisabled || isAdding}
            aria-label={`Agregar ${name} al carrito`}
          >
            {isAdding ? 'Agregando...' : 'Agregar al carrito'}
          </button>

          <button
            className={`${styles.buttonSecondary} ${
              isDisabled ? styles.buttonDisabled : ''
            }`}
            onClick={handleBuyNow}
            disabled={isDisabled}
            aria-label={`Comprar ${name} ahora`}
          >
            Comprar ahora
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * PROPS:
 * 
 * @param {string} id - ID único del producto
 * @param {string} image - URL de imagen del producto
 * @param {string} category - Categoría (ej: "Fragancias de lujo")
 * @param {string} name - Nombre del producto
 * @param {string} description - Descripción corta
 * @param {number} price - Precio actual
 * @param {number} originalPrice - Precio original (opcional, para descuentos)
 * @param {number} rating - Rating 1-5 (opcional)
 * @param {number} reviewCount - Número de reviews (opcional)
 * @param {string} badge - Badge de descuento/oferta (ej: "OFF 20%")
 * @param {boolean} isDisabled - Deshabilitar tarjeta
 * @param {function} onAddToCart - Callback al agregar carrito
 * @param {function} onBuyNow - Callback compra rápida
 * @param {string} variant - Variante de diseño (default, small, large, compact)
 * 
 * ============================================
 * EJEMPLOS DE USO:
 * ============================================
 * 
 * <!-- Producto básico -->
 * <ProductCard
 *   id="essenze-001"
 *   image="https://cdn.shopify.com/..."
 *   name="Essenze - Eau de Parfum"
 *   price={199.99}
 *   onAddToCart={(product) => addToCart(product)}
 *   onBuyNow={(product) => buyNow(product)}
 * />
 * 
 * <!-- Producto con descuento -->
 * <ProductCard
 *   id="essenze-002"
 *   image="https://cdn.shopify.com/..."
 *   category="Fragancias de Lujo"
 *   name="Essenze Signature Collection"
 *   description="Fragancia exclusiva con notas florales"
 *   price={299.99}
 *   originalPrice={399.99}
 *   rating={4.8}
 *   reviewCount={124}
 *   badge="OFF 25%"
 *   onAddToCart={(product) => addToCart(product)}
 *   onBuyNow={(product) => buyNow(product)}
 * />
 * 
 * <!-- Producto sin stock -->
 * <ProductCard
 *   id="essenze-003"
 *   image="https://cdn.shopify.com/..."
 *   name="Essenze Limited Edition"
 *   price={499.99}
 *   badge="AGOTADO"
 *   isDisabled={true}
 * />
 */