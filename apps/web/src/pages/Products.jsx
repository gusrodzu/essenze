import {useEffect,useMemo,useState} from 'react';
import {DollarSign,Edit3,Package,Plus,Trash2,X} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Input,Switch} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import {DataTableFrame,DetailDrawer,ModuleHeader,ModuleToolbar} from '../components/module-system';
import styles from './Catalog.module.css';

const emptyForm={categoryId:'',sku:'',name:'',description:'',unit:'PZA',cost:0,price:0,minStock:0,active:true};
const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

export default function Products(){
  const [items,setItems]=useState([]);
  const [categories,setCategories]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState(null);
  const [query,setQuery]=useState('');
  const [message,setMessage]=useState(null);
  const [selected,setSelected]=useState(null);
  const [drawerTab,setDrawerTab]=useState('summary');

  async function loadData(){
    setLoading(true);
    try{
      const result=await apiRequest('/products');
      setItems(result.products??[]);
      setCategories(result.categories??[]);
    }catch(error){
      setMessage({type:'error',text:error.message});
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{loadData();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return items;
    return items.filter(item=>[item.sku,item.name,item.category?.name,item.unit]
      .filter(Boolean).some(value=>value.toLowerCase().includes(q)));
  },[items,query]);

  async function save(event){
    event.preventDefault();
    setSaving(true);
    try{
      const editing=Boolean(form.id);
      await apiRequest(editing?`/products/${form.id}`:'/products',{
        method:editing?'PUT':'POST',
        body:{...form,cost:Number(form.cost),price:Number(form.price),minStock:Number(form.minStock)}
      });
      setForm(null);
      await loadData();
      setMessage({type:'success',text:editing?'Producto actualizado.':'Producto creado.'});
    }catch(error){
      setMessage({type:'error',text:error.message});
    }finally{
      setSaving(false);
    }
  }

  async function toggle(item){
    try{
      await apiRequest(`/products/${item.id}/status`,{method:'PATCH',body:{active:!item.active}});
      setItems(current=>current.map(row=>row.id===item.id?{...row,active:!row.active}:row));
      if(selected?.id===item.id)setSelected(v=>({...v,active:!v.active}));
    }catch(error){
      setMessage({type:'error',text:error.message});
    }
  }

  async function remove(item){
    if(!window.confirm(`¿Eliminar el producto ${item.name}?`))return;
    try{
      await apiRequest(`/products/${item.id}`,{method:'DELETE'});
      setItems(current=>current.filter(row=>row.id!==item.id));
      if(selected?.id===item.id)setSelected(null);
    }catch(error){
      setMessage({type:'error',text:error.message});
    }
  }

  if(loading)return <div className={styles.loading}>Cargando productos…</div>;

  const active=items.filter(item=>item.active).length;
  const inventoryValue=items.reduce((sum,item)=>sum+Number(item.cost||0),0);

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Inventario · Maestro de producto"
      title="Catálogo de productos"
      description="Define SKU, unidades, costos, precios y niveles mínimos antes de operar existencias."
      actions={<Button icon={Plus} onClick={()=>setForm({...emptyForm,categoryId:categories[0]?.id??''})}>Nuevo producto</Button>}
    />

    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}

    <KpiGrid>
      <KpiCard><Package/><span>Productos registrados</span><KpiInfo title="Productos registrados">Total de productos del catálogo.</KpiInfo><strong>{items.length}</strong><small>maestro de producto</small></KpiCard>
      <KpiCard><Package/><span>Productos activos</span><KpiInfo title="Productos activos">Disponibles para compras, ventas e inventario.</KpiInfo><strong>{active}</strong><small>{items.length-active} inactivo(s)</small></KpiCard>
      <KpiCard><DollarSign/><span>Costo catálogo</span><KpiInfo title="Costo catálogo">Suma del costo configurado; no representa valorización de existencias.</KpiInfo><strong>{money(inventoryValue)}</strong><small>referencia del maestro</small></KpiCard>
    </KpiGrid>

    <section className={styles.tableCard}>
      <ModuleToolbar
        title="Productos"
        description={`${filtered.length} resultados`}
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre, SKU o categoría"
      />
      <DataTableFrame empty={!filtered.length?'No se encontraron productos.':null}>
        <table>
          <thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Costos</th><th>Mínimo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(item=><tr key={item.id} onClick={()=>{setSelected(item);setDrawerTab('summary')}} style={{cursor:'pointer'}}>
              <td><strong>{item.name}</strong><small>{item.sku}</small></td>
              <td>{item.category?.name||'Sin categoría'}</td>
              <td>{item.unit}</td>
              <td><strong>{money(item.cost)}</strong><small>Venta {money(item.price)}</small></td>
              <td>{Number(item.minStock)}</td>
              <td><div className={styles.status} onClick={e=>e.stopPropagation()}><Badge tone={item.active?'success':'neutral'}>{item.active?'Activo':'Inactivo'}</Badge><Switch checked={item.active} onChange={()=>toggle(item)}/></div></td>
              <td><div className={styles.actions} onClick={e=>e.stopPropagation()}><button onClick={()=>setForm({...item,categoryId:item.categoryId||''})} aria-label={`Editar ${item.name}`}><Edit3 size={17}/></button><button onClick={()=>remove(item)} aria-label={`Eliminar ${item.name}`}><Trash2 size={17}/></button></div></td>
            </tr>)}
          </tbody>
        </table>
      </DataTableFrame>
    </section>

    <DetailDrawer
      open={Boolean(selected)}
      onClose={()=>setSelected(null)}
      title={selected?.sku}
      subtitle={selected?.name}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      tabs={[
        {id:'summary',label:'Resumen'},
        {id:'commercial',label:'Comercial'},
        {id:'inventory',label:'Inventario'}
      ]}
      footer={<><Button variant="secondary" onClick={()=>setSelected(null)}>Cerrar</Button><Button onClick={()=>{setForm({...selected,categoryId:selected.categoryId||''});setSelected(null)}}><Edit3 size={16}/> Editar producto</Button></>}
    >
      {selected&&drawerTab==='summary'?<div className={styles.detailGrid}>
        <div><span>Estado</span><strong><Badge tone={selected.active?'success':'neutral'}>{selected.active?'Activo':'Inactivo'}</Badge></strong></div>
        <div><span>Categoría</span><strong>{selected.category?.name||'Sin categoría'}</strong></div>
        <div><span>Unidad</span><strong>{selected.unit}</strong></div>
        <div><span>Descripción</span><strong>{selected.description||'Sin descripción'}</strong></div>
      </div>:null}
      {selected&&drawerTab==='commercial'?<div className={styles.detailGrid}>
        <div><span>Costo</span><strong>{money(selected.cost)}</strong></div>
        <div><span>Precio de venta</span><strong>{money(selected.price)}</strong></div>
        <div><span>Margen unitario</span><strong>{money(Number(selected.price)-Number(selected.cost))}</strong></div>
      </div>:null}
      {selected&&drawerTab==='inventory'?<div className={styles.detailGrid}>
        <div><span>Stock mínimo</span><strong>{Number(selected.minStock)} {selected.unit}</strong></div>
        <div><span>SKU</span><strong>{selected.sku}</strong></div>
        <div><span>Uso</span><strong>Compras · Ventas · Inventario</strong></div>
      </div>:null}
    </DetailDrawer>

    {form?<div className={styles.overlay} onMouseDown={e=>e.target===e.currentTarget&&setForm(null)}>
      <form className={styles.modal} onSubmit={save}>
        <div className={styles.modalHeader}><div><span>{form.id?'Editar registro':'Nuevo registro'}</span><h2>{form.id?'Editar producto':'Crear producto'}</h2></div><button type="button" onClick={()=>setForm(null)}><X size={20}/></button></div>
        <div className={styles.modalBody}>
          <div className={styles.grid2}>
            <Input label="SKU" value={form.sku} onChange={e=>setForm(v=>({...v,sku:e.target.value.toUpperCase()}))} required/>
            <label className={styles.selectField}><span>Categoría</span><select value={form.categoryId||''} onChange={e=>setForm(v=>({...v,categoryId:e.target.value}))}><option value="">Sin categoría</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          <Input label="Nombre" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} required/>
          <Input label="Descripción" value={form.description||''} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/>
          <div className={styles.grid2}><Input label="Unidad" value={form.unit} onChange={e=>setForm(v=>({...v,unit:e.target.value.toUpperCase()}))}/><Input label="Stock mínimo" type="number" min="0" step="0.001" value={form.minStock} onChange={e=>setForm(v=>({...v,minStock:e.target.value}))}/></div>
          <div className={styles.grid2}><Input label="Costo" type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(v=>({...v,cost:e.target.value}))}/><Input label="Precio de venta" type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))}/></div>
          <div className={styles.statusField}><div><strong>Producto activo</strong><p>Disponible en compras, inventario y movimientos.</p></div><Switch checked={form.active} onChange={active=>setForm(v=>({...v,active}))}/></div>
        </div>
        <div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar producto</Button></div>
      </form>
    </div>:null}
  </div>;
}
