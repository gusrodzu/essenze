/**
 * ProductCard genérica.
 * Conserva acciones de compra, pero utiliza la tarjeta visual estándar.
 */

import {useState} from 'react';
import UnifiedProductCard from './UnifiedProductCard';
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
}) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    await onAddToCart?.({id, name, price});
    setIsAdding(false);
  };

  const handleBuyNow = () => {
    onBuyNow?.({id, name, price});
  };

  const badges = [
    badge ? {label: badge, tone: 'gold'} : null,
    rating
      ? {
          label: `${rating.toFixed(1)} ★${reviewCount ? ` · ${reviewCount}` : ''}`,
          tone: 'neutral',
        }
      : null,
  ].filter(Boolean);

  return (
    <UnifiedProductCard
      actions={
        <>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isDisabled || isAdding}
            aria-label={`Agregar ${name} al carrito`}
          >
            {isAdding ? 'Agregando…' : 'Agregar al carrito'}
          </button>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={handleBuyNow}
            disabled={isDisabled}
            aria-label={`Comprar ${name} ahora`}
          >
            Comprar ahora
          </button>
        </>
      }
      available={!isDisabled}
      badges={badges}
      dataProductId={id}
      imageUrl={image}
      price={
        <>
          ${Number(price || 0).toFixed(2)}
          {originalPrice ? <del>${Number(originalPrice).toFixed(2)}</del> : null}
        </>
      }
      productType={description || category || 'Perfumería de autor'}
      title={name}
      vendor={category || 'Essenze'}
    />
  );
}
