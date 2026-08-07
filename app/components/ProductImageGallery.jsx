import { Image } from '@shopify/hydrogen';
import styles from './ProductImageGallery.module.css';

/**
 * ProductImageGallery
 * Galería de imágenes con imagen principal y thumbnails
 */
export function ProductImageGallery({ images, title }) {
  const [selectedImage, setSelectedImage] = React.useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={styles.emptyGallery}>
        <p>No hay imágenes disponibles</p>
      </div>
    );
  }

  const mainImage = images[selectedImage];

  return (
    <div className={styles.gallery}>
      {/* Imagen Principal */}
      <div className={styles.mainImage}>
        {mainImage && (
          <Image
            alt={mainImage.altText || title}
            data={mainImage}
            sizes="(min-width: 768px) 50vw, 100vw"
            className={styles.image}
          />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className={styles.thumbnails}>
          {images.map((image, index) => (
            <button
              key={index}
              className={`${styles.thumbnail} ${selectedImage === index ? styles.active : ''}`}
              onClick={() => setSelectedImage(index)}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <Image
                alt={image.altText || `${title} - imagen ${index + 1}`}
                data={image}
                sizes="100px"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
