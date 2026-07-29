/**
 * AromaticNotes.jsx
 * 
 * Biblioteca de Notas Aromáticas
 * - 8 familias aromáticas
 * - Imagen de fondo por nota
 * - Conectado a colecciones Shopify
 * - Clickeable para navegar
 * - 100% responsivo
 */

import { useNavigate } from 'react-router';

export default function AromaticNotes({ collections = [] }) {
  const navigate = useNavigate();

  /**
   * Mapeo de notas aromáticas con handles de colecciones
   */
  const aromaticNotes = [
    {
      id: 'Floral',
      label: 'Floral',
      handle: 'Floral',
     
      description: 'Notas florales delicadas',
    },
    {
      id: 'Ambar',
      label: 'Ámbar',
      handle: 'Ambar',
    
      description: 'Calidez y sensualidad',
    },
    {
      id: 'Citrico',
      label: 'Cítrico',
      handle: 'Citrico',
    
      description: 'Frescura y energía',
    },
    {
      id: 'Frutal',
      label: 'Frutal',
      handle: 'Frutal',
     
      description: 'Dulzura natural',
    },
    {
      id: 'Aromatico',
      label: 'Aromático',
      handle: 'Aromatico',
     
      description: 'Herbales y especias',
    },
    {
      id: 'Oriental',
      label: 'Oriental',
      handle: 'Oriental',
     
      description: 'Exotismo y lujo',
    },
    {
      id: 'especiadoEspeciado',
      label: 'Especiado',
      handle: 'Especiado',
    
      description: 'Notas picantes',
    },
    {
      id: 'Marino',
      label: 'Marino',
      handle: 'Marino',
     
      description: 'Frescura salina',
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
    <section className="aromatic-notes-section">
      <div className="container">
        {/* Header */}
        <div className="aromatic-header">
          <h2 className="aromatic-title">Biblioteca de Notas Aromáticas</h2>
          <p className="aromatic-subtitle">
            Explora nuestras 8 familias aromáticas y encuentra tu fragancia perfecta
          </p>
        </div>

        {/* Grid de Notas */}
        <div className="aromatic-grid">
          {aromaticNotes.map(note => {
            const backgroundImage = getCollectionImage(note.handle);

            return (
              <button
                key={note.id}
                className="aromatic-card"
                onClick={() => handleNavigate(note.handle)}
                style={{
                  backgroundImage: backgroundImage 
                    ? `url(${backgroundImage})`
                    : `linear-gradient(135deg, var(--color-ink) 0%, var(--color-gold-legacy) 100%)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                title={note.description}
              >
                {/* Overlay oscuro */}
                <div className="aromatic-overlay" />

                {/* Contenido */}
                <div className="aromatic-content">
                  <div className="aromatic-emoji">{note.emoji}</div>
                  <h3 className="aromatic-label">{note.label}</h3>
                  <p className="aromatic-description">{note.description}</p>
                </div>

                {/* Hover effect */}
                <div className="aromatic-hover-effect" />
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .aromatic-notes-section {
          padding: var(--space-10) 0;
          background: var(--bg-page);
        }

        .aromatic-header {
          text-align: center;
          margin-bottom: var(--space-10);
        }

        .aromatic-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0 0 var(--space-3) 0;
          font-weight: 700;
        }

        .aromatic-subtitle {
          font-size: var(--text-body-lg);
          color: var(--text-muted);
          margin: 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .aromatic-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        .aromatic-card {
          position: relative;
          aspect-ratio: 1 / 1;
          border: none;
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          background: var(--color-surface);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .aromatic-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }

        .aromatic-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          transition: background 0.3s ease;
          z-index: 1;
        }

        .aromatic-card:hover .aromatic-overlay {
          background: rgba(0, 0, 0, 0.5);
        }

        .aromatic-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          z-index: 2;
          padding: var(--space-4);
        }

        .aromatic-emoji {
          font-size: 48px;
          line-height: 1;
          animation: float 3s ease-in-out infinite;
        }

        .aromatic-card:hover .aromatic-emoji {
          animation: floatHover 0.3s ease-out forwards;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes floatHover {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-12px) scale(1.2); }
        }

        .aromatic-label {
          font-family: var(--font-display);
          font-size: var(--text-h4);
          color: var(--color-white);
          margin: 0;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .aromatic-description {
          font-size: var(--text-body-sm);
          color: rgba(255, 255, 255, 0.9);
          margin: var(--space-1) 0 0 0;
          text-align: center;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .aromatic-card:hover .aromatic-description {
          opacity: 1;
        }

        .aromatic-hover-effect {
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

        .aromatic-card:hover .aromatic-hover-effect {
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.3);
        }

        /* Tablet - 2 columnas */
        @media (max-width: 992px) {
          .aromatic-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-5);
          }

          .aromatic-emoji {
            font-size: 40px;
          }

          .aromatic-label {
            font-size: var(--text-h4);
          }
        }

        /* Tablet pequeño - 2 columnas */
        @media (max-width: 768px) {
          .aromatic-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .aromatic-emoji {
            font-size: 36px;
          }

          .aromatic-label {
            font-size: var(--text-body-lg);
          }

          .aromatic-description {
            display: none;
          }
        }

        /* Mobile - 1 columna */
        @media (max-width: 480px) {
          .aromatic-grid {
            grid-template-columns: 1fr;
            gap: var(--space-3);
          }

          .aromatic-card {
            aspect-ratio: 3 / 2;
          }

          .aromatic-emoji {
            font-size: 32px;
          }

          .aromatic-label {
            font-size: var(--text-body-lg);
          }

          .aromatic-title {
            font-size: var(--text-h3);
          }

          .aromatic-subtitle {
            font-size: var(--text-body-md);
          }

          .aromatic-header {
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
 *       handle: 'floral',
 *       title: 'Floral',
 *       image: { url: 'https://...' }
 *     }
 *   ]
 * 
 * HANDLES REQUERIDOS EN SHOPIFY:
 * - floral
 * - amber
 * - citric
 * - frutal
 * - aromatic
 * - oriental
 * - spicy
 * - marine
 * 
 * CADA COLECCIÓN DEBE TENER:
 * - Imagen de portada
 * - Handle correcto (lowercase)
 * 
 * EJEMPLO DE USO:
 * 
 * <AromaticNotes collections={allCollections} />
 */