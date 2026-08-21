import {Form, Link, useNavigation} from 'react-router';
import styles from './CatalogToolbar.module.css';

const SORT_OPTIONS = [
  {value: 'featured', label: 'Destacados'},
  {value: 'newest', label: 'Más recientes'},
  {value: 'price-asc', label: 'Precio: menor a mayor'},
  {value: 'price-desc', label: 'Precio: mayor a menor'},
  {value: 'title-asc', label: 'Nombre: A–Z'},
];

export default function CatalogToolbar({
  sort = 'featured',
  availableOnly = false,
  currentCount = 0,
  contextLabel = 'Catálogo Essenze',
}) {
  const navigation = useNavigation();
  const loading = navigation.state !== 'idle';

  return (
    <div className={styles.shell} aria-label="Controles del catálogo">
      <div className={styles.meta}>
        <span className={styles.metaLabel}>{contextLabel}</span>
        <span className={styles.count} aria-live="polite">
          {currentCount} {currentCount === 1 ? 'producto' : 'productos'} en esta página
        </span>
      </div>

      <div className={styles.discovery} aria-label="Explorar por">
        <Link to="/#familias-olfativas">Familia olfativa</Link>
        <Link to="/marcas">Marca</Link>
        <Link to="/asesor">Asesor</Link>
      </div>

      <Form method="get" className={styles.form} preventScrollReset>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="available"
            value="1"
            checked={availableOnly}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
          <span aria-hidden="true" />
          Disponibles
        </label>

        <label className={styles.sort}>
          <span>Ordenar</span>
          <select
            name="sort"
            value={sort}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            aria-label="Ordenar productos"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {loading ? <span className={styles.loading} aria-label="Actualizando catálogo" /> : null}
      </Form>
    </div>
  );
}
