import {useEffect, useMemo, useState} from 'react';
import {
  Activity,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Gauge,
  Link2,
  Megaphone,
  MousePointerClick,
  Plus,
  Search,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import {ModuleTabs} from '../components/module-system';
import styles from './Marketing.module.css';

const statusLabels = {
  DRAFT: 'Borrador',
  PLANNED: 'Planeada',
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};
const statusTone = {
  DRAFT: 'neutral',
  PLANNED: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};
const objectiveLabels = {
  AWARENESS: 'Awareness',
  LEAD_GENERATION: 'Generación de leads',
  SALES: 'Ventas',
  RETENTION: 'Retención',
  EVENT: 'Evento',
  OTHER: 'Otro',
};
const channelLabels = {
  SEARCH: 'Búsqueda',
  SOCIAL: 'Social',
  EMAIL: 'Email',
  CONTENT: 'Contenido',
  EVENT: 'Evento',
  REFERRAL: 'Referidos',
  DISPLAY: 'Display',
  OFFLINE: 'Offline',
  OTHER: 'Otro',
};
const eventLabels = {
  CAMPAIGN: 'Campaña',
  CONTENT: 'Contenido',
  EMAIL: 'Email',
  SOCIAL: 'Social',
  EVENT: 'Evento',
  MILESTONE: 'Hito',
  OTHER: 'Otro',
};

const money = (v) => new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', maximumFractionDigits: 0}).format(Number(v || 0));
const number = (v, digits = 0) => new Intl.NumberFormat('es-MX', {maximumFractionDigits: digits}).format(Number(v || 0));
const pct = (v) => `${number(v, 1)}%`;
const date = (v) => v ? new Intl.DateTimeFormat('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(v)) : 'Sin fecha';
const inputDate = (v) => v ? new Date(v).toISOString().slice(0,10) : '';
const initials = (first = '', last = '') => `${first[0] || ''}${last[0] || ''}`.toUpperCase();

const blankCampaign = () => ({
  code: '',
  name: '',
  channelId: '',
  ownerId: '',
  objective: 'LEAD_GENERATION',
  status: 'DRAFT',
  startDate: '',
  endDate: '',
  budget: '',
  targetAudience: '',
  description: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  notes: '',
});

export default function Marketing() {
  const [data, setData] = useState({campaigns: [], channels: [], prospects: [], customers: [], salesOrders: [], users: [], events: [], summary: {}});
  const [tab, setTab] = useState('overview');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [campaignModal, setCampaignModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);
  const [leadModal, setLeadModal] = useState(null);
  const [opportunityModal, setOpportunityModal] = useState(null);
  const [eventModal, setEventModal] = useState(null);
  const [metricModal, setMetricModal] = useState(null);
  const [channelModal, setChannelModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(preferred) {
    setLoading(true);
    try {
      const response = await apiRequest('/marketing/dashboard');
      setData(response);
      const candidate = preferred ?? selectedId;
      if (candidate && response.campaigns.some((row) => row.id === candidate)) setSelectedId(candidate);
      else if (!selectedId && response.campaigns.length) setSelectedId(response.campaigns[0].id);
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = data.campaigns.find((row) => row.id === selectedId) || null;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.campaigns;
    return data.campaigns.filter((row) =>
      `${row.code} ${row.name} ${row.channel?.name || ''} ${row.targetAudience || ''}`.toLowerCase().includes(term),
    );
  }, [query, data.campaigns]);

  async function submit(path, body, success, method = 'POST', preferred = selectedId) {
    setSaving(true);
    try {
      const response = await apiRequest(path, {method, body});
      setMessage(['success', success]);
      await load(preferred || response.campaign?.id);
      return response;
    } catch (error) {
      setMessage(['error', error.message]);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    const editing = Boolean(campaignModal.id);
    const body = {
      ...campaignModal,
      channelId: campaignModal.channelId || null,
      ownerId: campaignModal.ownerId || null,
      startDate: campaignModal.startDate || null,
      endDate: campaignModal.endDate || null,
      budget: Number(campaignModal.budget || 0),
      targetAudience: campaignModal.targetAudience || null,
      description: campaignModal.description || null,
      utmSource: campaignModal.utmSource || null,
      utmMedium: campaignModal.utmMedium || null,
      utmCampaign: campaignModal.utmCampaign || null,
      notes: campaignModal.notes || null,
    };
    const response = await submit(
      editing ? `/marketing/campaigns/${campaignModal.id}` : '/marketing/campaigns',
      body,
      editing ? 'Campaña actualizada' : 'Campaña creada',
      editing ? 'PUT' : 'POST',
      campaignModal.id,
    );
    if (response) {
      setCampaignModal(null);
      setSelectedId(response.campaign.id);
    }
  }

  function editCampaign(row) {
    setCampaignModal({
      ...row,
      channelId: row.channelId || '',
      ownerId: row.ownerId || '',
      startDate: inputDate(row.startDate),
      endDate: inputDate(row.endDate),
      budget: String(row.budget || ''),
      targetAudience: row.targetAudience || '',
      description: row.description || '',
      utmSource: row.utmSource || '',
      utmMedium: row.utmMedium || '',
      utmCampaign: row.utmCampaign || '',
      notes: row.notes || '',
    });
  }

  if (loading && !data.campaigns.length) return <Card className={styles.loading}>Cargando Marketing…</Card>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Growth · Demand · Attribution</span>
          <h1>Marketing</h1>
          <p>Planea campañas, registra inversión, conecta leads del CRM y mide CPL, conversión, ROAS y retorno comercial desde el mismo ERP.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={Plus} onClick={() => setEventModal({campaignId: selectedId || '', title: '', type: 'CONTENT', startAt: new Date().toISOString().slice(0,10), endAt: '', channel: '', ownerName: '', description: ''})}>Nuevo evento</Button>
          <Button icon={Plus} onClick={() => setCampaignModal(blankCampaign())}>Nueva campaña</Button>
        </div>
      </header>

      {message ? <div className={`${styles.message} ${styles[message[0]]}`}><span>{message[1]}</span><button onClick={() => setMessage(null)}><X size={16}/></button></div> : null}

      <KpiGrid>
        <KpiCard><Megaphone/><span>Campañas activas</span><KpiInfo title="Campañas activas">Campañas actualmente en estado Activa.</KpiInfo><strong>{data.summary.activeCampaigns || 0}</strong><small>{data.campaigns.length} campañas en el portafolio</small></KpiCard>
        <KpiCard><CircleDollarSign/><span>Inversión</span><KpiInfo title="Inversión">Gasto registrado y gasto de métricas de las campañas.</KpiInfo><strong>{money(data.summary.spend)}</strong><small>{money(data.summary.budget)} de presupuesto</small></KpiCard>
        <KpiCard><Users/><span>Leads</span><KpiInfo title="Leads">Leads registrados o reportados por las métricas de campañas.</KpiInfo><strong>{number(data.summary.leads)}</strong><small>CPL {money(data.summary.cpl)}</small></KpiCard>
        <KpiCard><BadgeDollarSign/><span>Ingresos atribuidos</span><KpiInfo title="Ingresos atribuidos">Ingresos asociados a oportunidades/pedidos y métricas.</KpiInfo><strong>{money(data.summary.revenue)}</strong><small>{data.summary.conversions || 0} conversiones</small></KpiCard>
        <KpiCard><TrendingUp/><span>ROI Marketing</span><KpiInfo title="ROI">Ingresos atribuidos menos inversión, dividido entre la inversión.</KpiInfo><strong>{pct(data.summary.roi)}</strong><small>ROAS {number(data.summary.roas, 2)}x · CTR {pct(data.summary.ctr)}</small></KpiCard>
      </KpiGrid>

      <ModuleTabs
        active={tab}
        onChange={setTab}
        items={[
          {id:'overview',label:'Resumen',icon:BarChart3},
          {id:'campaigns',label:'Campañas',icon:Megaphone},
          {id:'attribution',label:'Leads y atribución',icon:Target},
          {id:'calendar',label:'Calendario',icon:CalendarDays}
        ]}
      />

      {tab === 'overview' ? <Overview data={data} onSelect={(id) => {setSelectedId(id); setTab('campaigns');}} /> : null}

      {tab === 'campaigns' ? (
        <div className={styles.workspace}>
          <aside className={styles.rail}>
            <div className={styles.railTop}><label className={styles.search}><Search size={15}/><input placeholder="Buscar campaña…" value={query} onChange={(e) => setQuery(e.target.value)}/></label></div>
            <div className={styles.campaignList}>
              {filtered.map((row) => <button key={row.id} className={selectedId === row.id ? styles.selected : ''} onClick={() => setSelectedId(row.id)}>
                <div><span>{row.code}</span><Badge tone={statusTone[row.status]}>{statusLabels[row.status]}</Badge></div>
                <strong>{row.name}</strong><small>{row.channel?.name || 'Sin canal'}</small>
                <footer><span>{money(row.performance.spend)}</span><strong>{number(row.performance.roas,2)}x ROAS</strong></footer>
              </button>)}
            </div>
          </aside>
          <main className={styles.main}>
            {selected ? <CampaignDetail
              campaign={selected}
              onEdit={() => editCampaign(selected)}
              onExpense={() => setExpenseModal({date: new Date().toISOString().slice(0,10), category: 'Media', description: '', vendor: '', amount: '', reference: ''})}
              onLead={() => setLeadModal({prospectId: '', capturedAt: new Date().toISOString().slice(0,10), source: selected.utmSource || '', medium: selected.utmMedium || '', content: '', landingUrl: '', notes: ''})}
              onOpportunity={() => setOpportunityModal({prospectId: '', customerId: '', salesOrderId: '', attributedRevenue: '', attributionPct: 100, convertedAt: '', notes: ''})}
              onMetric={() => setMetricModal({date: new Date().toISOString().slice(0,10), impressions: '', clicks: '', sessions: '', leads: '', conversions: '', spend: '', revenue: ''})}
            /> : <Card className={styles.loading}>Crea o selecciona una campaña.</Card>}
          </main>
        </div>
      ) : null}

      {tab === 'attribution' ? <Attribution data={data} onSelect={(id) => {setSelectedId(id); setTab('campaigns');}} /> : null}
      {tab === 'calendar' ? <CalendarView data={data} onNew={() => setEventModal({campaignId: selectedId || '', title: '', type: 'CONTENT', startAt: new Date().toISOString().slice(0,10), endAt: '', channel: '', ownerName: '', description: ''})} onComplete={async (id) => {await submit(`/marketing/events/${id}/complete`, {}, 'Evento actualizado', 'PATCH');}} /> : null}

      {campaignModal ? <CampaignModal value={campaignModal} setValue={setCampaignModal} data={data} onSubmit={saveCampaign} onClose={() => setCampaignModal(null)} saving={saving} onChannel={() => setChannelModal({name: '', type: 'SOCIAL', active: true, notes: ''})}/> : null}
      {expenseModal ? <SimpleModal title="Registrar gasto" eyebrow={selected?.code} onClose={() => setExpenseModal(null)} onSubmit={async (e) => {e.preventDefault(); const r = await submit(`/marketing/campaigns/${selected.id}/expenses`, {...expenseModal, amount: Number(expenseModal.amount)}, 'Gasto registrado'); if(r) setExpenseModal(null);}} saving={saving}><div className={styles.grid2}><Input label="Fecha" type="date" required value={expenseModal.date} onChange={(e) => setExpenseModal(v=>({...v,date:e.target.value}))}/><Input label="Monto" type="number" min="0.01" step="0.01" required value={expenseModal.amount} onChange={(e) => setExpenseModal(v=>({...v,amount:e.target.value}))}/></div><div className={styles.grid2}><Input label="Categoría" required value={expenseModal.category} onChange={(e) => setExpenseModal(v=>({...v,category:e.target.value}))}/><Input label="Proveedor" value={expenseModal.vendor} onChange={(e) => setExpenseModal(v=>({...v,vendor:e.target.value}))}/></div><Input label="Descripción" value={expenseModal.description} onChange={(e) => setExpenseModal(v=>({...v,description:e.target.value}))}/></SimpleModal> : null}
      {leadModal ? <SimpleModal title="Atribuir lead" eyebrow={selected?.code} onClose={() => setLeadModal(null)} onSubmit={async (e) => {e.preventDefault(); const r=await submit(`/marketing/campaigns/${selected.id}/leads`, {...leadModal, capturedAt: leadModal.capturedAt || undefined}, 'Lead atribuido a campaña'); if(r) setLeadModal(null);}} saving={saving}><label>Prospecto<select required value={leadModal.prospectId} onChange={(e)=>setLeadModal(v=>({...v,prospectId:e.target.value}))}><option value="">Seleccionar…</option>{data.prospects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.companyName || 'Sin empresa'} · {p.stage}</option>)}</select></label><div className={styles.grid3}><Input label="Fecha" type="date" value={leadModal.capturedAt} onChange={(e)=>setLeadModal(v=>({...v,capturedAt:e.target.value}))}/><Input label="Source" value={leadModal.source} onChange={(e)=>setLeadModal(v=>({...v,source:e.target.value}))}/><Input label="Medium" value={leadModal.medium} onChange={(e)=>setLeadModal(v=>({...v,medium:e.target.value}))}/></div><Input label="Landing URL" value={leadModal.landingUrl} onChange={(e)=>setLeadModal(v=>({...v,landingUrl:e.target.value}))}/></SimpleModal> : null}
      {opportunityModal ? <SimpleModal title="Atribución comercial" eyebrow={selected?.code} onClose={() => setOpportunityModal(null)} onSubmit={async (e) => {e.preventDefault(); const r=await submit(`/marketing/campaigns/${selected.id}/opportunities`, {...opportunityModal, customerId: opportunityModal.customerId || null, salesOrderId: opportunityModal.salesOrderId || null, attributedRevenue: Number(opportunityModal.attributedRevenue || 0), attributionPct: Number(opportunityModal.attributionPct || 100), convertedAt: opportunityModal.convertedAt || null}, 'Atribución comercial guardada'); if(r) setOpportunityModal(null);}} saving={saving}><label>Prospecto<select required value={opportunityModal.prospectId} onChange={(e)=>setOpportunityModal(v=>({...v,prospectId:e.target.value}))}><option value="">Seleccionar…</option>{data.prospects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.companyName || 'Sin empresa'}</option>)}</select></label><label>Pedido de venta<select value={opportunityModal.salesOrderId} onChange={(e)=>{const order=data.salesOrders.find(o=>o.id===e.target.value);setOpportunityModal(v=>({...v,salesOrderId:e.target.value,customerId:order?.customerId||v.customerId,attributedRevenue:order?String(order.total):v.attributedRevenue}))}}><option value="">Sin pedido</option>{data.salesOrders.map(o=><option key={o.id} value={o.id}>{o.folio} · {o.customer?.commercialName || o.customer?.legalName} · {money(o.total)}</option>)}</select></label><div className={styles.grid2}><Input label="Ingreso atribuido" type="number" min="0" value={opportunityModal.attributedRevenue} onChange={(e)=>setOpportunityModal(v=>({...v,attributedRevenue:e.target.value}))}/><Input label="% atribución" type="number" min="0" max="100" value={opportunityModal.attributionPct} onChange={(e)=>setOpportunityModal(v=>({...v,attributionPct:e.target.value}))}/></div></SimpleModal> : null}
      {metricModal ? <SimpleModal title="Registrar métricas" eyebrow={selected?.code} onClose={() => setMetricModal(null)} onSubmit={async (e) => {e.preventDefault(); const body=Object.fromEntries(Object.entries(metricModal).map(([k,v])=>[k,k==='date'?v:Number(v||0)])); const r=await submit(`/marketing/campaigns/${selected.id}/metrics`, body, 'Métricas actualizadas'); if(r) setMetricModal(null);}} saving={saving}><Input label="Fecha" type="date" required value={metricModal.date} onChange={(e)=>setMetricModal(v=>({...v,date:e.target.value}))}/><div className={styles.grid3}><Input label="Impresiones" type="number" value={metricModal.impressions} onChange={(e)=>setMetricModal(v=>({...v,impressions:e.target.value}))}/><Input label="Clics" type="number" value={metricModal.clicks} onChange={(e)=>setMetricModal(v=>({...v,clicks:e.target.value}))}/><Input label="Sesiones" type="number" value={metricModal.sessions} onChange={(e)=>setMetricModal(v=>({...v,sessions:e.target.value}))}/><Input label="Prospectos" type="number" value={metricModal.leads} onChange={(e)=>setMetricModal(v=>({...v,leads:e.target.value}))}/><Input label="Conversiones" type="number" value={metricModal.conversions} onChange={(e)=>setMetricModal(v=>({...v,conversions:e.target.value}))}/><Input label="Inversión" type="number" value={metricModal.spend} onChange={(e)=>setMetricModal(v=>({...v,spend:e.target.value}))}/></div><Input label="Ingresos reportados" type="number" value={metricModal.revenue} onChange={(e)=>setMetricModal(v=>({...v,revenue:e.target.value}))}/></SimpleModal> : null}
      {eventModal ? <SimpleModal title="Evento de marketing" eyebrow="Calendario" onClose={() => setEventModal(null)} onSubmit={async (e) => {e.preventDefault(); const r=await submit('/marketing/events', {...eventModal,campaignId:eventModal.campaignId||null,startAt:eventModal.startAt,endAt:eventModal.endAt||null}, 'Evento creado'); if(r) setEventModal(null);}} saving={saving}><Input label="Título" required value={eventModal.title} onChange={(e)=>setEventModal(v=>({...v,title:e.target.value}))}/><div className={styles.grid2}><label>Campaña<select value={eventModal.campaignId} onChange={(e)=>setEventModal(v=>({...v,campaignId:e.target.value}))}><option value="">General</option>{data.campaigns.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label><label>Tipo<select value={eventModal.type} onChange={(e)=>setEventModal(v=>({...v,type:e.target.value}))}>{Object.entries(eventLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div><div className={styles.grid2}><Input label="Inicio" type="date" required value={eventModal.startAt} onChange={(e)=>setEventModal(v=>({...v,startAt:e.target.value}))}/><Input label="Fin" type="date" value={eventModal.endAt} onChange={(e)=>setEventModal(v=>({...v,endAt:e.target.value}))}/></div><div className={styles.grid2}><Input label="Canal" value={eventModal.channel} onChange={(e)=>setEventModal(v=>({...v,channel:e.target.value}))}/><Input label="Responsable" value={eventModal.ownerName} onChange={(e)=>setEventModal(v=>({...v,ownerName:e.target.value}))}/></div></SimpleModal> : null}
      {channelModal ? <SimpleModal title="Nuevo canal" eyebrow="Configuración Marketing" onClose={() => setChannelModal(null)} onSubmit={async (e)=>{e.preventDefault();const r=await submit('/marketing/channels',channelModal,'Canal creado');if(r)setChannelModal(null);}} saving={saving}><div className={styles.grid2}><Input label="Nombre" required value={channelModal.name} onChange={(e)=>setChannelModal(v=>({...v,name:e.target.value}))}/><label>Tipo<select value={channelModal.type} onChange={(e)=>setChannelModal(v=>({...v,type:e.target.value}))}>{Object.entries(channelLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div></SimpleModal> : null}
    </div>
  );
}

function Overview({data, onSelect}) {
  const best = [...data.campaigns].sort((a,b)=>b.performance.roas-a.performance.roas).slice(0,4);
  const upcoming = data.events.filter(e=>!e.completedAt).slice(0,6);
  return <div className={styles.overviewGrid}>
    <Card className={styles.performanceCard}><SectionHeader eyebrow="Rendimiento" title="Rendimiento por campaña"/><div className={styles.performanceTable}><header><span>Campaña</span><span>Inversión</span><span>Prospectos</span><span>Ingresos</span><span>ROAS</span></header>{data.campaigns.slice(0,8).map(c=><button key={c.id} onClick={()=>onSelect(c.id)}><div><strong>{c.name}</strong><small>{c.channel?.name||'Sin canal'}</small></div><span>{money(c.performance.spend)}</span><span>{number(c.performance.leads)}</span><span>{money(c.performance.revenue)}</span><b>{number(c.performance.roas,2)}x</b></button>)}</div></Card>
    <Card className={styles.bestCard}><SectionHeader eyebrow="Eficiencia" title="Mejor ROAS"/><div className={styles.rankList}>{best.map((c,i)=><button key={c.id} onClick={()=>onSelect(c.id)}><i>{i+1}</i><div><strong>{c.name}</strong><small>{money(c.performance.spend)} invertidos</small></div><b>{number(c.performance.roas,2)}x</b></button>)}</div></Card>
    <Card className={styles.funnelCard}><SectionHeader eyebrow="Embudo" title="Marketing → Ingresos"/><div className={styles.funnel}><FunnelRow label="Impresiones" value={number(data.summary.impressions)} width="100%"/><FunnelRow label="Clics" value={number(data.summary.clicks)} width="78%"/><FunnelRow label="Prospectos" value={number(data.summary.leads)} width="55%"/><FunnelRow label="Conversiones" value={number(data.summary.conversions)} width="35%"/><FunnelRow label="Ingresos" value={money(data.summary.revenue)} width="22%"/></div></Card>
    <Card className={styles.upcomingCard}><SectionHeader eyebrow="Agenda" title="Próximas acciones"/><div className={styles.eventList}>{upcoming.map(e=><article key={e.id}><span>{new Date(e.startAt).getUTCDate()}</span><div><strong>{e.title}</strong><small>{date(e.startAt)} · {e.campaign?.name||e.channel||'Marketing'}</small></div><Badge tone="info">{eventLabels[e.type]}</Badge></article>)}</div></Card>
  </div>;
}

function CampaignDetail({campaign,onEdit,onExpense,onLead,onOpportunity,onMetric}) {
  const p=campaign.performance;
  return <div className={styles.detailGrid}>
    <Card className={styles.heroCard}><div className={styles.campaignHero}><div><div className={styles.meta}><span>{campaign.code}</span><Badge tone={statusTone[campaign.status]}>{statusLabels[campaign.status]}</Badge><Badge tone="info">{objectiveLabels[campaign.objective]}</Badge></div><h2>{campaign.name}</h2><p>{campaign.description||'Sin descripción.'}</p></div><Button variant="ghost" onClick={onEdit}>Editar campaña</Button></div><div className={styles.heroMetrics}><Metric label="Inversión" value={money(p.spend)}/><Metric label="Ingresos" value={money(p.revenue)}/><Metric label="ROAS" value={`${number(p.roas,2)}x`}/><Metric label="ROI" value={pct(p.roi)}/><Metric label="CPL" value={money(p.cpl)}/><Metric label="Conversión" value={pct(p.conversionRate)}/></div></Card>
    <Card className={styles.budgetCard}><SectionHeader eyebrow="Budget" title="Presupuesto y gasto"/><div className={styles.budgetBody}><div className={styles.budgetNumbers}><Metric label="Presupuesto" value={money(campaign.budget)}/><Metric label="Gasto" value={money(p.spend)}/><Metric label="Disponible" value={money(Math.max(0,Number(campaign.budget)-p.spend))}/></div><div className={styles.progress}><i style={{width:`${Math.min(100,p.budgetUsed)}%`}}/></div><small>{pct(p.budgetUsed)} utilizado</small><Button variant="secondary" icon={Plus} onClick={onExpense}>Registrar gasto</Button></div></Card>
    <Card className={styles.trackingCard}><SectionHeader eyebrow="Tracking" title="Adquisición y atribución"/><div className={styles.trackingStats}><Metric label="Impresiones" value={number(p.impressions)}/><Metric label="Clics" value={number(p.clicks)}/><Metric label="CTR" value={pct(p.ctr)}/><Metric label="Prospectos" value={number(p.leads)}/><Metric label="Conversiones" value={number(p.conversions)}/><Metric label="Ingresos" value={money(p.revenue)}/></div><div className={styles.actionRow}><Button variant="secondary" onClick={onLead}>Atribuir lead</Button><Button variant="secondary" onClick={onOpportunity}>Atribuir oportunidad</Button><Button variant="secondary" onClick={onMetric}>Registrar métricas</Button></div></Card>
    <Card className={styles.contextCard}><SectionHeader eyebrow="Campaña" title="Configuración"/><div className={styles.infoRows}><Info label="Canal" value={campaign.channel?.name||'Sin canal'}/><Info label="Responsable" value={campaign.owner?`${campaign.owner.firstName} ${campaign.owner.lastName}`:'Sin responsable'}/><Info label="Periodo" value={`${date(campaign.startDate)} → ${date(campaign.endDate)}`}/><Info label="Audiencia" value={campaign.targetAudience||'Sin definir'}/><Info label="UTM" value={[campaign.utmSource,campaign.utmMedium,campaign.utmCampaign].filter(Boolean).join(' / ')||'Sin UTMs'}/></div></Card>
    <Card className={styles.leadCard}><SectionHeader eyebrow="CRM" title={`${campaign.leads.length} leads vinculados`}/><div className={styles.leadList}>{campaign.leads.map(l=><article key={l.id}><span className={styles.avatar}>{initials(l.prospect.name,'')}</span><div><strong>{l.prospect.name}</strong><small>{l.prospect.companyName||'Sin empresa'} · {l.source||'Sin fuente'} / {l.medium||'—'}</small></div><Badge tone="info">{l.prospect.stage}</Badge></article>)}{!campaign.leads.length?<Empty text="Aún no hay leads atribuidos."/>:null}</div></Card>
    <Card className={styles.expenseCard}><SectionHeader eyebrow="Spend" title="Últimos gastos"/><div className={styles.expenseList}>{campaign.expenses.slice(0,8).map(e=><article key={e.id}><div><strong>{e.category}</strong><small>{e.vendor||'Sin proveedor'} · {date(e.date)}</small></div><b>{money(e.amount)}</b></article>)}{!campaign.expenses.length?<Empty text="No hay gastos registrados."/>:null}</div></Card>
  </div>;
}

function Attribution({data,onSelect}) {
  const rows=data.campaigns.flatMap(c=>c.opportunities.map(o=>({...o,campaign:c})));
  return <div className={styles.attributionGrid}><Card className={styles.attributionTable}><SectionHeader eyebrow="Atribución de ingresos" title="Oportunidades atribuidas"/><div className={styles.table}><header><span>Prospecto</span><span>Campaña</span><span>Pedido</span><span>%</span><span>Ingresos</span></header>{rows.map(r=><button key={r.id} onClick={()=>onSelect(r.campaign.id)}><div><strong>{r.prospect.name}</strong><small>{r.prospect.companyName||r.customer?.commercialName||'—'}</small></div><span>{r.campaign.name}</span><span>{r.salesOrder?.folio||'Oportunidad'}</span><span>{r.attributionPct}%</span><b>{money(Number(r.attributedRevenue)*(r.attributionPct/100))}</b></button>)}{!rows.length?<Empty text="No hay oportunidades atribuidas."/>:null}</div></Card></div>;
}

function CalendarView({data,onNew,onComplete}) {
  const groups={};
  data.events.forEach(e=>{const key=new Date(e.startAt).toISOString().slice(0,7);(groups[key]??=[]).push(e)});
  return <Card className={styles.calendarCard}><div className={styles.calendarHeader}><SectionHeader eyebrow="Planeación" title="Calendario de marketing"/><Button icon={Plus} onClick={onNew}>Nuevo evento</Button></div><div className={styles.timeline}>{Object.entries(groups).map(([month,events])=><section key={month}><header>{new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(`${month}-05T12:00:00Z`))}</header><div>{events.map(e=><article className={e.completedAt?styles.completed:''} key={e.id}><time><strong>{new Date(e.startAt).getUTCDate()}</strong><small>{new Intl.DateTimeFormat('es-MX',{weekday:'short'}).format(new Date(e.startAt))}</small></time><span className={styles.timelineDot}/><div><div><Badge tone="info">{eventLabels[e.type]}</Badge><span>{e.channel||e.campaign?.name||'Marketing'}</span></div><h3>{e.title}</h3><p>{e.description||'Sin descripción'}</p></div><button onClick={()=>onComplete(e.id)}><CheckCircle2 size={17}/>{e.completedAt?'Reabrir':'Completar'}</button></article>)}</div></section>)}</div></Card>;
}

function CampaignModal({value,setValue,data,onSubmit,onClose,saving,onChannel}) {
  return <Modal title={value.id?'Editar campaña':'Nueva campaña'} eyebrow="Campaña de marketing" onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}><div className={styles.grid2}><Input label="Código" required value={value.code} onChange={(e)=>setValue(v=>({...v,code:e.target.value.toUpperCase()}))}/><Input label="Nombre" required value={value.name} onChange={(e)=>setValue(v=>({...v,name:e.target.value}))}/></div><div className={styles.grid3}><label>Estado<select value={value.status} onChange={(e)=>setValue(v=>({...v,status:e.target.value}))}>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Objetivo<select value={value.objective} onChange={(e)=>setValue(v=>({...v,objective:e.target.value}))}>{Object.entries(objectiveLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Canal<div className={styles.inlineSelect}><select value={value.channelId} onChange={(e)=>setValue(v=>({...v,channelId:e.target.value}))}><option value="">Sin canal</option>{data.channels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" onClick={onChannel}>+</button></div></label></div><div className={styles.grid3}><label>Responsable<select value={value.ownerId} onChange={(e)=>setValue(v=>({...v,ownerId:e.target.value}))}><option value="">Sin responsable</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></label><Input label="Inicio" type="date" value={value.startDate} onChange={(e)=>setValue(v=>({...v,startDate:e.target.value}))}/><Input label="Fin" type="date" value={value.endDate} onChange={(e)=>setValue(v=>({...v,endDate:e.target.value}))}/></div><Input label="Presupuesto" type="number" min="0" step="0.01" value={value.budget} onChange={(e)=>setValue(v=>({...v,budget:e.target.value}))}/><label>Audiencia objetivo<textarea rows="2" value={value.targetAudience} onChange={(e)=>setValue(v=>({...v,targetAudience:e.target.value}))}/></label><label>Descripción<textarea rows="3" value={value.description} onChange={(e)=>setValue(v=>({...v,description:e.target.value}))}/></label><div className={styles.grid3}><Input label="UTM · Fuente" value={value.utmSource} onChange={(e)=>setValue(v=>({...v,utmSource:e.target.value}))}/><Input label="UTM · Medio" value={value.utmMedium} onChange={(e)=>setValue(v=>({...v,utmMedium:e.target.value}))}/><Input label="UTM · Campaña" value={value.utmCampaign} onChange={(e)=>setValue(v=>({...v,utmCampaign:e.target.value}))}/></div></div><ModalFooter onClose={onClose} saving={saving} label={value.id?'Guardar cambios':'Crear campaña'}/></form></Modal>;
}

function SimpleModal({title,eyebrow,onClose,onSubmit,saving,children}) {return <Modal title={title} eyebrow={eyebrow} onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}>{children}</div><ModalFooter onClose={onClose} saving={saving} label="Guardar"/></form></Modal>}
function Modal({title,eyebrow,onClose,children}) {return <div className={styles.overlay} onMouseDown={onClose}><div className={styles.modal} onMouseDown={e=>e.stopPropagation()}><header className={styles.modalHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={19}/></button></header>{children}</div></div>}
function ModalFooter({onClose,saving,label}) {return <footer className={styles.modalFooter}><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>{label}</Button></footer>}
function SectionHeader({eyebrow,title}) {return <header className={styles.sectionHeader}><div><span>{eyebrow}</span><h3>{title}</h3></div></header>}
function Metric({label,value}) {return <div className={styles.metric}><small>{label}</small><strong>{value}</strong></div>}
function Info({label,value}) {return <div className={styles.info}><small>{label}</small><strong>{value}</strong></div>}
function FunnelRow({label,value,width}) {return <div className={styles.funnelRow} style={{width}}><span>{label}</span><strong>{value}</strong></div>}
function Empty({text}) {return <div className={styles.empty}>{text}</div>}
