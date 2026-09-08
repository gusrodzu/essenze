import {ClipboardCheck, FileText, PackageCheck, Plus, Search, Truck, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './GoodsReceipts.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
import {DetailDrawer} from '../components/module-system';
const today=()=>new Date().toISOString().slice(0,10);
const num=(value)=>Number(value||0).toLocaleString('es-MX',{maximumFractionDigits:3});

export default function GoodsReceipts(){
  const [searchParams]=useSearchParams();
  const [receipts,setReceipts]=useState([]),[orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[query,setQuery]=useState(''),[form,setForm]=useState(null),[selected,setSelected]=useState(null),[drawerTab,setDrawerTab]=useState('summary'),[message,setMessage]=useState(null);
  async function load(){setLoading(true);try{const data=await apiRequest('/receipts');setReceipts(data.receipts||[]);setOrders(data.orders||[]);const requested=searchParams.get('order');if(requested&&data.orders?.some(o=>o.id===requested)&&!form)openReceipt(data.orders.find(o=>o.id===requested));}catch(error){setMessage({type:'error',text:error.message});}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return q?receipts.filter(r=>[r.folio,r.purchaseOrder?.folio,r.purchaseOrder?.supplier?.legalName,r.supplierDocument].filter(Boolean).join(' ').toLowerCase().includes(q)):receipts;},[receipts,query]);
  function openReceipt(order){setSelected(null);setForm({purchaseOrderId:order.id,receivedAt:today(),supplierDocument:'',notes:'',order,items:order.items.map(i=>({purchaseOrderItemId:i.id,product:i.product,pending:Math.max(0,Number(i.quantity)-Number(i.receivedQuantity)),quantity:Math.max(0,Number(i.quantity)-Number(i.receivedQuantity)),notes:''}))});}
  function updateItem(index,key,value){setForm(v=>({...v,items:v.items.map((item,i)=>i===index?{...item,[key]:value}:item)}));}
  async function save(e){e.preventDefault();const items=form.items.filter(i=>Number(i.quantity)>0).map(i=>({purchaseOrderItemId:i.purchaseOrderItemId,quantity:Number(i.quantity),notes:i.notes||null}));if(!items.length){setMessage({type:'error',text:'Captura al menos una cantidad recibida.'});return;}setSaving(true);try{await apiRequest('/receipts',{method:'POST',body:{purchaseOrderId:form.purchaseOrderId,receivedAt:form.receivedAt,supplierDocument:form.supplierDocument,notes:form.notes,items}});setForm(null);await load();setMessage({type:'success',text:'Recepción registrada y existencias actualizadas.'});}catch(error){setMessage({type:'error',text:error.message});}finally{setSaving(false);}}
  if(loading)return <div className={styles.loading}>Cargando recepciones…</div>;
  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Compras</span><h1>Recepción de mercancía</h1><p>Registra entradas contra órdenes emitidas y actualiza el inventario automáticamente.</p></div>{orders.length?<Button icon={Plus} onClick={()=>openReceipt(orders[0])}>Nueva recepción</Button>:null}</header>
    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}
    <section className={styles.metrics}><KpiCard><span>Recepciones</span><KpiInfo title="Recepciones registradas">Cantidad de entradas de mercancía registradas.</KpiInfo><strong>{receipts.length}</strong></KpiCard><KpiCard><span>Órdenes pendientes</span><KpiInfo title="\u00d3rdenes por recibir">Órdenes de compra con mercancía todavía pendiente.</KpiInfo><strong>{orders.length}</strong></KpiCard><KpiCard><span>Entradas hoy</span><KpiInfo title="Recepciones del d\u00eda">Recepciones cuya fecha de registro corresponde al día actual.</KpiInfo><strong>{receipts.filter(r=>new Date(r.receivedAt).toDateString()===new Date().toDateString()).length}</strong></KpiCard><KpiCard><span>Partidas recibidas</span><KpiInfo title="Partidas ingresadas">Cantidad de partidas de producto incluidas en las recepciones.</KpiInfo><strong>{receipts.reduce((s,r)=>s+(r.items?.length||0),0)}</strong></KpiCard></section>
    {orders.length?<Card className={styles.pendingCard}><div className={styles.sectionTitle}><div><h2>Órdenes por recibir</h2><p>Selecciona una orden para registrar una entrega parcial o completa.</p></div></div><div className={styles.orderGrid}>{orders.map(o=><button key={o.id} className={styles.orderCard} onClick={()=>openReceipt(o)}><div><span>{o.folio}</span><strong>{o.supplier?.commercialName||o.supplier?.legalName}</strong><small>{o.warehouse?.name} · {o.items.length} partidas</small></div><Badge tone={o.status==='PARTIALLY_RECEIVED'?'warning':'info'}>{o.status==='PARTIALLY_RECEIVED'?'Parcial':'Emitida'}</Badge></button>)}</div></Card>:null}
    <Card className={styles.tableCard}><div className={styles.toolbar}><div><h2>Historial de recepciones</h2><p>{filtered.length} registros</p></div><label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar folio, orden o proveedor"/></label></div><div className={styles.tableWrap}><table><thead><tr><th>Recepción</th><th>Orden</th><th>Proveedor</th><th>Almacén</th><th>Documento</th><th>Partidas</th><th>Fecha</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id} className={styles.clickableRow} onClick={()=>{setSelected(r);setDrawerTab('summary')}}><td><strong>{r.folio}</strong></td><td>{r.purchaseOrder?.folio}</td><td>{r.purchaseOrder?.supplier?.commercialName||r.purchaseOrder?.supplier?.legalName}</td><td>{r.warehouse?.name}<small>{r.warehouse?.branch?.name}</small></td><td>{r.supplierDocument||'—'}</td><td>{r.items?.length||0}</td><td>{new Date(r.receivedAt).toLocaleDateString('es-MX')}</td></tr>)}</tbody></table>{!filtered.length?<div className={styles.empty}>Aún no hay recepciones registradas.</div>:null}</div></Card>
    <DetailDrawer
      open={Boolean(selected)}
      onClose={()=>setSelected(null)}
      title={selected?.folio||'Recepción'}
      subtitle={selected?`Recepción de mercancía · ${selected.purchaseOrder?.folio||'Sin OC'}`:''}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      tabs={[
        {id:'summary',label:'Resumen'},
        {id:'items',label:`Partidas${selected?` (${selected.items?.length||0})`:''}`},
        {id:'trace',label:'Trazabilidad'}
      ]}
    >
      {selected&&drawerTab==='summary'?<div className={styles.drawerDetail}>
        <div className={styles.drawerGrid}>
          <div><span>Orden de compra</span><strong>{selected.purchaseOrder?.folio||'—'}</strong></div>
          <div><span>Fecha</span><strong>{new Date(selected.receivedAt).toLocaleDateString('es-MX')}</strong></div>
          <div><span>Proveedor</span><strong>{selected.purchaseOrder?.supplier?.commercialName||selected.purchaseOrder?.supplier?.legalName||'—'}</strong></div>
          <div><span>Almacén</span><strong>{selected.warehouse?.name||'—'}</strong></div>
          <div><span>Sucursal</span><strong>{selected.warehouse?.branch?.name||'—'}</strong></div>
          <div><span>Documento proveedor</span><strong>{selected.supplierDocument||'—'}</strong></div>
        </div>
        <section className={styles.drawerSection}>
          <FileText size={18}/>
          <div><strong>Notas</strong><p>{selected.notes||'Sin notas adicionales.'}</p></div>
        </section>
      </div>:null}

      {selected&&drawerTab==='items'?<div className={styles.drawerItems}>
        {selected.items?.map(item=><article key={item.id}>
          <div><strong>{item.product?.name||'Producto'}</strong><span>{item.product?.sku||''}</span></div>
          <div><strong>{num(item.quantity)} {item.product?.unit||''}</strong><span>recibido</span></div>
        </article>)}
      </div>:null}

      {selected&&drawerTab==='trace'?<div className={styles.traceList}>
        <article><i><ClipboardCheck size={15}/></i><div><strong>Orden de compra</strong><span>{selected.purchaseOrder?.folio||'Sin orden relacionada'}</span></div></article>
        <article><i><Truck size={15}/></i><div><strong>Recepción registrada</strong><span>{new Date(selected.receivedAt).toLocaleString('es-MX')}</span></div></article>
        <article><i><PackageCheck size={15}/></i><div><strong>Inventario actualizado</strong><span>Las partidas recibidas alimentan existencias y Kardex.</span></div></article>
      </div>:null}
    </DetailDrawer>

    <DetailDrawer
      open={Boolean(form)}
      onClose={()=>setForm(null)}
      title="Registrar recepción"
      subtitle={form?`${form.order.folio} · ${form.order.supplier?.commercialName||form.order.supplier?.legalName||'Proveedor'}`:'Compras'}
      footer={form?<div className={styles.drawerFormActions}>
        <Button type="button" variant="secondary" onClick={()=>setForm(null)}>Cancelar</Button>
        <Button type="submit" form="receipt-drawer-form" loading={saving} icon={PackageCheck}>Registrar entrada</Button>
      </div>:null}
    >
      {form?<form id="receipt-drawer-form" className={styles.drawerForm} onSubmit={save}>
        <div className={styles.summary}><ClipboardCheck/><div><strong>{form.order.supplier?.commercialName||form.order.supplier?.legalName}</strong><span>{form.order.warehouse?.name} · {form.order.warehouse?.branch?.name}</span></div></div>
        <div className={styles.grid2}><Input label="Fecha de recepción" type="date" required value={form.receivedAt} onChange={e=>setForm(v=>({...v,receivedAt:e.target.value}))}/><Input label="Remisión / factura del proveedor" value={form.supplierDocument} onChange={e=>setForm(v=>({...v,supplierDocument:e.target.value}))} placeholder="Ej. REM-1842"/></div>
        <label className={styles.drawerLabel}><span>Notas generales</span><textarea rows="2" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/></label>
        <div className={styles.itemsHeader}><PackageCheck/><div><h3>Cantidades recibidas</h3><p>Puedes registrar entregas parciales.</p></div></div>
        <div className={styles.items}>{form.items.map((i,index)=><div className={styles.item} key={i.purchaseOrderItemId}><div className={styles.product}><strong>{i.product?.name}</strong><small>{i.product?.sku} · pendiente {num(i.pending)} {i.product?.unit}</small></div><Input label="Recibido" type="number" min="0" max={i.pending} step="0.001" value={i.quantity} onChange={e=>updateItem(index,'quantity',e.target.value)}/><Input label="Nota" value={i.notes} onChange={e=>updateItem(index,'notes',e.target.value)} placeholder="Opcional"/></div>)}</div>
      </form>:null}
    </DetailDrawer>
  </div>;
}
