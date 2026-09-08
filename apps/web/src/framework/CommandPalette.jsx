import {useEffect, useMemo, useState} from 'react';
import {ArrowRight, Command, Search, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {adminNavigation, isDiscoverable, navigation, quickActions} from '../data/navigation';
import styles from './CommandPalette.module.css';

function flatten(items) {
  return items.flatMap((item) =>
    item.children
      ? item.children.map((child) => ({
          label: child.label,
          group: item.label,
          to: child.to,
          icon: item.icon,
        }))
      : [{label: item.label, group: 'Apps', to: item.to, icon: item.icon}],
  );
}

function uniqueByRoute(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.group}|${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CommandPalette({open, onClose}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const commands = useMemo(
    () => [
      ...quickActions.map((item) => ({...item, group: 'Acciones rápidas'})),
      ...uniqueByRoute([...flatten(navigation.filter(isDiscoverable)), ...flatten(adminNavigation.filter(isDiscoverable))]),
    ],
    [],
  );

  const filtered = commands.filter((item) =>
    `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()),
  );

  if (!open) return null;

  function select(item) {
    navigate(item.to);
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <section className={styles.palette} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <Search size={20} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar Apps, pantallas y acciones..."
          />
          <span><Command size={12} /> K</span>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className={styles.results}>
          {filtered.length ? filtered.slice(0, 12).map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={`${item.group}-${item.label}-${index}`} onClick={() => select(item)}>
                <span className={styles.icon}><Icon size={18} /></span>
                <span className={styles.copy}>
                  <strong>{item.label}</strong>
                  <small>{item.group}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            );
          }) : <div className={styles.empty}>No encontramos resultados para “{query}”.</div>}
        </div>

        <footer>
          <span>↑↓ Navegar</span>
          <span>Enter Abrir</span>
          <span>Esc Cerrar</span>
        </footer>
      </section>
    </div>
  );
}
