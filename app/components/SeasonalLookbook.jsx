import {useRef} from 'react';
import {useNavigate} from 'react-router';
import {Image} from '@shopify/hydrogen';
import estilos from './LookbookEstacional.module.css';

export default function LookbookEstacional({
titulo = 'Descubre Nuestras Colecciones',
  descripcion = 'Explora nuestras colecciones cuidadosamente seleccionadas y encuentra la fragancia perfecta para cada momento.',
  botonTexto = 'Ver todas',

  colecciones = [
    {
      nombre: 'Primavera',
      handle: 'primavera',
      imagen: '/images/colecciones/rings.webp',
   
    },
    {
      nombre: 'Verano',
      handle: 'verano',
      imagen: '/images/colecciones/necklaces.webp',
  
    },
    {
      nombre: 'Otoño',
      handle: 'otono',
      imagen: '/images/colecciones/bracelets.webp',
   
    },
    {
      nombre: 'Invierno',
      handle: 'invierno',
      imagen: '/images/colecciones/wedding.webp',
    
    },
  ],
}) {
  const navegar = useNavigate();
  const carruselRef = useRef(null);

  const moverCarrusel = (direccion) => {
    if (!carruselRef.current) return;

    carruselRef.current.scrollBy({
      left: direccion * 330,
      behavior: 'smooth',
    });
  };

  return (
    <section className={estilos.lookbook}>
      {/* BLOQUE EDITORIAL */}
      <div className={estilos.contenido}>
        <h2>{titulo}</h2>

        <p className={estilos.descripcion}>{descripcion}</p>

        <button
          className={estilos.botonPrincipal}
          onClick={() => navegar('/collections')}
        >
          {botonTexto}
        </button>
      </div>

      {/* CARRUSEL */}
      <div className={estilos.areaCarrusel}>
        <div className={estilos.controles}>
          <button className={estilos.flecha} onClick={() => moverCarrusel(-1)}>
            ←
          </button>

          <button className={estilos.flecha} onClick={() => moverCarrusel(1)}>
            →
          </button>
        </div>

        <div ref={carruselRef} className={estilos.carrusel}>
          {colecciones.map((coleccion) => (
            <article
              key={coleccion.handle}
              className={estilos.tarjetaColeccion}
            >
              <button
                className={estilos.tarjetaBoton}
                onClick={() => navegar(`/collections/${coleccion.handle}`)}
              >
                <div className={estilos.headerCard}>
                  <div>
                    <span>Colección</span>

                    <h3>{coleccion.nombre}</h3>
                  </div>

      
                </div>

                {coleccion.etiqueta && (
                  <span className={estilos.etiqueta}>{coleccion.etiqueta}</span>
                )}

                <div className={estilos.imagenContenedor}>
                  <Image
                    src={coleccion.imagen}
                    alt={coleccion.nombre}
                    className={estilos.imagenColeccion}
                  />
                </div>

                {/* <div className={estilos.footerCard}>
                  <div>
                    <strong>{coleccion.precio}</strong>

                    <del>{coleccion.precioAnterior}</del>
                  </div>

                  <span className={estilos.addCart}>Add To Cart 🛒</span>
                </div> */}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
