/**
 * SeasonalLookbook.jsx
 * 
 * Lookbook Estacional
 * - 4 estaciones: Primavera, Verano, Otoño, Invierno
 * - Cada una con imagen de fondo
 * - Clickeable para navegar a colecciones
 * - Grid responsive
 */

import { useNavigate } from 'react-router';

export default function SeasonalLookbook({ collections = [] }) {
  const navigate = useNavigate();

  /**
   * Mapeo de estaciones con handles de colecciones
   */
  const seasons = [
    {
      id: 'spring',
      label: 'Primavera',
      handle: 'primavera',
     
      description: 'Fragancias frescas y florales',
      color: '#FFB6D9' // Rosa pastel
    },
    {
      id: 'summer',
      label: 'Verano',
      handle: 'verano',

      description: 'Notas cítricas y marinas',
      color: '#FFD700' // Oro claro
    },
    {
      id: 'fall',
      label: 'Otoño',
      handle: 'otono',
     
      description: 'Aromas cálidos y especiados',
      color: '#FF8C42' // Naranja
    },
    {
      id: 'winter',
      label: 'Invierno',
      handle: 'invierno',
      
      description: 'Fragancias ambarinas y gourmand',
      color: '#A8D8EA' // Azul claro
    },
  ];

  /**
   * Obtener imagen de la colección
   */
  const getCollectionImage = (handle) => {
    const collection = collections.find(c => 
      c.handle.toLowerCase() === handle.toLowerCase()
    );
    return collection?.image?.url || null;
  };

  /**
   * Navegar a colección
   */
  const handleNavigate = (handle) => {
    navigate(`/collections/${handle}`);
  };

  return (
    <section className="seasonal-lookbook-section">
      <div className="container">
        {/* Header */}
        <div className="lookbook-header">
          <h2 className="lookbook-title">Lookbook Estacional</h2>
        </div>

        {/* Grid de Estaciones */}
        <div className="lookbook-grid">
          {seasons.map(season => {
            const backgroundImage = getCollectionImage(season.handle);

            return (
              <button
                key={season.id}
                className="lookbook-card"
                onClick={() => handleNavigate(season.handle)}
                style={{
                  backgroundImage: backgroundImage 
                    ? `url(${backgroundImage})`
                    : `linear-gradient(135deg, ${season.color} 0%, ${season.color}80 100%)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                title={season.description}
              >
                {/* Overlay oscuro */}
                <div className="lookbook-overlay" />

                {/* Contenido */}
                <div className="lookbook-content">
                  <div className="lookbook-emoji">{season.emoji}</div>
                  <h3 className="lookbook-label">{season.label}</h3>
                </div>

                {/* Hover effect */}
                <div className="lookbook-hover-effect" />
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .seasonal-lookbook-section {
          padding: var(--space-10) 0;
          background: var(--bg-page);
        }

        .lookbook-header {
          margin-bottom: var(--space-8);
          position: relative;
        }

        .lookbook-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0;
          font-weight: 700;
          padding-bottom: var(--space-4);
          border-bottom: 4px solid var(--color-gold-legacy);
          display: inline-block;
        }

        .lookbook-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        .lookbook-card {
          position: relative;
          aspect-ratio: 1 / 1.3;
          border: none;
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          background: var(--color-surface);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .lookbook-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
        }

        .lookbook-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
          transition: background 0.3s ease;
          z-index: 1;
        }

        .lookbook-card:hover .lookbook-overlay {
          background: rgba(0, 0, 0, 0.4);
        }

        .lookbook-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          z-index: 2;
          padding: var(--space-4);
        }

        .lookbook-emoji {
          font-size: 56px;
          line-height: 1;
          animation: float 3s ease-in-out infinite;
        }

        .lookbook-card:hover .lookbook-emoji {
          animation: floatHover 0.3s ease-out forwards;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes floatHover {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-16px) scale(1.2); }
        }

        .lookbook-label {
          font-family: var(--font-display);
          font-size: var(--text-h3);
          color: var(--color-white);
          margin: 0;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .lookbook-hover-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: var(--radius-lg);
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0);
          transition: box-shadow 0.3s ease;
          z-index: 3;
          pointer-events: none;
        }

        .lookbook-card:hover .lookbook-hover-effect {
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.3);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .lookbook-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-5);
          }
        }

        @media (max-width: 992px) {
          .lookbook-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .lookbook-emoji {
            font-size: 48px;
          }

          .lookbook-label {
            font-size: var(--text-h4);
          }
        }

        @media (max-width: 768px) {
          .lookbook-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .lookbook-title {
            font-size: var(--text-h3);
          }

          .lookbook-emoji {
            font-size: 40px;
          }

          .lookbook-label {
            font-size: var(--text-h5);
          }
        }

        @media (max-width: 480px) {
          .lookbook-grid {
            grid-template-columns: 1fr;
            gap: var(--space-3);
          }

          .lookbook-emoji {
            font-size: 36px;
          }

          .lookbook-label {
            font-size: var(--text-h5);
          }

          .lookbook-title {
            font-size: var(--text-h4);
            padding-bottom: var(--space-2);
            border-bottom: 3px solid var(--color-gold-legacy);
          }

          .lookbook-header {
            margin-bottom: var(--space-6);
          }
        }
      `}</style>
    </section>
  );
}

/**
 * PROPS:
 * 
 * collections: array de colecciones de Shopify
 *   [
 *     {
 *       id: string,
 *       handle: 'primavera',
 *       title: 'Primavera',
 *       image: { url: 'https://...' }
 *     }
 *   ]
 * 
 * HANDLES REQUERIDOS EN SHOPIFY:
 * - primavera
 * - verano
 * - otono
 * - invierno
 * 
 * CADA COLECCIÓN DEBE TENER:
 * - Imagen de portada
 * - Handle correcto (lowercase)
 * 
 * EJEMPLO DE USO:
 * 
 * <SeasonalLookbook collections={allCollections} />
 */