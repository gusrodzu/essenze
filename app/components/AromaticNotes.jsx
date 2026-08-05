/**
 * AromaticNotes.jsx
 * 
 * Biblioteca de Notas Aromáticas
 * - 8 familias aromáticas
 * - Emoji + descripción por nota
 * - Imagen default por card
 * - Conectado a colecciones Shopify
 * - Clickeable para navegar
 * - 100% responsivo
 * - Design System integrado
 */

import { useNavigate } from 'react-router';

export default function AromaticNotes({ collections = [] }) {
  const navigate = useNavigate();

  const DEFAULT_IMAGE = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_45_04_a.m.png?v=1785429924';
  const DEFAULT_IMAGE1 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337';
  const DEFAULT_IMAGE2 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_02_41_a.m.png?v=1785430977';

  const DEFAULT_IMAGE3 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_08_19_a.m.png?v=1785431328';
  const DEFAULT_IMAGE4 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_13_00_a.m.png?v=1785431612';
  const DEFAULT_IMAGE5 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_15_05_a.m.png?v=1785431723';
  const DEFAULT_IMAGE6 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_17_26_a.m.png?v=1785431866';
  const DEFAULT_IMAGE7 = 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337';
  



 

  /**
   * Mapeo de notas aromáticas con:
   * - id: identificador único
   * - label: nombre de la nota
   * - handle: handle de colección en Shopify
   * - emoji: emoji representativo
   * - description: descripción breve
   * - image: URL imagen por default
   * - fallbackColor: color gradient si no hay imagen
   */
  const aromaticNotes = [
    {
      id: 'floral',
      label: 'Floral',
      handle: 'floral',
    
      description: 'Notas florales delicadas',
      image: DEFAULT_IMAGE,
     
    },
    {
      id: 'ambar',
      label: 'Ámbar',
      handle: 'ambar',
   
      description: 'Calidez y sensualidad',
      image: DEFAULT_IMAGE1,
    
    },
    {
      id: 'citrico',
      label: 'Cítrico',
      handle: 'citric',
     
      description: 'Frescura y energía',
      image: DEFAULT_IMAGE2,
      
    },
    {
      id: 'frutal',
      label: 'Frutal',
      handle: 'frutal',
     
      description: 'Dulzura natural',
      image: DEFAULT_IMAGE3,
     
    },
    {
      id: 'aromatico',
      label: 'Aromático',
      handle: 'aromatico',
     
      description: 'Herbales y especias',
      image: DEFAULT_IMAGE4,
      
    },
    {
      id: 'oriental',
      label: 'Oriental',
      handle: 'oriental',
     
      description: 'Exotismo y lujo',
      image: DEFAULT_IMAGE5,
      
    },
    {
      id: 'especiado',
      label: 'Especiado',
      handle: 'especiado',
    
      description: 'Notas picantes',
      image: DEFAULT_IMAGE6,
      
    },
    {
      id: 'marino',
      label: 'Marino',
      handle: 'marino',
  
      description: 'Frescura salina',
      image: DEFAULT_IMAGE7,
      
    },
  ];

  /**
   * Obtener imagen - prioridad:
   * 1. Imagen de colección Shopify (si existe)
   * 2. Imagen default
   * 3. Fallback color
   */
  const getBackgroundImage = (note) => {
    // Buscar imagen en colecciones de Shopify
    const collection = collections.find(c => 
      c.handle.toLowerCase() === note.handle.toLowerCase()
    );
    
    // Si existe colección con imagen, usar esa
    if (collection?.image?.url) {
      return `url(${collection.image.url})`;
    }
    
    // Si no, usar imagen default
    if (note.image) {
      return `url(${note.image})`;
    }
    
    // Si no hay nada, retornar null (usará fallback)
    return null;
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
            const backgroundImage = getBackgroundImage(note);

            return (
              <button
                key={note.id}
                className="aromatic-card"
                onClick={() => handleNavigate(note.handle)}
                style={{
                  backgroundImage: backgroundImage,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: backgroundImage ? 'transparent' : 'rgba(0,0,0,0.1)',
                  ...(backgroundImage ? {} : {
                    background: note.fallbackColor,
                  })
                }}
                title={note.description}
                aria-label={`${note.label} - ${note.description}`}
              >
                {/* Overlay oscuro */}
                <div className="aromatic-overlay" />

                {/* Contenido */}
                <div className="aromatic-content">
                  <div className="aromatic-emoji">{note.emoji}</div>
                  <h3 className="aromatic-label">{note.label}</h3>
                  <p className="aromatic-description">{note.description}</p>
                </div>

                {/* Efecto glow en hover */}
                <div className="aromatic-hover-glow" />
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .container {
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 0 var(--space-4);
        }

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
          line-height: var(--lh-snug);
        }

        .aromatic-subtitle {
          font-size: var(--text-body-lg);
          color: var(--text-muted);
          margin: 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: var(--lh-relaxed);
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
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 0;
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
          transition: background var(--transition-fast);
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
          display: block;
        }

        .aromatic-card:hover .aromatic-emoji {
          animation: floatHover 0.3s ease-out forwards;
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0); 
          }
          50% { 
            transform: translateY(-8px); 
          }
        }

        @keyframes floatHover {
          0% { 
            transform: translateY(0) scale(1); 
          }
          100% { 
            transform: translateY(-12px) scale(1.2); 
          }
        }

        .aromatic-label {
          font-family: var(--font-display);
          font-size: var(--text-h4);
          color: var(--text-inverse);
          margin: 0;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          line-height: var(--lh-snug);
        }

        .aromatic-description {
          font-size: var(--text-body-sm);
          color: rgba(255, 255, 255, 0.9);
          margin: var(--space-1) 0 0 0;
          text-align: center;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity var(--transition-fast);
          line-height: var(--lh-snug);
        }

        .aromatic-card:hover .aromatic-description {
          opacity: 1;
        }

        .aromatic-hover-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: var(--radius-lg);
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0);
          transition: box-shadow var(--transition-fast);
          z-index: 3;
          pointer-events: none;
        }

        .aromatic-card:hover .aromatic-hover-glow {
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
 * collections: array de colecciones de Shopify (opcional)
 *   Si pasas colecciones, usará sus imágenes si existen
 *   Si no, usará imagen default en todas las cards
 * 
 * PRIORIDAD DE IMAGEN:
 * 1. Imagen de colección Shopify (si existe)
 * 2. Imagen default (ChatGPT_Image_...)
 * 3. Fallback color gradient
 * 
 * HANDLES REQUERIDOS EN SHOPIFY (LOWERCASE):
 * - floral 🌸
 * - amber ✨
 * - citric 🍋
 * - frutal 🍎
 * - aromatic 🌿
 * - oriental 🏯
 * - spicy 🌶️
 * - marine 🌊
 * 
 * EJEMPLO DE USO:
 * 
 * <!-- Sin colecciones (usa imagen default) -->
 * <AromaticNotes />
 * 
 * <!-- Con colecciones (prioriza imagen Shopify) -->
 * <AromaticNotes collections={allCollectionsFromShopify} />
 * 
 * ESTRUCTURA DE COLECCIÓN ESPERADA:
 * {
 *   id: "gid://shopify/Collection/123456",
 *   handle: "floral",
 *   title: "Floral",
 *   image: {
 *     url: "https://cdn.shopify.com/...",
 *     altText: "Floral Collection"
 *   }
 * }
 */