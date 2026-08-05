/**
 * ProductItem_ESSENZE_FINAL_DS.jsx
 * 
 * Componente ProductItem Personalizado para Essenze
 * - Adaptado a estructura de metadatos REAL de Shopify
 * - Muestra: Género, Intensidad, Ocasión, Temporadas
 * - Premium styling con Design System
 * - Fully responsive
 * - Fully accessible
 */

import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import styles from '~/styles/ProductItem.module.css';

const PRODUCT_WITH_METADATA_QUERY = `
  query GetProductMetadata($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      metafields(identifiers: [
        { namespace: "custom", key: "familias_olfativas" }
        { namespace: "custom", key: "genero" }
        { namespace: "custom", key: "intensidad" }
        { namespace: "custom", key: "notas_base" }
        { namespace: "custom", key: "ocasion_y_temporadas" }
        { namespace: "custom", key: "recomendaciones_de_uso" }
        { namespace: "custom", key: "uso_dia" }
        { namespace: "custom", key: "uso_noche" }
        { namespace: "custom", key: "uso_primavera" }
        { namespace: "custom", key: "uso_verano" }
        { namespace: "custom", key: "uso_otono" }
        { namespace: "custom", key: "uso_invierno" }
        { namespace: "custom", key: "envio_gratis" }
      ]) {
        namespace
        key
        value
        type
      }
    }
  }
`;

/**
 * @param {{
 *   product:
 *     | CollectionItemFragment
 *     | ProductItemFragment
 *     | RecommendedProductFragment;
 *   loading?: 'eager' | 'lazy';
 *   showMetadata?: boolean;
 * }}
 */
export function ProductItem({product, loading, showMetadata = true}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;

  // Extraer metadatos de la estructura de Shopify
  const metafields = product.metafields || [];
  
  const getMetafieldValue = (key) => {
    const field = metafields.find(
      m => m?.namespace === 'custom' && m?.key === key
    );
    return field?.value || null;
  };

  // Metadatos principales
  const genero = getMetafieldValue('genero');
  const intensidad = getMetafieldValue('intensidad');
  const ocasion = getMetafieldValue('ocasion_y_temporadas');
  const familias = getMetafieldValue('familias_olfativas');
  const usoDia = getMetafieldValue('uso_dia') === 'true';
  const usoNoche = getMetafieldValue('uso_noche') === 'true';
  const usoPrimavera = getMetafieldValue('uso_primavera') === 'true';
  const usoVerano = getMetafieldValue('uso_verano') === 'true';
  const usoOtono = getMetafieldValue('uso_otono') === 'true';
  const usoInvierno = getMetafieldValue('uso_invierno') === 'true';
  const envioGratis = getMetafieldValue('envio_gratis') === 'true';

  // Parsear JSON arrays
  const parseJsonArray = (value) => {
    if (!value) return [];
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const ocasiones = parseJsonArray(ocasion);
  const temporadas = [];
  if (usoPrimavera) temporadas.push('Primavera');
  if (usoVerano) temporadas.push('Verano');
  if (usoOtono) temporadas.push('Otoño');
  if (usoInvierno) temporadas.push('Invierno');

  // Función para mapear intensidad a visual
  const getIntensidadLevel = (intensidad) => {
    const levels = {
      'Suave': 1,
      'Moderado-Suave': 2,
      'Moderado': 3,
      'Media': 3,
      'Moderado-Fuerte': 4,
      'Fuerte': 5,
    };
    return levels[intensidad] || 0;
  };

  const intensidadLevel = getIntensidadLevel(intensidad);

  // Función para obtener emoji según género
  const getGeneroEmoji = (genero) => {
    if (!genero) return null;
    const emojiMap = {
      'Masculino': '♂',
      'Femenino': '♀',
      'Unisex': '⚤',
    };
    return emojiMap[genero] || null;
  };

  // Función para obtener emoji de temporada
  const getSeasonEmoji = (season) => {
    const emojiMap = {
      'Primavera': '🌸',
      'Verano': '☀️',
      'Otoño': '🍂',
      'Invierno': '❄️',
    };
    return emojiMap[season] || '';
  };

  const generoEmoji = getGeneroEmoji(genero);

  return (
    <Link
      className={styles.card}
      key={product.id}
      prefetch="intent"
      to={variantUrl}
      aria-label={`${product.title} - ${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}`}
    >
      {/* Image Wrapper */}
      <div className={styles.imageWrapper}>
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
            className={styles.image}
          />
        )}
        {/* Overlay */}
        <div className={styles.overlay} />
        
        {/* Hover Badge */}
        <div className={styles.hoverBadge}>
          Ver Detalles
        </div>

        {/* Metadata Badges */}
        {showMetadata && (
          <div className={styles.metadataBadges}>
            {generoEmoji && (
              <span className={styles.genderBadge} title={`Género: ${genero}`}>
                {generoEmoji}
              </span>
            )}
            {familias && (
              <span className={styles.metadataBadge} title={familias}>
                💎
              </span>
            )}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={styles.content}>
        <h3 className={styles.title}>{product.title}</h3>
        
        {/* Metadatos Info */}
        {showMetadata && (
          <div className={styles.metadataSection}>
            {/* Ocasión + Género */}
            {(ocasiones.length > 0 || genero) && (
              <div className={styles.metadataRow}>
                {ocasiones.map((occ) => (
                  <span key={occ} className={styles.metadataTag}>
                    {occ}
                  </span>
                ))}
                {genero && (
                  <span className={styles.metadataTag}>
                    {genero}
                  </span>
                )}
              </div>
            )}

            {/* Temporadas */}
            {temporadas.length > 0 && (
              <div className={styles.seasonRow}>
                {temporadas.map((season) => (
                  <span key={season} className={styles.seasonBadge}>
                    {getSeasonEmoji(season)} {season}
                  </span>
                ))}
              </div>
            )}

            {/* Intensidad Bar */}
            {intensidad && (
              <div className={styles.intensityBar}>
                <span className={styles.intensityLabel}>{intensidad}</span>
                <div className={styles.intensityLevel}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`${styles.intensityDot} ${
                        level <= intensidadLevel ? styles.filled : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Envío Gratis Badge */}
            {envioGratis && (
              <div className={styles.freeShippingBadge}>
                ✓ Envío Gratis
              </div>
            )}
          </div>
        )}
        
        <div className={styles.priceWrapper}>
          <span className={styles.price}>
            <Money data={product.priceRange.minVariantPrice} />
          </span>
          
          {product.priceRange.maxVariantPrice.amount !== product.priceRange.minVariantPrice.amount && (
            <span className={styles.maxPrice}>
              <Money data={product.priceRange.maxVariantPrice} />
            </span>
          )}
        </div>
      </div>

      {/* Hover Effect Border */}
      <div className={styles.hoverBorder} />
    </Link>
  );
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductFragment} RecommendedProductFragment */