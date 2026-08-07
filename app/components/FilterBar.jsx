/**
 * BarraFiltrosEjemplo.jsx
 * Ejemplo de cómo estructurar la barra de filtros sticky optimizada
 * 
 * Layout: Grid 4 columnas (auto auto 1fr auto)
 * - Columna 1: Toggle filtros (auto)
 * - Columna 2: Contador productos (auto)
 * - Columna 3: Espacio flexible (1fr)
 * - Columna 4: Select ordenamiento (auto)
 */

import { useState } from 'react';
import estilos from './CollectionDetail.module.css';

export default function BarraFiltros({
  productosTotal = 48,
  ordenamiento = 'Más Nuevos',
  onOrdenamientoChange,
  onToggleFiltros,
}) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const handleToggleFiltros = () => {
    setFiltrosAbiertos(!filtrosAbiertos);
    onToggleFiltros?.(!filtrosAbiertos);
  };

  const handleOrdenamientoChange = (e) => {
    onOrdenamientoChange?.(e.target.value);
  };

  return (
    <div className={estilos.barraFiltros}>
      <div className={estilos.contenedorBarraFiltros}>
        
        {/* 
          GRUPO IZQUIERDO (auto auto)
          - Botón Toggle Filtros (auto)
          - Contador Productos (auto)
        */}
        <div className={estilos.grupoIzquierdo}>
          
          {/* COLUMNA 1: Botón Toggle Filtros */}
          <button
            className={estilos.botonToggleFiltros}
            onClick={handleToggleFiltros}
            aria-label="Abrir/cerrar panel de filtros"
            aria-expanded={filtrosAbiertos}
          >
            ☰ Filtros
          </button>

          {/* COLUMNA 2: Contador de Productos */}
          <span 
            className={estilos.contadorProductos}
            role="status"
            aria-live="polite"
          >
            {productosTotal} producto{productosTotal !== 1 ? 's' : ''}
          </span>
        </div>

        {/* 
          COLUMNA 3: Espacio flexible (1fr)
          Este espacio crece automáticamente para separar
          el contador del select hacia la derecha
        */}

        {/* 
          COLUMNA 4: Select Ordenamiento (auto)
          Se alinea a la derecha gracias al grid layout
        */}
        <select
          className={estilos.selectOrdenamiento}
          value={ordenamiento}
          onChange={handleOrdenamientoChange}
          aria-label="Ordenar productos por"
        >
          <option value="Más Nuevos">Más Nuevos</option>
          <option value="Precio: Menor a Mayor">Precio: Menor a Mayor</option>
          <option value="Precio: Mayor a Menor">Precio: Mayor a Menor</option>
          <option value="Nombre: A-Z">Nombre: A-Z</option>
          <option value="Nombre: Z-A">Nombre: Z-A</option>
          <option value="Relevancia">Relevancia</option>
        </select>
      </div>
    </div>
  );
}

/**
 * ESTRUCTURA HTML RESULTANTE:
 * 
 * <div class="barraFiltros">
 *   <div class="contenedorBarraFiltros">
 *     
 *     <div class="grupoIzquierdo">
 *       <button class="botonToggleFiltros">☰ Filtros</button>
 *       <span class="contadorProductos">48 productos</span>
 *     </div>
 *     
 *     <!-- Espacio flexible aquí (1fr) -->
 *     
 *     <select class="selectOrdenamiento">
 *       <option>Más Nuevos</option>
 *       ...
 *     </select>
 *   </div>
 * </div>
 */

/**
 * GRID LAYOUT EXPLICADO:
 * 
 * grid-template-columns: auto auto 1fr auto;
 * 
 * Columna 1 (auto):
 * ├─ Ancho automático según contenido del botón
 * ├─ Botón "☰ Filtros"
 * └─ Ocupa lo mínimo necesario
 * 
 * Columna 2 (auto):
 * ├─ Ancho automático según contenido del contador
 * ├─ "48 productos"
 * └─ Ocupa lo mínimo necesario
 * 
 * Columna 3 (1fr):
 * ├─ ESPACIO FLEXIBLE
 * ├─ Crece/encoge para llenar el espacio disponible
 * ├─ Mantiene separación entre contador y select
 * └─ Responsive automático
 * 
 * Columna 4 (auto):
 * ├─ Ancho automático según contenido del select
 * ├─ Select "Más Nuevos ▼"
 * ├─ Se alinea a la derecha
 * └─ min-width: 160px (para legibilidad)
 */

/**
 * RESPONSIVE BEHAVIOR:
 * 
 * DESKTOP (1280px+):
 * ┌─────────────────────────────────────────────┐
 * │ [☰ Filtros] [48 productos]  [Más Nuevos ▼] │
 * └─────────────────────────────────────────────┘
 *  auto        auto          1fr        auto
 * 
 * TABLET (1024px):
 * ┌──────────────────────────────────────┐
 * │ [☰] [48 prod.]     [Más Nuevos ▼]   │
 * └──────────────────────────────────────┘
 *  auto  auto         1fr     auto
 * 
 * MÓVIL (768px):
 * ┌────────────────────────────────┐
 * │ [☰] [48 prod.]                 │
 * ├────────────────────────────────┤
 * │ [Más Nuevos ▼              ]   │
 * └────────────────────────────────┘
 *  Apilado en 2 filas
 * 
 * MÓVIL PEQUEÑO (480px):
 * ┌──────────────────────────┐
 * │ [☰] [48 prod.]           │
 * │ [Más Nuevos ▼          ] │
 * └──────────────────────────┘
 *  Compacto, legible
 */

/**
 * ESTILOS APLICADOS:
 * 
 * .barraFiltros:
 * - background: #F9F9F9
 * - border-bottom: 1px solid #E0E0E0
 * - padding: 12px 24px
 * - position: sticky; top: 80px
 * 
 * .contenedorBarraFiltros:
 * - display: grid
 * - grid-template-columns: auto auto 1fr auto
 * - gap: 24px (32px en algunos breakpoints)
 * - max-width: 1400px
 * 
 * .grupoIzquierdo:
 * - display: flex
 * - gap: 12px
 * - align-items: center
 * 
 * .botonToggleFiltros:
 * - background: transparent
 * - border: 1px solid #CCCCCC
 * - color: #333333
 * - font-size: 11px
 * - text-transform: uppercase
 * 
 * .contadorProductos:
 * - font-family: 'Playfair Display'
 * - font-size: 13px
 * - font-weight: 600
 * - color: #1a1a1a
 * 
 * .selectOrdenamiento:
 * - background: #FFFFFF
 * - border: 1px solid #E0E0E0
 * - color: #1a1a1a
 * - font-size: 13px
 * - min-width: 160px
 */

/**
 * ACCESIBILIDAD:
 * 
 * ✅ aria-label en botón toggle
 * ✅ aria-expanded para estado
 * ✅ aria-label en select
 * ✅ role="status" en contador
 * ✅ aria-live="polite" para cambios
 * ✅ Suficiente contraste de color
 * ✅ Touch-friendly (min 44px height)
 * ✅ Navegable con teclado
 */

/**
 * EJEMPLO DE USO EN PÁGINA:
 * 
 * import BarraFiltros from './BarraFiltros';
 * 
 * export default function CollectionPage() {
 *   const [ordenamiento, setOrdenamiento] = useState('Más Nuevos');
 *   const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
 * 
 *   return (
 *     <>
 *       <BarraFiltros
 *         productosTotal={48}
 *         ordenamiento={ordenamiento}
 *         onOrdenamientoChange={setOrdenamiento}
 *         onToggleFiltros={setFiltrosAbiertos}
 *       />
 *       
 *       <div className={estilos.contenedorContenido}>
 *         {filtrosAbiertos && <Sidebar />}
 *         <div className={estilos.gridProductos}>
 *           {/* Productos aquí */}
 *         </div>
 *       </div>
 *     </>
 *   );
 * }
 */