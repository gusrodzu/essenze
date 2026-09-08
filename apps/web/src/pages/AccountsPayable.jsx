import {useEffect, useMemo, useState} from 'react';
import {Banknote, CalendarClock, ChevronRight, FilePlus2, ReceiptText, Search, WalletCards, X} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './AccountsPayable.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
import {ModalInfoGrid,ModalNote,ModalSection,RecordModal} from '../components/module-system';
const statuses={PENDING:['Pendiente','warning'],PARTIALLY_PAID:['Pago parcial','info'],PAID:['Pagada','success'],OVERDUE:['Vencida','danger'],CANCELLED:['Cancelada','neutral']};
const money=(value,currency='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency}).format(Number(value||0));
const emptyInvoice=()=>({supplierId:'',purchaseOrderId:'',invoiceNumber:'',issueDate:new Date().toISOString().slice(0,10),dueDate:'',currency:'MXN',subtotal:'',taxAmount:'',total:'',notes:''});
const emptyPayment=()=>({amount:'',paymentDate:new Date().toISOString().slice(0,10),method:'Transferencia',reference:'',notes:'',treasuryAccountId:''});

export default function AccountsPayable(){
 const [invoices,setInvoices]=useState([]),[metrics,setMetrics]=useState({}),[suppliers,setSuppliers]=useState([]),[orders,setOrders]=useState([]),[treasuryAccounts,setTreasuryAccounts]=useState([]),[query,setQuery]=useState(''),[form,setForm]=useState(null),[detail,setDetail]=useState(null),[payment,setPayment]=useState(null),[saving,setSaving]=useState(false),[message,setMessage]=useState(null);
 async function load(){const [data,catalogs]=await Promise.all([apiRequest('/accounts-payable'),apiRequest('/accounts-payable/catalogs')]);setInvoices(data.invoices);setMetrics(data.metrics);setSuppliers(catalogs.suppliers);setOrders(catalogs.purchaseOrders);setTreasuryAccounts(catalogs.treasuryAccounts||[])}
 useEffect(()=>{load().catch(e=>setMessage(['error',e.message]))},[]);
 const filtered=useMemo(()=>invoices.filter(i=>`${i.invoiceNumber} ${i.supplier?.legalName} ${i.purchaseOrder?.folio||''}`.toLowerCase().includes(query.toLowerCase())),[invoices,query]);
 const availableOrders=useMemo(()=>orders.filter(o=>!form?.supplierId||o.supplierId===form.supplierId),[orders,form?.supplierId]);
 function selectOrder(id){const order=orders.find(o=>o.id===id);setForm(v=>({...v,purchaseOrderId:id,total:order?String(order.total):v.total,subtotal:order?String(order.total):v.subtotal}))}
 async function save(e){e.preventDefault();setSaving(true);setMessage(null);try{await apiRequest('/accounts-payable',{method:'POST',body:form});setForm(null);setMessage(['success','Factura registrada correctamente']);await load()}catch(err){setMessage(['error',err.message])}finally{setSaving(false)}}
 async function applyPayment(e){e.preventDefault();setSaving(true);try{const result=await apiRequest(`/accounts-payable/${detail.id}/payments`,{method:'POST',body:payment});setDetail(result.invoice);setPayment(null);setMessage(['success','Pago aplicado correctamente']);await load()}catch(err){setMessage(['error',err.message])}finally{setSaving(false)}}
 return <div className={styles.page}>
  <header className={styles.header}><div><span className={styles.eyebrow}>Finanzas administrativas</span><h1>Cuentas por pagar</h1><p>Controla facturas, vencimientos, pagos parciales y saldos con proveedores.</p></div><Button icon={FilePlus2} onClick={()=>setForm(emptyInvoice())}>Registrar factura</Button></header>
  {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}
  <section className={styles.metrics}><KpiCard><WalletCards size={20}/><span>Facturado</span><KpiInfo title="Total facturado">Importe total de las facturas de proveedores registradas.</KpiInfo><strong>{money(metrics.total)}</strong></KpiCard><KpiCard><Banknote size={20}/><span>Pagado</span><KpiInfo title="Pagos realizados">Importe acumulado aplicado a las cuentas por pagar.</KpiInfo><strong>{money(metrics.paid)}</strong></KpiCard><KpiCard><CalendarClock size={20}/><span>Saldo pendiente</span><KpiInfo title="Deuda pendiente">Importe que todavía debe pagarse a proveedores.</KpiInfo><strong>{money(metrics.balance)}</strong></KpiCard><KpiCard><CalendarClock size={20}/><span>Saldo vencido</span><KpiInfo title="Deuda vencida">Saldo pendiente cuya fecha de vencimiento ya transcurrió.</KpiInfo><strong>{money(metrics.overdue)}</strong></KpiCard></section>
  <Card className={styles.tableCard}><div className={styles.toolbar}><div><h2>Facturas de proveedor</h2><p>{filtered.length} registros</p></div><label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar factura, proveedor u orden"/></label></div><div className={styles.tableWrap}><table><thead><tr><th>Factura</th><th>Proveedor</th><th>Vencimiento</th><th>Total</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>{filtered.map(i=>{const st=statuses[i.displayStatus]||[i.displayStatus,'neutral'];return <tr key={i.id}><td><strong>{i.invoiceNumber}</strong><small>{i.purchaseOrder?.folio||'Sin orden vinculada'}</small></td><td>{i.supplier?.commercialName||i.supplier?.legalName}</td><td>{new Date(i.dueDate).toLocaleDateString('es-MX')}</td><td>{money(i.total,i.currency)}</td><td><strong>{money(i.balance,i.currency)}</strong></td><td><Badge tone={st[1]}>{st[0]}</Badge></td><td><button className={styles.detailButton} onClick={()=>setDetail(i)}>Ver <ChevronRight size={16}/></button></td></tr>})}</tbody></table>{!filtered.length?<div className={styles.empty}>No hay cuentas por pagar registradas.</div>:null}</div></Card>
  {form?<div className={styles.overlay}><form className={styles.modal} onSubmit={save}><div className={styles.modalHeader}><div><span>Nueva factura</span><h2>Cuenta por pagar</h2></div><button type="button" onClick={()=>setForm(null)}><X/></button></div><div className={styles.modalBody}><div className={styles.grid2}><label><span>Proveedor</span><select required value={form.supplierId} onChange={e=>setForm(v=>({...v,supplierId:e.target.value,purchaseOrderId:''}))}><option value="">Selecciona</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.code} · {s.commercialName||s.legalName}</option>)}</select></label><label><span>Orden relacionada</span><select value={form.purchaseOrderId} onChange={e=>selectOrder(e.target.value)}><option value="">Sin orden</option>{availableOrders.map(o=><option key={o.id} value={o.id}>{o.folio} · {money(o.total)}</option>)}</select></label></div><div className={styles.grid3}><Input label="Número de factura" required value={form.invoiceNumber} onChange={e=>setForm(v=>({...v,invoiceNumber:e.target.value}))}/><Input label="Fecha de emisión" type="date" required value={form.issueDate} onChange={e=>setForm(v=>({...v,issueDate:e.target.value}))}/><Input label="Fecha de vencimiento" type="date" required value={form.dueDate} onChange={e=>setForm(v=>({...v,dueDate:e.target.value}))}/></div><div className={styles.grid3}><Input label="Subtotal" type="number" step="0.01" required value={form.subtotal} onChange={e=>setForm(v=>({...v,subtotal:e.target.value}))}/><Input label="Impuestos" type="number" step="0.01" required value={form.taxAmount} onChange={e=>setForm(v=>({...v,taxAmount:e.target.value}))}/><Input label="Total" type="number" step="0.01" required value={form.total} onChange={e=>setForm(v=>({...v,total:e.target.value}))}/></div><label><span>Notas</span><textarea rows="3" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/></label></div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Registrar factura</Button></div></form></div>:null}
  <RecordModal
    open={Boolean(detail)}
    onClose={()=>setDetail(null)}
    title={detail?.invoiceNumber||'Cuenta por pagar'}
    subtitle={detail?.supplier?.commercialName||detail?.supplier?.legalName||'Proveedor'}
    eyebrow="Cuenta por pagar"
    icon={ReceiptText}
    size="lg"
    meta={detail?[detail.purchaseOrder?.folio?`OC ${detail.purchaseOrder.folio}`:null,`Vence ${new Date(detail.dueDate).toLocaleDateString('es-MX')}`]:[]}
    status={detail?<Badge tone={(statuses[detail.displayStatus]||statuses[detail.status]||['','neutral'])[1]}>{(statuses[detail.displayStatus]||statuses[detail.status]||[detail.status])[0]}</Badge>:null}
    footer={detail?<>{Number(detail.balance)>0&&detail.status!=='CANCELLED'?<Button icon={Banknote} onClick={()=>setPayment(emptyPayment())}>Registrar pago</Button>:<Badge tone="success">Saldo liquidado</Badge>}</>:null}
  >
    {detail?<div className={styles.standardDetailStack}>
      <ModalSection title="Resumen financiero" icon={WalletCards}>
        <ModalInfoGrid items={[
          {label:'Total',value:money(detail.total,detail.currency)},
          {label:'Pagado',value:money(detail.paidAmount,detail.currency)},
          {label:'Saldo',value:money(detail.balance,detail.currency)},
          {label:'Vencimiento',value:new Date(detail.dueDate).toLocaleDateString('es-MX')},
          {label:'Proveedor',value:detail.supplier?.commercialName||detail.supplier?.legalName},
          {label:'Orden relacionada',value:detail.purchaseOrder?.folio||'Sin orden vinculada'}
        ]}/>
      </ModalSection>
      {detail.notes?<ModalSection title="Notas" icon={ReceiptText}><ModalNote>{detail.notes}</ModalNote></ModalSection>:null}
      <ModalSection title="Historial de pagos" icon={Banknote} description={`${detail.payments?.length||0} pago(s) registrado(s)`}>
        {detail.payments?.length?<div className={styles.paymentHistory}>{detail.payments.map(p=><div className={styles.paymentRow} key={p.id}><div><strong>{p.folio}</strong><small>{new Date(p.paymentDate).toLocaleDateString('es-MX')} · {p.method}{p.reference?` · ${p.reference}`:''}</small></div><strong>{money(p.amount,detail.currency)}</strong></div>)}</div>:<ModalNote>Aún no hay pagos aplicados.</ModalNote>}
      </ModalSection>
    </div>:null}
  </RecordModal>
  {payment?<div className={styles.overlay}><form className={styles.paymentModal} onSubmit={applyPayment}><div className={styles.modalHeader}><div><span>Aplicar pago</span><h2>{detail.invoiceNumber}</h2></div><button type="button" onClick={()=>setPayment(null)}><X/></button></div><div className={styles.modalBody}><div className={styles.balanceBox}><span>Saldo disponible</span><strong>{money(detail.balance,detail.currency)}</strong></div><Input label="Importe" type="number" min="0.01" max={detail.balance} step="0.01" required value={payment.amount} onChange={e=>setPayment(v=>({...v,amount:e.target.value}))}/><Input label="Fecha de pago" type="date" required value={payment.paymentDate} onChange={e=>setPayment(v=>({...v,paymentDate:e.target.value}))}/><label><span>Cuenta de tesorería</span><select value={payment.treasuryAccountId} onChange={e=>setPayment(v=>({...v,treasuryAccountId:e.target.value}))}><option value="">Sin movimiento de tesorería</option>{treasuryAccounts.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name} · {money(a.currentBalance,a.currency)}</option>)}</select></label><label><span>Método</span><select value={payment.method} onChange={e=>setPayment(v=>({...v,method:e.target.value}))}><option>Transferencia</option><option>Cheque</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select></label><Input label="Referencia" value={payment.reference} onChange={e=>setPayment(v=>({...v,reference:e.target.value}))}/></div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setPayment(null)}>Cancelar</Button><Button type="submit" loading={saving}>Aplicar pago</Button></div></form></div>:null}
 </div>
}
