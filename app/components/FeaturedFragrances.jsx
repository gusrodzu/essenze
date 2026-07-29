/**
 * FeaturedFragrances.jsx
 * 
 * Fragancias Destacadas
 * - Filtros por género (Todos, Masculino, Femenino, Unisex)
 * - Grid de 4 productos destacados
 * - Tarjetas con imagen, marca, nombre, descripción, precio
 * - Botones: Comparar y Comprar
 * - 100% responsivo
 */

import { useState } from 'react';

export default function FeaturedFragrances({ products = [], onAddToCart, onCompare }) {
  const [selectedGender, setSelectedGender] = useState('all');

  /**
   * Filtros disponibles
   */
  const genders = [
    { value: 'all', label: 'Todos' },
    { value: 'masculine', label: 'Masculino' },
    { value: 'feminine', label: 'Femenino' },
    { value: 'unisex', label: 'Unisex' },
  ];

  /**
   * Filtrar productos por género
   */
  const filteredProducts = selectedGender === 'all'
    ? products.slice(0, 4) // Mostrar primeros 4
    : products.filter(p => 
        p.tags?.some(tag => tag.toLowerCase() === selectedGender.toLowerCase())
      ).slice(0, 4);

  /**
   * Obtener familia aromática como descripción
   */
  const getAromaticFamily = (product) => {
    const families = ['floral', 'amber', 'citric', 'frutal', 'aromatic', 'oriental', 'spicy', 'marine'];
    const found = families.find(fam => 
      product.tags?.some(tag => tag.toLowerCase().includes(fam.toLowerCase()))
    );
    return found ? `${found.charAt(0).toUpperCase()}${found.slice(1)} Especiado` : 'Fragancia Premium';
  };

  /**
   * Obtener precio formateado
   */
  const getPrice = (product) => {
    const amount = product.priceRange?.minVariantPrice?.amount;
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <section className="featured-fragrances-section">
      <div className="container">
        {/* Header */}
        <div className="featured-header">
          <h2 className="featured-title">Fragancias Destacadas</h2>
        </div>

        {/* Filtros */}
        <div className="featured-filters">
          <span className="filters-label">Filtrar por:</span>
          <div className="filters-buttons">
            {genders.map(gender => (
              <button
                key={gender.value}
                className={`filter-button ${selectedGender === gender.value ? 'active' : ''}`}
                onClick={() => setSelectedGender(gender.value)}
              >
                {gender.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="featured-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`featured-card ${index === 2 ? 'featured-highlight' : ''}`}
              >
                {/* Imagen */}
                <div className="featured-image">
                  {product.featuredImage?.url ? (
                    <img 
                      src={product.featuredImage.url} 
                      alt={product.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="featured-image-placeholder" />
                  )}
                </div>

                {/* Contenido */}
                <div className="featured-content">
                  {/* Vendor/Marca */}
                  <p className="featured-vendor">{product.vendor || 'ESSENZE'}</p>

                  {/* Nombre */}
                  <h3 className="featured-name">{product.title}</h3>

                  {/* Descripción */}
                  <p className="featured-description">
                    {getAromaticFamily(product)}
                  </p>

                  {/* Precio */}
                  <p className="featured-price">{getPrice(product)}</p>

                  {/* Botones */}
                  <div className="featured-actions">
                    <button
                      className="button secondary small"
                      onClick={() => onCompare?.(product)}
                    >
                      Comparar
                    </button>
                    <button
                      className="button primary small"
                      onClick={() => onAddToCart?.(product)}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-products-message">
              <p>No hay fragancias destacadas disponibles en esta categoría</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .featured-fragrances-section {
          padding: var(--space-10) 0;
          background: var(--bg-page);
        }

        .featured-header {
          margin-bottom: var(--space-8);
          position: relative;
        }

        .featured-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0;
          font-weight: 700;
          padding-bottom: var(--space-4);
          border-bottom: 4px solid var(--color-gold-legacy);
          display: inline-block;
        }

        /* Filtros */
        .featured-filters {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
          flex-wrap: wrap;
        }

        .filters-label {
          font-size: var(--text-body-md);
          font-weight: 600;
          color: var(--text-body);
        }

        .filters-buttons {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .filter-button {
          padding: var(--space-2) var(--space-4);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-pill);
          background: var(--color-white);
          color: var(--text-body);
          cursor: pointer;
          font-size: var(--text-body-md);
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .filter-button:hover {
          border-color: var(--color-gold-legacy);
          background: var(--color-surface);
        }

        .filter-button.active {
          background: var(--color-ink);
          color: var(--color-white);
          border-color: var(--color-ink);
        }

        /* Grid */
        .featured-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        /* Card */
        .featured-card {
          background: var(--color-white);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .featured-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          transform: translateY(-4px);
        }

        .featured-card.featured-highlight {
          border-color: var(--color-ink);
          box-shadow: 0 0 0 2px var(--color-ink);
        }

        .featured-card.featured-highlight:hover {
          box-shadow: 0 0 0 2px var(--color-ink), 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        /* Imagen */
        .featured-image {
          width: 100%;
          aspect-ratio: 1 / 1.2;
          background: var(--color-surface);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .featured-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .featured-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-border) 100%);
        }

        /* Contenido */
        .featured-content {
          padding: var(--space-4);
        }

        .featured-vendor {
          font-size: var(--text-body-sm);
          color: var(--text-muted);
          margin: 0 0 var(--space-1) 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .featured-name {
          font-family: var(--font-display);
          font-size: var(--text-h4);
          color: var(--text-body);
          margin: 0 0 var(--space-1) 0;
          font-weight: 700;
          line-height: 1.3;
        }

        .featured-description {
          font-size: var(--text-body-sm);
          color: var(--text-muted);
          margin: 0 0 var(--space-2) 0;
        }

        .featured-price {
          font-family: var(--font-display);
          font-size: var(--text-h4);
          color: var(--color-ink);
          margin: 0 0 var(--space-4) 0;
          font-weight: 700;
        }

        /* Acciones */
        .featured-actions {
          display: flex;
          gap: var(--space-2);
        }

        .button.small {
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-body-sm);
          flex: 1;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .button.secondary.small {
          background: var(--color-surface);
          color: var(--text-body);
          border: 1px solid var(--color-border);
        }

        .button.secondary.small:hover {
          background: var(--color-border);
          border-color: var(--color-ink);
        }

        .button.primary.small {
          background: var(--color-ink);
          color: var(--color-white);
        }

        .button.primary.small:hover {
          background: var(--color-gold-legacy);
        }

        /* No products */
        .no-products-message {
          grid-column: 1 / -1;
          text-align: center;
          padding: var(--space-8);
          color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .featured-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-5);
          }
        }

        @media (max-width: 992px) {
          .featured-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .featured-title {
            font-size: var(--text-h3);
          }
        }

        @media (max-width: 768px) {
          .featured-fragrances-section {
            padding: var(--space-8) 0;
          }

          .featured-grid {
            grid-template-columns: 1fr;
          }

          .featured-filters {
            justify-content: center;
          }

          .filters-buttons {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .featured-header {
            margin-bottom: var(--space-6);
          }

          .featured-title {
            font-size: var(--text-h4);
            padding-bottom: var(--space-2);
            border-bottom: 3px solid var(--color-gold-legacy);
          }

          .featured-filters {
            gap: var(--space-2);
          }

          .filters-label {
            width: 100%;
          }

          .filter-button {
            padding: var(--space-1) var(--space-3);
            font-size: var(--text-body-sm);
          }

          .featured-actions {
            gap: var(--space-1);
          }

          .button.small {
            padding: var(--space-1) var(--space-2);
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}

/**
 * PROPS:
 * 
 * products: array de productos Shopify
 *   [
 *     {
 *       id: string,
 *       title: string,
 *       handle: string,
 *       vendor: string,
 *       tags: ['masculine', 'floral', 'daily'],
 *       priceRange: {
 *         minVariantPrice: { amount: '4500' }
 *       },
 *       featuredImage: { url: 'https://...' }
 *     }
 *   ]
 * 
 * onAddToCart: (product) => void
 *   Callback cuando usuario hace click en "Comprar"
 * 
 * onCompare: (product) => void
 *   Callback cuando usuario hace click en "Comparar"
 * 
 * EJEMPLO DE USO:
 * 
 * <FeaturedFragrances
 *   products={featuredProducts}
 *   onAddToCart={(prod) => {
 *     // Agregar al carrito
 *     console.log('Agregar:', prod.title);
 *   }}
 *   onCompare={(prod) => {
 *     // Agregar a comparar
 *     console.log('Comparar:', prod.title);
 *   }}
 * />
 */