import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  Bell,CalendarDays,Check,ChevronLeft,ChevronRight,Clock3,Edit3,Plus,RefreshCw,
  Trash2,X
} from 'lucide-react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {apiRequest} from '../api';
import {Button} from '../design-system/components/Button';
import {Input} from '../design-system/components/Input';
import styles from './Agenda.module.css';

const priorityLabels={LOW:'Baja',NORMAL:'Normal',HIGH:'Alta',URGENT:'Urgente'};
const reminderOptions=[
  {value:'',label:'Sin recordatorio'},
  {value:'0',label:'Al iniciar'},
  {value:'10',label:'10 minutos antes'},
  {value:'30',label:'30 minutos antes'},
  {value:'60',label:'1 hora antes'},
  {value:'1440',label:'1 día antes'},
  {value:'2880',label:'2 días antes'},
  {value:'10080',label:'1 semana antes'},
];

function startOfDay(date){const d=new Date(date);d.setHours(0,0,0,0);return d}
function endOfDay(date){const d=new Date(date);d.setHours(23,59,59,999);return d}
function startOfWeek(date){const d=startOfDay(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d}
function addDays(date,count){const d=new Date(date);d.setDate(d.getDate()+count);return d}
function startOfMonth(date){return new Date(date.getFullYear(),date.getMonth(),1)}
function sameDay(a,b){return new Date(a).toDateString()===new Date(b).toDateString()}
function isoDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function localDateTime(value){
  const d=new Date(value);
  return `${isoDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function timeLabel(value,allDay){return allDay?'Todo el día':new Intl.DateTimeFormat('es-MX',{hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function fullDate(value){return new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value))}
function employeeName(employee){return `${employee.firstName||''} ${employee.lastName||''}`.trim()}

function emptyEvent(date=new Date()){
  const start=new Date(date);
  if(start.getHours()===0&&start.getMinutes()===0)start.setHours(9,0,0,0);
  else start.setHours(start.getHours()+1,0,0,0);
  const end=new Date(start.getTime()+60*60*1000);
  return {id:null,title:'',description:'',allDay:false,startAt:localDateTime(start),endAt:localDateTime(end),priority:'NORMAL',reminderMinutes:'30',assigneeEmployeeId:'',status:'ACTIVE'};
}

export default function Agenda(){
  const navigate=useNavigate();
  const [searchParams,setSearchParams]=useSearchParams();
  const [view,setView]=useState('month');
  const [cursor,setCursor]=useState(new Date());
  const [items,setItems]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [filter,setFilter]=useState('all');
  const [modal,setModal]=useState(null);

  useEffect(()=>{
    if(searchParams.get('new')==='1'){
      setModal(emptyEvent(new Date()));
      setSearchParams({}, {replace:true});
    }
  },[searchParams,setSearchParams]);

  const range=useMemo(()=>{
    if(view==='week'){
      const from=startOfWeek(cursor);
      return {from,to:endOfDay(addDays(from,6))};
    }
    const first=startOfMonth(cursor);
    const from=startOfWeek(first);
    return {from,to:endOfDay(addDays(from,41))};
  },[cursor,view]);

  const load=useCallback(async(silent=false)=>{
    if(!silent)setLoading(true);
    setError('');
    try{
      const [agenda,meta]=await Promise.all([
        apiRequest('/agenda',{params:{from:isoDate(range.from),to:isoDate(range.to),take:500}}),
        employees.length?Promise.resolve({employees}):apiRequest('/agenda/meta'),
      ]);
      setItems(agenda.items||[]);
      if(meta.employees)setEmployees(meta.employees);
    }catch(e){setError(e.message||'No fue posible cargar la agenda');}
    finally{if(!silent)setLoading(false)}
  },[range.from,range.to,employees]);

  useEffect(()=>{load()},[view,cursor.getFullYear(),cursor.getMonth(),cursor.getDate()]);
  useEffect(()=>{
    const onFocus=()=>load(true);
    const timer=window.setInterval(()=>load(true),60_000);
    window.addEventListener('focus',onFocus);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus)};
  },[load]);

  const visibleItems=useMemo(()=>items.filter(item=>filter==='all'||(filter==='manual'?item.source==='manual':item.source!=='manual')),[items,filter]);
  const byDay=useMemo(()=>{
    const map=new Map();
    visibleItems.forEach(item=>{const key=isoDate(new Date(item.date));const list=map.get(key)||[];list.push(item);map.set(key,list)});
    map.forEach(list=>list.sort((a,b)=>new Date(a.date)-new Date(b.date)));
    return map;
  },[visibleItems]);

  useEffect(()=>{
    const eventId=searchParams.get('event');
    if(!eventId||!items.length)return;
    const item=items.find(row=>row.source==='manual'&&row.rawId===eventId);
    if(item){
      openItem(item);
      setSearchParams({}, {replace:true});
    }
  },[items,searchParams,setSearchParams]);

  const stats=useMemo(()=>{
    const today=startOfDay(new Date());const todayEnd=endOfDay(today);const weekEnd=endOfDay(addDays(today,7));
    return {
      today:items.filter(i=>{const d=new Date(i.date);return d>=today&&d<=todayEnd}).length,
      week:items.filter(i=>{const d=new Date(i.date);return d>=today&&d<=weekEnd}).length,
      overdue:items.filter(i=>new Date(i.date)<today&&i.status!=='COMPLETED').length,
      manual:items.filter(i=>i.source==='manual').length,
    };
  },[items]);

  function move(direction){
    if(view==='week'){
      const d=new Date(cursor);d.setDate(d.getDate()+direction*7);setCursor(d);
    }else{
      setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+direction,1));
    }
  }

  function openNew(date=new Date()){
    setModal(emptyEvent(date));
  }

  function openItem(item){
    if(item.source!=='manual'){
      if(item.route)navigate(item.route);
      return;
    }
    const allDay=Boolean(item.allDay);
    setModal({
      id:item.rawId,
      title:item.title||'',
      description:item.description||'',
      allDay,
      startAt:allDay?isoDate(new Date(item.date)):localDateTime(item.date),
      endAt:item.endAt?(allDay?isoDate(new Date(item.endAt)):localDateTime(item.endAt)):'',
      priority:item.eventPriority||'NORMAL',
      reminderMinutes:item.reminderMinutes==null?'':String(item.reminderMinutes),
      assigneeEmployeeId:item.assigneeEmployeeId||'',
      status:item.status||'ACTIVE',
    });
  }

  async function saveEvent(event){
    event.preventDefault();
    if(!modal.title.trim())return;
    setSaving(true);setError('');setNotice('');
    try{
      const startAt=modal.allDay?new Date(`${modal.startAt}T12:00:00`).toISOString():new Date(modal.startAt).toISOString();
      const endAt=modal.endAt?(modal.allDay?new Date(`${modal.endAt}T23:59:00`).toISOString():new Date(modal.endAt).toISOString()):null;
      const body={
        title:modal.title.trim(),description:modal.description.trim()||null,startAt,endAt,allDay:modal.allDay,
        priority:modal.priority,reminderMinutes:modal.reminderMinutes===''?null:Number(modal.reminderMinutes),
        assigneeEmployeeId:modal.assigneeEmployeeId||null,status:modal.status||'ACTIVE',
      };
      await apiRequest(modal.id?`/agenda/events/${modal.id}`:'/agenda/events',{method:modal.id?'PUT':'POST',body});
      setNotice(modal.id?'Evento actualizado':'Evento creado');setModal(null);await load(true);
    }catch(e){setError(e.message||'No fue posible guardar el evento');}
    finally{setSaving(false)}
  }

  async function removeEvent(){
    if(!modal?.id)return;
    setSaving(true);
    try{
      await apiRequest(`/agenda/events/${modal.id}`,{method:'DELETE'});
      setNotice('Evento eliminado');setModal(null);await load(true);
    }catch(e){setError(e.message||'No fue posible eliminar el evento');}
    finally{setSaving(false)}
  }

  async function completeEvent(){
    if(!modal?.id)return;
    setSaving(true);
    try{
      await apiRequest(`/agenda/events/${modal.id}/status`,{method:'PATCH',body:{status:modal.status==='COMPLETED'?'ACTIVE':'COMPLETED'}});
      setNotice(modal.status==='COMPLETED'?'Evento reactivado':'Evento completado');setModal(null);await load(true);
    }catch(e){setError(e.message||'No fue posible actualizar el evento');}
    finally{setSaving(false)}
  }

  const title=view==='week'
    ?`${new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(range.from)} – ${new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(range.to)}`
    :new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(cursor);

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div>
        <span className={styles.eyebrow}>Business OS · Agenda central</span>
        <h1>Agenda</h1>
        <p>Unifica fechas operativas de todo BuzzBee con tus eventos, responsables y recordatorios.</p>
      </div>
      <div className={styles.headerActions}>
        <Button variant="secondary" icon={RefreshCw} onClick={()=>load()} disabled={loading}>Actualizar</Button>
        <Button icon={Plus} onClick={()=>openNew(new Date())}>Nuevo evento</Button>
      </div>
    </header>

    {notice?<div className={styles.notice}>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>:null}
    {error?<div className={styles.error}>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>:null}

    <section className={styles.stats}>
      <article><span><CalendarDays size={16}/>Hoy</span><strong>{stats.today}</strong><small>Eventos del día</small></article>
      <article><span><Clock3 size={16}/>Próximos 7 días</span><strong>{stats.week}</strong><small>Compromisos próximos</small></article>
      <article className={stats.overdue?styles.statAlert:''}><span><Bell size={16}/>Vencidos</span><strong>{stats.overdue}</strong><small>Requieren atención</small></article>
      <article><span><Edit3 size={16}/>Eventos propios</span><strong>{stats.manual}</strong><small>Creados en Agenda</small></article>
    </section>

    <section className={styles.calendarCard}>
      <div className={styles.toolbar}>
        <div className={styles.periodControls}>
          <button type="button" onClick={()=>move(-1)} aria-label="Anterior"><ChevronLeft size={17}/></button>
          <button type="button" className={styles.todayButton} onClick={()=>setCursor(new Date())}>Hoy</button>
          <button type="button" onClick={()=>move(1)} aria-label="Siguiente"><ChevronRight size={17}/></button>
          <h2>{title}</h2>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.filters}>
            <button className={filter==='all'?styles.active:''} onClick={()=>setFilter('all')}>Todos</button>
            <button className={filter==='system'?styles.active:''} onClick={()=>setFilter('system')}>ERP</button>
            <button className={filter==='manual'?styles.active:''} onClick={()=>setFilter('manual')}>Propios</button>
          </div>
          <div className={styles.viewToggle}>
            <button className={view==='month'?styles.active:''} onClick={()=>setView('month')}>Mes</button>
            <button className={view==='week'?styles.active:''} onClick={()=>setView('week')}>Semana</button>
          </div>
        </div>
      </div>

      {loading?<div className={styles.loading}><RefreshCw size={20}/>Sincronizando agenda…</div>:view==='month'
        ?<MonthGrid cursor={cursor} range={range} byDay={byDay} onNew={openNew} onItem={openItem}/>
        :<WeekGrid range={range} byDay={byDay} onNew={openNew} onItem={openItem}/>
      }
    </section>

    {modal?<EventModal value={modal} setValue={setModal} employees={employees} saving={saving} onClose={()=>setModal(null)} onSubmit={saveEvent} onDelete={removeEvent} onComplete={completeEvent}/>:null}
  </div>;
}

function MonthGrid({cursor,range,byDay,onNew,onItem}){
  const days=Array.from({length:42},(_,i)=>addDays(range.from,i));
  const today=new Date();
  return <div className={styles.monthWrap}>
    <div className={styles.weekdays}>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day}>{day}</span>)}</div>
    <div className={styles.monthGrid}>
      {days.map(day=>{
        const events=byDay.get(isoDate(day))||[];
        const muted=day.getMonth()!==cursor.getMonth();
        return <div key={day.toISOString()} className={`${styles.dayCell} ${muted?styles.mutedDay:''} ${sameDay(day,today)?styles.todayCell:''}`}>
          <button className={styles.dayNumber} onClick={()=>onNew(day)} title={`Crear evento el ${fullDate(day)}`}>{day.getDate()}</button>
          <div className={styles.dayEvents}>
            {events.slice(0,3).map(item=><EventPill key={item.id} item={item} onClick={()=>onItem(item)}/>)}
            {events.length>3?<button className={styles.moreEvents} onClick={()=>onNew(day)}>+{events.length-3} más</button>:null}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function WeekGrid({range,byDay,onNew,onItem}){
  const days=Array.from({length:7},(_,i)=>addDays(range.from,i));
  const today=new Date();
  return <div className={styles.weekGrid}>
    {days.map(day=>{
      const events=byDay.get(isoDate(day))||[];
      return <section key={day.toISOString()} className={`${styles.weekColumn} ${sameDay(day,today)?styles.todayWeek:''}`}>
        <header>
          <span>{new Intl.DateTimeFormat('es-MX',{weekday:'short'}).format(day).replace('.','')}</span>
          <strong>{day.getDate()}</strong>
          <button onClick={()=>onNew(day)} aria-label="Crear evento"><Plus size={14}/></button>
        </header>
        <div className={styles.weekEvents}>
          {events.length?events.map(item=><WeekEvent key={item.id} item={item} onClick={()=>onItem(item)}/>):<button className={styles.emptyDay} onClick={()=>onNew(day)}>Agregar evento</button>}
        </div>
      </section>;
    })}
  </div>;
}

function EventPill({item,onClick}){
  return <button className={`${styles.eventPill} ${styles[`tone_${item.tone}`]||''} ${item.source==='manual'?styles.manualEvent:''}`} onClick={onClick} title={`${item.module}: ${item.title}`}>
    <span>{timeLabel(item.date,item.allDay)}</span><strong>{item.title}</strong>
  </button>;
}

function WeekEvent({item,onClick}){
  return <button className={`${styles.weekEvent} ${item.source==='manual'?styles.manualWeekEvent:''}`} onClick={onClick}>
    <span className={`${styles.eventDot} ${styles[`dot_${item.tone}`]||''}`}/>
    <small>{timeLabel(item.date,item.allDay)} · {item.module}</small>
    <strong>{item.title}</strong>
    <span>{item.meta}</span>
  </button>;
}

function EventModal({value,setValue,employees,saving,onClose,onSubmit,onDelete,onComplete}){
  const editing=Boolean(value.id);
  return <div className={styles.overlay} onMouseDown={onClose}>
    <div className={styles.modal} onMouseDown={e=>e.stopPropagation()}>
      <header className={styles.modalHeader}>
        <div><span>{editing?'Editar evento':'Agenda BuzzBee'}</span><h2>{editing?'Actualizar evento':'Nuevo evento'}</h2></div>
        <button type="button" onClick={onClose}><X size={19}/></button>
      </header>
      <form onSubmit={onSubmit}>
        <div className={styles.modalBody}>
          <Input label="Título" required maxLength="180" value={value.title} onChange={e=>setValue(v=>({...v,title:e.target.value}))}/>
          <label className={styles.textareaField}>Descripción<textarea rows="3" maxLength="3000" value={value.description} onChange={e=>setValue(v=>({...v,description:e.target.value}))}/></label>
          <label className={styles.checkRow}><input type="checkbox" checked={value.allDay} onChange={e=>setValue(v=>({...v,allDay:e.target.checked,startAt:e.target.checked?v.startAt.split('T')[0]:`${v.startAt}T09:00`,endAt:v.endAt?(e.target.checked?v.endAt.split('T')[0]:`${v.endAt}T10:00`):''}))}/><span><strong>Todo el día</strong><small>Oculta la hora del evento en el calendario</small></span></label>
          <div className={styles.grid2}>
            <Input label="Inicio" type={value.allDay?'date':'datetime-local'} required value={value.startAt} onChange={e=>setValue(v=>({...v,startAt:e.target.value}))}/>
            <Input label="Término" type={value.allDay?'date':'datetime-local'} value={value.endAt} onChange={e=>setValue(v=>({...v,endAt:e.target.value}))}/>
          </div>
          <div className={styles.grid2}>
            <label>Prioridad<select value={value.priority} onChange={e=>setValue(v=>({...v,priority:e.target.value}))}>{Object.entries(priorityLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
            <label>Responsable<select value={value.assigneeEmployeeId} onChange={e=>setValue(v=>({...v,assigneeEmployeeId:e.target.value}))}><option value="">Sin responsable</option>{employees.map(employee=><option key={employee.id} value={employee.id}>{employeeName(employee)} · {employee.employeeNumber}</option>)}</select></label>
          </div>
          <label>Recordatorio<select value={value.reminderMinutes} onChange={e=>setValue(v=>({...v,reminderMinutes:e.target.value}))}>{reminderOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><small className={styles.helper}><Bell size={12}/> Se enviará una notificación dentro de BuzzBee.</small></label>
        </div>
        <footer className={styles.modalFooter}>
          <div className={styles.destructiveActions}>
            {editing?<button type="button" className={styles.deleteButton} onClick={onDelete} disabled={saving}><Trash2 size={15}/>Eliminar</button>:null}
            {editing?<button type="button" className={styles.completeButton} onClick={onComplete} disabled={saving}><Check size={15}/>{value.status==='COMPLETED'?'Reactivar':'Completar'}</button>:null}
          </div>
          <div className={styles.saveActions}><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving} icon={editing?Edit3:Plus}>{editing?'Guardar cambios':'Crear evento'}</Button></div>
        </footer>
      </form>
    </div>
  </div>;
}
