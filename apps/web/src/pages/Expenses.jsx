import {useEffect,useMemo,useState} from 'react';
import {Banknote,CheckCircle2,Clock3,Plus,ReceiptText,RefreshCw,WalletCards} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import styles from './Expenses.module.css';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';

const money=(n,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(n||0));
const d=v=>v?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(v)):'—';

export default function Expenses(){
  const [data,setData]=useState({expenses:[],categories:[],employees:[],summary:{}});
  const [show,setShow]=useState(false);
  const [msg,setMsg]=useState(null);
  const [form,setForm]=useState({categoryId:'',employeeId:'',title:'',merchant:'',expenseDate:new Date().toISOString().slice(0,10),amount:'',taxAmount:'0',currency:'MXN',paymentMethod:'PERSONAL_CARD',reimbursable:true,receiptUrl:'',receiptNumber:'',notes:''});

  const load=async()=>{try{setData(await apiRequest('/expenses/dashboard'))}catch(e){setMsg(['error',e.message])}};
  useEffect(()=>{load()},[]);
  useEffect(()=>{if(!form.categoryId && data.categories[0])setForm(f=>({...f,categoryId:data.categories[0].id}))},[data.categories]);

  async function create(e){
    e.preventDefault();
    try{
      const r=await apiRequest('/expenses',{method:'POST',body:{...form,amount:Number(form.amount),taxAmount:Number(form.taxAmount),employeeId:form.employeeId||null,receiptUrl:form.receiptUrl||null}});
      setMsg(['success',`${r.expense.folio} creado`]);setShow(false);await load();
    }catch(err){setMsg(['error',err.message])}
  }
  async function act(id,action){
    try{await apiRequest(`/expenses/${id}/${action}`,{method:'POST',body:{}});setMsg(['success','Gasto actualizado']);await load()}catch(e){setMsg(['error',e.message])}
  }

  return <div className={styles.page}>
    <header className={styles.header}><div><span>Finanzas</span><h1>Gastos y viáticos</h1><p>Controla comprobaciones, autorizaciones y reembolsos desde un solo lugar.</p></div><Button onClick={()=>setShow(v=>!v)}><Plus size={17}/> Nuevo gasto</Button></header>
    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}
    <KpiGrid>
      <KpiCard><ReceiptText/><span>Gasto registrado</span><KpiInfo title="Gasto registrado">Importe total de gastos y viáticos en el periodo consultado.</KpiInfo><strong>{money(data.summary.total)}</strong><small>Periodo consultado</small></KpiCard>
      <KpiCard><Clock3/><span>Pendientes</span><KpiInfo title="Pendientes">Gastos enviados que todavía esperan una decisión de aprobación.</KpiInfo><strong>{data.summary.pending||0}</strong><small>En aprobación</small></KpiCard>
      <KpiCard><CheckCircle2/><span>Aprobados</span><KpiInfo title="Aprobados">Gastos autorizados y disponibles para completar su pago o reembolso.</KpiInfo><strong>{data.summary.approved||0}</strong><small>Listos para pago</small></KpiCard>
      <KpiCard><WalletCards/><span>Por reembolsar</span><KpiInfo title="Por reembolsar">Saldo de gastos reembolsables que aún no han sido marcados como pagados.</KpiInfo><strong>{money(data.summary.reimbursable)}</strong><small>Saldo pendiente</small></KpiCard>
    </KpiGrid>

    {show?<Card className={styles.formCard}><form onSubmit={create} className={styles.form}>
      <label>Categoría<select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}>{data.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <Input label="Concepto" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/>
      <Input label="Comercio / proveedor" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})}/>
      <Input label="Fecha" type="date" value={form.expenseDate} onChange={e=>setForm({...form,expenseDate:e.target.value})}/>
      <Input label="Importe" type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
      <Input label="IVA" type="number" step="0.01" value={form.taxAmount} onChange={e=>setForm({...form,taxAmount:e.target.value})}/>
      <label>Método<select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option value="PERSONAL_CARD">Tarjeta personal</option><option value="CORPORATE_CARD">Tarjeta corporativa</option><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="OTHER">Otro</option></select></label>
      <Input label="Folio comprobante" value={form.receiptNumber} onChange={e=>setForm({...form,receiptNumber:e.target.value})}/>
      <div className={styles.formActions}><Button type="button" variant="secondary" onClick={()=>setShow(false)}>Cancelar</Button><Button type="submit">Guardar gasto</Button></div>
    </form></Card>:null}

    <Card className={styles.tableCard}>
      <div className={styles.tableHeader}><div><h2>Movimientos</h2><p>Gastos, comprobaciones y viáticos registrados.</p></div><Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button></div>
      <div className={styles.list}>
      {data.expenses.length===0?<div className={styles.empty}>Aún no hay gastos registrados.</div>:data.expenses.map(x=><article key={x.id}>
        <div><span>{x.folio} · {x.category?.name}</span><h3>{x.title}</h3><p>{x.merchant||'Sin comercio'} · {d(x.expenseDate)}</p></div>
        <div className={styles.amount}><strong>{money(x.amount,x.currency)}</strong><Badge tone={x.status==='PAID'||x.status==='APPROVED'?'success':x.status==='REJECTED'?'danger':x.status==='SUBMITTED'?'warning':'neutral'}>{x.status}</Badge></div>
        <div className={styles.actions}>
          {x.status==='DRAFT'?<Button onClick={()=>act(x.id,'submit')}>Enviar a aprobación</Button>:null}
          {x.status==='SUBMITTED'?<Button variant="secondary" onClick={()=>act(x.id,'sync-approval')}>Sincronizar aprobación</Button>:null}
          {x.status==='APPROVED'?<Button onClick={()=>act(x.id,'pay')}><Banknote size={16}/> Marcar pagado</Button>:null}
        </div>
      </article>)}
      </div>
    </Card>
  </div>
}
