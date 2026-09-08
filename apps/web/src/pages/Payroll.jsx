import {useEffect, useMemo, useState} from 'react';
import {Banknote, Calculator, CheckCircle2, CircleDollarSign, Pencil, Plus, Search, X} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Payroll.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const statusLabels={DRAFT:'Borrador',CALCULATED:'Calculada',APPROVED:'Aprobada',PAID:'Pagada',CANCELLED:'Cancelada'};
const statusTones={DRAFT:'neutral',CALCULATED:'warning',APPROVED:'success',PAID:'success',CANCELLED:'danger'};
const currency=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value||0));
const date=value=>value?new Date(value).toLocaleDateString('es-MX'):'—';
const blank=()=>({name:'Nómina quincenal',startDate:'',endDate:'',paymentDate:'',notes:''});

export default function Payroll(){
  const [data,setData]=useState({periods:[],employees:[],stats:{periods:0,draft:0,approved:0,pendingNet:0}});
  const [query,setQuery]=useState('');
  const [modal,setModal]=useState(null);
  const [detail,setDetail]=useState(null);
  const [editing,setEditing]=useState(null);
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);

  async function load(){
    const response=await apiRequest('/payroll');
    setData(response);
    if(detail){
      const refreshed=response.periods.find(item=>item.id===detail.id);
      setDetail(refreshed||null);
    }
  }
  useEffect(()=>{load().catch(error=>setMessage(['error',error.message]))},[]);

  const periods=useMemo(()=>data.periods.filter(item=>
    `${item.folio} ${item.name} ${statusLabels[item.status]}`.toLowerCase().includes(query.toLowerCase())
  ),[data.periods,query]);

  async function createPeriod(event){
    event.preventDefault();setSaving(true);
    try{
      await apiRequest('/payroll',{method:'POST',body:modal});
      setModal(null);setMessage(['success','Periodo de nómina creado']);await load();
    }catch(error){setMessage(['error',error.message])}finally{setSaving(false)}
  }
  async function calculate(item){
    if(!window.confirm(`¿Calcular ${item.folio} con los empleados activos e incidencias del periodo?`))return;
    try{await apiRequest(`/payroll/${item.id}/calculate`,{method:'POST'});setMessage(['success','Prenómina calculada']);await load()}catch(error){setMessage(['error',error.message])}
  }
  async function changeStatus(item,status){
    try{await apiRequest(`/payroll/${item.id}/status`,{method:'PATCH',body:{status}});setMessage(['success',`Periodo actualizado a ${statusLabels[status]}`]);await load()}catch(error){setMessage(['error',error.message])}
  }
  async function saveItem(event){
    event.preventDefault();setSaving(true);
    try{
      await apiRequest(`/payroll/${detail.id}/items/${editing.id}`,{method:'PUT',body:{
        baseSalary:Number(editing.baseSalary),bonuses:Number(editing.bonuses),overtime:Number(editing.overtime),deductions:Number(editing.deductions),notes:editing.notes||null
      }});
      setEditing(null);setMessage(['success','Conceptos del empleado actualizados']);await load();
    }catch(error){setMessage(['error',error.message])}finally{setSaving(false)}
  }

  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Recursos humanos</span><h1>Prenómina</h1><p>Calcula periodos de pago, integra bonos, tiempo extra e incidencias y controla su aprobación.</p></div><Button icon={Plus} onClick={()=>setModal(blank())}>Nuevo periodo</Button></header>
    {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}
    <section className={styles.metrics}>
      <KpiCard><Banknote/><span>Periodos</span><KpiInfo title="Periodos de pren\u00f3mina">Cantidad total de periodos de nómina creados.</KpiInfo><strong>{data.stats.periods}</strong></KpiCard>
      <KpiCard><Calculator/><span>En preparación</span><KpiInfo title="N\u00f3minas abiertas">Periodos todavía disponibles para ajustes y revisión.</KpiInfo><strong>{data.stats.draft}</strong></KpiCard>
      <KpiCard><CheckCircle2/><span>Aprobadas</span><KpiInfo title="N\u00f3minas autorizadas">Periodos revisados y aprobados para su procesamiento.</KpiInfo><strong>{data.stats.approved}</strong></KpiCard>
      <KpiCard><CircleDollarSign/><span>Neto pendiente</span><KpiInfo title="Importe neto pendiente">Suma del neto de periodos que aún no han sido pagados.</KpiInfo><strong>{currency(data.stats.pendingNet)}</strong></KpiCard>
    </section>

    <Card className={styles.tableCard}>
      <div className={styles.toolbar}><div><h2>Periodos de pago</h2><p>{periods.length} periodos visibles</p></div><label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar periodo o folio"/></label></div>
      <div className={styles.tableWrap}><table><thead><tr><th>Periodo</th><th>Fechas</th><th>Empleados</th><th>Percepciones</th><th>Deducciones</th><th>Neto</th><th>Estado</th><th></th></tr></thead><tbody>
        {periods.length?periods.map(item=><tr key={item.id}><td><strong>{item.folio}</strong><small>{item.name}</small></td><td>{date(item.startDate)} – {date(item.endDate)}<small>Pago: {date(item.paymentDate)}</small></td><td>{item.items.length}</td><td>{currency(item.totalGross)}</td><td>{currency(item.totalDeductions)}</td><td><strong>{currency(item.totalNet)}</strong></td><td><Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge></td><td className={styles.actions}><button onClick={()=>setDetail(item)}>Ver detalle</button>{['DRAFT','CALCULATED'].includes(item.status)?<button onClick={()=>calculate(item)}><Calculator size={15}/> Calcular</button>:null}{item.status==='CALCULATED'?<button onClick={()=>changeStatus(item,'APPROVED')}>Aprobar</button>:null}{item.status==='APPROVED'?<button onClick={()=>changeStatus(item,'PAID')}>Marcar pagada</button>:null}</td></tr>):<tr><td colSpan="8"><div className={styles.empty}>No hay periodos de nómina todavía.</div></td></tr>}
      </tbody></table></div>
    </Card>

    {modal?<div className={styles.overlay}><form className={styles.modal} onSubmit={createPeriod}><div className={styles.modalHeader}><div><span>Nuevo periodo</span><h2>Configurar prenómina</h2></div><button type="button" onClick={()=>setModal(null)}><X/></button></div><div className={styles.modalBody}><Input label="Nombre" required value={modal.name} onChange={e=>setModal(v=>({...v,name:e.target.value}))}/><div className={styles.grid3}><Input label="Fecha inicial" type="date" required value={modal.startDate} onChange={e=>setModal(v=>({...v,startDate:e.target.value}))}/><Input label="Fecha final" type="date" required value={modal.endDate} onChange={e=>setModal(v=>({...v,endDate:e.target.value}))}/><Input label="Fecha de pago" type="date" required value={modal.paymentDate} onChange={e=>setModal(v=>({...v,paymentDate:e.target.value}))}/></div><label>Notas<textarea rows="4" value={modal.notes} onChange={e=>setModal(v=>({...v,notes:e.target.value}))}/></label></div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setModal(null)}>Cancelar</Button><Button type="submit" loading={saving}>Crear periodo</Button></div></form></div>:null}

    {detail?<div className={styles.overlay}><div className={`${styles.modal} ${styles.detailModal}`}><div className={styles.modalHeader}><div><span>{detail.folio}</span><h2>{detail.name}</h2></div><button type="button" onClick={()=>setDetail(null)}><X/></button></div><div className={styles.summary}><div><span>Percepciones</span><strong>{currency(detail.totalGross)}</strong></div><div><span>Deducciones</span><strong>{currency(detail.totalDeductions)}</strong></div><div><span>Neto</span><strong>{currency(detail.totalNet)}</strong></div></div><div className={styles.detailTable}><table><thead><tr><th>Empleado</th><th>Sueldo proporcional</th><th>Bonos</th><th>Tiempo extra</th><th>Deducciones</th><th>Neto</th><th></th></tr></thead><tbody>{detail.items.map(item=><tr key={item.id}><td><strong>{item.employee.firstName} {item.employee.lastName}</strong><small>{item.employee.employeeNumber} · {item.employee.department?.name||'Sin departamento'}</small></td><td>{currency(item.baseSalary)}</td><td>{currency(item.bonuses)}</td><td>{currency(item.overtime)}</td><td>{currency(item.deductions)}</td><td><strong>{currency(item.netPay)}</strong></td><td><button className={styles.iconButton} onClick={()=>setEditing({...item,baseSalary:Number(item.baseSalary),bonuses:Number(item.bonuses),overtime:Number(item.overtime),deductions:Number(item.deductions)})}><Pencil size={16}/></button></td></tr>)}</tbody></table></div></div></div>:null}

    {editing?<div className={styles.overlay}><form className={styles.smallModal} onSubmit={saveItem}><div className={styles.modalHeader}><div><span>Ajustar conceptos</span><h2>{editing.employee.firstName} {editing.employee.lastName}</h2></div><button type="button" onClick={()=>setEditing(null)}><X/></button></div><div className={styles.modalBody}><div className={styles.grid2}><Input label="Sueldo proporcional" type="number" min="0" step="0.01" value={editing.baseSalary} onChange={e=>setEditing(v=>({...v,baseSalary:e.target.value}))}/><Input label="Bonos" type="number" min="0" step="0.01" value={editing.bonuses} onChange={e=>setEditing(v=>({...v,bonuses:e.target.value}))}/><Input label="Tiempo extra" type="number" min="0" step="0.01" value={editing.overtime} onChange={e=>setEditing(v=>({...v,overtime:e.target.value}))}/><Input label="Deducciones" type="number" min="0" step="0.01" value={editing.deductions} onChange={e=>setEditing(v=>({...v,deductions:e.target.value}))}/></div><label>Notas<textarea rows="3" value={editing.notes||''} onChange={e=>setEditing(v=>({...v,notes:e.target.value}))}/></label></div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setEditing(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar cambios</Button></div></form></div>:null}
  </div>
}
