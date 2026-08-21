import {useMemo, useRef} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import estilos from './LookbookEstacional.module.css';

/**
 * Vitrina editorial de colecciones.
 * Trabaja directamente con las colecciones reales de Shopify para evitar
 * contenido de demostración o enlaces a colecciones inexistentes.
 */
export default function SeasonalLookbook({
  titulo = 'Descubre Nuestras Colecciones',
  descripcion = 'Explora selecciones cuidadosamente curadas y encuentra una fragancia para cada momento, estilo y personalidad.',
  botonTexto = 'Ver todas las colecciones',
  collections = [],
  colecciones,
}) {
  const carruselRef = useRef(null);

  const curatedCollections = useMemo(() => {
    const source = Array.isArray(collections) && collections.length
      ? collections
      : Array.isArray(colecciones)
        ? colecciones
        : [];

    return source
      .filter((collection) => collection?.handle && collection?.title !== 'Home page')
      .slice(0, 8)
      .map((collection, index) => ({
        id: collection.id || collection.handle,
        nombre: collection.title || collection.nombre || 'Colección Essenze',
        handle: collection.handle,
        image: collection.image || (collection.imagen ? {url: collection.imagen, altText: collection.nombre} : null),
        etiqueta: index === 0 ? 'Selección Essenze' : null,
      }));
  }, [collections, colecciones]);

  if (!curatedCollections.length) return null;

  const moverCarrusel = (direccion) => {
    if (!carruselRef.current) return;
    const card = carruselRef.current.querySelector(`.${estilos.tarjetaColeccion}`);
    const amount = (card?.getBoundingClientRect().width || 330) + 14;
    carruselRef.current.scrollBy({left: direccion * amount, behavior: 'smooth'});
  };

  return (
    <section id="colecciones-destacadas" className={estilos.lookbook} aria-labelledby="seasonal-lookbook-title" data-motion-reveal>
      <div className={estilos.contenido}>
        <h2 id="seasonal-lookbook-title">{titulo}</h2>
        <p className={estilos.descripcion}>{descripcion}</p>
        <Link prefetch="intent" to="/collections" className={estilos.botonPrincipal}>
          {botonTexto}
        </Link>
      </div>

      <div className={estilos.areaCarrusel}>
        {curatedCollections.length > 2 ? (
          <div className={estilos.controles} aria-label="Controles del carrusel">
            <button type="button" className={estilos.flecha} onClick={() => moverCarrusel(-1)} aria-label="Colecciones anteriores">←</button>
            <button type="button" className={estilos.flecha} onClick={() => moverCarrusel(1)} aria-label="Colecciones siguientes">→</button>
          </div>
        ) : null}

        <div ref={carruselRef} className={estilos.carrusel} role="list" aria-label="Colecciones destacadas">
          {curatedCollections.map((collection) => (
            <article key={collection.id} className={estilos.tarjetaColeccion} role="listitem" data-motion-surface>
              <Link
                prefetch="intent"
                to={`/collections/${collection.handle}`}
                className={estilos.tarjetaBoton}
                aria-label={`Explorar colección ${collection.nombre}`}
              >
                <div className={estilos.headerCard}>
                  <div>
                    <span>Colección</span>
                    <h3>{collection.nombre}</h3>
                  </div>
                </div>

                {collection.etiqueta ? <span className={estilos.etiqueta}>{collection.etiqueta}</span> : null}

                <div className={`${estilos.imagenContenedor} ${!collection.image?.url ? estilos.imagenFallback : ''}`}>
                  {collection.image?.url ? (
                    <Image
                      data={collection.image}
                      alt={collection.image.altText || collection.nombre}
                      className={estilos.imagenColeccion}
                      sizes="(min-width: 901px) 34vw, 72vw"
                      loading="lazy"
                    />
                  ) : (
                    <span className={estilos.fallbackMonogram} aria-hidden="true">E</span>
                  )}
                </div>

                <div className={estilos.footerCard}>
                  <span className={estilos.addCart}>Explorar colección</span>
                  <span aria-hidden="true">↗</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
