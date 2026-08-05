/**
 * FilterBar.jsx
 * Barra de controles: Toggle filtros + Contador + Sort
 * Componente independiente sin conflictos con Aside
 */

import styles from '~/styles/FilterBar.module.css';

export function FilterBar({
  showFilters,
  onToggleFilters,
  productCount,
  sortBy,
  onSortChange,
}) {
  return (
    <div className={styles.filterBar}>
      <button 
        className={styles.toggleButton}
        onClick={onToggleFilters}
        aria-label="Alternar filtros"
      >
        ⚙️ Ocultar Filtros
      </button>
      
      <div className={styles.spacer} />

      <div className={styles.resultInfo}>
        <span className={styles.productCount}>
          {productCount} producto{productCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.sortContainer}>
        <label htmlFor="collection-sort" className={styles.sortLabel}>
          Ordenar por:
        </label>
        <select 
          id="collection-sort"
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="newest">Más vendidos</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
          <option value="title">Nombre A-Z</option>
        </select>
      </div>
    </div>
  );
}