import {ArrowLeftRight, PackagePlus, Plus, Search, SlidersHorizontal, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './InventoryOperations.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
import {ModuleTabs} from '../components/module-system';
const today=()=>new Date().toISOString().slice(0,10);
const qty=(value)=>Number(value||0).toLocaleString('es-MX',{maximumFractionDigits:3});

function emptyItem(){return {productId:'',direction:'IN',quantity:1,unitCost:0,notes:''};}
function transferItem(){return {productId:'',quantity:1,notes:''};}

export default function InventoryOperations(){
  const [data,setData]=useState({adjustments:[],transfers:[],warehouses:[],products:[],balances:[]});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[query,setQuery]=useState(''),[tab,setTab]=useState('transfers'),[form,setForm]=useState(null),[message,setMessage]=useState(null);

  async function load(){
    setLoading(true);
    try{setData(await apiRequest('/inventory-operations'));}
    catch(error){setMessage({type:'error',text:error.message});}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    const rows=tab==='transfers'?data.transfers:data.adjustments;
    if(!q)return rows;
    return rows.filter(row=>JSON.stringify(row).toLowerCase().includes(q));
  },[data,query,tab]);

  function balanceFor(warehouseId,productId){return data.balances.find(row=>row.warehouseId===warehouseId&&row.productId===productId);}
  function productFor(id){return data.products.find(product=>product.id===id);}

  function openTransfer(){setForm({type:'transfer',fromWarehouseId:'',toWarehouseId:'',occurredAt:today(),notes:'',items:[transferItem()]});}
  function openAdjustment(){setForm({type:'adjustment',warehouseId:'',occurredAt:today(),reason:'Conteo físico',notes:'',items:[emptyItem()]});}
  function updateItem(index,key,value){setForm(current=>({...current,items:current.items.map((item,i)=>i===index?{...item,[key]:value}:item)}));}
  function addItem(){setForm(current=>({...current,items:[...current.items,current.type==='transfer'?transferItem():emptyItem()]}));}
  function removeItem(index){setForm(current=>({...current,items:current.items.filter((_,i)=>i!==index)}));}

  async function save(event){
    event.preventDefault();
    setSaving(true);setMessage(null);
    try{
      const items=form.items.filter(item=>item.productId&&Number(item.quantity)>0).map(item=>({...item,quantity:Number(item.quantity),unitCost:Number(item.unitCost||0)}));
      if(!items.length)throw new Error('Agrega al menos una partida válida.');
      if(form.type==='transfer'){
        await apiRequest('/inventory-operations/transfers',{method:'POST',body:{fromWarehouseId:form.fromWarehouseId,toWarehouseId:form.toWarehouseId,occurredAt:form.occurredAt,notes:form.notes,items:items.map(({productId,quantity,notes})=>({productId,quantity,notes}))}});
        setMessage({type:'success',text:'Transferencia registrada y existencias actualizadas.'});
      }else{
        await apiRequest('/inventory-operations/adjustments',{method:'POST',body:{warehouseId:form.warehouseId,occurredAt:form.occurredAt,reason:form.reason,notes:form.notes,items}});
        setMessage({type:'success',text:'Ajuste registrado y Kardex actualizado.'});
      }
      setForm(null);await load();
    }catch(error){setMessage({type:'error',text:error.message});}
    finally{setSaving(false);}
  }

  if(loading)return <div className={styles.loading}>Cargando operaciones de inventario…</div>;

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Inventario</span><h1>Operaciones de inventario</h1><p>Transfiere productos entre almacenes y corrige diferencias mediante ajustes controlados.</p></div>
      <div className={styles.actions}><Button variant="secondary" icon={SlidersHorizontal} onClick={openAdjustment}>Nuevo ajuste</Button><Button icon={ArrowLeftRight} onClick={openTransfer}>Nueva transferencia</Button></div>
    </header>

    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}

    <section className={styles.metrics}>
      <KpiCard><span>Transferencias</span><KpiInfo title="Transferencias registradas">Movimientos de producto realizados entre almacenes.</KpiInfo><strong>{data.transfers.length}</strong><small>Movimientos entre almacenes</small></KpiCard>
      <KpiCard><span>Ajustes</span><KpiInfo title="Ajustes de inventario">Correcciones positivas o negativas aplicadas a las existencias.</KpiInfo><strong>{data.adjustments.length}</strong><small>Correcciones documentadas</small></KpiCard>
      <KpiCard><span>Almacenes activos</span><KpiInfo title="Almacenes disponibles">Almacenes habilitados para operaciones de inventario.</KpiInfo><strong>{data.warehouses.length}</strong><small>Disponibles para operar</small></KpiCard>
      <KpiCard><span>Productos con saldo</span><KpiInfo title="Productos disponibles">Productos que presentan existencia en al menos un almacén.</KpiInfo><strong>{new Set(data.balances.filter(row=>Number(row.quantity)>0).map(row=>row.productId)).size}</strong><small>En cualquier almacén</small></KpiCard>
    </section>

    <Card className={styles.tableCard}>
      <div className={styles.toolbar}>
        <ModuleTabs
          active={tab}
          onChange={setTab}
          items={[
            {id:'transfers',label:'Transferencias',icon:ArrowLeftRight},
            {id:'adjustments',label:'Ajustes',icon:SlidersHorizontal}
          ]}
        />
        <label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar folio, almacén o producto"/></label>
      </div>

      <div className={styles.tableWrap}>
        {tab==='transfers'?<table><thead><tr><th>Folio</th><th>Origen</th><th>Destino</th><th>Partidas</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><strong>{row.folio}</strong><small>{row.createdBy?.firstName} {row.createdBy?.lastName}</small></td><td>{row.fromWarehouse?.name}<small>{row.fromWarehouse?.branch?.name}</small></td><td>{row.toWarehouse?.name}<small>{row.toWarehouse?.branch?.name}</small></td><td>{row.items?.length||0}</td><td>{new Date(row.occurredAt).toLocaleDateString('es-MX')}</td><td><Badge tone="success">Aplicada</Badge></td></tr>)}</tbody></table>:<table><thead><tr><th>Folio</th><th>Almacén</th><th>Motivo</th><th>Partidas</th><th>Fecha</th><th>Usuario</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><strong>{row.folio}</strong></td><td>{row.warehouse?.name}<small>{row.warehouse?.branch?.name}</small></td><td>{row.reason}</td><td>{row.items?.length||0}</td><td>{new Date(row.occurredAt).toLocaleDateString('es-MX')}</td><td>{row.createdBy?.firstName} {row.createdBy?.lastName}</td></tr>)}</tbody></table>}
        {!filtered.length?<div className={styles.empty}>Aún no hay operaciones registradas.</div>:null}
      </div>
    </Card>

    {form?<div className={styles.overlay}><form className={styles.modal} onSubmit={save}>
      <div className={styles.modalHeader}><div><span>{form.type==='transfer'?'Movimiento interno':'Corrección controlada'}</span><h2>{form.type==='transfer'?'Nueva transferencia':'Nuevo ajuste de inventario'}</h2></div><button type="button" onClick={()=>setForm(null)}><X/></button></div>
      <div className={styles.modalBody}>
        {form.type==='transfer'?<div className={styles.grid2}><label><span>Almacén origen</span><select required value={form.fromWarehouseId} onChange={e=>setForm(v=>({...v,fromWarehouseId:e.target.value}))}><option value="">Selecciona</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name} · {w.branch?.name}</option>)}</select></label><label><span>Almacén destino</span><select required value={form.toWarehouseId} onChange={e=>setForm(v=>({...v,toWarehouseId:e.target.value}))}><option value="">Selecciona</option>{data.warehouses.filter(w=>w.id!==form.fromWarehouseId).map(w=><option key={w.id} value={w.id}>{w.name} · {w.branch?.name}</option>)}</select></label></div>:<div className={styles.grid2}><label><span>Almacén</span><select required value={form.warehouseId} onChange={e=>setForm(v=>({...v,warehouseId:e.target.value}))}><option value="">Selecciona</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name} · {w.branch?.name}</option>)}</select></label><Input label="Motivo" required value={form.reason} onChange={e=>setForm(v=>({...v,reason:e.target.value}))}/></div>}
        <div className={styles.grid2}><Input label="Fecha" type="date" required value={form.occurredAt} onChange={e=>setForm(v=>({...v,occurredAt:e.target.value}))}/><Input label="Notas generales" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Opcional"/></div>

        <div className={styles.itemsHeader}><div><h3>Partidas</h3><p>Captura productos y cantidades.</p></div><Button type="button" size="small" variant="secondary" icon={Plus} onClick={addItem}>Agregar</Button></div>
        <div className={styles.items}>{form.items.map((item,index)=>{const balance=balanceFor(form.type==='transfer'?form.fromWarehouseId:form.warehouseId,item.productId);const product=productFor(item.productId);return <div className={styles.item} key={index}>
          <label className={styles.productSelect}><span>Producto</span><select required value={item.productId} onChange={e=>updateItem(index,'productId',e.target.value)}><option value="">Selecciona</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select><small>Disponible: {qty(balance?.quantity)} {product?.unit||''}</small></label>
          {form.type==='adjustment'?<label><span>Tipo</span><select value={item.direction} onChange={e=>updateItem(index,'direction',e.target.value)}><option value="IN">Entrada</option><option value="OUT">Salida</option></select></label>:null}
          <Input label="Cantidad" type="number" min="0.001" step="0.001" required value={item.quantity} onChange={e=>updateItem(index,'quantity',e.target.value)}/>
          {form.type==='adjustment'&&item.direction==='IN'?<Input label="Costo unitario" type="number" min="0" step="0.01" value={item.unitCost} onChange={e=>updateItem(index,'unitCost',e.target.value)}/>:null}
          <button type="button" className={styles.remove} disabled={form.items.length===1} onClick={()=>removeItem(index)}><X size={17}/></button>
        </div>})}</div>
      </div>
      <div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setForm(null)}>Cancelar</Button><Button type="submit" loading={saving} icon={form.type==='transfer'?ArrowLeftRight:PackagePlus}>{form.type==='transfer'?'Aplicar transferencia':'Aplicar ajuste'}</Button></div>
    </form></div>:null}
  </div>;
}
