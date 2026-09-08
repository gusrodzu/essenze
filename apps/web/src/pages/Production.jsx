import {useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Factory,
  Gauge,
  Layers3,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  Timer,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import {ModuleTabs} from '../components/module-system';
import styles from './Production.module.css';

const statusLabel={DRAFT:'Borrador',PLANNED:'Planeada',RELEASED:'Liberada',IN_PROGRESS:'En producción',PAUSED:'Pausada',COMPLETED:'Completada',CANCELLED:'Cancelada'};
const statusTone={DRAFT:'neutral',PLANNED:'info',RELEASED:'info',IN_PROGRESS:'success',PAUSED:'warning',COMPLETED:'neutral',CANCELLED:'danger'};
const operationLabel={PENDING:'Pendiente',READY:'Lista',IN_PROGRESS:'En proceso',PAUSED:'Pausada',DONE:'Terminada',CANCELLED:'Cancelada'};
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(v||0));
const num=(v,d=1)=>new Intl.NumberFormat('es-MX',{maximumFractionDigits:d}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'Sin fecha';

export default function Production(){
  const [data,setData]=useState({orders:[],boms:[],workCenters:[],products:[],warehouses:[],employees:[],salesOrders:[],projects:[],summary:{}});
  const [tab,setTab]=useState('overview');
  const [selectedId,setSelectedId]=useState(null);
  const [query,setQuery]=useState('');
  const [orderModal,setOrderModal]=useState(null);
  const [bomModal,setBomModal]=useState(null);
  const [workCenterModal,setWorkCenterModal]=useState(null);
  const [operationModal,setOperationModal]=useState(null);
  const [consumptionModal,setConsumptionModal]=useState(null);
  const [outputModal,setOutputModal]=useState(null);
  const [wasteModal,setWasteModal]=useState(null);
  const [costModal,setCostModal]=useState(null);
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  async function load(preferred){
    setLoading(true);
    try{
      const r=await apiRequest('/production/dashboard');
      setData(r);
      const candidate=preferred??selectedId;
      if(candidate&&r.orders.some(o=>o.id===candidate))setSelectedId(candidate);
      else if(!selectedId&&r.orders.length)setSelectedId(r.orders[0].id);
    }catch(e){setMessage(['error',e.message])}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function submit(path,body,success,method='POST',preferred=selectedId){
    setSaving(true);
    try{
      const r=await apiRequest(path,{method,body});
      setMessage(['success',success]);
      await load(preferred||r.order?.id);
      return r;
    }catch(e){setMessage(['error',e.message]);return null}
    finally{setSaving(false)}
  }

  const selected=data.orders.find(o=>o.id===selectedId)||null;
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return data.orders;
    return data.orders.filter(o=>`${o.folio} ${o.product?.name||''} ${o.salesOrder?.customer?.commercialName||''} ${o.project?.name||''}`.toLowerCase().includes(q))
  },[query,data.orders]);

  if(loading&&!data.orders.length)return <Card className={styles.loading}>Cargando Producción…</Card>;

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>Manufacturing · MRP · Costing</span><h1>Producción</h1><p>Planea órdenes, explota listas de materiales, controla operaciones, consumos, salidas, lotes, mermas y costo real de manufactura.</p></div>
      <div className={styles.headerActions}><Button variant="secondary" icon={Layers3} onClick={()=>setBomModal({code:'',name:'',finishedProductId:'',version:1,baseQuantity:1,notes:'',active:true,items:[{componentId:'',quantity:1,wastePercent:0,notes:'',sortOrder:1}]})}>Nueva BOM</Button><Button icon={Plus} onClick={()=>setOrderModal({bomId:'',salesOrderId:'',projectId:'',issueWarehouseId:'',receiptWarehouseId:'',folio:`PROD-${String(data.orders.length+1).padStart(5,'0')}`,productId:'',priority:'MEDIUM',plannedQuantity:'',plannedStartAt:'',plannedEndAt:'',notes:''})}>Nueva orden</Button></div>
    </header>

    {message?<div className={`${styles.message} ${styles[message[0]]}`}><span>{message[1]}</span><button onClick={()=>setMessage(null)}><X size={16}/></button></div>:null}

    <KpiGrid>
      <KpiCard><Factory/><span>Órdenes activas</span><KpiInfo title="Órdenes activas">Órdenes planeadas, liberadas, en producción o pausadas.</KpiInfo><strong>{data.summary.activeOrders||0}</strong><small>{data.summary.inProgress||0} en proceso</small></KpiCard>
      <KpiCard><PackageCheck/><span>Producción</span><KpiInfo title="Avance global">Unidades producidas sobre las planeadas en órdenes activas.</KpiInfo><strong>{num(data.summary.totalProduced,0)}</strong><small>de {num(data.summary.totalPlanned,0)} · {num(data.summary.efficiency,1)}%</small></KpiCard>
      <KpiCard><CircleDollarSign/><span>Costo acumulado</span><KpiInfo title="Costo de producción">Materiales, mano de obra, overhead, costos extra y mermas.</KpiInfo><strong>{money(data.summary.totalCost)}</strong><small>{money(data.summary.wasteCost)} en mermas</small></KpiCard>
      <KpiCard><AlertTriangle/><span>Órdenes atrasadas</span><KpiInfo title="Atrasos">Órdenes activas cuya fecha planificada de fin ya pasó.</KpiInfo><strong>{data.summary.late||0}</strong><small>{data.summary.completed||0} completadas</small></KpiCard>
      <KpiCard><Gauge/><span>Eficiencia global</span><KpiInfo title="Eficiencia">Producción real contra cantidad planificada activa.</KpiInfo><strong>{num(data.summary.efficiency,1)}%</strong><small>Seguimiento de cumplimiento</small></KpiCard>
    </KpiGrid>

    <ModuleTabs
      active={tab}
      onChange={setTab}
      items={[
        {id:'overview',label:'Resumen',icon:TrendingUp},
        {id:'orders',label:'Órdenes',icon:Factory},
        {id:'boms',label:'BOM / materiales',icon:Layers3},
        {id:'centers',label:'Centros de trabajo',icon:Wrench}
      ]}
    />

    {tab==='overview'?<Overview data={data} onSelect={id=>{setSelectedId(id);setTab('orders')}}/>:null}

    {tab==='orders'?<div className={styles.workspace}>
      <aside className={styles.rail}><div className={styles.railTop}><label className={styles.search}><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar orden…"/></label></div><div className={styles.orderList}>{filtered.map(o=><button key={o.id} className={selectedId===o.id?styles.selected:''} onClick={()=>setSelectedId(o.id)}><div><span>{o.folio}</span><Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge></div><strong>{o.product?.name}</strong><small>{o.salesOrder?.customer?.commercialName||o.project?.name||'Producción interna'}</small><div className={styles.miniBar}><i style={{width:`${Math.min(100,o.metrics.progress)}%`}}/></div><footer><span>{num(o.producedQuantity,0)} / {num(o.plannedQuantity,0)}</span><b>{num(o.metrics.progress,0)}%</b></footer></button>)}</div></aside>
      <main className={styles.main}>{selected?<OrderDetail order={selected} data={data}
        onOperation={()=>setOperationModal({workCenterId:'',employeeId:'',sequence:selected.operations.length?Math.max(...selected.operations.map(x=>x.sequence))+10:10,name:'',description:'',plannedMinutes:0,plannedStartAt:'',plannedEndAt:'',notes:''})}
        onConsumption={()=>setConsumptionModal({productId:'',quantity:'',unitCost:'',reference:'',notes:''})}
        onOutput={()=>setOutputModal({quantity:'',unitCost:selected.metrics.unitCost||'',lotNumber:'',expiresAt:'',qualityStatus:'PENDING',notes:''})}
        onWaste={()=>setWasteModal({productId:'',quantity:'',reason:'',cost:'',notes:''})}
        onCost={()=>setCostModal({type:'OVERHEAD',description:'',amount:'',reference:''})}
        onStatus={async status=>submit(`/production/orders/${selected.id}/status`,{status},'Estado de producción actualizado','PATCH',selected.id)}
        onOpStatus={async (op,status)=>submit(`/production/orders/${selected.id}/operations/${op.id}/status`,{status},'Operación actualizada','PATCH',selected.id)}
      />:<Card className={styles.loading}>Selecciona una orden de producción.</Card>}</main>
    </div>:null}

    {tab==='boms'?<Boms data={data} onNew={()=>setBomModal({code:'',name:'',finishedProductId:'',version:1,baseQuantity:1,notes:'',active:true,items:[{componentId:'',quantity:1,wastePercent:0,notes:'',sortOrder:1}]})}/>:null}
    {tab==='centers'?<Centers data={data} onNew={()=>setWorkCenterModal({code:'',name:'',description:'',capacityPerDay:'',hourlyRate:'',active:true})}/>:null}

    {orderModal?<OrderModal value={orderModal} setValue={setOrderModal} data={data} saving={saving} onClose={()=>setOrderModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit('/production/orders',{...orderModal,bomId:orderModal.bomId||null,salesOrderId:orderModal.salesOrderId||null,projectId:orderModal.projectId||null,issueWarehouseId:orderModal.issueWarehouseId||null,receiptWarehouseId:orderModal.receiptWarehouseId||null,plannedQuantity:Number(orderModal.plannedQuantity),plannedStartAt:orderModal.plannedStartAt||null,plannedEndAt:orderModal.plannedEndAt||null},'Orden de producción creada');if(r){setOrderModal(null);setSelectedId(r.order.id);setTab('orders')}}}/>:null}

    {bomModal?<BomModal value={bomModal} setValue={setBomModal} data={data} saving={saving} onClose={()=>setBomModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit('/production/boms',{...bomModal,version:Number(bomModal.version),baseQuantity:Number(bomModal.baseQuantity),items:bomModal.items.map((x,i)=>({...x,quantity:Number(x.quantity),wastePercent:Number(x.wastePercent||0),sortOrder:i+1}))},'BOM creada');if(r)setBomModal(null)}}/>:null}

    {workCenterModal?<SimpleModal title="Nuevo centro de trabajo" eyebrow="Manufactura" saving={saving} onClose={()=>setWorkCenterModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit('/production/work-centers',{...workCenterModal,capacityPerDay:Number(workCenterModal.capacityPerDay||0),hourlyRate:Number(workCenterModal.hourlyRate||0)},'Centro de trabajo creado');if(r)setWorkCenterModal(null)}}><div className={styles.grid2}><Input label="Código" required value={workCenterModal.code} onChange={e=>setWorkCenterModal(v=>({...v,code:e.target.value.toUpperCase()}))}/><Input label="Nombre" required value={workCenterModal.name} onChange={e=>setWorkCenterModal(v=>({...v,name:e.target.value}))}/></div><div className={styles.grid2}><Input label="Capacidad/día" type="number" min="0" value={workCenterModal.capacityPerDay} onChange={e=>setWorkCenterModal(v=>({...v,capacityPerDay:e.target.value}))}/><Input label="Costo/hora" type="number" min="0" value={workCenterModal.hourlyRate} onChange={e=>setWorkCenterModal(v=>({...v,hourlyRate:e.target.value}))}/></div></SimpleModal>:null}

    {operationModal?<SimpleModal title="Nueva operación" eyebrow={selected?.folio} saving={saving} onClose={()=>setOperationModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit(`/production/orders/${selected.id}/operations`,{...operationModal,workCenterId:operationModal.workCenterId||null,employeeId:operationModal.employeeId||null,sequence:Number(operationModal.sequence),plannedMinutes:Number(operationModal.plannedMinutes||0),plannedStartAt:operationModal.plannedStartAt||null,plannedEndAt:operationModal.plannedEndAt||null},'Operación agregada');if(r)setOperationModal(null)}}><div className={styles.grid2}><Input label="Secuencia" type="number" min="1" required value={operationModal.sequence} onChange={e=>setOperationModal(v=>({...v,sequence:e.target.value}))}/><Input label="Nombre" required value={operationModal.name} onChange={e=>setOperationModal(v=>({...v,name:e.target.value}))}/></div><div className={styles.grid2}><label>Centro<select value={operationModal.workCenterId} onChange={e=>setOperationModal(v=>({...v,workCenterId:e.target.value}))}><option value="">Sin centro</option>{data.workCenters.map(w=><option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></label><label>Responsable<select value={operationModal.employeeId} onChange={e=>setOperationModal(v=>({...v,employeeId:e.target.value}))}><option value="">Sin responsable</option>{data.employees.map(x=><option key={x.id} value={x.id}>{x.firstName} {x.lastName}</option>)}</select></label></div><Input label="Minutos planeados" type="number" min="0" value={operationModal.plannedMinutes} onChange={e=>setOperationModal(v=>({...v,plannedMinutes:e.target.value}))}/></SimpleModal>:null}

    {consumptionModal?<SimpleModal title="Registrar consumo" eyebrow={selected?.folio} saving={saving} onClose={()=>setConsumptionModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit(`/production/orders/${selected.id}/consumptions`,{...consumptionModal,quantity:Number(consumptionModal.quantity),unitCost:Number(consumptionModal.unitCost||0)},'Consumo registrado');if(r)setConsumptionModal(null)}}><label>Material<select required value={consumptionModal.productId} onChange={e=>setConsumptionModal(v=>({...v,productId:e.target.value}))}><option value="">Seleccionar…</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><div className={styles.grid2}><Input label="Cantidad" type="number" step="0.001" min="0.001" required value={consumptionModal.quantity} onChange={e=>setConsumptionModal(v=>({...v,quantity:e.target.value}))}/><Input label="Costo unitario" type="number" step="0.01" min="0" value={consumptionModal.unitCost} onChange={e=>setConsumptionModal(v=>({...v,unitCost:e.target.value}))}/></div></SimpleModal>:null}

    {outputModal?<SimpleModal title="Registrar producción terminada" eyebrow={selected?.folio} saving={saving} onClose={()=>setOutputModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit(`/production/orders/${selected.id}/outputs`,{...outputModal,quantity:Number(outputModal.quantity),unitCost:Number(outputModal.unitCost||0),lotNumber:outputModal.lotNumber||null,expiresAt:outputModal.expiresAt||null},'Producción terminada registrada');if(r)setOutputModal(null)}}><div className={styles.grid2}><Input label="Cantidad producida" type="number" min="0.001" step="0.001" required value={outputModal.quantity} onChange={e=>setOutputModal(v=>({...v,quantity:e.target.value}))}/><Input label="Costo unitario" type="number" min="0" step="0.01" value={outputModal.unitCost} onChange={e=>setOutputModal(v=>({...v,unitCost:e.target.value}))}/></div><div className={styles.grid2}><Input label="Lote (opcional)" value={outputModal.lotNumber} onChange={e=>setOutputModal(v=>({...v,lotNumber:e.target.value}))}/><Input label="Caducidad" type="date" value={outputModal.expiresAt} onChange={e=>setOutputModal(v=>({...v,expiresAt:e.target.value}))}/></div></SimpleModal>:null}

    {wasteModal?<SimpleModal title="Registrar merma" eyebrow={selected?.folio} saving={saving} onClose={()=>setWasteModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit(`/production/orders/${selected.id}/waste`,{...wasteModal,productId:wasteModal.productId||null,quantity:Number(wasteModal.quantity),cost:Number(wasteModal.cost||0)},'Merma registrada');if(r)setWasteModal(null)}}><label>Producto/material<select value={wasteModal.productId} onChange={e=>setWasteModal(v=>({...v,productId:e.target.value}))}><option value="">Sin producto específico</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className={styles.grid2}><Input label="Cantidad" type="number" min="0.001" step="0.001" required value={wasteModal.quantity} onChange={e=>setWasteModal(v=>({...v,quantity:e.target.value}))}/><Input label="Costo" type="number" min="0" value={wasteModal.cost} onChange={e=>setWasteModal(v=>({...v,cost:e.target.value}))}/></div><Input label="Motivo" required value={wasteModal.reason} onChange={e=>setWasteModal(v=>({...v,reason:e.target.value}))}/></SimpleModal>:null}

    {costModal?<SimpleModal title="Costo adicional" eyebrow={selected?.folio} saving={saving} onClose={()=>setCostModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit(`/production/orders/${selected.id}/costs`,{...costModal,amount:Number(costModal.amount)},'Costo agregado');if(r)setCostModal(null)}}><label>Tipo<select value={costModal.type} onChange={e=>setCostModal(v=>({...v,type:e.target.value}))}><option value="MATERIAL">Material</option><option value="LABOR">Mano de obra</option><option value="OVERHEAD">Overhead</option><option value="OUTSOURCED">Externo</option><option value="OTHER">Otro</option></select></label><Input label="Descripción" required value={costModal.description} onChange={e=>setCostModal(v=>({...v,description:e.target.value}))}/><Input label="Monto" type="number" min="0.01" step="0.01" required value={costModal.amount} onChange={e=>setCostModal(v=>({...v,amount:e.target.value}))}/></SimpleModal>:null}
  </div>
}

function Overview({data,onSelect}){const active=data.orders.filter(o=>['PLANNED','RELEASED','IN_PROGRESS','PAUSED'].includes(o.status));return <div className={styles.overviewGrid}><Card className={styles.scheduleCard}><Section eyebrow="Shop floor" title="Órdenes activas"/><div className={styles.schedule}>{active.map(o=><button key={o.id} onClick={()=>onSelect(o.id)}><span className={styles.factoryIcon}><Factory size={18}/></span><div><strong>{o.folio} · {o.product?.name}</strong><small>{date(o.plannedStartAt)} → {date(o.plannedEndAt)}</small></div><Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge><div className={styles.progressText}><b>{num(o.metrics.progress,0)}%</b><small>{num(o.producedQuantity,0)}/{num(o.plannedQuantity,0)}</small></div></button>)}</div></Card><Card className={styles.costCard}><Section eyebrow="Costing" title="Costo por orden"/><div className={styles.costList}>{data.orders.slice(0,6).map(o=><article key={o.id}><div><strong>{o.folio}</strong><small>{o.product?.name}</small></div><span>{money(o.metrics.totalCost)}</span><b>{money(o.metrics.unitCost)}/u</b></article>)}</div></Card><Card className={styles.capacityCard}><Section eyebrow="Capacity" title="Centros de trabajo"/><div className={styles.centerList}>{data.workCenters.map(w=><article key={w.id}><span className={styles.factoryIcon}><Wrench size={16}/></span><div><strong>{w.name}</strong><small>{w.code} · {num(w.capacityPerDay,0)} unidades/día</small></div><b>{money(w.hourlyRate)}/h</b></article>)}</div></Card></div>}
function OrderDetail({order,data,onOperation,onConsumption,onOutput,onWaste,onCost,onStatus,onOpStatus}){const m=order.metrics;return <div className={styles.detailGrid}><Card className={styles.heroCard}><div className={styles.hero}><div><div className={styles.meta}><span>{order.folio}</span><Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge></div><h2>{order.product?.name}</h2><p>{order.salesOrder?`Venta ${order.salesOrder.folio} · ${order.salesOrder.customer?.commercialName||order.salesOrder.customer?.legalName}`:order.project?`Proyecto ${order.project.code} · ${order.project.name}`:'Producción interna'}</p></div><select value={order.status} onChange={e=>onStatus(e.target.value)}>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><div className={styles.heroMetrics}><Metric label="Planeado" value={num(order.plannedQuantity,0)}/><Metric label="Producido" value={num(order.producedQuantity,0)}/><Metric label="Avance" value={`${num(m.progress,1)}%`}/><Metric label="Costo real" value={money(m.totalCost)}/><Metric label="Costo/u" value={money(m.unitCost)}/><Metric label="Merma" value={money(m.wasteCost)}/></div></Card><Card className={styles.opsCard}><div className={styles.cardAction}><Section eyebrow="Routing" title="Operaciones"/><Button icon={Plus} onClick={onOperation}>Operación</Button></div><div className={styles.ops}>{order.operations.map(op=><article key={op.id}><span className={styles.seq}>{op.sequence}</span><div><strong>{op.name}</strong><small>{op.workCenter?.name||'Sin centro'} · {op.employee?`${op.employee.firstName} ${op.employee.lastName}`:'Sin responsable'} · {op.actualMinutes}/{op.plannedMinutes} min</small></div><Badge tone={op.status==='DONE'?'success':op.status==='IN_PROGRESS'?'info':'neutral'}>{operationLabel[op.status]}</Badge><select value={op.status} onChange={e=>onOpStatus(op,e.target.value)}>{Object.entries(operationLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></article>)}</div></Card><Card className={styles.materialCard}><div className={styles.cardAction}><Section eyebrow="MRP" title="Materiales"/><Button variant="secondary" onClick={onConsumption}>Registrar consumo</Button></div><div className={styles.materials}><header><span>Material</span><span>Planeado</span><span>Emitido</span><span>Costo u.</span></header>{order.materials.map(r=><article key={r.id}><div><strong>{r.product.name}</strong><small>{r.product.sku}</small></div><span>{num(r.plannedQuantity,2)}</span><span>{num(r.issuedQuantity,2)}</span><b>{money(r.unitCost)}</b></article>)}</div></Card><Card className={styles.costBreak}><Section eyebrow="Costeo" title="Estructura de costo"/><div className={styles.costMetrics}><Metric label="Materiales" value={money(m.materialCost)}/><Metric label="Mano de obra" value={money(m.operationLabor)}/><Metric label="Overhead operaciones" value={money(m.operationOverhead)}/><Metric label="Costos adicionales" value={money(m.additionalCosts)}/><Metric label="Merma" value={money(m.wasteCost)}/><Metric label="Total" value={money(m.totalCost)}/></div><Button variant="secondary" onClick={onCost}>Agregar costo</Button></Card><Card className={styles.actionsCard}><Section eyebrow="Ejecución" title="Movimientos de producción"/><div className={styles.bigActions}><button onClick={onOutput}><PackageCheck size={22}/><strong>Registrar salida</strong><small>Producto terminado / lote</small></button><button onClick={onWaste}><AlertTriangle size={22}/><strong>Registrar merma</strong><small>Scrap, daño o rechazo</small></button><button onClick={onConsumption}><Boxes size={22}/><strong>Consumir material</strong><small>Consumo real de componentes</small></button></div></Card><Card className={styles.batchCard}><Section eyebrow="Traceability" title="Lotes producidos"/><div className={styles.batchList}>{order.batches.map(b=><article key={b.id}><div><strong>{b.lotNumber}</strong><small>{date(b.manufacturedAt)} · {b.product.name}</small></div><span>{num(b.quantity,2)} u</span><Badge tone={b.qualityStatus==='APPROVED'?'success':'warning'}>{b.qualityStatus}</Badge></article>)}</div></Card></div>}
function Boms({data,onNew}){return <Card className={styles.tableCard}><div className={styles.cardAction}><Section eyebrow="Bill of Materials" title="Listas de materiales"/><Button icon={Plus} onClick={onNew}>Nueva BOM</Button></div><div className={styles.bomGrid}>{data.boms.map(b=><article key={b.id}><div className={styles.bomTitle}><span className={styles.factoryIcon}><Layers3 size={18}/></span><div><strong>{b.code} · v{b.version}</strong><small>{b.name}</small></div><Badge tone={b.active?'success':'neutral'}>{b.active?'Activa':'Inactiva'}</Badge></div><h3>{b.finishedProduct.name}</h3><p>Base: {num(b.baseQuantity,2)} · {b.items.length} componentes</p><div>{b.items.map(i=><span key={i.id}>{i.component.name}<b>{num(i.quantity,3)}</b></span>)}</div></article>)}</div></Card>}
function Centers({data,onNew}){return <Card className={styles.tableCard}><div className={styles.cardAction}><Section eyebrow="Shop floor" title="Centros de trabajo"/><Button icon={Plus} onClick={onNew}>Nuevo centro</Button></div><div className={styles.centerGrid}>{data.workCenters.map(w=><article key={w.id}><span className={styles.bigIcon}><Wrench size={22}/></span><div><strong>{w.name}</strong><small>{w.code}</small><p>{w.description||'Sin descripción'}</p></div><Metric label="Capacidad/día" value={num(w.capacityPerDay,0)}/><Metric label="Costo/hora" value={money(w.hourlyRate)}/></article>)}</div></Card>}
function OrderModal({value,setValue,data,saving,onClose,onSubmit}){return <Modal title="Nueva orden de producción" eyebrow="Manufacturing Order" onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}><div className={styles.grid2}><Input label="Folio" required value={value.folio} onChange={e=>setValue(v=>({...v,folio:e.target.value.toUpperCase()}))}/><Input label="Cantidad planeada" type="number" min="0.001" step="0.001" required value={value.plannedQuantity} onChange={e=>setValue(v=>({...v,plannedQuantity:e.target.value}))}/></div><div className={styles.grid2}><label>Producto a fabricar<select required value={value.productId} onChange={e=>setValue(v=>({...v,productId:e.target.value}))}><option value="">Seleccionar…</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>BOM<select value={value.bomId} onChange={e=>{const b=data.boms.find(x=>x.id===e.target.value);setValue(v=>({...v,bomId:e.target.value,productId:b?.finishedProductId||v.productId}))}}><option value="">Sin BOM</option>{data.boms.map(b=><option key={b.id} value={b.id}>{b.code} v{b.version} · {b.finishedProduct.name}</option>)}</select></label></div><div className={styles.grid2}><label>Pedido de venta<select value={value.salesOrderId} onChange={e=>setValue(v=>({...v,salesOrderId:e.target.value}))}><option value="">Sin pedido</option>{data.salesOrders.map(o=><option key={o.id} value={o.id}>{o.folio} · {o.customer?.commercialName||o.customer?.legalName}</option>)}</select></label><label>Proyecto<select value={value.projectId} onChange={e=>setValue(v=>({...v,projectId:e.target.value}))}><option value="">Sin proyecto</option>{data.projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label></div><div className={styles.grid2}><label>Almacén materiales<select value={value.issueWarehouseId} onChange={e=>setValue(v=>({...v,issueWarehouseId:e.target.value}))}><option value="">Sin asignar</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>Almacén terminado<select value={value.receiptWarehouseId} onChange={e=>setValue(v=>({...v,receiptWarehouseId:e.target.value}))}><option value="">Sin asignar</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div><div className={styles.grid2}><Input label="Inicio planeado" type="date" value={value.plannedStartAt} onChange={e=>setValue(v=>({...v,plannedStartAt:e.target.value}))}/><Input label="Fin planeado" type="date" value={value.plannedEndAt} onChange={e=>setValue(v=>({...v,plannedEndAt:e.target.value}))}/></div></div><Footer onClose={onClose} saving={saving}/></form></Modal>}
function BomModal({value,setValue,data,saving,onClose,onSubmit}){function setItem(i,key,val){setValue(v=>({...v,items:v.items.map((x,idx)=>idx===i?{...x,[key]:val}:x)}))}return <Modal title="Nueva lista de materiales" eyebrow="BOM" onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}><div className={styles.grid3}><Input label="Código" required value={value.code} onChange={e=>setValue(v=>({...v,code:e.target.value.toUpperCase()}))}/><Input label="Nombre" required value={value.name} onChange={e=>setValue(v=>({...v,name:e.target.value}))}/><Input label="Versión" type="number" min="1" required value={value.version} onChange={e=>setValue(v=>({...v,version:e.target.value}))}/></div><div className={styles.grid2}><label>Producto terminado<select required value={value.finishedProductId} onChange={e=>setValue(v=>({...v,finishedProductId:e.target.value}))}><option value="">Seleccionar…</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><Input label="Cantidad base" type="number" min="0.001" step="0.001" value={value.baseQuantity} onChange={e=>setValue(v=>({...v,baseQuantity:e.target.value}))}/></div><div className={styles.bomEditor}><header><strong>Componentes</strong><button type="button" onClick={()=>setValue(v=>({...v,items:[...v.items,{componentId:'',quantity:1,wastePercent:0,notes:'',sortOrder:v.items.length+1}]}))}>+ Agregar material</button></header>{value.items.map((item,i)=><div key={i}><select required value={item.componentId} onChange={e=>setItem(i,'componentId',e.target.value)}><option value="">Producto…</option>{data.products.filter(p=>p.id!==value.finishedProductId).map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select><input type="number" step="0.001" min="0.001" value={item.quantity} onChange={e=>setItem(i,'quantity',e.target.value)} placeholder="Cantidad"/><input type="number" step="0.1" min="0" max="100" value={item.wastePercent} onChange={e=>setItem(i,'wastePercent',e.target.value)} placeholder="% merma"/><button type="button" onClick={()=>setValue(v=>({...v,items:v.items.filter((_,idx)=>idx!==i)}))}>×</button></div>)}</div></div><Footer onClose={onClose} saving={saving}/></form></Modal>}
function SimpleModal({title,eyebrow,saving,onClose,onSubmit,children}){return <Modal title={title} eyebrow={eyebrow} onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}>{children}</div><Footer onClose={onClose} saving={saving}/></form></Modal>}
function Section({eyebrow,title}){return <header className={styles.section}><span>{eyebrow}</span><h3>{title}</h3></header>}
function Metric({label,value}){return <div className={styles.metric}><small>{label}</small><strong>{value}</strong></div>}
function Modal({title,eyebrow,onClose,children}){return <div className={styles.overlay} onMouseDown={onClose}><div className={styles.modal} onMouseDown={e=>e.stopPropagation()}><header className={styles.modalHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={19}/></button></header>{children}</div></div>}
function Footer({onClose,saving}){return <footer className={styles.modalFooter}><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>Guardar</Button></footer>}
