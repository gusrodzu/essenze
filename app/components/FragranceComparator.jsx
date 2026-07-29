/**
 * FragranceComparator.jsx
 * 
 * Comparador de Fragancias
 * - Muestra 3-4 productos con detalles de comparación
 * - Información: Familia, Notas Top, Longevidad, Sillage, Precio
 * - Grid responsive
 * - Diseño premium
 */

export default function FragranceComparator({ products = [] }) {
  // Mostrar solo los primeros 3 productos
  const comparisonProducts = products.slice(0, 3);

  /**
   * Obtener familia aromática de tags
   */
  const getAromaticFamily = (product) => {
    const families = {
      'floral': 'Floral',
      'amber': 'Ámbar',
      'citric': 'Cítrico',
      'frutal': 'Frutal',
      'aromatic': 'Aromático',
      'oriental': 'Oriental',
      'spicy': 'Especiado',
      'marine': 'Marino'
    };
    
    const found = Object.entries(families).find(([key]) =>
      product.tags?.some(tag => tag.toLowerCase().includes(key.toLowerCase()))
    );
    
    return found ? found[1] : 'Premium';
  };

  /**
   * Obtener notas top (simuladas o de tags)
   */
  const getTopNotes = (product) => {
    // Simulación - en real podrían venir de campos personalizados
    const topNotesMap = {
      'viking': 'Bergamota, Especias',
      'sauvage': 'Bergamota, Pimienta',
      'black noir': 'Ámbar Gris, Vainilla',
      'default': 'Notas Aromáticas'
    };
    
    const key = product.title.toLowerCase().split(' ')[0];
    return topNotesMap[key] || topNotesMap['default'];
  };

  /**
   * Obtener longevidad (simulada)
   */
  const getLongevity = (product) => {
    const longevityMap = {
      'viking': '10 horas',
      'sauvage': '12 horas',
      'black noir': '8 horas',
      'default': '10 horas'
    };
    
    const key = product.title.toLowerCase().split(' ')[0];
    return longevityMap[key] || longevityMap['default'];
  };

  /**
   * Obtener sillage (simulado)
   */
  const getSillage = (product) => {
    const sillageMap = {
      'viking': 'Fuerte',
      'sauvage': 'Moderado',
      'black noir': 'Fuerte',
      'default': 'Moderado'
    };
    
    const key = product.title.toLowerCase().split(' ')[0];
    return sillageMap[key] || sillageMap['default'];
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
    <section className="fragrance-comparator-section">
      <div className="container">
        {/* Header */}
        <div className="comparator-header">
          <h2 className="comparator-title">Comparador de Fragancias</h2>
        </div>

        {/* Grid de Comparación */}
        <div className="comparator-grid">
          {comparisonProducts.length > 0 ? (
            comparisonProducts.map((product) => (
              <div key={product.id} className="comparator-card">
                {/* Imagen */}
                <div className="comparator-image">
                  {product.featuredImage?.url ? (
                    <img 
                      src={product.featuredImage.url} 
                      alt={product.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="comparator-image-placeholder" />
                  )}
                </div>

                {/* Contenido */}
                <div className="comparator-content">
                  {/* Nombre */}
                  <h3 className="comparator-name">{product.title}</h3>

                  {/* Familia */}
                  <div className="comparator-item">
                    <span className="comparator-label">Familia:</span>
                    <span className="comparator-value">
                      {getAromaticFamily(product)}
                    </span>
                  </div>

                  {/* Notas Top */}
                  <div className="comparator-item">
                    <span className="comparator-label">Notas Top:</span>
                    <span className="comparator-value">
                      {getTopNotes(product)}
                    </span>
                  </div>

                  {/* Longevidad */}
                  <div className="comparator-item">
                    <span className="comparator-label">Longevidad:</span>
                    <span className="comparator-value">
                      {getLongevity(product)}
                    </span>
                  </div>

                  {/* Sillage */}
                  <div className="comparator-item">
                    <span className="comparator-label">Sillage:</span>
                    <span className="comparator-value">
                      {getSillage(product)}
                    </span>
                  </div>

                  {/* Precio */}
                  <div className="comparator-item">
                    <span className="comparator-label">Precio:</span>
                    <span className="comparator-price">
                      {getPrice(product)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-comparator-message">
              <p>No hay fragancias disponibles para comparar</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .fragrance-comparator-section {
          padding: var(--space-10) 0;
          background: var(--color-surface);
        }

        .comparator-header {
          margin-bottom: var(--space-8);
          position: relative;
        }

        .comparator-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0;
          font-weight: 700;
          padding-bottom: var(--space-4);
          border-bottom: 4px solid var(--color-gold-legacy);
          display: inline-block;
        }

        /* Grid */
        .comparator-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        /* Card */
        .comparator-card {
          background: var(--color-white);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 1px solid var(--color-border);
        }

        .comparator-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          transform: translateY(-4px);
        }

        /* Imagen */
        .comparator-image {
          width: 100%;
          aspect-ratio: 1 / 1;
          background: var(--color-surface);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comparator-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .comparator-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-border) 100%);
        }

        /* Contenido */
        .comparator-content {
          padding: var(--space-5);
        }

        .comparator-name {
          font-family: var(--font-display);
          font-size: var(--text-h4);
          color: var(--text-body);
          margin: 0 0 var(--space-4) 0;
          font-weight: 700;
          line-height: 1.3;
        }

        /* Items */
        .comparator-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: var(--space-3);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }

        .comparator-item:last-of-type {
          margin-bottom: 0;
          border-bottom: none;
          padding-bottom: 0;
        }

        .comparator-label {
          font-size: var(--text-body-md);
          font-weight: 600;
          color: var(--text-body);
        }

        .comparator-value {
          font-size: var(--text-body-md);
          color: var(--text-muted);
        }

        .comparator-price {
          font-family: var(--font-display);
          font-size: var(--text-h5);
          color: var(--color-ink);
          font-weight: 700;
        }

        /* No products */
        .no-comparator-message {
          grid-column: 1 / -1;
          text-align: center;
          padding: var(--space-8);
          color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .comparator-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-5);
          }
        }

        @media (max-width: 992px) {
          .comparator-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .comparator-title {
            font-size: var(--text-h3);
          }
        }

        @media (max-width: 768px) {
          .fragrance-comparator-section {
            padding: var(--space-8) 0;
          }

          .comparator-grid {
            grid-template-columns: 1fr;
          }

          .comparator-title {
            font-size: var(--text-h3);
          }
        }

        @media (max-width: 480px) {
          .comparator-header {
            margin-bottom: var(--space-6);
          }

          .comparator-title {
            font-size: var(--text-h4);
            padding-bottom: var(--space-2);
            border-bottom: 3px solid var(--color-gold-legacy);
          }

          .comparator-content {
            padding: var(--space-4);
          }

          .comparator-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-1);
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
 *       tags: ['masculine', 'floral', 'daily'],
 *       priceRange: {
 *         minVariantPrice: { amount: '4500' }
 *       },
 *       featuredImage: { url: 'https://...' }
 *     }
 *   ]
 * 
 * EJEMPLO DE USO:
 * 
 * <FragranceComparator products={products} />
 * 
 * DATOS MOSTRADOS:
 * - Familia aromática: Detectada de tags (floral, amber, etc.)
 * - Notas Top: Generadas por producto (customizable)
 * - Longevidad: Generada por producto (customizable)
 * - Sillage: Generada por producto (customizable)
 * - Precio: Del priceRange de Shopify
 */