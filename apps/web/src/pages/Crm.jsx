import {useEffect, useMemo, useState} from 'react';
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  ListTodo,
  Mail,
  Phone,
  Plus,
  Search,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import {ModuleTabs} from '../components/module-system';
import styles from './Crm.module.css';

const stages = [
  {id: 'LEAD', label: 'Lead'},
  {id: 'CONTACTED', label: 'Contactado'},
  {id: 'QUALIFIED', label: 'Calificado'},
  {id: 'PROPOSAL', label: 'Propuesta'},
  {id: 'WON', label: 'Ganado'},
  {id: 'LOST', label: 'Perdido'},
];

const stageTone = {
  LEAD: 'neutral',
  CONTACTED: 'info',
  QUALIFIED: 'warning',
  PROPOSAL: 'warning',
  WON: 'success',
  LOST: 'danger',
};

const activityTypeLabel = {
  NOTE: 'Nota',
  CALL: 'Llamada',
  EMAIL: 'Correo',
  MEETING: 'Reunión',
  TASK: 'Tarea',
  STATUS_CHANGE: 'Cambio de etapa',
};

const blankLead = () => ({
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

const blankActivity = (prospectId = '') => ({
  prospectId,
  type: 'TASK',
  title: '',
  description: '',
  dueAt: '',
});

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

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isConverted(prospect) {
  return prospect.activities?.some(
    (activity) => activity.customerId && activity.title === 'Prospecto convertido a cliente',
  );
}

export default function Crm() {
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState({
    summary: {},
    pipeline: [],
    prospects: [],
    activities: [],
  });
  const [prospects, setProspects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [leadModal, setLeadModal] = useState(null);
  const [activityModal, setActivityModal] = useState(null);
  const [conversionModal, setConversionModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [crmData, prospectData, customerData] = await Promise.all([
        apiRequest('/sales-enterprise/dashboard'),
        apiRequest('/sales-enterprise/prospects'),
        apiRequest('/customers'),
      ]);
      setDashboard(crmData);
      setProspects(prospectData.prospects || []);
      setCustomers(customerData.customers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((error) => {
      setMessage(['error', error.message]);
      setLoading(false);
    });
  }, []);

  const openProspects = prospects.filter((item) => !['WON', 'LOST'].includes(item.stage));
  const weightedPipeline = openProspects.reduce(
    (sum, item) => sum + Number(item.estimatedValue || 0) * (Number(item.probability || 0) / 100),
    0,
  );
  const won = prospects.filter((item) => item.stage === 'WON').length;
  const lost = prospects.filter((item) => item.stage === 'LOST').length;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
  const now = new Date();
  const overdueActivities = dashboard.activities.filter(
    (item) => item.dueAt && !item.completedAt && new Date(item.dueAt) < now,
  );
  const pendingActivities = dashboard.activities.filter(
    (item) => item.dueAt && !item.completedAt,
  );
  const thisMonthLeads = prospects.filter((item) => {
    const created = new Date(item.createdAt);
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    );
  }).length;

  const filteredProspects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return prospects;
    return prospects.filter((item) =>
      `${item.name} ${item.companyName || ''} ${item.email || ''} ${item.phone || ''} ${item.source || ''}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [prospects, query]);

  const pipelineValue = stages.reduce((acc, stage) => {
    acc[stage.id] = prospects
      .filter((item) => item.stage === stage.id)
      .reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
    return acc;
  }, {});

  async function saveLead(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const editing = Boolean(leadModal.id);
      await apiRequest(
        editing
          ? `/sales-enterprise/prospects/${leadModal.id}`
          : '/sales-enterprise/prospects',
        {
          method: editing ? 'PUT' : 'POST',
          body: {
            ...leadModal,
            estimatedValue: Number(leadModal.estimatedValue || 0),
            probability: Number(leadModal.probability || 0),
            companyName: leadModal.companyName || null,
            email: leadModal.email || null,
            phone: leadModal.phone || null,
            source: leadModal.source || null,
            nextActionAt: leadModal.nextActionAt || null,
            notes: leadModal.notes || null,
          },
        },
      );
      setLeadModal(null);
      setMessage(['success', editing ? 'Oportunidad actualizada' : 'Lead creado correctamente']);
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

  async function saveActivity(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/sales-enterprise/activities', {
        method: 'POST',
        body: {
          ...activityModal,
          prospectId: activityModal.prospectId || null,
          description: activityModal.description || null,
          dueAt: activityModal.dueAt || null,
        },
      });
      setActivityModal(null);
      setMessage(['success', 'Seguimiento registrado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivity(activity) {
    try {
      await apiRequest(`/sales-enterprise/activities/${activity.id}/complete`, {
        method: 'PATCH',
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  function openConversion(prospect) {
    const slug = (prospect.companyName || prospect.name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 5)
      .toUpperCase();
    setConversionModal({
      prospectId: prospect.id,
      prospectName: prospect.name,
      code: `CRM-${slug || 'CLI'}`,
      legalName: prospect.companyName || prospect.name,
      commercialName: prospect.companyName || '',
      taxId: '',
      contactName: prospect.name,
      email: prospect.email || '',
      phone: prospect.phone || '',
      address: '',
      creditDays: 0,
      creditLimit: 0,
    });
  }

  async function convertProspect(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const {prospectId, prospectName, ...body} = conversionModal;
      const response = await apiRequest(
        `/sales-enterprise/prospects/${prospectId}/convert`,
        {
          method: 'POST',
          body: {
            ...body,
            commercialName: body.commercialName || null,
            taxId: body.taxId || null,
            contactName: body.contactName || null,
            email: body.email || null,
            phone: body.phone || null,
            address: body.address || null,
            creditDays: Number(body.creditDays || 0),
            creditLimit: Number(body.creditLimit || 0),
          },
        },
      );
      setConversionModal(null);
      setMessage([
        'success',
        `${prospectName} se convirtió en el cliente ${response.customer.code}`,
      ]);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !prospects.length) {
    return (
      <div className={styles.page}>
        <Card className={styles.loadingCard}>Cargando CRM…</Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>CRM · Customer Relationship Management</span>
          <h1>Centro de relaciones comerciales</h1>
          <p>
            Gestiona leads, oportunidades, seguimientos y conversiones a cliente desde
            un solo espacio conectado con Ventas y Finanzas.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={CalendarClock}
            onClick={() => setActivityModal(blankActivity())}
          >
            Nueva actividad
          </Button>
          <Button icon={UserPlus} onClick={() => setLeadModal(blankLead())}>
            Nuevo lead
          </Button>
        </div>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          <span>{message[1]}</span>
          <button type="button" onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      ) : null}

      <ModuleTabs
        active={tab}
        onChange={setTab}
        items={[
          {id:'overview',label:'Resumen',icon:LayoutDashboard},
          {id:'pipeline',label:'Pipeline',icon:Target},
          {id:'leads',label:'Leads y oportunidades',icon:Users},
          {id:'activities',label:'Actividades',icon:ListTodo,count:overdueActivities.length||undefined}
        ]}
      />

      <section className={styles.metrics}>
        <KpiCard>
          <Target />
          <span>Pipeline abierto</span>
          <KpiInfo title="Pipeline abierto">Suma del valor estimado de oportunidades que aún no están ganadas ni perdidas.</KpiInfo>
          <strong>{money(openProspects.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0))}</strong>
          <small>{openProspects.length} oportunidades activas</small>
        </KpiCard>
        <KpiCard>
          <BadgeDollarSign />
          <span>Pipeline ponderado</span>
          <KpiInfo title="Pipeline ponderado">Valor estimado multiplicado por la probabilidad de cierre de cada oportunidad.</KpiInfo>
          <strong>{money(weightedPipeline)}</strong>
          <small>Pronóstico comercial</small>
        </KpiCard>
        <KpiCard>
          <TrendingUp />
          <span>Tasa de cierre</span>
          <KpiInfo title="Tasa de cierre">Oportunidades ganadas sobre el total de oportunidades cerradas.</KpiInfo>
          <strong>{winRate}%</strong>
          <small>{won} ganadas · {lost} perdidas</small>
        </KpiCard>
        <KpiCard>
          <UserPlus />
          <span>Leads del mes</span>
          <KpiInfo title="Leads del mes">Prospectos creados durante el mes calendario actual.</KpiInfo>
          <strong>{thisMonthLeads}</strong>
          <small>{prospects.length} prospectos históricos</small>
        </KpiCard>
        <KpiCard>
          <Clock3 />
          <span>Seguimientos vencidos</span>
          <KpiInfo title="Seguimientos vencidos">Actividades con fecha límite pasada que todavía no han sido completadas.</KpiInfo>
          <strong>{overdueActivities.length}</strong>
          <small>{pendingActivities.length} actividades pendientes</small>
        </KpiCard>
      </section>

      {tab === 'overview' ? (
        <Overview
          prospects={prospects}
          activities={dashboard.activities}
          customers={customers}
          pipelineValue={pipelineValue}
          onOpenPipeline={() => setTab('pipeline')}
          onOpenActivities={() => setTab('activities')}
          onEdit={setLeadModal}
          onConvert={openConversion}
        />
      ) : null}

      {tab === 'pipeline' ? (
        <Pipeline
          prospects={filteredProspects}
          query={query}
          setQuery={setQuery}
          onEdit={setLeadModal}
          onStage={changeStage}
          onActivity={(prospect) => setActivityModal(blankActivity(prospect.id))}
          onConvert={openConversion}
        />
      ) : null}

      {tab === 'leads' ? (
        <LeadList
          prospects={filteredProspects}
          query={query}
          setQuery={setQuery}
          onEdit={setLeadModal}
          onActivity={(prospect) => setActivityModal(blankActivity(prospect.id))}
          onConvert={openConversion}
        />
      ) : null}

      {tab === 'activities' ? (
        <Activities
          activities={dashboard.activities}
          prospects={prospects}
          onCreate={() => setActivityModal(blankActivity())}
          onToggle={toggleActivity}
        />
      ) : null}

      {leadModal ? (
        <LeadModal
          value={leadModal}
          setValue={setLeadModal}
          onClose={() => setLeadModal(null)}
          onSubmit={saveLead}
          saving={saving}
        />
      ) : null}

      {activityModal ? (
        <ActivityModal
          value={activityModal}
          setValue={setActivityModal}
          prospects={prospects}
          onClose={() => setActivityModal(null)}
          onSubmit={saveActivity}
          saving={saving}
        />
      ) : null}

      {conversionModal ? (
        <ConversionModal
          value={conversionModal}
          setValue={setConversionModal}
          onClose={() => setConversionModal(null)}
          onSubmit={convertProspect}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function Overview({prospects, activities, customers, pipelineValue, onOpenPipeline, onOpenActivities, onEdit, onConvert}) {
  const open = prospects.filter((item) => !['WON', 'LOST'].includes(item.stage));
  const next = [...open]
    .filter((item) => item.nextActionAt)
    .sort((a, b) => new Date(a.nextActionAt) - new Date(b.nextActionAt))
    .slice(0, 5);
  const recentActivities = activities.slice(0, 6);
  const max = Math.max(1, ...Object.values(pipelineValue));

  return (
    <div className={styles.overviewGrid}>
      <Card className={styles.pipelineSummary}>
        <CardHeader eyebrow="Forecast" title="Embudo comercial" action="Ver pipeline" onAction={onOpenPipeline} />
        <div className={styles.funnel}>
          {stages.filter((stage) => !['LOST'].includes(stage.id)).map((stage) => {
            const count = prospects.filter((item) => item.stage === stage.id).length;
            const value = pipelineValue[stage.id] || 0;
            return (
              <div key={stage.id}>
                <div className={styles.funnelTop}>
                  <span>{stage.label}</span>
                  <strong>{money(value)}</strong>
                  <small>{count} oportunidades</small>
                </div>
                <div className={styles.funnelTrack}><i style={{width: `${Math.max(value ? 8 : 0, (value / max) * 100)}%`}} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className={styles.nextActions}>
        <CardHeader eyebrow="Prioridad" title="Próximos seguimientos" action="Ver agenda" onAction={onOpenActivities} />
        <div className={styles.nextList}>
          {next.map((item) => (
            <button key={item.id} type="button" onClick={() => onEdit({...item, estimatedValue: String(item.estimatedValue), nextActionAt: item.nextActionAt ? item.nextActionAt.slice(0, 16) : ''})}>
              <span className={styles.avatar}>{initials(item.name)}</span>
              <div><strong>{item.name}</strong><small>{item.companyName || 'Sin empresa'}</small></div>
              <time>{dateTime(item.nextActionAt)}</time>
            </button>
          ))}
          {!next.length ? <Empty text="No hay seguimientos próximos." /> : null}
        </div>
      </Card>

      <Card className={styles.hotOpportunities}>
        <CardHeader eyebrow="Oportunidades" title="Mayor potencial" action="Ver todas" onAction={onOpenPipeline} />
        <div className={styles.opportunityList}>
          {[...open].sort((a, b) => Number(b.estimatedValue) - Number(a.estimatedValue)).slice(0, 5).map((item) => (
            <article key={item.id}>
              <div className={styles.avatar}>{initials(item.name)}</div>
              <div className={styles.opportunityCopy}>
                <strong>{item.companyName || item.name}</strong>
                <small>{item.name} · {item.probability}% prob.</small>
              </div>
              <div className={styles.opportunityValue}>
                <strong>{money(item.estimatedValue)}</strong>
                <Badge tone={stageTone[item.stage]}>{stages.find((stage) => stage.id === item.stage)?.label}</Badge>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card className={styles.activityCard}>
        <CardHeader eyebrow="Actividad" title="Últimos contactos" action="Registrar" onAction={onOpenActivities} />
        <div className={styles.activityFeed}>
          {recentActivities.map((item) => (
            <article key={item.id}>
              <span className={styles.activityIcon}>{item.completedAt ? <Check size={15} /> : <Activity size={15} />}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description || activityTypeLabel[item.type]}</p>
                <small>
                  {item.prospect?.companyName || item.prospect?.name || item.customer?.commercialName || item.customer?.legalName || 'Actividad comercial'} · {dateTime(item.createdAt)}
                </small>
              </div>
            </article>
          ))}
          {!recentActivities.length ? <Empty text="Todavía no hay actividad comercial." /> : null}
        </div>
      </Card>

      <Card className={styles.customerCard}>
        <CardHeader eyebrow="Base comercial" title="Clientes conectados" />
        <div className={styles.customerMetric}>
          <span><Building2 size={23} /></span>
          <div><strong>{customers.filter((item) => item.active).length}</strong><small>clientes activos</small></div>
        </div>
        <p>Las conversiones del CRM crean clientes directamente en la base financiera y comercial del ERP.</p>
        <div className={styles.wonList}>
          {prospects.filter((item) => item.stage === 'WON').slice(0, 3).map((item) => (
            <div key={item.id}>
              <span>{initials(item.name)}</span>
              <div><strong>{item.companyName || item.name}</strong><small>{isConverted(item) ? 'Cliente creado' : 'Pendiente de convertir'}</small></div>
              {!isConverted(item) ? <button type="button" onClick={() => onConvert(item)}>Convertir</button> : <CheckCircle2 size={17} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Pipeline({prospects, query, setQuery, onEdit, onStage, onActivity, onConvert}) {
  return (
    <Card className={styles.pipelineCard}>
      <div className={styles.toolbar}>
        <div>
          <span className={styles.cardEyebrow}>Kanban comercial</span>
          <h2>Pipeline de oportunidades</h2>
        </div>
        <SearchBox value={query} onChange={setQuery} />
      </div>
      <div className={styles.kanban}>
        {stages.map((stage) => {
          const items = prospects.filter((item) => item.stage === stage.id);
          return (
            <section className={styles.column} key={stage.id}>
              <header>
                <div><span>{stage.label}</span><strong>{money(items.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0))}</strong></div>
                <i>{items.length}</i>
              </header>
              <div className={styles.cards}>
                {items.map((item) => (
                  <article key={item.id}>
                    <div className={styles.prospectTop}>
                      <span className={styles.avatar}>{initials(item.name)}</span>
                      <Badge tone={stageTone[item.stage]}>{item.probability}%</Badge>
                    </div>
                    <button className={styles.cardTitle} type="button" onClick={() => onEdit({...item, estimatedValue: String(item.estimatedValue), nextActionAt: item.nextActionAt ? item.nextActionAt.slice(0, 16) : ''})}>
                      <strong>{item.companyName || item.name}</strong>
                      <small>{item.name}</small>
                    </button>
                    <strong className={styles.amount}>{money(item.estimatedValue)}</strong>
                    <div className={styles.cardMeta}>
                      <span>{item.source || 'Sin fuente'}</span>
                      <span>{item.nextActionAt ? dateTime(item.nextActionAt) : 'Sin seguimiento'}</span>
                    </div>
                    <select value={item.stage} onChange={(event) => onStage(item, event.target.value)}>
                      {stages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => onActivity(item)}><CalendarClock size={14} /> Seguimiento</button>
                      {item.stage === 'WON' && !isConverted(item) ? (
                        <button type="button" onClick={() => onConvert(item)}><ArrowRight size={14} /> Cliente</button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!items.length ? <Empty text="Sin oportunidades" /> : null}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function LeadList({prospects, query, setQuery, onEdit, onActivity, onConvert}) {
  return (
    <Card className={styles.listCard}>
      <div className={styles.toolbar}>
        <div><span className={styles.cardEyebrow}>Directorio CRM</span><h2>Leads y oportunidades</h2></div>
        <SearchBox value={query} onChange={setQuery} />
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>Contacto</th><th>Empresa</th><th>Etapa</th><th>Valor</th><th>Probabilidad</th><th>Próximo paso</th><th></th></tr></thead>
          <tbody>
            {prospects.map((item) => (
              <tr key={item.id}>
                <td>
                  <button className={styles.contactCell} type="button" onClick={() => onEdit({...item, estimatedValue: String(item.estimatedValue), nextActionAt: item.nextActionAt ? item.nextActionAt.slice(0, 16) : ''})}>
                    <span>{initials(item.name)}</span>
                    <div><strong>{item.name}</strong><small>{item.email || item.phone || 'Sin contacto'}</small></div>
                  </button>
                </td>
                <td>{item.companyName || '—'}</td>
                <td><Badge tone={stageTone[item.stage]}>{stages.find((stage) => stage.id === item.stage)?.label}</Badge></td>
                <td><strong>{money(item.estimatedValue)}</strong></td>
                <td>{item.probability}%</td>
                <td>{item.nextActionAt ? dateTime(item.nextActionAt) : 'Sin fecha'}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button type="button" title="Registrar seguimiento" onClick={() => onActivity(item)}><CalendarClock size={16} /></button>
                    {item.stage === 'WON' && !isConverted(item) ? (
                      <button type="button" title="Convertir a cliente" onClick={() => onConvert(item)}><UserPlus size={16} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!prospects.length ? <Empty text="No se encontraron prospectos." /> : null}
      </div>
    </Card>
  );
}

function Activities({activities, prospects, onCreate, onToggle}) {
  const sorted = [...activities].sort((a, b) => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
    return new Date(a.dueAt || a.createdAt) - new Date(b.dueAt || b.createdAt);
  });
  const now = new Date();

  return (
    <Card className={styles.activitiesCard}>
      <div className={styles.toolbar}>
        <div><span className={styles.cardEyebrow}>Seguimiento</span><h2>Agenda de actividades</h2></div>
        <Button icon={Plus} onClick={onCreate}>Nueva actividad</Button>
      </div>
      <div className={styles.agenda}>
        {sorted.map((item) => {
          const overdue = item.dueAt && !item.completedAt && new Date(item.dueAt) < now;
          const prospect = prospects.find((row) => row.id === item.prospectId);
          return (
            <article className={`${styles.agendaItem} ${item.completedAt ? styles.completed : ''}`} key={item.id}>
              <button className={styles.completeButton} type="button" onClick={() => onToggle(item)} title={item.completedAt ? 'Reabrir actividad' : 'Completar actividad'}>
                {item.completedAt ? <Check size={16} /> : null}
              </button>
              <span className={styles.agendaType}>{activityTypeLabel[item.type] || item.type}</span>
              <div className={styles.agendaCopy}>
                <strong>{item.title}</strong>
                <p>{item.description || 'Sin descripción adicional.'}</p>
                <small>{prospect?.companyName || prospect?.name || item.customer?.commercialName || item.customer?.legalName || 'Actividad general'}</small>
              </div>
              <div className={styles.agendaDate}>
                {overdue ? <Badge tone="danger">Vencida</Badge> : item.completedAt ? <Badge tone="success">Completada</Badge> : <Badge tone="info">Pendiente</Badge>}
                <time>{dateTime(item.dueAt || item.createdAt)}</time>
              </div>
            </article>
          );
        })}
        {!sorted.length ? <Empty text="No hay actividades registradas." /> : null}
      </div>
    </Card>
  );
}

function SearchBox({value, onChange}) {
  return (
    <label className={styles.search}>
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar lead, empresa o contacto…" />
    </label>
  );
}

function CardHeader({eyebrow, title, action, onAction}) {
  return (
    <header className={styles.cardHeader}>
      <div><span className={styles.cardEyebrow}>{eyebrow}</span><h2>{title}</h2></div>
      {action ? <button type="button" onClick={onAction}>{action} <ArrowRight size={15} /></button> : null}
    </header>
  );
}

function LeadModal({value, setValue, onClose, onSubmit, saving}) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <form className={styles.modal} onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader eyebrow={value.id ? 'Editar oportunidad' : 'Nuevo lead'} title={value.companyName || value.name || 'Datos comerciales'} onClose={onClose} />
        <div className={styles.modalBody}>
          <div className={styles.grid2}>
            <Input label="Nombre del contacto" required value={value.name} onChange={(event) => setValue((current) => ({...current, name: event.target.value}))} />
            <Input label="Empresa" value={value.companyName || ''} onChange={(event) => setValue((current) => ({...current, companyName: event.target.value}))} />
          </div>
          <div className={styles.grid2}>
            <Input label="Correo" type="email" icon={Mail} value={value.email || ''} onChange={(event) => setValue((current) => ({...current, email: event.target.value}))} />
            <Input label="Teléfono" icon={Phone} value={value.phone || ''} onChange={(event) => setValue((current) => ({...current, phone: event.target.value}))} />
          </div>
          <div className={styles.grid3}>
            <label>Etapa<select value={value.stage} onChange={(event) => setValue((current) => ({...current, stage: event.target.value}))}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
            <Input label="Valor estimado" type="number" min="0" step="0.01" value={value.estimatedValue} onChange={(event) => setValue((current) => ({...current, estimatedValue: event.target.value}))} />
            <Input label="Probabilidad %" type="number" min="0" max="100" value={value.probability} onChange={(event) => setValue((current) => ({...current, probability: event.target.value}))} />
          </div>
          <div className={styles.grid2}>
            <Input label="Fuente" placeholder="Referido, web, evento…" value={value.source || ''} onChange={(event) => setValue((current) => ({...current, source: event.target.value}))} />
            <Input label="Próximo seguimiento" type="datetime-local" value={value.nextActionAt || ''} onChange={(event) => setValue((current) => ({...current, nextActionAt: event.target.value}))} />
          </div>
          <label>Notas<textarea rows="4" value={value.notes || ''} onChange={(event) => setValue((current) => ({...current, notes: event.target.value}))} /></label>
        </div>
        <ModalFooter onClose={onClose} saving={saving} label={value.id ? 'Guardar cambios' : 'Crear lead'} />
      </form>
    </div>
  );
}

function ActivityModal({value, setValue, prospects, onClose, onSubmit, saving}) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <form className={styles.modal} onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader eyebrow="Seguimiento CRM" title="Nueva actividad" onClose={onClose} />
        <div className={styles.modalBody}>
          <label>Prospecto<select required value={value.prospectId} onChange={(event) => setValue((current) => ({...current, prospectId: event.target.value}))}><option value="">Seleccionar prospecto</option>{prospects.map((item) => <option key={item.id} value={item.id}>{item.companyName || item.name} · {item.name}</option>)}</select></label>
          <div className={styles.grid2}>
            <label>Tipo<select value={value.type} onChange={(event) => setValue((current) => ({...current, type: event.target.value}))}>{Object.entries(activityTypeLabel).filter(([key]) => key !== 'STATUS_CHANGE').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <Input label="Fecha límite" type="datetime-local" value={value.dueAt || ''} onChange={(event) => setValue((current) => ({...current, dueAt: event.target.value}))} />
          </div>
          <Input label="Título" required value={value.title} onChange={(event) => setValue((current) => ({...current, title: event.target.value}))} />
          <label>Descripción<textarea rows="4" value={value.description || ''} onChange={(event) => setValue((current) => ({...current, description: event.target.value}))} /></label>
        </div>
        <ModalFooter onClose={onClose} saving={saving} label="Registrar actividad" />
      </form>
    </div>
  );
}

function ConversionModal({value, setValue, onClose, onSubmit, saving}) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <form className={styles.modal} onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader eyebrow="Conversión comercial" title="Convertir prospecto a cliente" onClose={onClose} />
        <div className={styles.conversionNotice}>
          <CheckCircle2 size={20} />
          <div><strong>{value.prospectName}</strong><p>Se creará un cliente real en el catálogo del ERP y la oportunidad quedará marcada como ganada.</p></div>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.grid2}>
            <Input label="Código de cliente" required value={value.code} onChange={(event) => setValue((current) => ({...current, code: event.target.value.toUpperCase()}))} />
            <Input label="RFC" value={value.taxId} onChange={(event) => setValue((current) => ({...current, taxId: event.target.value}))} />
          </div>
          <Input label="Razón social" required value={value.legalName} onChange={(event) => setValue((current) => ({...current, legalName: event.target.value}))} />
          <div className={styles.grid2}>
            <Input label="Nombre comercial" value={value.commercialName} onChange={(event) => setValue((current) => ({...current, commercialName: event.target.value}))} />
            <Input label="Contacto" value={value.contactName} onChange={(event) => setValue((current) => ({...current, contactName: event.target.value}))} />
          </div>
          <div className={styles.grid2}>
            <Input label="Correo" type="email" value={value.email} onChange={(event) => setValue((current) => ({...current, email: event.target.value}))} />
            <Input label="Teléfono" value={value.phone} onChange={(event) => setValue((current) => ({...current, phone: event.target.value}))} />
          </div>
          <Input label="Dirección" value={value.address} onChange={(event) => setValue((current) => ({...current, address: event.target.value}))} />
          <div className={styles.grid2}>
            <Input label="Días de crédito" type="number" min="0" value={value.creditDays} onChange={(event) => setValue((current) => ({...current, creditDays: event.target.value}))} />
            <Input label="Límite de crédito" type="number" min="0" step="0.01" value={value.creditLimit} onChange={(event) => setValue((current) => ({...current, creditLimit: event.target.value}))} />
          </div>
        </div>
        <ModalFooter onClose={onClose} saving={saving} label="Crear cliente" />
      </form>
    </div>
  );
}

function ModalHeader({eyebrow, title, onClose}) {
  return (
    <header className={styles.modalHeader}>
      <div><span>{eyebrow}</span><h2>{title}</h2></div>
      <button type="button" onClick={onClose}><X size={19} /></button>
    </header>
  );
}

function ModalFooter({onClose, saving, label}) {
  return (
    <footer className={styles.modalFooter}>
      <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button type="submit" loading={saving}>{label}</Button>
    </footer>
  );
}

function Empty({text}) {
  return <div className={styles.empty}>{text}</div>;
}
