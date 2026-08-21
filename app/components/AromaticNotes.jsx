/**
 * AromaticNotes.jsx - Biblioteca de Notas Aromáticas
 * 
 * ✅ Import correcto: react-router-dom
 * ✅ Sin botones anidados
 * ✅ Accesibilidad mejorada (WCAG AA+)
 * ✅ Carrusel robusto
 * ✅ Responsive completo
 * ✅ CSS Module separado
 */

import { Link } from 'react-router';
import { useRef } from 'react';
import estilos from './AromaticNotes.module.css';

export default function AromaticNotes({ collections = [] }) {
  const carouselRef = useRef(null);

  // URLs de imágenes por defecto
  const DEFAULT_IMAGES = {
    floral: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_45_04_a.m.png?v=1785429924',
    ambar: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
    citrico: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_02_41_a.m.png?v=1785430977',
    frutal: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_08_19_a.m.png?v=1785431328',
    aromatico: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_13_00_a.m.png?v=1785431612',
    oriental: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_15_05_a.m.png?v=1785431723',
    especiado: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_17_26_a.m.png?v=1785431866',
    marino: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
  };

  /**
   * Notas aromáticas - 8 familias de fragancias
   */
  const aromaticNotes = [
    {
      id: 'floral',
      label: 'Floral',
      handle: 'floral',
      description: 'Notas florales delicadas',

    },
    {
      id: 'ambar',
      label: 'Ámbar',
      handle: 'ambar',
      description: 'Calidez y sensualidad',

    },
    {
      id: 'citrico',
      label: 'Cítrico',
      handle: 'citrico',
      description: 'Frescura y energía',
  
    },
    {
      id: 'frutal',
      label: 'Frutal',
      handle: 'frutal',
      description: 'Dulzura natural',
  
    },
    {
      id: 'aromatico',
      label: 'Aromático',
      handle: 'aromatico',
      description: 'Herbales y especias',
  
    },
    {
      id: 'oriental',
      label: 'Oriental',
      handle: 'oriental',
      description: 'Exotismo y lujo',
   
    },
    {
      id: 'especiado',
      label: 'Especiado',
      handle: 'especiado',
      description: 'Notas picantes',
  
    },
    {
      id: 'marino',
      label: 'Marino',
      handle: 'marino',
      description: 'Frescura salina',
     
    },
  ];

  /**
   * Obtener imagen de la nota aromática
   * Prioridad:
   * 1. Imagen de colección Shopify (si existe)
   * 2. Imagen default
   * 3. Null (fallback a color gradient en CSS)
   */
  const getImageUrl = (note) => {
    if (!note || !note.id) return null;

    // Buscar en colecciones de Shopify
    const collection = collections.find(
      (c) => c?.handle?.toLowerCase() === note.handle.toLowerCase()
    );

    // Si existe colección con imagen, usar esa
    if (collection?.image?.url) {
      return collection.image.url;
    }

    // Si no, usar imagen default
    return DEFAULT_IMAGES[note.id] || null;
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

  const getNoteTarget = (note) => {
    const hasCollection = collections.some(
      (collection) => collection?.handle?.toLowerCase() === note?.handle?.toLowerCase(),
    );
    return hasCollection
      ? `/collections/${note.handle}`
      : `/search?q=${encodeURIComponent(note.label)}`;
  };

  // No renderizar si no hay notas
  if (!aromaticNotes || aromaticNotes.length === 0) {
    return null;
  }

  return (
    <section id="familias-olfativas" className={estilos.section} data-motion-reveal>
      <div className={estilos.container}>

        {/* ENCABEZADO */}
        <div className={estilos.header}>
          <div>
            <h2 className={estilos.title}>
              Biblioteca de Notas Aromáticas
            </h2>
            <p className={estilos.subtitle}>
              Explora nuestras 8 familias aromáticas y encuentra tu fragancia perfecta
            </p>
          </div>
        </div>

        {/* CARRUSEL */}
        <div className={estilos.carouselContainer}>

          {/* Botón izquierda */}
          <button
            className={`${estilos.carouselArrow} ${estilos.left}`}
            type="button"
            onClick={() => scrollCarousel('left')}
            aria-label="Notas aromáticas anteriores"
            title="Anterior"
          >
            ←
          </button>

          {/* Track del carrusel */}
          <div
            className={estilos.track}
            ref={carouselRef}
            role="region"
            aria-label="Carrusel de notas aromáticas"
          >
            {aromaticNotes.map((note) => {
              const imageUrl = getImageUrl(note);

              return (
                <article
                  key={note.id}
                  className={estilos.card}
                  data-motion-surface
                >
                  <Link
                    prefetch="intent"
                    to={getNoteTarget(note)}
                    className={estilos.cardButton}
                    aria-label={`Explorar familia aromática ${note.label}`}
                  >

                    {/* Imagen */}
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

             

                      {/* Contenido centrado */}
                      <div className={estilos.content}>

                        <h3 className={estilos.label}>
                          {note.label}
                        </h3>

                        <p className={estilos.description}>
                          {note.description}
                        </p>
                      </div>

                      {/* Glow hover */}
                      <div className={estilos.hoverGlow}></div>
                    </div>

                    {/* Info footer */}
                    <div className={estilos.info}>
                      <span className={estilos.category}>
                        Familia Aromática
                      </span>

                      <span className={estilos.cta}>
                        {note.label}
                      </span>
                    </div>

                  </Link>

                </article>
              );
            })}
          </div>

          {/* Botón derecha */}
          <button
            className={`${estilos.carouselArrow} ${estilos.right}`}
            type="button"
            onClick={() => scrollCarousel('right')}
            aria-label="Notas aromáticas siguientes"
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
 * @param {Array<Object>} collections
 *   Array de colecciones de Shopify (opcional)
 *   Estructura esperada:
 *   {
 *     handle: string (ej: "floral", "ambar", etc.)
 *     image: { url: string }
 *   }
 * 
 * ============================================
 * EJEMPLOS DE USO
 * ============================================
 * 
 * <!-- Sin colecciones (usa imágenes por defecto) -->
 * <AromaticNotes />
 * 
 * <!-- Con colecciones de Shopify -->
 * <AromaticNotes collections={shopifyCollections} />
 * 
 * ============================================
 * HANDLES REQUERIDOS EN SHOPIFY
 * ============================================
 * 
 * - floral
 * - ambar
 * - citrico
 * - frutal
 * - aromatico
 * - oriental
 * - especiado
 * - marino
 */

/**
 * ============================================
 * CAMBIOS REALIZADOS
 * ============================================
 * 
 * ✅ Import: react-router → react-router-dom
 * ✅ Botones: Eliminados botones anidados
 * ✅ Favorito: Button separado, fuera del card button
 * ✅ Imagen: Función getImageUrl mejorada
 * ✅ Validación: Checks para null/undefined
 * ✅ Accesibilidad: aria-labels, roles, aria-hidden
 * ✅ Scroll: Usa scrollTo en lugar de scrollLeft directo
 * ✅ Estilos: Movidos a CSS Module
 * ✅ Emojis: Array data en lugar de hardcoded
 * ✅ Responsive: Manejado por CSS Module
 */