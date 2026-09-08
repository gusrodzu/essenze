import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,BarChart3,Boxes,CalendarDays,ChevronRight,Clock3,FolderKanban,ReceiptText,
  Plus,RefreshCw,ShoppingBag,ShoppingCart,Store,Users,UsersRound,WalletCards
} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {apiRequest} from '../api';
import styles from './BuzzBeeRightRail.module.css';

const apps=[
  {label:'Ventas',moduleKey:'ventas',icon:ShoppingBag,to:'/ventas',tone:'violet'},
  {label:'Compras',moduleKey:'compras',icon:ShoppingCart,to:'/compras/ordenes',tone:'orange'},
  {label:'Inventario',moduleKey:'inventario',icon:Boxes,to:'/inventario/existencias',tone:'amber'},
  {label:'POS',moduleKey:'pos',icon:Store,to:'/pos',tone:'pink'},
  {label:'CRM',moduleKey:'crm',icon:UsersRound,to:'/crm',tone:'green'},
  {label:'Finanzas',moduleKey:'finanzas',icon:WalletCards,to:'/finanzas/flujo-efectivo',tone:'blue'},
  {label:'Facturación',moduleKey:'facturacion-fiscal',icon:ReceiptText,to:'/facturacion-fiscal',tone:'cyan'},
  {label:'RR. HH.',moduleKey:'rrhh',icon:Users,to:'/recursos-humanos',tone:'purple'},
  {label:'Proyectos',moduleKey:'proyectos',icon:FolderKanban,to:'/proyectos',tone:'rose'},
  {label:'Reportes',moduleKey:'reportes',icon:BarChart3,to:'/reportes',tone:'teal'}
];

function agendaDateLabel(value){
  const date=new Date(value);
  const today=new Date();
  const todayStart=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const targetStart=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const delta=Math.round((targetStart-todayStart)/(24*60*60*1000));
  if(delta<0)return `Vencido · ${Math.abs(delta)}d`;
  if(delta===0)return 'Hoy';
  if(delta===1)return 'Mañana';
  if(delta<7)return new Intl.DateTimeFormat('es-MX',{weekday:'short'}).format(date).replace('.','');
  return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(date).replace('.','');
}

function agendaDay(value){
  return new Intl.DateTimeFormat('es-MX',{day:'2-digit'}).format(new Date(value));
}

function agendaMonth(value){
  return new Intl.DateTimeFormat('es-MX',{month:'short'}).format(new Date(value)).replace('.','').slice(0,3).toUpperCase();
}

export default function BuzzBeeRightRail(){
  const navigate=useNavigate();
  const [moduleState,setModuleState]=useState(null);
  const [agenda,setAgenda]=useState({items:[],summary:null,generatedAt:null});
  const [agendaLoading,setAgendaLoading]=useState(true);
  const [agendaError,setAgendaError]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    apiRequest('/modules/dashboard')
      .then(response=>{
        if(cancelled)return;
        const states=new Map();
        (response.companyModules||[]).forEach(row=>{
          const key=row.module?.key||row.moduleId;
          if(key)states.set(key,row.enabled);
        });
        setModuleState(states);
      })
      .catch(()=>setModuleState(null));
    return()=>{cancelled=true};
  },[]);

  const loadAgenda=useCallback(async(silent=false)=>{
    if(!silent)setAgendaLoading(true);
    try{
      const response=await apiRequest('/agenda',{params:{take:6,days:60,pastDays:14}});
      setAgenda({items:response.items||[],summary:response.summary||null,generatedAt:response.generatedAt||null});
      setAgendaError(false);
    }catch{
      setAgendaError(true);
    }finally{
      if(!silent)setAgendaLoading(false);
    }
  },[]);

  useEffect(()=>{
    loadAgenda();
    const interval=window.setInterval(()=>loadAgenda(true),60_000);
    const onFocus=()=>loadAgenda(true);
    window.addEventListener('focus',onFocus);
    return()=>{
      window.clearInterval(interval);
      window.removeEventListener('focus',onFocus);
    };
  },[loadAgenda]);

  const visibleApps=useMemo(
    ()=>apps.filter(app=>!app.moduleKey||!moduleState||moduleState.get(app.moduleKey)!==false),
    [moduleState]
  );

  return <aside className={styles.rail} aria-label="Aplicaciones y agenda BuzzBee">
    <section className={styles.appsCard}>
      <header>
        <div className={styles.appsHeading}>
          <strong>Aplicaciones</strong>
          <small>Acceso rápido a tus módulos activos</small>
        </div>
        <button type="button" onClick={()=>navigate('/configuracion/modulos')}>Ver todas</button>
      </header>
      <div className={styles.appGrid}>
        {visibleApps.map(app=>{
          const Icon=app.icon;
          return <button type="button" key={app.label} onClick={()=>navigate(app.to)} title={app.label}>
            <span className={`${styles.appIcon} ${styles[app.tone]}`}><Icon size={18}/></span>
            <small>{app.label}</small>
          </button>
        })}
        <button type="button" onClick={()=>navigate('/configuracion/modulos')} title="Más aplicaciones">
          <span className={`${styles.appIcon} ${styles.more}`}>•••</span>
          <small>Más apps</small>
        </button>
      </div>
    </section>

    <section className={styles.agendaCard} aria-label="Agenda sincronizada del sistema">
      <header className={styles.agendaHeader}>
        <div className={styles.agendaHeading}>
          <span className={styles.agendaIcon}><CalendarDays size={17}/></span>
          <div>
            <strong>Agenda</strong>
            <small><i/> Sincronizada con el sistema</small>
          </div>
        </div>
        <div className={styles.agendaActions}>
          <button type="button" className={styles.agendaOpenButton} onClick={()=>navigate('/agenda')} title="Abrir agenda completa">Abrir</button>
          <button type="button" className={styles.agendaAddButton} onClick={()=>navigate('/agenda?new=1')} title="Crear evento" aria-label="Crear evento"><Plus size={14}/></button>
          <button type="button" className={styles.refreshButton} onClick={()=>loadAgenda()} title="Actualizar agenda" aria-label="Actualizar agenda">
            <RefreshCw size={14} className={agendaLoading?styles.spinning:''}/>
          </button>
        </div>
      </header>

      {agenda.summary?<div className={styles.agendaSummary}>
        <div><strong>{agenda.summary.today||0}</strong><span>Hoy</span></div>
        <div><strong>{agenda.summary.next7||0}</strong><span>7 días</span></div>
        <div className={agenda.summary.overdue?styles.summaryAlert:''}><strong>{agenda.summary.overdue||0}</strong><span>Vencidos</span></div>
      </div>:null}

      <div className={styles.agendaList}>
        {agendaLoading&&!agenda.items.length?<div className={styles.agendaState}><Clock3 size={17}/><span>Sincronizando agenda…</span></div>:null}
        {agendaError&&!agenda.items.length?<div className={`${styles.agendaState} ${styles.agendaError}`}><AlertTriangle size={17}/><span>No se pudo sincronizar.</span><button type="button" onClick={()=>loadAgenda()}>Reintentar</button></div>:null}
        {!agendaLoading&&!agendaError&&!agenda.items.length?<div className={styles.agendaState}><CalendarDays size={17}/><span>No hay eventos próximos.</span></div>:null}
        {agenda.items.map(item=><button type="button" key={item.id} className={`${styles.agendaItem} ${item.overdue?styles.overdue:''}`} onClick={()=>item.source==='manual'&&item.rawId?navigate(`/agenda?event=${item.rawId}`):item.route&&navigate(item.route)} title={`${item.module}: ${item.title}`}>
          <span className={styles.dateTile}>
            <strong>{agendaDay(item.date)}</strong>
            <small>{agendaMonth(item.date)}</small>
          </span>
          <span className={styles.agendaCopy}>
            <span className={styles.agendaMetaRow}><b className={`${styles.agendaDot} ${styles[item.tone]||''}`}/><small>{item.module} · {agendaDateLabel(item.date)}</small></span>
            <strong>{item.title}</strong>
            <small className={styles.agendaMeta}>{item.meta}</small>
          </span>
          <ChevronRight size={14} className={styles.agendaChevron}/>
        </button>)}
      </div>

      <footer className={styles.agendaFooter}>
        <span><Clock3 size={12}/> Actualiza automáticamente cada minuto</span>
        {agendaError&&agenda.items.length?<button type="button" onClick={()=>loadAgenda()}>Reconectar</button>:null}
      </footer>
    </section>
  </aside>;
}
