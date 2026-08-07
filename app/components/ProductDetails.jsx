import { useState } from 'react';
import { Money, RichText } from '@shopify/hydrogen';
import styles from './ProductDetails.module.css';
import { QuantitySelector } from './QuantitySelector';

/**
 * ProductDetails
 * Información del producto con opciones, precio, descripción
 */
export function ProductDetails({
  product,
  selectedVariant,
  productOptions,
  children, // AddToCartButton
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className={styles.details}>
      {/* Título y Rating */}
      <div className={styles.header}>
        <h1 className={styles.title}>{product.title}</h1>
        {product.reviewsConnection?.edges?.length > 0 && (
          <div className={styles.rating}>
            <span className={styles.stars}>★★★★★</span>
            <span className={styles.reviewCount}>
              {product.reviewsConnection.edges.length} reseñas
            </span>
          </div>
        )}
      </div>

    

       {/* Descripción */}
      {product.description && (
        <div className={styles.description}>
          <RichText>{product.description}</RichText>
        </div>
      )}

      {/* Metafields / Información adicional */}
      {product.metafields && product.metafields.length > 0 && (
        <div className={styles.metadata}>
          {product.metafields.map((metafield, index) => (
            <div key={index} className={styles.metadataItem}>
              <h5 className={styles.metadataTitle}>{metafield.key}</h5>
              <p className={styles.metadataValue}>{metafield.value}</p>
            </div>
          ))}
        </div>
      )}

        {/* Precio */}
      {selectedVariant && (
        <div className={styles.priceSection}>
          <div className={styles.price}>
            <Money data={selectedVariant.price} />
          </div>
          <p className={styles.taxNote}>Impuesto incluido.</p>
        </div>
      )}

      {/* Opciones de variantes */}
      {productOptions && productOptions.length > 0 && (
        <div className={styles.optionsSection}>
          {productOptions.map((option) => {
            if (option.optionValues.length === 1) return null;

            return (
              <div key={option.name} className={styles.optionGroup}>
                <h4 className={styles.optionTitle}>{option.name}</h4>
                <div className={styles.optionValues}>
                  {option.optionValues.map((value) => (
                    <div key={value.name} className={styles.optionItem}>
                      {value.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selector de Cantidad */}
      <div className={styles.quantitySection}>
        <QuantitySelector value={quantity} onChange={setQuantity} />
      </div>

      {/* Botón Agregar al Carrito - con cantidad */}
      <div className={styles.addToCart}>
        {children && typeof children === 'function'
          ? children({quantity})
          : children}
      </div>

     
    </div>
  );
}
