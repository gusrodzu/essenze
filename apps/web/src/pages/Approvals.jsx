import {useEffect,useState} from 'react';
import {CheckCircle2,Clock3,FileCheck2,History,Inbox,Settings2,XCircle} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import styles from './Approvals.module.css';

const money=(v,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';

export default function Approvals(){
  const [data,setData]=useState({workflows:[],requests:[],inbox:[],requestedByMe:[],summary:{}});
  const [tab,setTab]=useState('inbox');
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);
  const [comment,setComment]=useState({});

  async function load(){
    try{setData(await apiRequest('/approvals/dashboard'))}
    catch(e){setMessage(['error',e.message])}
  }
  useEffect(()=>{load()},[]);

  async function decide(id,action){
    setSaving(true);
    try{
      await apiRequest(`/approvals/requests/${id}/${action}`,{method:'POST',body:{comment:comment[id]||null}});
      setMessage(['success',action==='approve'?'Solicitud aprobada':'Solicitud rechazada']);
      await load();
    }catch(e){setMessage(['error',e.message])}
    finally{setSaving(false)}
  }

  const rows=tab==='inbox'?data.inbox:tab==='mine'?data.requestedByMe:data.requests;

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Motor de flujos</span><h1>Aprobaciones</h1><p>Centraliza decisiones, autorizaciones y trazabilidad de procesos críticos.</p></div>
    </header>

    {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}

    <KpiGrid>
      <KpiCard><Inbox/><span>Mi bandeja</span><KpiInfo title="Pendientes">Solicitudes que requieren tu decisión.</KpiInfo><strong>{data.summary.myInbox||0}</strong><small>Por resolver</small></KpiCard>
      <KpiCard><Clock3/><span>Pendientes</span><KpiInfo title="Pendientes">Solicitudes abiertas en la empresa.</KpiInfo><strong>{data.summary.pending||0}</strong><small>En proceso</small></KpiCard>
      <KpiCard><CheckCircle2/><span>Aprobadas</span><KpiInfo title="Aprobadas">Solicitudes completadas.</KpiInfo><strong>{data.summary.approved||0}</strong><small>Histórico</small></KpiCard>
      <KpiCard><XCircle/><span>Rechazadas</span><KpiInfo title="Rechazadas">Solicitudes rechazadas.</KpiInfo><strong>{data.summary.rejected||0}</strong><small>Histórico</small></KpiCard>
    </KpiGrid>

    <nav className={styles.tabs}>
      <button className={tab==='inbox'?styles.active:''} onClick={()=>setTab('inbox')}><Inbox size={16}/> Mi bandeja</button>
      <button className={tab==='mine'?styles.active:''} onClick={()=>setTab('mine')}><FileCheck2 size={16}/> Mis solicitudes</button>
      <button className={tab==='history'?styles.active:''} onClick={()=>setTab('history')}><History size={16}/> Historial</button>
      <button className={tab==='workflows'?styles.active:''} onClick={()=>setTab('workflows')}><Settings2 size={16}/> Flujos</button>
    </nav>

    {tab==='workflows'?<div className={styles.workflowGrid}>{data.workflows.map(w=><Card key={w.id} className={styles.workflow}><div className={styles.workflowHead}><div><span>{w.entityType}</span><h3>{w.name}</h3></div><Badge tone={w.active?'success':'neutral'}>{w.active?'Activo':'Inactivo'}</Badge></div><p>{w.description||'Sin descripción'}</p><div className={styles.steps}>{w.rules.map(r=><div key={r.id}><b>{r.sequence}</b><span>{r.name}</span><small>{r.actorType}{r.permissionKey?` · ${r.permissionKey}`:''}</small></div>)}</div></Card>)}</div>:<Card className={styles.tableCard}>
      <div className={styles.list}>
        {rows.length===0?<div className={styles.empty}>No hay solicitudes para mostrar.</div>:rows.map(r=>{
          const currentStep=r.steps?.find(s=>s.status==='PENDING');
          return <article key={r.id}>
            <div className={styles.requestTop}>
              <div><span>{r.entityFolio||r.entityType}</span><h3>{r.title}</h3><p>{r.description||r.workflow?.name}</p></div>
              <div className={styles.requestMeta}><Badge tone={r.status==='APPROVED'?'success':r.status==='REJECTED'?'danger':'warning'}>{r.status}</Badge>{r.amount!=null?<strong>{money(r.amount,r.currency)}</strong>:null}<small>{date(r.requestedAt)}</small></div>
            </div>
            {currentStep?<div className={styles.step}><span>Paso actual</span><strong>{currentStep.name}</strong><small>{currentStep.permissionKey||currentStep.role?.name||currentStep.approverUser?.name||'Aprobador autorizado'}</small></div>:null}
            {tab==='inbox' && r.status==='PENDING'?<div className={styles.actions}><Input label="Comentario" value={comment[r.id]||''} onChange={e=>setComment(v=>({...v,[r.id]:e.target.value}))}/><Button variant="secondary" disabled={saving} onClick={()=>decide(r.id,'reject')}>Rechazar</Button><Button disabled={saving} onClick={()=>decide(r.id,'approve')}>Aprobar</Button></div>:null}
          </article>
        })}
      </div>
    </Card>}
  </div>
}
