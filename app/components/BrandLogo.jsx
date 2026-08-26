import styles from './BrandLogo.module.css';

const SOURCES = {
  wordmark: {
    dark: '/brand/essenze-wordmark-black.png',
    light: '/brand/essenze-wordmark-white.png',
  },
  mark: {
    dark: '/brand/essenze-mark-black.png',
    light: '/brand/essenze-mark-white.png',
  },
};

/**
 * Logotipo oficial de Essenze.
 *
 * @param {{
 *   variant?: 'wordmark' | 'mark';
 *   tone?: 'dark' | 'light';
 *   alt?: string;
 *   decorative?: boolean;
 *   className?: string;
 *   eager?: boolean;
 * }} props
 */
export function BrandLogo({
  variant = 'wordmark',
  tone = 'dark',
  alt = 'Essenze',
  decorative = false,
  className = '',
  eager = false,
}) {
  const safeVariant = SOURCES[variant] ? variant : 'wordmark';
  const safeTone = SOURCES[safeVariant][tone] ? tone : 'dark';
  const src = SOURCES[safeVariant][safeTone];
  const classes = [styles.root, styles[safeVariant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden={decorative || undefined}>
      <img
        src={src}
        alt={decorative ? '' : alt}
        width={safeVariant === 'wordmark' ? 1600 : 429}
        height={safeVariant === 'wordmark' ? 241 : 640}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </span>
  );
}
