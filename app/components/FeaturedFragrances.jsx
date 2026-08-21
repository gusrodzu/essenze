/**
 * Carrusel de productos destacados.
 * Todas las cards utilizan el mismo componente visual que catálogo,
 * búsqueda, recomendaciones y productos complementarios.
 */

import {useRef} from 'react';
import UnifiedProductCard from './UnifiedProductCard';
import estilos from './FeaturedFragrances.module.css';

export default function FeaturedFragrances({
  products = [],
  title = 'Productos Destacados',
  subtitle = 'Descubre nuestros artículos seleccionados especialmente para ti',
  onCompare,
}) {
  const carouselRef = useRef(null);

  const getPrice = (product) => {
    const money = product?.priceRange?.minVariantPrice;
    if (!money?.amount) return 'Consultar precio';

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: money.currencyCode || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(money.amount));
  };

  const getDiscountBadge = (product) => {
    const price = Number(
      product?.selectedOrFirstAvailableVariant?.price?.amount || 0,
    );
    const compareAtPrice = Number(
      product?.selectedOrFirstAvailableVariant?.compareAtPrice?.amount || 0,
    );

    if (!price || !compareAtPrice || compareAtPrice <= price) return [];

    const discount = Math.round(
      ((compareAtPrice - price) / compareAtPrice) * 100,
    );
    return [{label: `${discount}% menos`, tone: 'gold'}];
  };

  const scrollCarousel = (direction) => {
    const track = carouselRef.current;
    if (!track) return;

    const firstCard = track.firstElementChild;
    const cardWidth = firstCard?.getBoundingClientRect().width || 330;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 16;

    track.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) : cardWidth + gap,
      behavior: 'smooth',
    });
  };

  if (!products.length) return null;

  return (
    <section id="fragancias-destacadas" className={estilos.section} data-motion-reveal>
      <div className={estilos.container}>
        <div className={estilos.header}>
          <div>
            <h2 className={estilos.title}>{title}</h2>
            <p className={estilos.subtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={estilos.carouselContainer}>
          <button
            className={`${estilos.carouselArrow} ${estilos.left}`}
            type="button"
            onClick={() => scrollCarousel('left')}
            aria-label="Productos anteriores"
            title="Anterior"
          >
            ←
          </button>

          <div
            className={estilos.track}
            ref={carouselRef}
            role="region"
            aria-label="Carrusel de productos destacados"
          >
            {products.map((product) => (
              <UnifiedProductCard
                available={product.availableForSale !== false}
                badges={getDiscountBadge(product)}
                className={estilos.featuredCard}
                dataProductId={product.id}
                image={product.featuredImage}
                key={product.id}
                loading="lazy"
                onCompare={onCompare ? () => onCompare(product) : undefined}
                price={getPrice(product)}
                productType={product.productType || 'Perfumería de autor'}
                title={product.title}
                to={`/products/${product.handle}`}
                vendor={product.vendor}
              />
            ))}
          </div>

          <button
            className={`${estilos.carouselArrow} ${estilos.right}`}
            type="button"
            onClick={() => scrollCarousel('right')}
            aria-label="Productos siguientes"
            title="Siguiente"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
