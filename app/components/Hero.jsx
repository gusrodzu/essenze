/**
 * Hero.jsx
 * 
 * Hero Section
 * - Imagen de fondo
 * - Overlay oscuro
 * - Título centrado
 * - Buscador CENTRADO
 * - Parallax desktop
 * - Responsive
 */

import { useState } from 'react';

export default function Hero({
  backgroundImage,
  title = 'Essenze',
  subtitle = 'Discover Luxury Niche Fragrances',
  ctaText = 'Explore',
  ctaLink = '/collections',
  onSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  return (
    <section className="hero-section">
      {/* Background Image */}
      <div
        className="hero-background"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Overlay */}
      <div className="hero-overlay" />

      {/* Content */}
      <div className="hero-content">
        {/* Title */}
        <h1 className="hero-title">{title}</h1>

        {/* Subtitle */}
        <p className="hero-subtitle">{subtitle}</p>

        {/* Search Bar - CENTRADO */}
        <form className="hero-search-form" onSubmit={handleSearch}>
          <div className="hero-search-wrapper">
            <input
              type="text"
              className="hero-search-input"
              placeholder="Buscar fragancias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar fragancias"
            />
            <button type="submit" className="hero-search-button">
              Buscar
            </button>
          </div>
        </form>

        {/* Scroll Indicator */}
        <div className="hero-scroll-indicator">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14m0 0l-7-7m7 7l7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 100%;
          padding: var(--space-8);
          text-align: center;
        }

        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(48px, 12vw, 96px);
          color: var(--color-white);
          margin: 0 0 var(--space-2) 0;
          font-weight: 700;
          letter-spacing: -1px;
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .hero-subtitle {
          font-size: clamp(16px, 3vw, 24px);
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 var(--space-8) 0;
          font-weight: 300;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          max-width: 600px;
        }

        /* Search Form - CENTRADO */
        .hero-search-form {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-8);
        }

        .hero-search-wrapper {
          width: 100%;
          max-width: 650px;
          display: flex;
          gap: var(--space-2);
          padding: 0 var(--space-4);
        }

        .hero-search-input {
          flex: 1;
          padding: var(--space-3) var(--space-4);
          border: 2px solid var(--color-gold-legacy);
          border-radius: var(--radius-md);
          background: var(--color-white);
          color: var(--text-body);
          font-size: var(--text-body-md);
          font-family: var(--font-body);
          transition: all 0.3s ease;
          outline: none;
        }

        .hero-search-input::placeholder {
          color: var(--text-muted);
        }

        .hero-search-input:focus {
          border-color: var(--color-white);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
          background: var(--color-white);
        }

        .hero-search-button {
          padding: var(--space-3) var(--space-5);
          background: var(--color-ink);
          color: var(--color-white);
          border: 2px solid var(--color-ink);
          border-radius: var(--radius-md);
          font-size: var(--text-body-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          font-family: var(--font-body);
        }

        .hero-search-button:hover {
          background: var(--color-gold-legacy);
          border-color: var(--color-gold-legacy);
          color: var(--color-ink);
          transform: translateY(-2px);
        }

        .hero-search-button:active {
          transform: translateY(0);
        }

        /* Scroll Indicator */
        .hero-scroll-indicator {
          position: absolute;
          bottom: var(--space-6);
          left: 50%;
          transform: translateX(-50%);
          color: var(--color-white);
          animation: bounce 2s ease-in-out infinite;
          opacity: 0.7;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(12px);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            height: 80vh;
            min-height: 500px;
          }

          .hero-background {
            backgroundAttachment: scroll !important;
          }

          .hero-title {
            font-size: clamp(36px, 10vw, 60px);
          }

          .hero-subtitle {
            font-size: clamp(14px, 2.5vw, 18px);
            margin-bottom: var(--space-6);
          }

          .hero-search-wrapper {
            flex-direction: column;
            gap: var(--space-3);
          }

          .hero-search-input,
          .hero-search-button {
            width: 100%;
            padding: var(--space-3);
          }

          .hero-scroll-indicator {
            bottom: var(--space-4);
          }
        }

        @media (max-width: 480px) {
          .hero-section {
            height: 70vh;
            min-height: 400px;
          }

          .hero-content {
            padding: var(--space-6);
          }

          .hero-title {
            font-size: clamp(28px, 8vw, 48px);
            margin-bottom: var(--space-2);
          }

          .hero-subtitle {
            font-size: 14px;
            margin-bottom: var(--space-5);
          }

          .hero-search-wrapper {
            padding: 0;
          }

          .hero-search-input,
          .hero-search-button {
            font-size: var(--text-body-sm);
            padding: var(--space-2) var(--space-3);
          }

          .hero-scroll-indicator {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

/**
 * PROPS:
 * 
 * backgroundImage: string (URL de imagen Shopify)
 * title: string (título principal)
 * subtitle: string (subtítulo)
 * ctaText: string (texto botón CTA)
 * ctaLink: string (enlace CTA)
 * onSearch: function (callback búsqueda)
 * 
 * EJEMPLO:
 * 
 * <Hero
 *   backgroundImage="https://..."
 *   title="Essenze"
 *   subtitle="Discover Luxury Niche Fragrances"
 *   ctaText="Explore"
 *   ctaLink="/collections"
 *   onSearch={(query) => navigate(`/search?q=${query}`)}
 * />
 */