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
import estilos from '~/styles/CollectionDetail.module.css';

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
            type="button"
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
