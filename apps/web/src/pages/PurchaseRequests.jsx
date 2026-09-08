import {CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardList, Clock3, FileText, Info, Package, Plus, Send, UserRound, Warehouse, X, XCircle} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './PurchaseRequests.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import {DataTableFrame,ModuleHeader,ModuleToolbar} from '../components/module-system';
const statusMap={DRAFT:['Borrador','neutral'],PENDING:['Pendiente','warning'],APPROVED:['Aprobada','success'],REJECTED:['Rechazada','danger'],ORDERED:['Ordenada','info'],CANCELLED:['Cancelada','neutral']};
const priorityMap={LOW:'Baja',NORMAL:'Normal',HIGH:'Alta',URGENT:'Urgente'};
const newForm=()=>({title:'',warehouseId:'',justification:'',priority:'NORMAL',requiredDate:'',items:[{productId:'',quantity:1,estimatedUnitCost:0,notes:''}]});
const money=(value)=>Number(value||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const dateTime=(value)=>value?new Date(value).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}):'—';

export default function PurchaseRequests(){
  const [requests,setRequests]=useState([]),[warehouses,setWarehouses]=useState([]),[products,setProducts]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[query,setQuery]=useState(''),[form,setForm]=useState(null),[detail,setDetail]=useState(null),[drawerTab,setDrawerTab]=useState('summary'),[message,setMessage]=useState(null);
  async function load(){setLoading(true);try{const data=await apiRequest('/purchase-requests');setRequests(data.requests||[]);setWarehouses(data.warehouses||[]);setProducts(data.products||[]);}catch(error){setMessage({type:'error',text:error.message});}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return q?requests.filter(r=>[r.folio,r.title,r.status,r.requestedBy?.firstName,r.warehouse?.name].filter(Boolean).join(' ').toLowerCase().includes(q)):requests;},[requests,query]);
  const metrics={total:requests.length,pending:requests.filter(r=>r.status==='PENDING').length,approved:requests.filter(r=>r.status==='APPROVED').length,value:requests.reduce((sum,r)=>sum+r.items.reduce((a,i)=>a+Number(i.quantity)*Number(i.estimatedUnitCost),0),0)};
  function openCreate(){const draft=newForm();draft.warehouseId=warehouses[0]?.id||'';setForm(draft);}
  function addItem(){setForm(v=>({...v,items:[...v.items,{productId:'',quantity:1,estimatedUnitCost:0,notes:''}]}));}
  function updateItem(index,key,value){setForm(v=>({...v,items:v.items.map((item,i)=>i===index?{...item,[key]:value}:item)}));}
  function selectProduct(index,id){const product=products.find(p=>p.id===id);setForm(v=>({...v,items:v.items.map((item,i)=>i===index?{...item,productId:id,estimatedUnitCost:product?Number(product.cost):0}:item)}));}
  function removeItem(index){setForm(v=>({...v,items:v.items.filter((_,i)=>i!==index)}));}
  async function save(event){event.preventDefault();setSaving(true);try{const payload={...form,items:form.items.map(i=>({...i,quantity:Number(i.quantity),estimatedUnitCost:Number(i.estimatedUnitCost)}))};await apiRequest('/purchase-requests',{method:'POST',body:payload});setForm(null);await load();setMessage({type:'success',text:'Solicitud guardada como borrador.'});}catch(error){setMessage({type:'error',text:error.message});}finally{setSaving(false);}}
  async function action(id,path,body){try{await apiRequest(`/purchase-requests/${id}/${path}`,{method:'POST',body});setDetail(null);await load();setMessage({type:'success',text:path==='submit'?'Solicitud enviada a aprobación.':body.decision==='APPROVED'?'Solicitud aprobada.':'Solicitud rechazada.'});}catch(error){setMessage({type:'error',text:error.message});}}
  if(loading)return <div className={styles.loading}>Cargando solicitudes…</div>;
  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Compras · Solicitudes"
      title="Solicitudes de compra"
      description="Captura necesidades internas, envíalas a aprobación y mantén trazabilidad de cada partida."
      actions={<Button icon={Plus} onClick={openCreate}>Nueva solicitud</Button>}
    />
    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}
    <KpiGrid>
      <KpiCard><ClipboardList/><span>Total solicitudes</span><KpiInfo title="Solicitudes registradas">Cantidad total de solicitudes de compra.</KpiInfo><strong>{metrics.total}</strong><small>registro histórico</small></KpiCard>
      <KpiCard><Send/><span>Pendientes</span><KpiInfo title="Solicitudes pendientes">Solicitudes que todavía requieren revisión o aprobación.</KpiInfo><strong>{metrics.pending}</strong><small>requieren atención</small></KpiCard>
      <KpiCard><Check/><span>Aprobadas</span><KpiInfo title="Solicitudes autorizadas">Solicitudes aprobadas para continuar con una orden de compra.</KpiInfo><strong>{metrics.approved}</strong><small>listas para comprar</small></KpiCard>
      <KpiCard><ClipboardList/><span>Valor estimado</span><KpiInfo title="Importe solicitado">Valor estimado acumulado de las solicitudes de compra.</KpiInfo><strong>{money(metrics.value)}</strong><small>importe solicitado</small></KpiCard>
    </KpiGrid>
    <Card className={styles.tableCard}>
      <ModuleToolbar title="Flujo de solicitudes" description={`${filtered.length} registros`} query={query} onQueryChange={setQuery} placeholder="Buscar folio, título o solicitante" filtersLabel={null} columnsLabel={null}/>
      <DataTableFrame empty={!filtered.length?'No hay solicitudes registradas.':null}>
        <table><thead><tr><th>Folio</th><th>Solicitud</th><th>Solicitante</th><th>Almacén</th><th>Partidas</th><th>Estimado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(r=>{const status=statusMap[r.status]||[r.status,'neutral'];const total=r.items.reduce((s,i)=>s+Number(i.quantity)*Number(i.estimatedUnitCost),0);return <tr key={r.id} className={styles.clickableRow} onClick={()=>{setDetail(r);setDrawerTab('summary')}}><td><strong>{r.folio}</strong><small>{new Date(r.createdAt).toLocaleDateString('es-MX')}</small></td><td><strong>{r.title}</strong><small>{priorityMap[r.priority]}</small></td><td>{r.requestedBy?.firstName} {r.requestedBy?.lastName}</td><td>{r.warehouse?.name}<small>{r.warehouse?.branch?.name}</small></td><td>{r.items.length}</td><td>{money(total)}</td><td><Badge tone={status[1]}>{status[0]}</Badge></td><td onClick={e=>e.stopPropagation()}><button className={styles.detailButton} onClick={()=>{setDetail(r);setDrawerTab('summary')}}>Ver <ChevronRight size={16}/></button></td></tr>})}</tbody></table>
      </DataTableFrame>
    </Card>
    {form?<div className={styles.overlay}><form className={styles.modal} onSubmit={save}><div className={styles.modalHeader}><div><span>Nueva solicitud</span><h2>Capturar requerimiento</h2></div><button type="button" onClick={()=>setForm(null)}><X/></button></div><div className={styles.modalBody}>
      <div className={styles.grid2}><Input label="Título" value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} required/><label><span>Almacén solicitante</span><select value={form.warehouseId} onChange={e=>setForm(v=>({...v,warehouseId:e.target.value}))} required><option value="">Selecciona</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name} · {w.branch?.name}</option>)}</select></label></div>
      <div className={styles.grid2}><label><span>Prioridad</span><select value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))}><option value="LOW">Baja</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></label><Input label="Fecha requerida" type="date" value={form.requiredDate} onChange={e=>setForm(v=>({...v,requiredDate:e.target.value}))}/></div>
      <label><span>Justificación</span><textarea value={form.justification} onChange={e=>setForm(v=>({...v,justification:e.target.value}))} rows="3" placeholder="Explica la necesidad de la compra"/></label>
      <div className={styles.itemsHeader}><div><h3>Partidas</h3><p>Selecciona productos y cantidades.</p></div><Button type="button" variant="secondary" icon={Plus} onClick={addItem}>Agregar partida</Button></div>
      <div className={styles.items}>{form.items.map((item,index)=><div className={styles.item} key={index}><label className={styles.product}><span>Producto</span><select value={item.productId} onChange={e=>selectProduct(index,e.target.value)} required><option value="">Selecciona</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><Input label="Cantidad" type="number" min="0.001" step="0.001" value={item.quantity} onChange={e=>updateItem(index,'quantity',e.target.value)} required/><Input label="Costo estimado" type="number" min="0" step="0.01" value={item.estimatedUnitCost} onChange={e=>updateItem(index,'estimatedUnitCost',e.target.value)}/><button type="button" className={styles.remove} disabled={form.items.length===1} onClick={()=>removeItem(index)}><X size={18}/></button></div>)}</div>
    </div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar borrador</Button></div></form></div>:null}
    {detail?<div className={styles.recordOverlay} role="presentation">
      <button type="button" className={styles.recordBackdrop} aria-label="Cerrar detalle" onClick={()=>setDetail(null)}/>
      <section className={styles.recordModal} role="dialog" aria-modal="true" aria-labelledby="purchase-request-modal-title">
        <header className={styles.recordHero}>
          <div className={styles.recordIdentity}>
            <div className={styles.recordIcon}><FileText size={28}/></div>
            <div>
              <h2 id="purchase-request-modal-title">{detail.folio}</h2>
              <p>{detail.title}</p>
              <div className={styles.recordMeta}>
                <span><CalendarDays size={15}/> Creada {dateTime(detail.createdAt)}</span>
                <span><UserRound size={15}/> {detail.requestedBy?.firstName} {detail.requestedBy?.lastName}</span>
                <span><Warehouse size={15}/> {detail.warehouse?.name}</span>
              </div>
            </div>
          </div>
          <div className={styles.recordHeroActions}>
            <div className={`${styles.heroStatus} ${styles[`heroStatus_${detail.status}`]||''}`}>
              {detail.status==='APPROVED'?<CheckCircle2 size={18}/>:detail.status==='REJECTED'?<XCircle size={18}/>:<Clock3 size={18}/>}
              <strong>{(statusMap[detail.status]||[detail.status])[0]}</strong>
              <small>Prioridad {priorityMap[detail.priority]?.toLowerCase()}</small>
            </div>
            <button type="button" className={styles.recordClose} onClick={()=>setDetail(null)} aria-label="Cerrar"><X size={20}/></button>
          </div>
        </header>

        <nav className={styles.recordTabs} aria-label="Detalle de solicitud">
          <button type="button" className={drawerTab==='summary'?styles.recordTabActive:styles.recordTab} onClick={()=>setDrawerTab('summary')}><Info size={16}/>Resumen</button>
          <button type="button" className={drawerTab==='items'?styles.recordTabActive:styles.recordTab} onClick={()=>setDrawerTab('items')}><Package size={16}/>Partidas <span>{detail.items.length}</span></button>
          <button type="button" className={drawerTab==='approvals'?styles.recordTabActive:styles.recordTab} onClick={()=>setDrawerTab('approvals')}><CheckCircle2 size={16}/>Aprobaciones</button>
        </nav>

        <div className={styles.recordBody}>
          {drawerTab==='summary'?<>
            <div className={styles.recordSummaryGrid}>
              <section className={styles.infoCard}>
                <div className={styles.cardTitle}><Info size={18}/><h3>Información general</h3></div>
                <dl className={styles.infoList}>
                  <div><dt>Estado</dt><dd><Badge tone={(statusMap[detail.status]||[])[1]}>{(statusMap[detail.status]||[])[0]}</Badge></dd></div>
                  <div><dt>Prioridad</dt><dd><strong>{priorityMap[detail.priority]}</strong></dd></div>
                  <div><dt>Solicitante</dt><dd>{detail.requestedBy?.firstName} {detail.requestedBy?.lastName}</dd></div>
                  <div><dt>Almacén</dt><dd>{detail.warehouse?.name}</dd></div>
                  <div><dt>Sucursal</dt><dd>{detail.warehouse?.branch?.name||'—'}</dd></div>
                  <div><dt>Fecha de creación</dt><dd>{dateTime(detail.createdAt)}</dd></div>
                  <div><dt>Fecha requerida</dt><dd>{dateTime(detail.requiredDate)}</dd></div>
                </dl>
              </section>

              <div className={styles.summaryStack}>
                <section className={styles.infoCard}>
                  <div className={styles.cardTitle}><FileText size={18}/><h3>Justificación</h3></div>
                  <div className={styles.noteBox}>{detail.justification||'Sin justificación adicional.'}</div>
                </section>

                <section className={styles.infoCard}>
                  <div className={styles.cardTitle}><CheckCircle2 size={18}/><h3>Resolución</h3></div>
                  {detail.resolutionNote?
                    <div className={`${styles.resolutionBox} ${detail.status==='REJECTED'?styles.resolutionRejected:styles.resolutionApproved}`}>
                      {detail.status==='REJECTED'?<XCircle size={19}/>:<CheckCircle2 size={19}/>}
                      <div><strong>{detail.resolutionNote}</strong>{detail.resolvedAt?<small>{dateTime(detail.resolvedAt)}</small>:null}</div>
                    </div>
                  :<div className={styles.noteBox}>{detail.status==='PENDING'?'La solicitud está en proceso de aprobación.':'Aún no existe una resolución registrada.'}</div>}
                </section>
              </div>
            </div>

            <section className={styles.flowCard}>
              <div className={styles.cardTitle}><CheckCircle2 size={18}/><h3>Flujo de aprobación</h3></div>
              <div className={styles.flowTimeline}>
                <div className={`${styles.flowStep} ${styles.flowDone}`}>
                  <span><Check size={16}/></span>
                  <strong>Solicitada</strong>
                  <small>{dateTime(detail.createdAt)}</small>
                </div>
                <div className={`${styles.flowLine} ${detail.status!=='DRAFT'?styles.flowLineDone:''}`}/>
                <div className={`${styles.flowStep} ${detail.status!=='DRAFT'?styles.flowDone:''}`}>
                  <span>{detail.status!=='DRAFT'?<Check size={16}/>:<Clock3 size={15}/>}</span>
                  <strong>En revisión</strong>
                  <small>{detail.submittedAt?dateTime(detail.submittedAt):'Pendiente de envío'}</small>
                </div>
                <div className={`${styles.flowLine} ${['APPROVED','REJECTED','ORDERED'].includes(detail.status)?styles.flowLineDone:''}`}/>
                <div className={`${styles.flowStep} ${['APPROVED','ORDERED'].includes(detail.status)?styles.flowDone:detail.status==='REJECTED'?styles.flowRejected:''}`}>
                  <span>{detail.status==='REJECTED'?<X size={16}/>:['APPROVED','ORDERED'].includes(detail.status)?<Check size={16}/>:<Clock3 size={15}/>}</span>
                  <strong>{detail.status==='REJECTED'?'Rechazada':'Aprobada'}</strong>
                  <small>{detail.resolvedAt?dateTime(detail.resolvedAt):'Pendiente'}</small>
                </div>
              </div>
            </section>
          </>:null}

          {drawerTab==='items'?<section className={styles.infoCard}>
            <div className={styles.cardTitle}><Package size={18}/><h3>Partidas solicitadas</h3><span className={styles.cardCount}>{detail.items.length}</span></div>
            <div className={styles.itemsTable}>
              <div className={styles.itemsTableHead}><span>Producto</span><span>Cantidad</span><span>Costo estimado</span><span>Subtotal</span></div>
              {detail.items.map(i=><div className={styles.itemsTableRow} key={i.id}>
                <div><strong>{i.product?.name}</strong><small>{i.product?.sku}</small></div>
                <span>{i.quantity} {i.product?.unit}</span>
                <span>{money(i.estimatedUnitCost)}</span>
                <strong>{money(Number(i.quantity)*Number(i.estimatedUnitCost))}</strong>
              </div>)}
              <div className={styles.itemsTotal}><span>Total estimado</span><strong>{money(detail.items.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.estimatedUnitCost),0))}</strong></div>
            </div>
          </section>:null}

          {drawerTab==='approvals'?<section className={styles.infoCard}>
            <div className={styles.cardTitle}><CheckCircle2 size={18}/><h3>Estado de aprobación</h3></div>
            <div className={styles.approvalState}>
              <div className={`${styles.approvalStateIcon} ${detail.status==='REJECTED'?styles.approvalStateRejected:''}`}>
                {detail.status==='REJECTED'?<XCircle size={24}/>:<CheckCircle2 size={24}/>}
              </div>
              <div>
                <strong>{detail.status==='PENDING'?'Pendiente de decisión':detail.status==='APPROVED'?'Solicitud aprobada':detail.status==='REJECTED'?'Solicitud rechazada':detail.status==='ORDERED'?'Solicitud convertida en orden':'Aún no enviada a aprobación'}</strong>
                <p>{detail.resolutionNote||'La trazabilidad mostrada corresponde al estado actual de la solicitud.'}</p>
              </div>
            </div>
            <div className={styles.approvalAudit}>
              <div><span>Creación</span><strong>{dateTime(detail.createdAt)}</strong></div>
              <div><span>Envío</span><strong>{dateTime(detail.submittedAt)}</strong></div>
              <div><span>Resolución</span><strong>{dateTime(detail.resolvedAt)}</strong></div>
            </div>
          </section>:null}
        </div>

        <footer className={styles.recordFooter}>
          <Button type="button" variant="ghost" onClick={()=>setDetail(null)}>Cerrar</Button>
          {detail.status==='DRAFT'?<Button icon={Send} onClick={()=>action(detail.id,'submit')}>Enviar a aprobación</Button>:null}
          {detail.status==='PENDING'?<>
            <Button variant="danger" icon={XCircle} onClick={()=>{const note=window.prompt('Motivo del rechazo');if(note)action(detail.id,'resolve',{decision:'REJECTED',note});}}>Rechazar</Button>
            <Button icon={Check} onClick={()=>action(detail.id,'resolve',{decision:'APPROVED',note:''})}>Aprobar</Button>
          </>:null}
        </footer>
      </section>
    </div>:null}
  </div>;
}
