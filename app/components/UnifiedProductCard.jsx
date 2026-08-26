import {useState} from 'react';
import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import AvailabilityBadge from './AvailabilityBadge';
import styles from './UnifiedProductCard.module.css';

function normalizeBadge(badge, index) {
  if (typeof badge === 'string') {
    return {label: badge, tone: 'neutral', key: `${badge}-${index}`};
  }

  return {
    label: badge?.label,
    tone: badge?.tone || 'neutral',
    key: badge?.key || `${badge?.label || 'badge'}-${index}`,
  };
}

/**
 * Tarjeta única para cualquier producto dentro de Essenze.
 * Mantiene la misma estructura en catálogo, destacados, búsqueda,
 * recomendaciones y productos complementarios.
 */
export function UnifiedProductCard({
  to,
  title,
  vendor,
  productType = 'Perfumería de autor',
  image,
  imageUrl,
  imageAlt,
  price,
  pricePrefix,
  available = true,
  loading = 'lazy',
  sizes = '(min-width: 1200px) 23vw, (min-width: 760px) 31vw, 48vw',
  badges = [],
  topBadge,
  ctaLabel = 'Ver fragancia',
  actionLabel,
  actionIcon = '＋',
  actionActive = false,
  actionDisabled = false,
  actionAriaLabel,
  onAction,
  onCompare,
  compareAriaLabel,
  actions,
  className = '',
  placeholderLabel = 'ESSENZE',
  dataProductId,
}) {
  const [compareState, setCompareState] = useState('idle');
  const normalizedBadges = badges
    .map(normalizeBadge)
    .filter((badge) => Boolean(badge.label));

  const media = image?.url || imageUrl;
  const body = (
    <>
      <div className={styles.media}>
        {topBadge?.label ? (
          <span
            className={`${styles.topBadge} ${
              styles[`topBadge${topBadge.tone || 'success'}`] || ''
            }`}
          >
            {topBadge.label}
          </span>
        ) : null}

        {image?.url ? (
          <Image
            alt={imageAlt || image.altText || title}
            className={styles.image}
            data={image}
            loading={loading}
            sizes={sizes}
          />
        ) : media ? (
          <img
            alt={imageAlt || title}
            className={styles.image}
            loading={loading}
            src={media}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            {placeholderLabel}
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.kickerRow}>
          <p className={styles.vendor}>{vendor || 'Essenze'}</p>
          <AvailabilityBadge available={available} compact />
        </div>

        <h3 className={styles.title}>{title}</h3>

        <div className={styles.details}>
          {normalizedBadges.length > 0 ? (
            <div
              className={styles.badges}
              aria-label="Características del producto"
            >
              {normalizedBadges.slice(0, 3).map((badge) => (
                <span
                  className={`${styles.badge} ${
                    styles[`badge${badge.tone}`] || ''
                  }`}
                  key={badge.key}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.productType}>{productType}</p>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.price}>
            {pricePrefix ? (
              <span className={styles.pricePrefix}>{pricePrefix}</span>
            ) : null}
            {price || 'Consultar precio'}
          </p>
          {to ? <span className={styles.cta}>{ctaLabel}</span> : null}
        </div>
      </div>
    </>
  );

  return (
    <article
      className={`${styles.card} ${className}`.trim()}
      data-product-id={dataProductId}
      data-motion-reveal
      data-motion-surface
    >
      {to ? (
        <Link
          aria-label={`Ver producto: ${title}`}
          className={styles.link}
          prefetch="intent"
          to={to}
        >
          {body}
        </Link>
      ) : (
        <div className={styles.link}>{body}</div>
      )}

      {actions ? <div className={styles.actions}>{actions}</div> : null}

      {onAction && actionLabel ? (
        <div className={styles.actions}>
          <button
            aria-label={actionAriaLabel || actionLabel}
            className={`${styles.actionButton} ${
              actionActive ? styles.actionButtonActive : ''
            }`}
            disabled={actionDisabled}
            onClick={onAction}
            type="button"
          >
            <span aria-hidden="true">{actionIcon}</span>
            {actionLabel}
          </button>
        </div>
      ) : null}

      {onCompare ? (
        <div className={styles.actions}>
          <button
            aria-label={compareAriaLabel || `Agregar ${title} al comparador`}
            className={`${styles.actionButton} ${
              compareState === 'added' ? styles.actionButtonActive : ''
            }`}
            onClick={() => {
              onCompare();
              setCompareState('added');
              window.setTimeout(() => setCompareState('idle'), 1600);
            }}
            type="button"
          >
            <span aria-hidden="true">
              {compareState === 'added' ? '✓' : '＋'}
            </span>
            {compareState === 'added' ? 'Agregada' : 'Comparar'}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default UnifiedProductCard;
