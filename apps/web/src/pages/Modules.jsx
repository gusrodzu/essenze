import {useEffect,useMemo,useState} from 'react';
import {
  Boxes,
  Check,
  CreditCard,
  Layers3,
  LockKeyhole,
  PackageOpen,
  Plus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UsersRound,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import styles from './Modules.module.css';

const money=(v,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';
const dateTime=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';

export default function Modules(){
  const [data,setData]=useState({modules:[],companyModules:[],plans:[],subscriptions:[],overrides:[],usage:[],summary:{}});
  const [tab,setTab]=useState('modules');
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);
  const [planModal,setPlanModal]=useState(null);
  const [limitModal,setLimitModal]=useState(null);

  async function load(){
    try{setData(await apiRequest('/modules/dashboard'))}
    catch(e){setMessage(['error',e.message])}
  }
  useEffect(()=>{load()},[]);

  async function submit(path,body,success,method='POST'){
    setSaving(true);
    try{
      const r=await apiRequest(path,{method,body});
      setMessage(['success',success]);
      await load();
      return r;
    }catch(e){setMessage(['error',e.message]);return null}
    finally{setSaving(false)}
  }

  const stateMap=useMemo(()=>new Map(data.companyModules.map(x=>[x.moduleId,x])),[data.companyModules]);
  const current=data.currentSubscription;

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>SaaS Control Plane</span><h1>Configuración de módulos</h1><p>Define qué aplicaciones están habilitadas para esta empresa, administra planes, límites y suscripción.</p></div>
      <div className={styles.headerActions}><Button variant="secondary" icon={SlidersHorizontal} onClick={()=>setLimitModal({metricKey:'users',metricType:'USERS',limitValue:'',hardLimit:false})}>Límite personalizado</Button><Button icon={Plus} onClick={()=>setPlanModal({planId:data.plans[0]?.id||'',billingDay:Math.min(28,new Date().getDate()),notes:''})}>Asignar plan</Button></div>
    </header>

    {message?<div className={`${styles.message} ${styles[message[0]]}`}><span>{message[1]}</span><button onClick={()=>setMessage(null)}><X size={16}/></button></div>:null}

    {current?.canChangePlan===false?<div className={`${styles.message} ${styles.success}`}><span>Tu plan <strong>{current.plan.name}</strong> está activo. El siguiente cambio de plan estará disponible el {dateTime(current.planChangeLockedUntil)}.</span></div>:null}

    <KpiGrid>
      <KpiCard><Boxes/><span>Módulos disponibles</span><KpiInfo title="Catálogo">Módulos disponibles en la plataforma.</KpiInfo><strong>{data.summary.modulesAvailable||0}</strong><small>Catálogo global</small></KpiCard>
      <KpiCard><ToggleRight/><span>Módulos activos</span><KpiInfo title="Activos">Módulos habilitados para esta empresa.</KpiInfo><strong>{data.summary.modulesEnabled||0}</strong><small>{data.summary.modulesDisabled||0} desactivados</small></KpiCard>
      <KpiCard><PackageOpen/><span>Plan actual</span><KpiInfo title="Plan">Suscripción vigente de la empresa.</KpiInfo><strong>{data.summary.plan||'Sin plan'}</strong><small>{data.summary.status||'NONE'}</small></KpiCard>
      <KpiCard><CreditCard/><span>Mensualidad</span><KpiInfo title="Precio">Precio mensual configurado en el plan actual.</KpiInfo><strong>{current?money(current.plan.monthlyPrice,current.plan.currency):money(0)}</strong><small>{current?current.plan.currency:'MXN'}</small></KpiCard>
      <KpiCard><UsersRound/><span>Límite usuarios</span><KpiInfo title="Límites">Override de empresa o límite de plan.</KpiInfo><strong>{data.overrides.find(x=>x.metricKey==='users')?.limitValue||current?.plan?.limits?.find(x=>x.metricKey==='users')?.limitValue||'—'}</strong><small>Configuración comercial</small></KpiCard>
    </KpiGrid>

    <nav className={styles.tabs}>
      <button className={tab==='modules'?styles.active:''} onClick={()=>setTab('modules')}><Layers3 size={17}/> Módulos</button>
      <button className={tab==='plans'?styles.active:''} onClick={()=>setTab('plans')}><PackageOpen size={17}/> Planes</button>
      <button className={tab==='subscription'?styles.active:''} onClick={()=>setTab('subscription')}><CreditCard size={17}/> Suscripción y límites</button>
    </nav>

    {tab==='modules'?<Card className={styles.card}><div className={styles.section}><span>Workspace</span><h3>Aplicaciones de la empresa</h3></div><div className={styles.moduleGrid}>{data.modules.map(m=>{const cm=stateMap.get(m.id);const enabled=cm?.enabled??false;return <article key={m.id} className={enabled?styles.enabled:''}><div className={styles.moduleTop}><span className={styles.moduleIcon}>{enabled?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}</span><Badge tone={enabled?'success':'neutral'}>{enabled?'Activo':'Inactivo'}</Badge></div><h3>{m.name}</h3><p>{m.description||m.category||'Módulo BuzzBee'}</p><small>{m.route||'Sin ruta'}</small><Button variant={enabled?'secondary':'primary'} onClick={()=>submit(`/modules/company/${m.id}`,{enabled:!enabled},`${m.name} ${enabled?'desactivado':'activado'}`,'PUT')}>{enabled?'Desactivar':'Activar'}</Button></article>})}</div></Card>:null}

    {tab==='plans'?<div className={styles.planGrid}>{data.plans.map(p=><Card key={p.id} className={styles.planCard}><div className={styles.planHead}><div><span>Plan</span><h3>{p.name}</h3></div>{current?.planId===p.id?<Badge tone="success">Actual</Badge>:null}</div><div className={styles.price}>{money(p.monthlyPrice,p.currency)}<small>/ mes</small></div><p>{p.description||'Plan modular configurable.'}</p><div className={styles.planModules}>{p.modules.map(x=><span key={x.id}><Check size={14}/>{x.module.name}</span>)}</div><Button variant={current?.planId===p.id?'secondary':'primary'} disabled={current?.planId===p.id || current?.canChangePlan===false} onClick={()=>setPlanModal({planId:p.id,billingDay:Math.min(28,new Date().getDate()),notes:''})}>{current?.planId===p.id?'Plan activo':current?.canChangePlan===false?'Disponible en próximo corte':'Asignar plan'}</Button></Card>)}</div>:null}

    {tab==='subscription'?<div className={styles.subGrid}>
      <Card className={styles.subscriptionCard}><div className={styles.section}><span>Subscription</span><h3>Suscripción actual</h3></div>{current?<div className={styles.subBody}><div className={styles.subHero}><span className={styles.bigIcon}><Sparkles size={22}/></span><div><strong>{current.plan.name}</strong><small>{current.status} · desde {date(current.startedAt)}</small></div><Badge tone={current.status==='ACTIVE'?'success':'warning'}>{current.status}</Badge></div><div className={styles.subFacts}><Fact label="Precio mensual" value={money(current.plan.monthlyPrice,current.plan.currency)}/><Fact label="Periodo inicio" value={date(current.currentPeriodStart)}/><Fact label="Próximo corte" value={date(current.nextBillingAt||current.currentPeriodEnd)}/><Fact label="Día de pago" value={current.billingDay?`Día ${current.billingDay}`:'—'}/><Fact label="Cambio de plan" value={current.canChangePlan===false?`Bloqueado hasta ${date(current.planChangeLockedUntil)}`:'Disponible'}/><Fact label="Módulos incluidos" value={current.plan.modules.length}/></div></div>:<div className={styles.empty}>No hay suscripción activa.</div>}</Card>
      <Card className={styles.limitCard}><div className={styles.cardAction}><div className={styles.section}><span>Limits</span><h3>Límites efectivos</h3></div><Button variant="secondary" onClick={()=>setLimitModal({metricKey:'users',metricType:'USERS',limitValue:'',hardLimit:false})}>Agregar override</Button></div><div className={styles.limitList}>{[...(current?.plan?.limits||[])].map(l=>{const ov=data.overrides.find(x=>x.metricKey===l.metricKey);return <article key={l.id}><span className={styles.lock}><LockKeyhole size={16}/></span><div><strong>{l.metricKey}</strong><small>{l.metricType} · {l.hardLimit?'hard limit':'soft limit'}</small></div><b>{ov?.limitValue||l.limitValue}</b>{ov?<Badge tone="info">Override</Badge>:<Badge tone="neutral">Plan</Badge>}</article>})}{data.overrides.filter(o=>!(current?.plan?.limits||[]).some(l=>l.metricKey===o.metricKey)).map(o=><article key={o.id}><span className={styles.lock}><Settings2 size={16}/></span><div><strong>{o.metricKey}</strong><small>{o.metricType}</small></div><b>{o.limitValue}</b><Badge tone="info">Override</Badge></article>)}</div></Card>
    </div>:null}
    {planModal?<Modal title="Cambiar plan" eyebrow="Suscripción" onClose={()=>setPlanModal(null)}><form onSubmit={async e=>{e.preventDefault();const r=await submit('/modules/subscriptions',{planId:planModal.planId,billingDay:Number(planModal.billingDay),notes:planModal.notes||null},'Plan aplicado inmediatamente');if(r)setPlanModal(null)}}><div className={styles.modalBody}><label>Plan<select value={planModal.planId} onChange={e=>setPlanModal(v=>({...v,planId:e.target.value}))}>{data.plans.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.monthlyPrice,p.currency)}/mes</option>)}</select></label><Input label="Día de corte / pago" type="number" min="1" max="28" required value={planModal.billingDay} onChange={e=>setPlanModal(v=>({...v,billingDay:Math.min(28,Math.max(1,Number(e.target.value)||1))}))}/><Input label="Notas" value={planModal.notes||''} onChange={e=>setPlanModal(v=>({...v,notes:e.target.value}))}/><p>El nuevo plan se aplicará hoy. El siguiente cambio quedará bloqueado hasta tu próxima fecha de facturación.</p></div><Footer onClose={()=>setPlanModal(null)} saving={saving}/></form></Modal>:null}

    {limitModal?<Modal title="Límite personalizado" eyebrow="Company override" onClose={()=>setLimitModal(null)}><form onSubmit={async e=>{e.preventDefault();const r=await submit(`/modules/limits/${limitModal.metricKey}`,{metricType:limitModal.metricType,limitValue:Number(limitModal.limitValue),hardLimit:limitModal.hardLimit},'Límite actualizado','PUT');if(r)setLimitModal(null)}}><div className={styles.modalBody}><div className={styles.grid2}><Input label="Métrica" required value={limitModal.metricKey} onChange={e=>setLimitModal(v=>({...v,metricKey:e.target.value.toLowerCase().replace(/\s+/g,'_')}))}/><label>Tipo<select value={limitModal.metricType} onChange={e=>setLimitModal(v=>({...v,metricType:e.target.value}))}><option value="USERS">Usuarios</option><option value="COUNT">Conteo</option><option value="STORAGE_MB">Almacenamiento MB</option><option value="API_CALLS">API calls</option><option value="TRANSACTIONS">Transacciones</option><option value="CUSTOM">Custom</option></select></label></div><Input label="Valor límite" type="number" min="0" step="1" required value={limitModal.limitValue} onChange={e=>setLimitModal(v=>({...v,limitValue:e.target.value}))}/></div><Footer onClose={()=>setLimitModal(null)} saving={saving}/></form></Modal>:null}
  </div>
}

function Fact({label,value}){return <div><small>{label}</small><strong>{value}</strong></div>}
function Modal({title,eyebrow,onClose,children}){return <div className={styles.overlay} onMouseDown={onClose}><div className={styles.modal} onMouseDown={e=>e.stopPropagation()}><header className={styles.modalHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={19}/></button></header>{children}</div></div>}
function Footer({onClose,saving}){return <footer className={styles.modalFooter}><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>Guardar</Button></footer>}
