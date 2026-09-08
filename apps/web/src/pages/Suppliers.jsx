import {Building2, Edit3, Plus, Search, Trash2, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input, Switch} from '../design-system/components';
import styles from './Catalog.module.css';

import KpiInfo from '../components/KpiInfo';
import {DetailDrawer} from '../components/module-system';
const emptyForm={code:'',legalName:'',commercialName:'',taxId:'',contactName:'',email:'',phone:'',address:'',paymentTerms:0,active:true};

export default function Suppliers(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState(null);
  const [query,setQuery]=useState('');
  const [message,setMessage]=useState(null);
  const [selected,setSelected]=useState(null);
  const [drawerTab,setDrawerTab]=useState('summary');

  async function loadData(){
    setLoading(true);
    try{const result=await apiRequest('/suppliers');setItems(result.suppliers??[]);}
    catch(error){setMessage({type:'error',text:error.message});}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadData();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return items;
    return items.filter(item=>[item.code,item.legalName,item.commercialName,item.taxId,item.contactName].filter(Boolean).some(value=>value.toLowerCase().includes(q)));
  },[items,query]);

  async function save(event){
    event.preventDefault();setSaving(true);setMessage(null);
    try{
      const editing=Boolean(form.id);
      await apiRequest(editing?`/suppliers/${form.id}`:'/suppliers',{method:editing?'PUT':'POST',body:{...form,paymentTerms:Number(form.paymentTerms||0)}});
      setForm(null);await loadData();setMessage({type:'success',text:editing?'Proveedor actualizado.':'Proveedor creado.'});
    }catch(error){setMessage({type:'error',text:error.message});}
    finally{setSaving(false);}
  }

  async function toggle(item){
    try{await apiRequest(`/suppliers/${item.id}/status`,{method:'PATCH',body:{active:!item.active}});setItems(current=>current.map(row=>row.id===item.id?{...row,active:!row.active}:row));if(selected?.id===item.id)setSelected(current=>({...current,active:!current.active}));}
    catch(error){setMessage({type:'error',text:error.message});}
  }

  async function remove(item){
    if(!window.confirm(`¿Eliminar al proveedor ${item.legalName}?`))return;
    try{await apiRequest(`/suppliers/${item.id}`,{method:'DELETE'});setItems(current=>current.filter(row=>row.id!==item.id));if(selected?.id===item.id)setSelected(null);}
    catch(error){setMessage({type:'error',text:error.message});}
  }

  if(loading)return <div className={styles.loading}>Cargando proveedores…</div>;

  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Compras</span><h1>Proveedores</h1><p>Centraliza los datos fiscales, contactos y condiciones comerciales de tus proveedores.</p></div><Button icon={Plus} onClick={()=>{setSelected(null);setForm({...emptyForm})}}>Nuevo proveedor</Button></header>
    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}
    <div className={styles.metrics}><Card className={styles.metric}><Building2 size={20}/><span>Total</span><KpiInfo title="Proveedores registrados">Cantidad total de proveedores en el directorio.</KpiInfo><strong>{items.length}</strong></Card><Card className={styles.metric}><Building2 size={20}/><span>Activos</span><KpiInfo title="Proveedores activos">Proveedores disponibles para solicitudes, órdenes y pagos.</KpiInfo><strong>{items.filter(item=>item.active).length}</strong></Card><Card className={styles.metric}><Building2 size={20}/><span>Crédito promedio</span><KpiInfo title="Plazo promedio">Promedio de días de crédito configurado entre los proveedores.</KpiInfo><strong>{items.length?Math.round(items.reduce((sum,item)=>sum+item.paymentTerms,0)/items.length):0} días</strong></Card></div>
    <Card className={styles.tableCard}>
      <div className={styles.toolbar}><div><h2>Directorio de proveedores</h2><p>{filtered.length} resultados</p></div><label className={styles.search}><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre, código o RFC"/></label></div>
      <div className={styles.tableWrap}><table><thead><tr><th>Proveedor</th><th>Contacto</th><th>Condiciones</th><th>Estado</th><th></th></tr></thead><tbody>
        {filtered.map(item=><tr key={item.id} className={styles.clickableRow} onClick={()=>{setSelected(item);setDrawerTab('summary')}}><td><strong>{item.commercialName||item.legalName}</strong><small>{item.code} · {item.taxId||'Sin RFC'}</small></td><td><strong>{item.contactName||'Sin contacto'}</strong><small>{item.email||item.phone||'Sin datos'}</small></td><td>{item.paymentTerms} días</td><td onClick={e=>e.stopPropagation()}><div className={styles.status}><Badge tone={item.active?'success':'neutral'}>{item.active?'Activo':'Inactivo'}</Badge><Switch checked={item.active} onChange={()=>toggle(item)}/></div></td><td onClick={e=>e.stopPropagation()}><div className={styles.actions}><button onClick={()=>{setSelected(null);setForm({...item})}} aria-label={`Editar ${item.legalName}`}><Edit3 size={17}/></button><button onClick={()=>remove(item)} aria-label={`Eliminar ${item.legalName}`}><Trash2 size={17}/></button></div></td></tr>)}
      </tbody></table>{filtered.length===0?<div className={styles.empty}>No se encontraron proveedores.</div>:null}</div>
    </Card>
    <DetailDrawer
      open={Boolean(selected)}
      onClose={()=>setSelected(null)}
      title={selected?.commercialName||selected?.legalName||'Proveedor'}
      subtitle={selected?`${selected.code} · Proveedor`:''}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      tabs={[
        {id:'summary',label:'Resumen'},
        {id:'contact',label:'Contacto'},
        {id:'commercial',label:'Condiciones'}
      ]}
      footer={selected?<Button onClick={()=>{setForm({...selected});setSelected(null)}}><Edit3 size={16}/> Editar proveedor</Button>:null}
    >
      {selected&&drawerTab==='summary'?<div className={styles.detailGrid}>
        <div><span>Estado</span><strong><Badge tone={selected.active?'success':'neutral'}>{selected.active?'Activo':'Inactivo'}</Badge></strong></div>
        <div><span>RFC</span><strong>{selected.taxId||'—'}</strong></div>
        <div><span>Razón social</span><strong>{selected.legalName}</strong></div>
        <div><span>Nombre comercial</span><strong>{selected.commercialName||'—'}</strong></div>
        <div><span>Código</span><strong>{selected.code}</strong></div>
        <div><span>Dirección</span><strong>{selected.address||'Sin dirección registrada'}</strong></div>
      </div>:null}

      {selected&&drawerTab==='contact'?<div className={styles.detailGrid}>
        <div><span>Contacto</span><strong>{selected.contactName||'Sin contacto'}</strong></div>
        <div><span>Correo</span><strong>{selected.email||'—'}</strong></div>
        <div><span>Teléfono</span><strong>{selected.phone||'—'}</strong></div>
      </div>:null}

      {selected&&drawerTab==='commercial'?<div className={styles.detailGrid}>
        <div><span>Días de crédito</span><strong>{selected.paymentTerms||0} días</strong></div>
        <div><span>Disponible en compras</span><strong>{selected.active?'Sí':'No'}</strong></div>
        <div><span>Uso operativo</span><strong>Solicitudes · Órdenes · Pagos</strong></div>
      </div>:null}
    </DetailDrawer>

    <DetailDrawer
      open={Boolean(form)}
      onClose={()=>setForm(null)}
      title={form?.id?'Editar proveedor':'Nuevo proveedor'}
      subtitle={form?.id?`${form.code} · Edición`:'Compras · Alta de proveedor'}
      footer={form?<div className={styles.drawerFormActions}>
        <Button type="button" variant="secondary" onClick={()=>setForm(null)}>Cancelar</Button>
        <Button type="submit" form="supplier-drawer-form" loading={saving}>Guardar proveedor</Button>
      </div>:null}
    >
      {form?<form id="supplier-drawer-form" className={styles.drawerForm} onSubmit={save}>
        <div className={styles.grid2}><Input label="Código" value={form.code} onChange={e=>setForm(v=>({...v,code:e.target.value.toUpperCase()}))} required/><Input label="RFC" value={form.taxId||''} onChange={e=>setForm(v=>({...v,taxId:e.target.value.toUpperCase()}))}/></div>
        <Input label="Razón social" value={form.legalName} onChange={e=>setForm(v=>({...v,legalName:e.target.value}))} required/>
        <Input label="Nombre comercial" value={form.commercialName||''} onChange={e=>setForm(v=>({...v,commercialName:e.target.value}))}/>
        <div className={styles.grid2}><Input label="Contacto" value={form.contactName||''} onChange={e=>setForm(v=>({...v,contactName:e.target.value}))}/><Input label="Teléfono" value={form.phone||''} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></div>
        <div className={styles.grid2}><Input label="Correo" type="email" value={form.email||''} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/><Input label="Días de crédito" type="number" min="0" value={form.paymentTerms} onChange={e=>setForm(v=>({...v,paymentTerms:e.target.value}))}/></div>
        <Input label="Dirección" value={form.address||''} onChange={e=>setForm(v=>({...v,address:e.target.value}))}/>
        <div className={styles.statusField}><div><strong>Proveedor activo</strong><p>Disponible para solicitudes y órdenes de compra.</p></div><Switch checked={form.active} onChange={active=>setForm(v=>({...v,active}))}/></div>
      </form>:null}
    </DetailDrawer>
  </div>;
}
