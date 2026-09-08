import {statusLabel} from '../design-system/i18n/uiLanguage.js';
import {useEffect, useMemo, useState} from 'react';
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import Sales from './Sales';
import styles from './SalesEnterprise.module.css';

import KpiInfo from '../components/KpiInfo';
import {ModuleHeader,ModuleTabs} from '../components/module-system';
import KpiCard from '../components/KpiCard';
const stages = [
  {id: 'LEAD', label: 'Prospecto'},
  {id: 'CONTACTED', label: 'Contactado'},
  {id: 'QUALIFIED', label: 'Calificado'},
  {id: 'PROPOSAL', label: 'Propuesta'},
  {id: 'WON', label: 'Ganado'},
  {id: 'LOST', label: 'Perdido'},
];

const stageTones = {
  LEAD: 'neutral',
  CONTACTED: 'warning',
  QUALIFIED: 'warning',
  PROPOSAL: 'neutral',
  WON: 'success',
  LOST: 'danger',
};

const activityIcons = {
  NOTE: Activity,
  CALL: Activity,
  EMAIL: Activity,
  MEETING: CalendarClock,
  TASK: CheckCircle2,
  STATUS_CHANGE: TrendingUp,
};

const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Sin fecha';

const blankProspect = () => ({
  name: '',
  companyName: '',
  email: '',
  phone: '',
  stage: 'LEAD',
  estimatedValue: '',
  probability: 10,
  source: '',
  nextActionAt: '',
  notes: '',
});

export default function SalesEnterprise() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({
    summary: {},
    pipeline: [],
    prospects: [],
    quotes: [],
    orders: [],
    receivables: [],
    activities: [],
  });
  const [query, setQuery] = useState('');
  const [prospectModal, setProspectModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/sales-enterprise/dashboard');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const filteredProspects = useMemo(
    () =>
      data.prospects.filter((item) =>
        `${item.name} ${item.companyName || ''} ${item.email || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.prospects, query],
  );

  async function saveProspect(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const method = prospectModal.id ? 'PUT' : 'POST';
      const url = prospectModal.id
        ? `/sales-enterprise/prospects/${prospectModal.id}`
        : '/sales-enterprise/prospects';

      await apiRequest(url, {
        method,
        body: {
          ...prospectModal,
          estimatedValue: Number(prospectModal.estimatedValue || 0),
          probability: Number(prospectModal.probability || 0),
          nextActionAt: prospectModal.nextActionAt || null,
          companyName: prospectModal.companyName || null,
          email: prospectModal.email || null,
          phone: prospectModal.phone || null,
          source: prospectModal.source || null,
          notes: prospectModal.notes || null,
        },
      });

      setProspectModal(null);
      setMessage(['success', 'Prospecto guardado correctamente']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function changeStage(prospect, stage) {
    try {
      await apiRequest(`/sales-enterprise/prospects/${prospect.id}/stage`, {
        method: 'PATCH',
        body: {stage},
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const maxPipeline = Math.max(
    1,
    ...data.pipeline.map((item) => Number(item.value || 0)),
  );

  return (
    <div className={styles.page}>
      <ModuleHeader
        eyebrow="Ventas · Sales App"
        title="Centro comercial"
        description="Prospectos, cotizaciones, pedidos, cartera y actividad en una sola experiencia."
        actions={<>
          <Button variant="secondary" icon={FileText} onClick={() => setTab('operations')}>
            Nueva cotización
          </Button>
          <Button icon={Plus} onClick={() => setProspectModal(blankProspect())}>
            Nuevo prospecto
          </Button>
        </>}
      />

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <ModuleTabs
        active={tab}
        onChange={setTab}
        items={[
          {id:'overview',label:'Resumen',icon:LayoutDashboard},
          {id:'pipeline',label:'Pipeline',icon:Target,count:data.prospects?.length||0},
          {id:'operations',label:'Cotizaciones y pedidos',icon:ShoppingBag}
        ]}
      />

      {tab === 'operations' ? (
        <Sales />
      ) : (
        <>
          <section className={styles.metrics}>
            <KpiCard>
              <BadgeDollarSign />
              <span>Ventas del mes</span><KpiInfo title="Ventas mensuales">Importe de pedidos confirmados o entregados durante el mes actual.</KpiInfo>
              <strong>{money(data.summary.monthSales)}</strong>
              <small>Pedidos confirmados y entregados</small>
            </KpiCard>
            <KpiCard>
              <FileText />
              <span>Cotizaciones abiertas</span><KpiInfo title="Propuestas abiertas">Cotizaciones en borrador o enviadas pendientes de resolución.</KpiInfo>
              <strong>{data.summary.openQuotes || 0}</strong>
              <small>{data.summary.conversionRate || 0}% de conversión</small>
            </KpiCard>
            <KpiCard>
              <ShoppingBag />
              <span>Pedidos activos</span><KpiInfo title="Pedidos en operaci\u00f3n">Pedidos confirmados o parcialmente entregados.</KpiInfo>
              <strong>{data.summary.activeOrders || 0}</strong>
              <small>Pendientes de cierre</small>
            </KpiCard>
            <KpiCard>
              <CircleDollarSign />
              <span>Cobranza pendiente</span><KpiInfo title="Saldo por cobrar">Saldo abierto de las cuentas por cobrar comerciales.</KpiInfo>
              <strong>{money(data.summary.openReceivables)}</strong>
              <small>Cuentas por cobrar abiertas</small>
            </KpiCard>
            <KpiCard>
              <Users />
              <span>Prospectos activos</span><KpiInfo title="Oportunidades abiertas">Prospectos que todavía no están marcados como ganados o perdidos.</KpiInfo>
              <strong>{data.summary.prospects || 0}</strong>
              <small>{data.summary.customers || 0} clientes activos</small>
            </KpiCard>
          </section>

          {tab === 'overview' ? (
            <>
              <section className={styles.mainGrid}>
                <Card className={styles.pipelineCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>Pipeline</span>
                      <h2>Valor por etapa comercial</h2>
                    </div>
                    <button onClick={() => setTab('pipeline')}>
                      Ver pipeline <ArrowRight size={15} />
                    </button>
                  </div>

                  <div className={styles.funnel}>
                    {data.pipeline
                      .filter((item) => item.stage !== 'LOST')
                      .map((item) => {
                        const stage = stages.find((entry) => entry.id === item.stage);
                        return (
                          <div key={item.stage}>
                            <div className={styles.funnelCopy}>
                              <span>{stage?.label}</span>
                              <strong>{money(item.value)}</strong>
                              <small>{item.count} oportunidades</small>
                            </div>
                            <div className={styles.funnelTrack}>
                              <i
                                style={{
                                  width: `${Math.max(
                                    5,
                                    (Number(item.value) / maxPipeline) * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>

                <Card className={styles.activityCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>Actividad</span>
                      <h2>Movimiento reciente</h2>
                    </div>
                  </div>

                  <div className={styles.activityList}>
                    {data.activities.slice(0, 7).map((item) => {
                      const Icon = activityIcons[item.type] || Activity;
                      const entity =
                        item.prospect?.companyName ||
                        item.prospect?.name ||
                        item.customer?.commercialName ||
                        item.customer?.legalName;

                      return (
                        <article key={item.id}>
                          <div className={styles.activityIcon}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description || entity || 'Actividad comercial'}</p>
                            <small>
                              {item.createdBy.firstName} {item.createdBy.lastName}
                              {' · '}
                              {dateTime(item.createdAt)}
                            </small>
                          </div>
                        </article>
                      );
                    })}

                    {!data.activities.length ? (
                      <div className={styles.empty}>Aún no hay actividad comercial.</div>
                    ) : null}
                  </div>
                </Card>
              </section>

              <section className={styles.secondaryGrid}>
                <Card className={styles.listCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>Cotizaciones</span>
                      <h2>Propuestas recientes</h2>
                    </div>
                  </div>
                  <div className={styles.compactList}>
                    {data.quotes.slice(0, 6).map((item) => (
                      <button key={item.id} onClick={() => setTab('operations')}>
                        <div>
                          <strong>{item.folio}</strong>
                          <span>
                            {item.customer.commercialName || item.customer.legalName}
                          </span>
                        </div>
                        <div>
                          <strong>{money(item.total)}</strong>
                          <Badge tone={item.status === 'ACCEPTED' ? 'success' : 'neutral'}>
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className={styles.listCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>Cobranza</span>
                      <h2>Saldos próximos</h2>
                    </div>
                    <button onClick={() => navigate('/finanzas/cuentas-por-cobrar')}>
                      Abrir CxC <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className={styles.compactList}>
                    {data.receivables.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate('/finanzas/cuentas-por-cobrar')}
                      >
                        <div>
                          <strong>{item.invoiceNumber}</strong>
                          <span>
                            {item.customer.commercialName || item.customer.legalName}
                          </span>
                        </div>
                        <div>
                          <strong>
                            {money(Number(item.total) - Number(item.paidAmount))}
                          </strong>
                          <small>{dateTime(item.dueDate)}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </section>
            </>
          ) : (
            <Card className={styles.kanbanCard}>
              <div className={styles.pipelineToolbar}>
                <div>
                  <span className={styles.cardEyebrow}>Pipeline Kanban</span>
                  <h2>Oportunidades comerciales</h2>
                </div>
                <label className={styles.search}>
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar prospecto"
                  />
                </label>
              </div>

              <div className={styles.kanban}>
                {stages.map((stage) => {
                  const rows = filteredProspects.filter(
                    (item) => item.stage === stage.id,
                  );

                  return (
                    <section key={stage.id} className={styles.column}>
                      <header>
                        <span>{stage.label}</span>
                        <strong>{rows.length}</strong>
                      </header>

                      <div className={styles.cards}>
                        {rows.map((prospect) => (
                          <article
                            key={prospect.id}
                            onClick={() =>
                              setProspectModal({
                                ...prospect,
                                estimatedValue: Number(prospect.estimatedValue),
                                nextActionAt: prospect.nextActionAt
                                  ? new Date(prospect.nextActionAt)
                                      .toISOString()
                                      .slice(0, 16)
                                  : '',
                              })
                            }
                          >
                            <div className={styles.prospectTop}>
                              <span className={styles.prospectAvatar}>
                                {prospect.name.slice(0, 1).toUpperCase()}
                              </span>
                              <Badge tone={stageTones[prospect.stage]}>
                                {prospect.probability}%
                              </Badge>
                            </div>
                            <h3>{prospect.companyName || prospect.name}</h3>
                            <p>{prospect.companyName ? prospect.name : prospect.email || 'Sin contacto'}</p>
                            <strong>{money(prospect.estimatedValue)}</strong>
                            <small>
                              {prospect.nextActionAt
                                ? `Próxima acción: ${dateTime(prospect.nextActionAt)}`
                                : 'Sin próxima acción'}
                            </small>

                            <select
                              value={prospect.stage}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                event.stopPropagation();
                                changeStage(prospect, event.target.value);
                              }}
                            >
                              {stages.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.label}
                                </option>
                              ))}
                            </select>
                          </article>
                        ))}

                        {!rows.length ? (
                          <div className={styles.columnEmpty}>Sin oportunidades</div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {prospectModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveProspect}>
            <header>
              <div>
                <span>Pipeline comercial</span>
                <h2>{prospectModal.id ? 'Editar prospecto' : 'Nuevo prospecto'}</h2>
              </div>
              <button type="button" onClick={() => setProspectModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <Input
                  label="Nombre del contacto"
                  required
                  value={prospectModal.name}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Empresa"
                  value={prospectModal.companyName || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Correo"
                  type="email"
                  value={prospectModal.email || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Teléfono"
                  value={prospectModal.phone || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid3}>
                <label>
                  Etapa
                  <select
                    value={prospectModal.stage}
                    onChange={(event) =>
                      setProspectModal((current) => ({
                        ...current,
                        stage: event.target.value,
                      }))
                    }
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Valor estimado"
                  type="number"
                  min="0"
                  step="0.01"
                  value={prospectModal.estimatedValue}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      estimatedValue: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Probabilidad %"
                  type="number"
                  min="0"
                  max="100"
                  value={prospectModal.probability}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      probability: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Origen"
                  placeholder="Referido, web, evento..."
                  value={prospectModal.source || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Próxima acción"
                  type="datetime-local"
                  value={prospectModal.nextActionAt || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      nextActionAt: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Notas
                <textarea
                  rows="4"
                  value={prospectModal.notes || ''}
                  onChange={(event) =>
                    setProspectModal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProspectModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar prospecto
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
