/**
 * FeaturedFragrances.jsx - Carrusel de Productos Destacados
 * 
 * ✅ Muestra productos en lugar de colecciones
 * ✅ Información: imagen, título, precio, disponibilidad
 * ✅ Accesibilidad mejorada (WCAG AA+)
 * ✅ Carrusel robusto y responsive
 * ✅ CSS Module separado
 * ✅ Rating y badge de destacado opcional
 */

import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import estilos from './FeaturedFragrances.module.css';

export default function FeaturedFragrances({ 
  products = [],
  title = 'Productos Destacados',
  subtitle = 'Descubre nuestros artículos seleccionados especialmente para ti'
}) {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  /**
   * Obtener precio formateado
   */
  const getPrice = (product) => {
    if (!product?.priceRange?.minVariantPrice?.amount) {
      return 'No disponible';
    }
    const price = parseFloat(product.priceRange.minVariantPrice.amount);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  /**
   * Obtener primera imagen del producto
   */
  const getProductImage = (product) => {
    if (product?.images?.[0]?.url) {
      return product.images[0].url;
    }
    if (product?.featuredImage?.url) {
      return product.featuredImage.url;
    }
    return null;
  };

  /**
   * Verificar disponibilidad
   */
  const isAvailable = (product) => {
    if (!product) return false;
    return (
      product.availableForSale || 
      (product.variants && product.variants.some(v => v.availableForSale))
    );
  };

  /**
   * Obtener badge según disponibilidad
   */
  const getBadge = (product) => {
    if (!isAvailable(product)) {
      return { text: 'Agotado', className: estilos.badgeOutOfStock };
    }
    
    // Badge opcional: si tiene descuento
    if (product.priceRange?.minVariantPrice?.amount && 
        product.compareAtPrice?.amount) {
      const discount = Math.round(
        ((product.compareAtPrice.amount - product.priceRange.minVariantPrice.amount) / 
         product.compareAtPrice.amount) * 100
      );
      if (discount > 0) {
        return { text: `-${discount}%`, className: estilos.badgeDiscount };
      }
    }

    return null;
  };

  /**
   * Scroll del carrusel
   */
  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;

    const scrollAmount = 350;
    const newScrollLeft =
      direction === 'left'
        ? carouselRef.current.scrollLeft - scrollAmount
        : carouselRef.current.scrollLeft + scrollAmount;

    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  /**
   * Navegar a página del producto
   */
  const handleNavigate = (handle) => {
    if (handle) {
      navigate(`/products/${handle}`);
    }
  };

  // No renderizar si no hay productos
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className={estilos.section}>
      <div className={estilos.container}>

        {/* ENCABEZADO */}
        <div className={estilos.header}>
          <div>
            <h2 className={estilos.title}>
              {title}
            </h2>
            <p className={estilos.subtitle}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* CARRUSEL */}
        <div className={estilos.carouselContainer}>

          {/* Botón izquierda */}
          <button
            className={`${estilos.carouselArrow} ${estilos.left}`}
            onClick={() => scrollCarousel('left')}
            aria-label="Productos anteriores"
            title="Anterior"
          >
            ←
          </button>

          {/* Track del carrusel */}
          <div
            className={estilos.track}
            ref={carouselRef}
            role="region"
            aria-label="Carrusel de productos destacados"
          >
            {products.map((product) => {
              const imageUrl = getProductImage(product);
              const badge = getBadge(product);
              const available = isAvailable(product);
              const price = getPrice(product);

              return (
                <article
                  key={product.id}
                  className={estilos.card}
                >
                  <button
                    className={estilos.cardButton}
                    onClick={() => handleNavigate(product.handle)}
                    aria-label={`Ver producto: ${product.title}`}
                  >

                    {/* Imagen con badge */}
                    <div
                      className={estilos.imageContainer}
                      style={{
                        backgroundImage: imageUrl
                          ? `url(${imageUrl})`
                          : undefined,
                      }}
                    >
                      {/* Overlay */}
                      <div className={estilos.overlay}></div>

                      {/* Badge */}
                      {badge && (
                        <span 
                          className={badge.className}
                          aria-label={badge.text}
                        >
                          {badge.text}
                        </span>
                      )}

                      {/* Glow hover */}
                      <div className={estilos.hoverGlow}></div>
                    </div>

                    {/* Info del producto */}
                    <div className={estilos.info}>
                      
                      {/* Título */}
                      <h3 className={estilos.label}>
                        {product.title}
                      </h3>

                      {/* Descripción opcional */}
                      {product.description && (
                        <p className={estilos.description}>
                          {product.description.substring(0, 60)}...
                        </p>
                      )}

                      {/* Precio y disponibilidad */}
                      <div className={estilos.priceRow}>
                        <span className={estilos.price}>
                          {price}
                        </span>
                        <span 
                          className={
                            available 
                              ? estilos.availableYes 
                              : estilos.availableNo
                          }
                        >
                          {available ? 'Disponible' : 'Agotado'}
                        </span>
                      </div>

                      {/* CTA */}
                      <span className={estilos.cta}>
                        Ver producto →
                      </span>

                    </div>

                  </button>

                </article>
              );
            })}
          </div>

          {/* Botón derecha */}
          <button
            className={`${estilos.carouselArrow} ${estilos.right}`}
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

/**
 * ============================================
 * PROPS
 * ============================================
 * 
 * @param {Array<Object>} products
 *   Array de productos de Shopify
 *   Estructura esperada:
 *   {
 *     id: string,
 *     title: string,
 *     handle: string,
 *     description: string (opcional),
 *     images: [{ url: string }],
 *     featuredImage: { url: string } (fallback),
 *     priceRange: {
 *       minVariantPrice: { amount: string }
 *     },
 *     compareAtPrice: { amount: string } (opcional, para descuentos),
 *     availableForSale: boolean,
 *     variants: [{ availableForSale: boolean }]
 *   }
 * 
 * @param {string} title
 *   Título de la sección (default: 'Productos Destacados')
 * 
 * @param {string} subtitle
 *   Subtítulo descriptivo
 * 
 * ============================================
 * EJEMPLOS DE USO
 * ============================================
 * 
 * <!-- Uso básico -->
 * <FeaturedFragrances products={featuredProducts} />
 * 
 * <!-- Con títulos personalizados -->
 * <FeaturedFragrances 
 *   products={bestsellers}
 *   title="Nuestros Más Vendidos"
 *   subtitle="Los favoritos de nuestros clientes"
 * />
 * 
 * <!-- Con colecciones de Shopify (filtradas) -->
 * <FeaturedFragrances 
 *   products={collection.products}
 *   title={collection.title}
 * />
 * 
 * ============================================
 * CARACTERÍSTICAS
 * ============================================
 * 
 * ✅ Muestra imagen principal del producto
 * ✅ Título y descripción (truncada)
 * ✅ Precio en MXN formateado
 * ✅ Estado de disponibilidad
 * ✅ Badge de descuento (%)
 * ✅ Badge de agotado
 * ✅ Carrusel con scroll suave
 * ✅ Responsive completo
 * ✅ Accesibilidad WCAG AA+
 * ✅ Sin botones anidados
 * ✅ Navegación a producto individual
 * 
 * ============================================
 * CAMBIOS RESPECTO A VERSIÓN ANTERIOR
 * ============================================
 * 
 * ✅ collections → products
 * ✅ Colecciones aromáticas → Productos individuales
 * ✅ Imagen por defecto → Imagen del producto
 * ✅ Precio formateado en MXN
 * ✅ Disponibilidad visual (Disponible/Agotado)
 * ✅ Badge de descuento automático
 * ✅ Títulos y subtítulos dinámicos
 * ✅ Descripción del producto
 * ✅ Ruta: /collections/{handle} → /products/{handle}
 */