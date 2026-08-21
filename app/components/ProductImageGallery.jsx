import {useEffect, useMemo, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import styles from './ProductImageGallery.module.css';

/**
 * Galería de producto con miniaturas, contador y sincronización con variante.
 */
export function ProductImageGallery({images = [], title, selectedImageId}) {
  const normalizedImages = useMemo(() => {
    const seen = new Set();
    return images.filter((image) => {
      if (!image?.id || seen.has(image.id)) return false;
      seen.add(image.id);
      return true;
    });
  }, [images]);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!selectedImageId) return;
    const nextIndex = normalizedImages.findIndex((image) => image.id === selectedImageId);
    if (nextIndex >= 0) setSelectedImage(nextIndex);
  }, [normalizedImages, selectedImageId]);

  if (!normalizedImages.length) {
    return (
      <div className={styles.emptyGallery}>
        <p>No hay imágenes disponibles</p>
      </div>
    );
  }

  const safeIndex = Math.min(selectedImage, normalizedImages.length - 1);
  const mainImage = normalizedImages[safeIndex];

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImage}>
        <Image
          alt={mainImage.altText || title}
          data={mainImage}
          sizes="(min-width: 980px) 52vw, 100vw"
          className={styles.image}
          loading="eager"
        />
        <span className={styles.counter} aria-live="polite">
          {safeIndex + 1}/{normalizedImages.length}
        </span>
      </div>

      {normalizedImages.length > 1 ? (
        <div className={styles.thumbnails} aria-label="Imágenes del producto">
          {normalizedImages.map((image, index) => (
            <button
              type="button"
              key={image.id}
              className={`${styles.thumbnail} ${safeIndex === index ? styles.active : ''}`}
              onClick={() => setSelectedImage(index)}
              aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length}`}
              aria-pressed={safeIndex === index}
            >
              <Image
                alt=""
                data={image}
                sizes="100px"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
