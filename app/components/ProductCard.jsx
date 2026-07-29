/**
 * ProductCard.jsx
 * 
 * Componente reutilizable para mostrar productos
 * Usable en:
 * - Collection pages
 * - Search results
 * - Product recommendations
 * - Home page featured products
 * 
 * Usa Design System CSS classes + inline styles
 */

export default function ProductCard({
  product,
  isLoading,
  onClick,
  variant = 'default', // 'default', 'compact', 'featured'
}) {
  // Estado de carga
  if (isLoading) {
    return (
      <div className="card p-0 overflow-hidden animate-pulse">
        <div 
          style={{
            aspectRatio: '1 / 1',
            backgroundColor: 'var(--color-surface)',
          }}
        />
        <div className="p-6">
          <div 
            style={{
              height: '20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
            }}
          />
          <div 
            style={{
              height: '16px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
            }}
          />
          <div 
            style={{
              height: '40px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>
      </div>
    );
  }

  // Si no hay producto
  if (!product) {
    return null;
  }

  // Destructuring del producto
  const {
    id,
    title,
    handle,
    featuredImage,
    priceRange,
    tags = [],
    vendor = 'Essenze',
    availableForSale = true,
  } = product;

  // Calcular precio
  const price = priceRange?.minVariantPrice?.amount || 0;
  const compareAtPrice = priceRange?.maxVariantPrice?.amount;
  const onSale = compareAtPrice && compareAtPrice > price;

  // Extraer tags útiles
  const isNew = tags.includes('new');
  const isBestseller = tags.includes('bestseller');
  const isLimited = tags.includes('limited');

  // URL de la imagen
  const imageUrl = featuredImage?.url || null;

  // Manejo del click
  const handleClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  // VARIANTE: COMPACT (más pequeña)
  if (variant === 'compact') {
    return (
      <div 
        className="card p-0 overflow-hidden cursor-pointer transition-default"
        onClick={handleClick}
      >
        {/* Imagen */}
        <div 
          style={{
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'var(--transition-default)',
              }}
              className="hover:scale-105"
            />
          )}

          {/* Badges */}
          <div 
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              right: 'var(--space-3)',
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {isNew && <span className="badge">New</span>}
            {!availableForSale && <span className="badge">Sold Out</span>}
            {onSale && <span className="badge success">Sale</span>}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-sm text-muted m-0">{vendor}</p>
          <h4 className="text-body-md font-semibold truncate m-0">
            {title}
          </h4>
          <p className="text-body-md font-bold text-gold m-0">
            ${parseFloat(price).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }

  // VARIANTE: FEATURED (grande, con más detalles)
  if (variant === 'featured') {
    return (
      <div 
        className="card p-0 overflow-hidden cursor-pointer shadow-lg transition-default"
        onClick={handleClick}
      >
        {/* Imagen Grande */}
        <div 
          style={{
            aspectRatio: '4 / 5',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'var(--transition-fast)',
              }}
              className="hover:scale-110"
            />
          )}

          {/* Overlay con badges */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              opacity: 0,
              transition: 'var(--transition-default)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 'var(--space-6)',
              gap: 'var(--space-2)',
            }}
            className="group-hover:opacity-100"
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0';
            }}
          >
            {isBestseller && <span className="badge">Bestseller</span>}
            {isLimited && <span className="badge warning">Limited</span>}
            {isNew && <span className="badge info">New</span>}
          </div>

          {/* Badge de esquina */}
          {!availableForSale && (
            <div 
              style={{
                position: 'absolute',
                top: 'var(--space-3)',
                right: 'var(--space-3)',
              }}
            >
              <span className="badge">Sold Out</span>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-8 flex flex-col gap-4">
          {/* Header */}
          <div>
            <p className="text-sm text-muted uppercase tracking-wide m-0">
              {vendor}
            </p>
            <h3 className="text-h4 font-semibold m-0 mt-2">
              {title}
            </h3>
          </div>

          {/* Descripción si existe */}
          <p className="text-body-md text-muted line-clamp-2 m-0">
            Luxury fragrance crafted for distinction
          </p>

          {/* Precio */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gold">
              ${parseFloat(price).toFixed(2)}
            </span>
            {onSale && (
              <span className="text-sm text-muted line-through">
                ${parseFloat(compareAtPrice).toFixed(2)}
              </span>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-default">
            <button 
              className="button full"
              disabled={!availableForSale}
            >
              {availableForSale ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button 
              className="button secondary"
              style={{ flex: '0 0 50px' }}
              title="Add to Wishlist"
            >
              ♡
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VARIANTE: DEFAULT (estándar)
  return (
    <div 
      className="card p-0 overflow-hidden cursor-pointer transition-default group"
      onClick={handleClick}
    >
      {/* Imagen */}
      <div 
        style={{
          aspectRatio: '1 / 1.2',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'var(--transition-default)',
            }}
            className="group-hover:scale-105"
          />
        ) : (
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No Image
          </div>
        )}

        {/* Badges Superior Derecha */}
        <div 
          style={{
            position: 'absolute',
            top: 'var(--space-3)',
            right: 'var(--space-3)',
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            zIndex: 2,
          }}
        >
          {isNew && (
            <span className="badge info">
              New
            </span>
          )}
          {onSale && (
            <span className="badge success">
              Sale
            </span>
          )}
          {!availableForSale && (
            <span className="badge">
              Sold Out
            </span>
          )}
        </div>

        {/* Overlay en hover */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
            padding: 'var(--space-6) var(--space-4)',
            display: 'flex',
            gap: 'var(--space-2)',
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'var(--transition-fast)',
          }}
          className="group-hover:opacity-100 group-hover:translate-y-0"
        >
          <button 
            className="button sm full"
            disabled={!availableForSale}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {availableForSale ? 'Add' : 'Out'}
          </button>
          <button 
            className="button sm secondary"
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Wishlist"
          >
            ♡
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Vendor */}
        <p className="text-eyebrow text-muted uppercase tracking-wide m-0 mb-2">
          {vendor}
        </p>

        {/* Título */}
        <h4 className="text-body-md font-semibold truncate m-0 mb-3">
          {title}
        </h4>

        {/* Precio */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-body-lg font-bold text-gold">
            ${parseFloat(price).toFixed(2)}
          </span>
          {onSale && (
            <span className="text-body-sm text-muted line-through">
              ${parseFloat(compareAtPrice).toFixed(2)}
            </span>
          )}
        </div>

        {/* Rating o status */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {/* Stars (opcional) */}
            <span className="text-sm">⭐ 4.8</span>
          </div>
          {isBestseller && (
            <span className="badge success" style={{ fontSize: 'var(--text-eyebrow)' }}>
              ⭐ Best
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PROPIEDADES:
 * 
 * product: {
 *   id: string
 *   title: string
 *   handle: string
 *   featuredImage: { url: string }
 *   priceRange: {
 *     minVariantPrice: { amount: string }
 *     maxVariantPrice: { amount: string }
 *   }
 *   tags: string[]
 *   vendor: string
 *   availableForSale: boolean
 * }
 * 
 * isLoading: boolean (muestra skeleton)
 * onClick: function (callback cuando click en card)
 * variant: 'default' | 'compact' | 'featured'
 * 
 * 
 * EJEMPLOS DE USO:
 * 
 * // Default
 * <ProductCard product={product} />
 * 
 * // Compact en mobile
 * <ProductCard 
 *   product={product}
 *   variant="compact"
 * />
 * 
 * // Featured
 * <ProductCard 
 *   product={product}
 *   variant="featured"
 *   onClick={(prod) => navigate(`/products/${prod.handle}`)}
 * />
 * 
 * // Con loading
 * <ProductCard isLoading={true} />
 * 
 * 
 * RESPONSIVE:
 * - Automáticamente responsive gracias al grid padre
 * - Imagen se ajusta a aspect ratio
 * - Buttons hidden en hover (desktop) o always visible (mobile)
 */