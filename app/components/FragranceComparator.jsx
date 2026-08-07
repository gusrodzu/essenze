/**
 * ComparadorFragancias.jsx - Comparador de 3 Fragancias
 * - Comparación lado a lado de hasta 3 productos
 * - Destacar características clave
 * - Mostrar precios y familia aromática
 * - Responsive completo
 * - CSS Modules
 * - Accesible
 */

import { useState } from 'react';
import estilos from './ComparadorFragancias.module.css';

/**
 * ComparadorFragancias - Comparador de fragancias
 * @param {Array} productos - Array de productos para comparar (máximo 3)
 * @param {Function} alSeleccionar - Callback cuando se selecciona un producto
 * @param {String} titulo - Título personalizado
 * @param {String} subtitulo - Subtítulo personalizado
 * @returns {React.ReactElement}
 */
export default function ComparadorFragancias({
  productos = [],
  alSeleccionar = null,
  titulo = 'Compara Nuestras Fragancias',
  subtitulo = 'Descubre las características de cada fragancia y elige la tuya',
}) {
  // Limitar a máximo 3 productos
  const productosLimitados = productos.slice(0, 3);
  const [seleccionados, setSeleccionados] = useState(new Set());

  /**
   * Maneja la selección de un producto
   */
  const manejarSeleccion = (id) => {
    if (alSeleccionar) {
      const producto = productosLimitados.find(p => p.id === id);
      if (producto) {
        alSeleccionar(producto);
      }
    }
  };

  /**
   * Alterna la selección visual de un producto
   */
  const alternarSeleccion = (id) => {
    const nuevaSeleccion = new Set(seleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setSeleccionados(nuevaSeleccion);
  };

  /**
   * Obtiene el valor de una propiedad o retorna N/A
   */
  const obtenerValor = (valor) => {
    if (valor === undefined || valor === null || valor === '') {
      return 'N/A';
    }
    return valor;
  };

  /**
   * Formatea el precio como moneda
   */
  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(precio || 0);
  };

  /**
   * Obtiene el label de la familia aromática
   */
  const obtenerFamilia = (familia) => {
    const familias = {
      floral: '🌸 Floral',
      ambar: '✨ Ámbar',
      citrico: '🍋 Cítrico',
      oriental: '🌹 Oriental',
    };
    return familias[familia?.toLowerCase()] || familia || 'N/A';
  };

  return (
    <section className={estilos.seccion}>
      <div className={estilos.contenedor}>
        {/* Encabezado */}
        <div className={estilos.encabezado}>
          <h2 className={estilos.titulo}>{titulo}</h2>
          {subtitulo && (
            <p className={estilos.subtitulo}>{subtitulo}</p>
          )}
        </div>

        {/* Grid de comparación */}
        <div className={estilos.grid}>
          {productosLimitados.length === 0 ? (
            <div className={estilos.sinProductos}>
              <p className={estilos.textoSinProductos}>
                No hay productos para comparar. Por favor, añade productos a tu carrito de comparación.
              </p>
            </div>
          ) : (
            productosLimitados.map(producto => (
              <div
                key={producto.id}
                className={estilos.tarjeta}
                role="article"
                aria-label={`Producto: ${producto.nombre}`}
              >
                {/* Imagen */}
                <div className={estilos.imagen}>
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      loading="lazy"
                    />
                  ) : (
                    <div className={estilos.imagenPlaceholder}>
                      Imagen no disponible
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className={estilos.contenido}>
                  {/* Nombre */}
                  <h3 className={estilos.nombre}>{producto.nombre}</h3>

                  {/* Items de comparación */}
                  <div className={estilos.items}>
                    {/* Familia Aromática */}
                    {producto.familia && (
                      <div className={`${estilos.item} ${estilos.itemFamilia}`}>
                        <span className={estilos.etiqueta}>Familia</span>
                        <span className={estilos.valor}>
                          {obtenerFamilia(producto.familia)}
                        </span>
                      </div>
                    )}

                    {/* Género Olfativo */}
                    {producto.genero && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Género</span>
                        <span className={estilos.valor}>
                          {producto.genero}
                        </span>
                      </div>
                    )}

                    {/* Ocasión */}
                    {producto.ocasion && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Ocasión</span>
                        <span className={estilos.valor}>
                          {producto.ocasion}
                        </span>
                      </div>
                    )}

                    {/* Volumen */}
                    {producto.volumen && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Volumen</span>
                        <span className={estilos.valor}>
                          {producto.volumen}
                        </span>
                      </div>
                    )}

                    {/* Concentración */}
                    {producto.concentracion && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Concentración</span>
                        <span className={estilos.valor}>
                          {producto.concentracion}
                        </span>
                      </div>
                    )}

                    {/* Precio */}
                    {producto.precio && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Precio</span>
                        <span className={estilos.precioValor}>
                          {formatearPrecio(producto.precio)}
                        </span>
                      </div>
                    )}

                    {/* Puntuación */}
                    {producto.puntuacion && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Puntuación</span>
                        <span className={estilos.valor}>
                          {'★'.repeat(Math.floor(producto.puntuacion))}
                          {'☆'.repeat(5 - Math.floor(producto.puntuacion))}
                          {' '}({producto.puntuacion}/5)
                        </span>
                      </div>
                    )}

                    {/* Reseñas */}
                    {producto.conteoResenas && (
                      <div className={estilos.item}>
                        <span className={estilos.etiqueta}>Reseñas</span>
                        <span className={estilos.valor}>
                          {producto.conteoResenas} reseña
                          {producto.conteoResenas !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botón */}
                  <button
                    className={estilos.botonComparar}
                    onClick={() => {
                      manejarSeleccion(producto.id);
                      alternarSeleccion(producto.id);
                    }}
                    type="button"
                    aria-label={`Ver detalles de ${producto.nombre}`}
                  >
                    {seleccionados.has(producto.id) ? '✓ Seleccionado' : 'Ver Detalles'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * PROPIEDADES:
 *
 * @param {Array<Object>} productos - Array de productos (máximo 3):
 *   {
 *     id: string,
 *     nombre: string,
 *     imagen: string,
 *     precio: number,
 *     familia: string, // 'floral', 'ambar', 'citrico', 'oriental'
 *     genero: string, // 'masculino', 'femenino', 'unisex', 'aventurero'
 *     ocasion: string, // 'diario', 'trabajo', 'noche', 'especial'
 *     volumen: string, // ej: '100ml'
 *     concentracion: string, // ej: 'Eau de Parfum'
 *     puntuacion: number, // 1-5
 *     conteoResenas: number,
 *   }
 *
 * @param {Function} alSeleccionar - Callback cuando se hace click en "Ver Detalles"
 *   Recibe: (producto) => { ... }
 *
 * @param {String} titulo - Título personalizado
 *   DEFAULT: "Compara Nuestras Fragancias"
 *
 * @param {String} subtitulo - Subtítulo personalizado
 *   DEFAULT: "Descubre las características de cada fragancia y elige la tuya"
 *
 * ============================================
 * EJEMPLO DE USO:
 * ============================================
 *
 * const productos = [
 *   {
 *     id: 'essenze-001',
 *     nombre: 'Essenze Signature',
 *     imagen: 'https://cdn.shopify.com/...',
 *     precio: 199.99,
 *     familia: 'floral',
 *     genero: 'femenino',
 *     ocasion: 'especial',
 *     volumen: '100ml',
 *     concentracion: 'Eau de Parfum',
 *     puntuacion: 4.9,
 *     conteoResenas: 156,
 *   },
 *   {
 *     id: 'essenze-002',
 *     nombre: 'Essenze Citrus Soul',
 *     imagen: 'https://cdn.shopify.com/...',
 *     precio: 149.99,
 *     familia: 'citrico',
 *     genero: 'masculino',
 *     ocasion: 'diario',
 *     volumen: '100ml',
 *     concentracion: 'Eau de Toilette',
 *     puntuacion: 4.7,
 *     conteoResenas: 89,
 *   },
 *   {
 *     id: 'essenze-003',
 *     nombre: 'Essenze Midnight',
 *     imagen: 'https://cdn.shopify.com/...',
 *     precio: 249.99,
 *     familia: 'oriental',
 *     genero: 'unisex',
 *     ocasion: 'noche',
 *     volumen: '100ml',
 *     concentracion: 'Eau de Parfum',
 *     puntuacion: 4.8,
 *     conteoResenas: 203,
 *   },
 * ];
 *
 * <ComparadorFragancias
 *   productos={productos}
 *   alSeleccionar={(producto) => {
 *     window.location.href = `/productos/${producto.id}`;
 *   }}
 *   titulo="Elige Tu Fragancia Perfecta"
 *   subtitulo="Compara nuestras mejores fragancias"
 * />
 *
 * ============================================
 * PROPIEDADES OPCIONALES DEL PRODUCTO:
 * ============================================
 *
 * - imagen: URL de imagen del producto
 * - familia: Familia aromática (floral, ambar, citrico, oriental)
 * - genero: Género olfativo (masculino, femenino, unisex, aventurero)
 * - ocasion: Ocasión de uso (diario, trabajo, noche, especial)
 * - volumen: Volumen disponible (ej: 100ml)
 * - concentracion: Tipo de concentración (ej: Eau de Parfum)
 * - precio: Precio del producto
 * - puntuacion: Puntuación de usuarios (1-5)
 * - conteoResenas: Número de reseñas
 *
 * Todas son opcionales y el componente mostrará "N/A" si no están disponibles.
 */