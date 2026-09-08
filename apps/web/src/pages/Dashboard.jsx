import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  GripVertical,
  PackageX,
  Plus,
  Settings2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {useAuth} from '../auth/AuthContext';
import {Badge, Button, Card, Switch} from '../design-system/components';
import {quickActions} from '../data/navigation';
import styles from './Dashboard.module.css';

const STORAGE_KEY = 'erp-dashboard-preferences';

const widgetCatalog = [
  {id: 'requests', label: 'Solicitudes recientes', description: 'Últimas solicitudes de compra.'},
  {id: 'purchaseChart', label: 'Compras mensuales', description: 'Tendencia anual de compras.'},
  {id: 'quickActions', label: 'Acciones rápidas', description: 'Atajos frecuentes del ERP.'},
  {id: 'stock', label: 'Alertas de inventario', description: 'Productos con stock crítico.'},
  {id: 'calendar', label: 'Agenda financiera', description: 'Próximos cobros y pagos.'},
  {id: 'team', label: 'Actividad de usuarios', description: 'Usuarios activos recientemente.'},
  {id: 'spend', label: 'Inventario por categoría', description: 'Distribución del valor de inventario.'},
];

const defaultPreferences = {hiddenWidgets: [], compact: false};

function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? {...defaultPreferences, ...JSON.parse(stored)} : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

const money = (value, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', {style: 'currency', currency, maximumFractionDigits: 0}).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat('es-MX', {maximumFractionDigits: 1}).format(Number(value || 0));

const shortMonth = (date) =>
  new Intl.DateTimeFormat('es-MX', {month: 'short'}).format(new Date(date)).replace('.', '').toUpperCase();

const statusTone = {
  Pendiente: 'warning',
  Borrador: 'neutral',
  Aprobada: 'success',
  Rechazada: 'danger',
  Ordenada: 'info',
  Cancelada: 'danger',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {user} = useAuth();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const visibleWidgets = useMemo(
    () => new Set(widgetCatalog.filter((widget) => !preferences.hiddenWidgets.includes(widget.id)).map((widget) => widget.id)),
    [preferences.hiddenWidgets],
  );

  function toggleWidget(widgetId) {
    setPreferences((current) => ({
      ...current,
      hiddenWidgets: current.hiddenWidgets.includes(widgetId)
        ? current.hiddenWidgets.filter((id) => id !== widgetId)
        : [...current.hiddenWidgets, widgetId],
    }));
  }

  function resetDashboard() {
    setPreferences(defaultPreferences);
  }

  if (loading) {
    return <div className={styles.page}><Card><p>Cargando información operativa…</p></Card></div>;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Card>
          <h2>No fue posible cargar el panel principal</h2>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const currency = data?.company?.currency || 'MXN';
  const kpis = [
    {
      label: 'Solicitudes pendientes',
      value: number(data?.kpis?.pendingRequests),
      change: 'Por atender',
      trend: 'up',
      icon: ClipboardCheck,
      tone: 'blue',
    },
    {
      label: 'Órdenes del mes',
      value: number(data?.kpis?.ordersThisMonth),
      change: `${data?.kpis?.purchaseChange >= 0 ? '+' : ''}${number(data?.kpis?.purchaseChange)}%`,
      trend: data?.kpis?.purchaseChange >= 0 ? 'up' : 'down',
      icon: ShoppingBag,
      tone: 'violet',
    },
    {
      label: 'Valor de inventario',
      value: money(data?.kpis?.inventoryValue, currency),
      change: 'Valor actual',
      trend: 'up',
      icon: CircleDollarSign,
      tone: 'green',
    },
    {
      label: 'Stock crítico',
      value: number(data?.kpis?.criticalStock),
      change: 'Requiere atención',
      trend: 'down',
      icon: PackageX,
      tone: 'amber',
    },
  ];

  const monthlyValues = (data?.monthlyPurchases || []).map((item) => Number(item.total || 0));
  const purchaseTotal = monthlyValues.reduce((sum, value) => sum + value, 0);
  const recentNotifications = data?.notifications || [];
  const insight = recentNotifications[0]
    ? `${recentNotifications[0].title}: ${recentNotifications[0].message}`
    : data?.kpis?.criticalStock
      ? `${data.kpis.criticalStock} productos requieren revisión de inventario.`
      : 'La operación no presenta alertas críticas en este momento.';

  return (
    <div className={`${styles.page} ${preferences.compact ? styles.compact : ''}`}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            {new Intl.DateTimeFormat('es-MX', {weekday: 'long', day: 'numeric', month: 'long'}).format(new Date())}
          </span>
          <h1>¡Buenos días, {data?.user?.firstName || user?.firstName || 'Usuario'}! 👋</h1>
          <p>Así va {data?.company?.name || 'tu empresa'} hoy. Prioridades, operación e inteligencia en un solo lugar.</p>
        </div>
        <div className={styles.headingActions}>
          <Badge tone="success" dot>Datos conectados</Badge>
          <Button variant="secondary" icon={Settings2} onClick={() => setCustomizerOpen(true)}>Personalizar</Button>
          <Button icon={Plus} onClick={() => navigate('/compras/solicitudes')}>Nueva solicitud</Button>
        </div>
      </section>

      <section className={styles.insightBanner}>
        <div className={styles.insightIcon}><Sparkles size={20} /></div>
        <div><strong>Requiere tu atención</strong><p>{insight}</p></div>
        <button type="button" onClick={() => navigate('/aprobaciones')}>Ver todas las tareas <ChevronRight size={15} /></button>
      </section>

      <section className={styles.kpiGrid}>
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card className={styles.kpiCard} key={item.label}>
              <div className={`${styles.kpiIcon} ${styles[item.tone]}`}><Icon size={20} /></div>
              <div className={styles.kpiMeta}><span>{item.label}</span><strong>{item.value}</strong></div>
              <span className={`${styles.change} ${styles[item.trend]}`}>
                {item.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {item.change}
              </span>
            </Card>
          );
        })}
      </section>

      <section className={styles.dashboardGrid}>
        {visibleWidgets.has('requests') ? (
          <Card className={`${styles.widget} ${styles.requestsWidget}`}>
            <WidgetHeader title="Solicitudes recientes" description="Últimos movimientos registrados en compras." onDetail={() => navigate('/compras/solicitudes')} />
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Folio</th><th>Área</th><th>Solicitante</th><th>Monto</th><th>Estado</th></tr></thead>
                <tbody>
                  {(data?.recentRequests || []).map((request) => (
                    <tr key={request.id}>
                      <td><strong>{request.folio}</strong></td>
                      <td>{request.area}</td>
                      <td><span className={styles.person}><i>{getInitials(request.requester)}</i>{request.requester}</span></td>
                      <td>{money(request.amount, currency)}</td>
                      <td><Badge tone={statusTone[request.status] || 'neutral'} dot>{request.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.recentRequests?.length ? <div className={styles.empty}>No hay solicitudes registradas.</div> : null}
            </div>
          </Card>
        ) : null}

        {visibleWidgets.has('purchaseChart') ? (
          <Card className={`${styles.widget} ${styles.chartWidget}`}>
            <WidgetHeader title="Compras mensuales" description="Monto de órdenes durante los últimos 12 meses." onDetail={() => navigate('/compras/ordenes')} />
            <div className={styles.chartSummary}>
              <div>
                <strong>{money(purchaseTotal, currency)}</strong>
                <span><TrendingUp size={14} /> últimos 12 meses</span>
              </div>
              <Badge tone="info">{new Date().getFullYear()}</Badge>
            </div>
            <MiniBarChart values={monthlyValues} />
            <div className={styles.monthLabels}>
              {(data?.monthlyPurchases || []).map((item) => (
                <span key={item.key}>{shortMonth(new Date(Date.UTC(item.year, item.month - 1, 1))).slice(0, 1)}</span>
              ))}
            </div>
          </Card>
        ) : null}

        {visibleWidgets.has('quickActions') ? (
          <Card className={`${styles.widget} ${styles.quickWidget}`}>
            <WidgetHeader title="Acciones rápidas" description="Atajos para tareas frecuentes." compact />
            <div className={styles.quickList}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button type="button" key={action.label} onClick={() => action.to && navigate(action.to)}>
                    <span><Icon size={18} /></span><strong>{action.label}</strong><ChevronRight size={16} />
                  </button>
                );
              })}
            </div>
          </Card>
        ) : null}

        {visibleWidgets.has('stock') ? (
          <Card className={`${styles.widget} ${styles.stockWidget}`}>
            <WidgetHeader
              title="Alertas de inventario"
              description="Productos por debajo del stock mínimo."
              badge={<Badge tone={data?.criticalProducts?.length ? 'danger' : 'success'}>{data?.criticalProducts?.length || 0} críticas</Badge>}
            />
            <div className={styles.stockList}>
              {(data?.criticalProducts || []).map((item) => (
                <div key={`${item.sku}-${item.warehouse}`}>
                  <span className={styles.stockIcon}><Box size={18} /></span>
                  <div><strong>{item.name}</strong><small>{item.sku} · {item.warehouse}</small></div>
                  <div className={styles.stockNumbers}><strong>{number(item.stock)}</strong><small>Mín. {number(item.min)}</small></div>
                </div>
              ))}
              {!data?.criticalProducts?.length ? <div className={styles.empty}>Sin alertas críticas.</div> : null}
            </div>
          </Card>
        ) : null}

        {visibleWidgets.has('calendar') ? (
          <Card className={`${styles.widget} ${styles.calendarWidget}`}>
            <WidgetHeader title="Agenda financiera" description="Próximos vencimientos registrados." />
            <div className={styles.calendarList}>
              {(data?.agenda || []).slice(0, 3).map((item) => (
                <AgendaItem
                  key={item.id}
                  date={item.date}
                  title={item.title}
                  meta={`${item.meta} · ${money(item.amount, currency)}`}
                  tone={item.type === 'RECEIVABLE' ? 'blue' : 'amber'}
                />
              ))}
              {!data?.agenda?.length ? <div className={styles.empty}>No hay vencimientos próximos.</div> : null}
            </div>
            <button className={styles.fullLink} type="button" onClick={() => navigate('/finanzas/flujo-efectivo')}>
              <CalendarDays size={15} /> Ver flujo de efectivo
            </button>
          </Card>
        ) : null}

        {visibleWidgets.has('spend') ? (
          <Card className={`${styles.widget} ${styles.spendWidget}`}>
            <WidgetHeader title="Inventario por categoría" description="Distribución del valor actual del inventario." onDetail={() => navigate('/inventario/existencias')} />
            <div className={styles.spendTotal}><strong>{money(data?.kpis?.inventoryValue, currency)}</strong><small>Valor total</small></div>
            <div className={styles.spendList}>
              {(data?.categorySpend || []).map((item) => (
                <div key={item.label}>
                  <div><span>{item.label}</span><strong>{number(item.percent)}%</strong></div>
                  <i><b style={{width: `${Math.min(100, item.percent)}%`}} /></i>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {visibleWidgets.has('team') ? (
          <Card className={`${styles.widget} ${styles.teamWidget}`}>
            <WidgetHeader title="Actividad de usuarios" description="Usuarios activos durante las últimas 24 horas." onDetail={() => navigate('/configuracion/usuarios')} />
            <div className={styles.teamMetric}>
              <span><Users size={22} /></span>
              <div><strong>{data?.activity?.activeUsers || 0} de {data?.activity?.totalUsers || 0}</strong><small>usuarios activos</small></div>
            </div>
            <div className={styles.avatarStack}>
              {(data?.activity?.users || []).slice(0, 5).map((item) => <i key={item.id} title={item.name}>{getInitials(item.name)}</i>)}
              {(data?.activity?.activeUsers || 0) > 5 ? <i>+{data.activity.activeUsers - 5}</i> : null}
            </div>
            <div className={styles.activityStatus}><Activity size={14} /><span>Información tomada de accesos reales</span></div>
          </Card>
        ) : null}
      </section>

      {customizerOpen ? (
        <DashboardCustomizer
          preferences={preferences}
          onClose={() => setCustomizerOpen(false)}
          onToggleWidget={toggleWidget}
          onCompactChange={(compact) => setPreferences((current) => ({...current, compact}))}
          onReset={resetDashboard}
        />
      ) : null}
    </div>
  );
}

function WidgetHeader({title, description, badge, compact = false, onDetail}) {
  return (
    <header className={`${styles.cardHeader} ${compact ? styles.compactHeader : ''}`}>
      <span className={styles.dragHandle} aria-hidden="true"><GripVertical size={15} /></span>
      <div><h2>{title}</h2><p>{description}</p></div>
      {badge || (onDetail ? <button type="button" onClick={onDetail}>Ver detalle <ChevronRight size={15} /></button> : null)}
    </header>
  );
}

function MiniBarChart({values}) {
  const safeValues = values.length ? values : [0];
  const max = Math.max(...safeValues, 1);
  return (
    <div className={styles.barChart} role="img" aria-label="Gráfica de compras mensuales">
      {safeValues.map((value, index) => (
        <span key={`${value}-${index}`}><i style={{height: `${value ? Math.max(12, (value / max) * 100) : 4}%`}} /></span>
      ))}
    </div>
  );
}

function AgendaItem({date, title, meta, tone}) {
  const value = new Date(date);
  return (
    <div className={styles.agendaItem}>
      <span className={`${styles.agendaDate} ${styles[tone]}`}>
        <strong>{String(value.getDate()).padStart(2, '0')}</strong>
        <small>{shortMonth(value).slice(0, 3)}</small>
      </span>
      <div><strong>{title}</strong><small>{meta}</small></div>
      <ChevronRight size={16} />
    </div>
  );
}

function DashboardCustomizer({preferences, onClose, onToggleWidget, onCompactChange, onReset}) {
  return (
    <div className={styles.customizerOverlay} role="presentation" onMouseDown={onClose}>
      <aside className={styles.customizer} role="dialog" aria-modal="true" aria-labelledby="customizer-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span>Panel principal</span><h2 id="customizer-title">Personalizar experiencia</h2><p>Elige qué información quieres ver al iniciar.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar personalización"><X size={19} /></button>
        </header>
        <section className={styles.customizerSection}>
          <div className={styles.settingRow}>
            <div><strong>Vista compacta</strong><small>Reduce espacios para mostrar más información.</small></div>
            <Switch checked={preferences.compact} onChange={(event) => onCompactChange(event.target.checked)} />
          </div>
        </section>
        <section className={styles.customizerSection}>
          <h3>Widgets visibles</h3>
          <div className={styles.widgetOptions}>
            {widgetCatalog.map((widget) => {
              const active = !preferences.hiddenWidgets.includes(widget.id);
              return (
                <button type="button" className={active ? styles.widgetOptionActive : ''} onClick={() => onToggleWidget(widget.id)} key={widget.id}>
                  <span>{active ? <Check size={15} /> : null}</span>
                  <div><strong>{widget.label}</strong><small>{widget.description}</small></div>
                </button>
              );
            })}
          </div>
        </section>
        <footer><Button variant="ghost" onClick={onReset}>Restablecer</Button><Button onClick={onClose}>Guardar cambios</Button></footer>
      </aside>
    </div>
  );
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'US';
}
