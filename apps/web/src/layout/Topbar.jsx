import {useCallback, useEffect, useState} from 'react';
import {
  Bell,
  Bot,
  ChevronDown,
  Command,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {apiRequest} from '../api';
import {useAuth} from '../auth/AuthContext';
import {useTheme} from '../framework/ThemeContext';
import styles from './Topbar.module.css';

const pageNames = {
  '/': ['Inicio', 'Centro del negocio'],
  '/agenda': ['Business OS', 'Agenda central'],
  '/ventas': ['Sales App', 'Centro comercial'],
  '/ventas/operacion': ['Sales App', 'Entregas y facturación'],
  '/ventas/devoluciones': ['Sales App', 'Devoluciones y notas de crédito'],
  '/ventas/cobranza': ['Sales App', 'Cobranza'],
  '/compras': ['Compras', 'Centro de compras'],
  '/compras/solicitudes': ['Compras', 'Solicitudes'],
  '/compras/ordenes': ['Compras', 'Órdenes de compra'],
  '/compras/recepciones': ['Compras', 'Recepciones'],
  '/compras/proveedores': ['Compras', 'Proveedores'],
  '/inventario/productos': ['Inventario', 'Productos'],
  '/inventario/existencias': ['Inventario', 'Existencias'],
  '/inventario/movimientos': ['Inventario', 'Movimientos'],
  '/inventario/operaciones': ['Inventario', 'Transferencias y ajustes'],
  '/almacenes': ['Inventario', 'Almacenes'],
  '/administracion': ['Administración', 'Centro administrativo'],
  '/finanzas': ['Finanzas', 'Cuentas por pagar'],
  '/finanzas/cuentas-por-pagar': ['Finanzas', 'Cuentas por pagar'],
  '/finanzas/cuentas-por-cobrar': ['Finanzas', 'Cuentas por cobrar'],
  '/finanzas/tesoreria': ['Finanzas', 'Tesorería'],
  '/finanzas/presupuestos': ['Finanzas', 'Presupuestos'],
  '/finanzas/conciliacion-bancaria': ['Finanzas', 'Conciliación bancaria'],
  '/finanzas/flujo-efectivo': ['Finanzas', 'Flujo de efectivo'],
  '/finanzas/contabilidad': ['Finanzas', 'Contabilidad'],
  '/recursos-humanos': ['Recursos humanos', 'Empleados y estructura'],
  '/recursos-humanos/operacion': ['Recursos humanos', 'Asistencias e incidencias'],
  '/recursos-humanos/expedientes': ['Recursos humanos', 'Expedientes'],
  '/recursos-humanos/prenomina': ['Recursos humanos', 'Prenómina'],
  '/reportes': ['Reportes', 'Inteligencia ejecutiva'],
  '/configuracion/actividad': ['Configuración', 'Centro de actividad'],
};

export default function Topbar({
  onOpenMobile,
  onOpenCommand,
  onOpenAI,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const {user, logout} = useAuth();
  const {theme, toggleTheme} = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [section, page] = pageNames[location.pathname] ?? ['Business OS', 'Área de trabajo'];

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiRequest('/activity/notifications');
      setNotifications(response.notifications || []);
      setUnread(response.unread || 0);
    } catch {
      // La barra superior no debe bloquear la navegación si falla el centro de actividad.
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60_000);
    const onFocus = () => loadNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadNotifications]);

  async function openNotification(item) {
    if (!item.read) {
      try {
        await apiRequest(`/activity/notifications/${item.id}/read`, {method: 'PATCH'});
      } catch {}
    }
    setNotificationsOpen(false);
    await loadNotifications();
    if (item.link) navigate(item.link);
  }

  useEffect(() => {
    function handleKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenCommand();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onOpenCommand]);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.mobileMenu} onClick={onOpenMobile} aria-label="Abrir navegación">
          <Menu size={20} />
        </button>
        <div className={styles.breadcrumb}>
          <span>{section}</span>
          <strong>{page}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.search} onClick={onOpenCommand}>
          <Search size={18} />
          <span className={styles.searchText}>Buscar en BuzzBee...</span>
          <kbd><Command size={11} /> K</kbd>
        </button>

        <button className={styles.iconButton} onClick={onOpenAI} aria-label="Abrir Buzz AI">
          <Bot size={18} />
        </button>

        <button className={styles.iconButton} onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className={styles.popoverWrap}>
          <button
            className={styles.iconButton}
            aria-label="Notificaciones"
            onClick={() => {setNotificationsOpen((value) => !value); loadNotifications();}}
          >
            <Bell size={18} />
            {unread ? <span className={styles.notificationDot} /> : null}
          </button>
          {notificationsOpen ? (
            <div className={`${styles.popover} ${styles.notificationPopover}`}>
              <header><strong>Notificaciones</strong><span>{unread ? `${unread} nueva${unread===1?'':'s'}` : 'Al día'}</span></header>
              {notifications.slice(0,4).map(item => (
                <button key={item.id} onClick={() => openNotification(item)}>
                  {!item.read ? <i /> : null}
                  {item.title}
                  <small>{item.message}</small>
                </button>
              ))}
              {!notifications.length ? <div className={styles.notificationEmpty}>No tienes notificaciones pendientes.</div> : null}
              <Link to="/configuracion/actividad" onClick={() => setNotificationsOpen(false)}>
                Ver centro de actividad
              </Link>
            </div>
          ) : null}
        </div>

        <div className={styles.popoverWrap}>
          <button className={styles.profile} onClick={() => setProfileOpen((value) => !value)}>
            <span className={styles.avatar}>{`${user?.firstName?.[0] ?? 'U'}${user?.lastName?.[0] ?? ''}`}</span>
            <span className={styles.profileCopy}>
              <strong>{user?.fullName ?? 'Usuario'}</strong>
              <small>{user?.roles?.[0]?.name ?? 'Colaborador'}</small>
            </span>
            <ChevronDown size={15} />
          </button>
          {profileOpen ? (
            <div className={`${styles.popover} ${styles.profilePopover}`}>
              <button>Mi perfil</button>
              <button>Preferencias</button>
              <button onClick={() => navigate('/configuracion/actividad')}>Actividad</button>
              <hr />
              <button onClick={async () => { await logout(); navigate('/login', {replace: true}); }}>
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
