import {useEffect,useState} from 'react';
import {Boxes,Calculator,CircleDollarSign,Landmark,Plus,RefreshCw,Trash2} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import styles from './FixedAssets.module.css';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';

const money=(n)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n||0));
const date=(v)=>v?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(v)):'—';

export default function FixedAssets(){
  const [data,setData]=useState({assets:[],categories:[],summary:{}});
  const [formOpen,setFormOpen]=useState(false);
  const [msg,setMsg]=useState(null);
  const [form,setForm]=useState({categoryId:'',name:'',brand:'',model:'',serialNumber:'',location:'',custodian:'',acquisitionDate:new Date().toISOString().slice(0,10),acquisitionCost:'',residualValue:'0',usefulLifeMonths:'36',depreciationStartDate:new Date().toISOString().slice(0,10),supplierName:'',invoiceReference:'',notes:''});

  const load=async()=>{try{setData(await apiRequest('/fixed-assets/dashboard'))}catch(e){setMsg(['error',e.message])}};
  useEffect(()=>{load()},[]);
  useEffect(()=>{if(!form.categoryId&&data.categories[0])setForm(f=>({...f,categoryId:data.categories[0].id,usefulLifeMonths:String(data.categories[0].usefulLifeMonths)}))},[data.categories]);

  async function create(e){
    e.preventDefault();
    try{
      const r=await apiRequest('/fixed-assets',{method:'POST',body:{...form,acquisitionCost:Number(form.acquisitionCost),residualValue:Number(form.residualValue),usefulLifeMonths:Number(form.usefulLifeMonths)}});
      setMsg(['success',`${r.asset.code} registrado`]);setFormOpen(false);await load();
    }catch(e){setMsg(['error',e.message])}
  }
  async function recalc(id){try{await apiRequest(`/fixed-assets/${id}/recalculate`,{method:'POST',body:{}});setMsg(['success','Depreciación actualizada']);await load()}catch(e){setMsg(['error',e.message])}}
  async function dispose(id){
    const reason=window.prompt('Motivo de baja del activo');
    if(!reason)return;
    try{await apiRequest(`/fixed-assets/${id}/dispose`,{method:'POST',body:{reason,amount:0,status:'DISPOSED'}});setMsg(['success','Activo dado de baja']);await load()}catch(e){setMsg(['error',e.message])}
  }

  return <div className={styles.page}>
    <header className={styles.header}><div><span>Finanzas · Patrimonio</span><h1>Activos fijos</h1><p>Control patrimonial, depreciación y valor en libros.</p></div><Button onClick={()=>setFormOpen(v=>!v)}><Plus size={17}/> Nuevo activo</Button></header>
    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}
    <KpiGrid>
      <KpiCard><Boxes/><span>Activos activos</span><KpiInfo title="Activos activos">Número de activos patrimoniales que se encuentran actualmente en estado activo.</KpiInfo><strong>{data.summary.assetCount||0}</strong><small>Inventario patrimonial</small></KpiCard>
      <KpiCard><CircleDollarSign/><span>Costo histórico</span><KpiInfo title="Costo histórico">Suma del costo de adquisición de los activos que permanecen activos.</KpiInfo><strong>{money(data.summary.acquisitionCost)}</strong><small>Valor de adquisición</small></KpiCard>
      <KpiCard><Calculator/><span>Depreciación acumulada</span><KpiInfo title="Depreciación acumulada">Depreciación lineal calculada desde el inicio de depreciación de cada activo.</KpiInfo><strong>{money(data.summary.accumulatedDepreciation)}</strong><small>Cálculo lineal</small></KpiCard>
      <KpiCard><Landmark/><span>Valor en libros</span><KpiInfo title="Valor en libros">Costo histórico menos depreciación acumulada, respetando el valor residual configurado.</KpiInfo><strong>{money(data.summary.bookValue)}</strong><small>Valor neto actual</small></KpiCard>
    </KpiGrid>

    {formOpen?<Card className={styles.formCard}><form onSubmit={create} className={styles.form}>
      <label>Categoría<select value={form.categoryId} onChange={e=>{const c=data.categories.find(x=>x.id===e.target.value);setForm({...form,categoryId:e.target.value,usefulLifeMonths:String(c?.usefulLifeMonths||36)})}}>{data.categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <Input label="Nombre del activo" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
      <Input label="Marca" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/>
      <Input label="Modelo" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/>
      <Input label="Número de serie" value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})}/>
      <Input label="Ubicación" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
      <Input label="Custodio" value={form.custodian} onChange={e=>setForm({...form,custodian:e.target.value})}/>
      <Input label="Fecha adquisición" type="date" value={form.acquisitionDate} onChange={e=>setForm({...form,acquisitionDate:e.target.value})}/>
      <Input label="Costo" type="number" step="0.01" value={form.acquisitionCost} onChange={e=>setForm({...form,acquisitionCost:e.target.value})} required/>
      <Input label="Valor residual" type="number" step="0.01" value={form.residualValue} onChange={e=>setForm({...form,residualValue:e.target.value})}/>
      <Input label="Vida útil (meses)" type="number" value={form.usefulLifeMonths} onChange={e=>setForm({...form,usefulLifeMonths:e.target.value})}/>
      <Input label="Inicio depreciación" type="date" value={form.depreciationStartDate} onChange={e=>setForm({...form,depreciationStartDate:e.target.value})}/>
      <div className={styles.formActions}><Button variant="secondary" type="button" onClick={()=>setFormOpen(false)}>Cancelar</Button><Button type="submit">Registrar activo</Button></div>
    </form></Card>:null}

    <Card className={styles.tableCard}>
      <div className={styles.tableHeader}><div><h2>Inventario patrimonial</h2><p>Activos registrados y su valor financiero actual.</p></div><Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button></div>
      <div className={styles.list}>
        {data.assets.length===0?<div className={styles.empty}>Aún no hay activos registrados.</div>:data.assets.map(a=><article key={a.id}>
          <div><span>{a.code} · {a.category?.name}</span><h3>{a.name}</h3><p>{a.brand||''} {a.model||''} · {a.location||'Sin ubicación'} · {date(a.acquisitionDate)}</p></div>
          <div className={styles.metrics}><small>Costo</small><strong>{money(a.acquisitionCost)}</strong><small>Valor libros</small><strong>{money(a.bookValue)}</strong></div>
          <div className={styles.status}><Badge tone={a.status==='ACTIVE'?'success':'neutral'}>{a.status}</Badge><small>{a.remainingMonths} meses restantes</small></div>
          <div className={styles.actions}>{a.status==='ACTIVE'?<><Button variant="secondary" onClick={()=>recalc(a.id)}><Calculator size={15}/></Button><Button variant="secondary" onClick={()=>dispose(a.id)}><Trash2 size={15}/></Button></>:null}</div>
        </article>)}
      </div>
    </Card>
  </div>
}
