/* Compatibility marker: BuzzBee Core · Flow v2 */
import {useEffect,useMemo,useState} from 'react';
import {
  Activity,CheckCircle2,GitBranch,Play,Plus,Power,RefreshCw,
  Sparkles,TriangleAlert,Workflow,Zap
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './Flow.module.css';

const emptyFlow={
  key:'',
  name:'',
  description:'',
  triggerEvent:'inventory.low_stock',
  runAsUserId:'',
  active:true,
  stopOnError:true,
  conditions:{mode:'ALL',rules:[]},
  actions:[{
    key:'notify',
    type:'NOTIFY',
    config:{
      title:'BuzzBee Flow',
      message:'Evento recibido: {{event.name}}'
    }
  }]
};

const tone=status=>{
  if(['COMPLETED'].includes(status))return 'success';
  if(['FAILED','COMPLETED_WITH_ERRORS'].includes(status))return 'danger';
  if(['RUNNING'].includes(status))return 'warning';
  return 'neutral';
};

function ActionEditor({action,index,onChange,onRemove,catalog}){
  const set=(key,value)=>onChange(index,{...action,[key]:value});
  const setConfig=(key,value)=>set('config',{...(action.config||{}),[key]:value});

  return <div className={styles.action}>
    <div className={styles.actionHead}>
      <div>
        <span>Acción {index+1}</span>
        <input value={action.key} onChange={e=>set('key',e.target.value)} placeholder="clave_de_accion"/>
      </div>
      <button type="button" onClick={()=>onRemove(index)}>Quitar</button>
    </div>

    <label>
      Tipo
      <select value={action.type} onChange={e=>{
        const type=e.target.value;
        let config={};
        if(type==='NOTIFY')config={title:'BuzzBee Flow',message:'Evento: {{event.name}}'};
        if(type==='CREATE_PURCHASE_REQUEST')config={
          warehouseId:'{{event.data.warehouse.id}}',
          productId:'{{event.data.product.id}}',
          quantity:'{{event.data.minStock}}',
          title:'Reposición automática · {{event.data.product.name}}',
          priority:'HIGH',
          submit:true
        };
        if(type==='CREATE_APPROVAL')config={
          workflowKey:'',
          entityType:'PURCHASE_REQUEST',
          entityId:'{{actions.restock.id}}',
          entityFolio:'{{actions.restock.folio}}',
          title:'Autorizar {{actions.restock.folio}}'
        };
        onChange(index,{...action,type,config});
      }}>
        {(catalog.actionTypes||[]).map(x=><option key={x.key} value={x.key}>{x.label}</option>)}
      </select>
    </label>

    {action.type==='NOTIFY'?<>
      <label>Título<input value={action.config?.title||''} onChange={e=>setConfig('title',e.target.value)}/></label>
      <label>Mensaje<textarea value={action.config?.message||''} onChange={e=>setConfig('message',e.target.value)}/></label>
    </>:null}

    {action.type==='CREATE_PURCHASE_REQUEST'?<>
      <label>Almacén / plantilla<input value={action.config?.warehouseId||''} onChange={e=>setConfig('warehouseId',e.target.value)} placeholder="{{event.data.warehouse.id}}"/></label>
      <label>Producto / plantilla<input value={action.config?.productId||''} onChange={e=>setConfig('productId',e.target.value)} placeholder="{{event.data.product.id}}"/></label>
      <label>Cantidad / plantilla<input value={action.config?.quantity||''} onChange={e=>setConfig('quantity',e.target.value)} placeholder="{{event.data.minStock}}"/></label>
      <label>Título<input value={action.config?.title||''} onChange={e=>setConfig('title',e.target.value)}/></label>
      <label>Prioridad<select value={action.config?.priority||'NORMAL'} onChange={e=>setConfig('priority',e.target.value)}>
        <option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option>
      </select></label>
    </>:null}

    {action.type==='CREATE_APPROVAL'?<>
      <label>Flujo<select value={action.config?.workflowKey||''} onChange={e=>setConfig('workflowKey',e.target.value)}>
        <option value="">Selecciona un flujo</option>
        {(catalog.approvalWorkflows||[]).map(x=><option key={x.id} value={x.key}>{x.name} · {x.entityType}</option>)}
      </select></label>
      <label>Entity type<input value={action.config?.entityType||''} onChange={e=>setConfig('entityType',e.target.value)} placeholder="PURCHASE_REQUEST"/></label>
      <label>Entity ID<input value={action.config?.entityId||''} onChange={e=>setConfig('entityId',e.target.value)} placeholder="{{actions.restock.id}}"/></label>
      <label>Folio<input value={action.config?.entityFolio||''} onChange={e=>setConfig('entityFolio',e.target.value)} placeholder="{{actions.restock.folio}}"/></label>
      <label>Título<input value={action.config?.title||''} onChange={e=>setConfig('title',e.target.value)}/></label>
    </>:null}
  </div>;
}

export default function Flow(){
  const [data,setData]=useState({summary:{},flows:[],runs:[]});
  const [catalog,setCatalog]=useState({triggerEvents:[],actionTypes:[],users:[],approvalWorkflows:[]});
  const [tab,setTab]=useState('flows');
  const [form,setForm]=useState(emptyFlow);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);

  const load=async()=>{
    try{
      const [dashboard,catalogData]=await Promise.all([
        apiRequest('/flow/dashboard'),
        apiRequest('/flow/catalog')
      ]);
      setData(dashboard);
      setCatalog(catalogData);
      setForm(current=>current.runAsUserId?current:{
        ...current,
        runAsUserId:catalogData.users?.[0]?.id||''
      });
    }catch(e){setMsg(['error',e.message])}
  };

  useEffect(()=>{load()},[]);

  const sample=useMemo(()=>({
    event:'inventory.low_stock',
    payload:{
      product:{id:'PRODUCT_ID',sku:'SKU-001',name:'Producto demo'},
      warehouse:{id:'WAREHOUSE_ID',code:'MTY-GEN',name:'Almacén General'},
      quantity:2,
      minStock:10
    }
  }),[]);

  function addCondition(){
    setForm(current=>({
      ...current,
      conditions:{
        ...current.conditions,
        rules:[...current.conditions.rules,{path:'event.data.quantity',operator:'lte',value:10}]
      }
    }));
  }

  function updateCondition(index,patch){
    setForm(current=>({
      ...current,
      conditions:{
        ...current.conditions,
        rules:current.conditions.rules.map((r,i)=>i===index?{...r,...patch}:r)
      }
    }));
  }

  function removeCondition(index){
    setForm(current=>({
      ...current,
      conditions:{
        ...current.conditions,
        rules:current.conditions.rules.filter((_r,i)=>i!==index)
      }
    }));
  }

  function updateAction(index,next){
    setForm(current=>({
      ...current,
      actions:current.actions.map((a,i)=>i===index?next:a)
    }));
  }

  function removeAction(index){
    setForm(current=>({
      ...current,
      actions:current.actions.filter((_a,i)=>i!==index)
    }));
  }

  function addAction(){
    setForm(current=>({
      ...current,
      actions:[
        ...current.actions,
        {
          key:`step_${current.actions.length+1}`,
          type:'NOTIFY',
          config:{title:'BuzzBee Flow',message:'Evento: {{event.name}}'}
        }
      ]
    }));
  }

  async function save(e){
    e.preventDefault();
    setBusy(true);
    try{
      const payload={
        ...form,
        key:form.key.toLowerCase().replace(/\s+/g,'-')
      };
      await apiRequest('/flow',{method:'POST',body:payload});
      setMsg(['success','Automatización creada y lista para escuchar eventos.']);
      setForm({...emptyFlow,runAsUserId:catalog.users?.[0]?.id||''});
      await load();
      setTab('flows');
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  async function toggle(flow){
    setBusy(true);
    try{
      await apiRequest(`/flow/${flow.id}/status`,{
        method:'PATCH',
        body:{active:!flow.active}
      });
      await load();
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  async function test(flow){
    setBusy(true);
    try{
      const result=await apiRequest(`/flow/${flow.id}/test`,{
        method:'POST',
        body:{
          event:flow.triggerEvent,
          payload:sample.payload
        }
      });
      setMsg([
        result.run.status==='COMPLETED'?'success':'error',
        `Prueba terminada: ${result.run.status}`
      ]);
      await load();
      setTab('runs');
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>BuzzBee Core · Automatización v3</span>
        <h1>Automatizaciones</h1>
        <p>Automatiza eventos operativos e insights de Intelligence con condiciones y acciones encadenadas.</p>
      </div>
      <Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button>
    </header>

    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}

    <KpiGrid>
      <KpiCard>
        <Workflow/><span>Automatizaciones</span>
        <KpiInfo title="Automatizaciones">Flujos configurados dentro de la empresa.</KpiInfo>
        <strong>{data.summary.flows||0}</strong><small>Reglas de negocio</small>
      </KpiCard>
      <KpiCard>
        <Zap/><span>Activas</span>
        <KpiInfo title="Activas">Automatizaciones escuchando eventos en tiempo real.</KpiInfo>
        <strong>{data.summary.active||0}</strong><small>En operación</small>
      </KpiCard>
      <KpiCard>
        <Activity/><span>Ejecuciones</span>
        <KpiInfo title="Ejecuciones">Ejecuciones recientes registradas por el motor.</KpiInfo>
        <strong>{data.summary.runs||0}</strong><small>Trazabilidad</small>
      </KpiCard>
      <KpiCard>
        <TriangleAlert/><span>Con incidencias</span>
        <KpiInfo title="Incidencias">Flujos que terminaron con errores en sus acciones.</KpiInfo>
        <strong>{data.summary.errors||0}</strong><small>Requieren revisión</small>
      </KpiCard>
    </KpiGrid>

    <nav className={styles.tabs}>
      <button className={tab==='flows'?styles.active:''} onClick={()=>setTab('flows')}><GitBranch size={16}/> Flujos</button>
      <button className={tab==='builder'?styles.active:''} onClick={()=>setTab('builder')}><Plus size={16}/> Crear automatización</button>
      <button className={tab==='runs'?styles.active:''} onClick={()=>setTab('runs')}><Activity size={16}/> Ejecuciones</button>
    </nav>

    {tab==='flows'?<Card className={styles.panel}>
      <div className={styles.list}>
        {data.flows.length===0?<div className={styles.empty}>Todavía no hay automatizaciones.</div>:data.flows.map(flow=><article key={flow.id}>
          <div className={styles.flowIcon}><Sparkles size={18}/></div>
          <div className={styles.flowMain}>
            <span>{flow.triggerEvent}</span>
            <strong>{flow.name}</strong>
            <small>{flow.description||flow.key} · {Array.isArray(flow.actions)?flow.actions.length:0} acciones · {flow.runCount} ejecuciones</small>
            {flow.lastError?<small className={styles.errorText}>{flow.lastError}</small>:null}
          </div>
          <Badge tone={flow.active?'success':'neutral'}>{flow.active?'ACTIVO':'PAUSADO'}</Badge>
          <div className={styles.rowActions}>
            <Button variant="secondary" disabled={busy} onClick={()=>test(flow)}><Play size={14}/> Probar</Button>
            <Button variant="secondary" disabled={busy} onClick={()=>toggle(flow)}><Power size={14}/> {flow.active?'Pausar':'Activar'}</Button>
          </div>
        </article>)}
      </div>
    </Card>:null}

    {tab==='builder'?<form onSubmit={save} className={styles.builder}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}><div><span>Paso 1</span><h2>Evento</h2></div></div>
        <div className={styles.formGrid}>
          <label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Reposición automática de stock"/></label>
          <label>Clave<input required value={form.key} onChange={e=>setForm({...form,key:e.target.value})} placeholder="inventory-auto-restock"/></label>
          <label>Evento<select value={form.triggerEvent} onChange={e=>setForm({...form,triggerEvent:e.target.value})}>
            {(catalog.triggerEvents||[]).map(x=><option key={x}>{x}</option>)}
          </select></label>
          <label>Ejecutar como<select value={form.runAsUserId} onChange={e=>setForm({...form,runAsUserId:e.target.value})}>
            {(catalog.users||[]).map(x=><option value={x.id} key={x.id}>{x.firstName} {x.lastName} · {x.email}</option>)}
          </select></label>
          <label className={styles.full}>Descripción<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        </div>
      </Card>

      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span>Paso 2</span><h2>Condiciones</h2></div>
          <Button type="button" variant="secondary" onClick={addCondition}>+ Condición</Button>
        </div>
        <div className={styles.conditionMode}>
          Ejecutar si
          <select value={form.conditions.mode} onChange={e=>setForm({...form,conditions:{...form.conditions,mode:e.target.value}})}>
            <option value="ALL">se cumplen TODAS</option>
            <option value="ANY">se cumple CUALQUIERA</option>
          </select>
        </div>
        <div className={styles.conditions}>
          {form.conditions.rules.length===0?<div className={styles.empty}>Sin condiciones: el flujo se ejecutará con cada evento.</div>:form.conditions.rules.map((rule,index)=><div key={index}>
            <input value={rule.path} onChange={e=>updateCondition(index,{path:e.target.value})} placeholder="event.data.quantity"/>
            <select value={rule.operator} onChange={e=>updateCondition(index,{operator:e.target.value})}>
              {(catalog.operators||[]).map(x=><option key={x}>{x}</option>)}
            </select>
            <input value={rule.value??''} onChange={e=>updateCondition(index,{value:e.target.value})} placeholder="10"/>
            <button type="button" onClick={()=>removeCondition(index)}>×</button>
          </div>)}
        </div>
      </Card>

      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span>Paso 3</span><h2>Acciones</h2></div>
          <Button type="button" variant="secondary" onClick={addAction}>+ Acción</Button>
        </div>
        <div className={styles.actions}>
          {form.actions.map((action,index)=><ActionEditor key={index} action={action} index={index} onChange={updateAction} onRemove={removeAction} catalog={catalog}/>)}
        </div>
        <div className={styles.templateHelp}>
          <b>Plantillas disponibles</b>
          <code>{'{{event.data.product.id}}'}</code>
          <code>{'{{event.data.warehouse.id}}'}</code>
          <code>{'{{actions.restock.id}}'}</code>
          <span>Las salidas de una acción pueden alimentar la siguiente.</span>
        </div>
      </Card>

      <div className={styles.builderFooter}>
        <label><input type="checkbox" checked={form.stopOnError} onChange={e=>setForm({...form,stopOnError:e.target.checked})}/> Detener si una acción falla</label>
        <Button disabled={busy||!form.actions.length}>{busy?'Guardando...':'Crear automatización'}</Button>
      </div>
    </form>:null}

    {tab==='runs'?<Card className={styles.panel}>
      <div className={styles.runs}>
        {data.runs.length===0?<div className={styles.empty}>Todavía no hay ejecuciones.</div>:data.runs.map(run=><article key={run.id}>
          <div>
            <span>{run.event}</span>
            <strong>{run.flow?.name||'Flow'}</strong>
            <small>{new Date(run.createdAt).toLocaleString('es-MX')} · {run.actionRuns?.length||0} acciones</small>
          </div>
          <div className={styles.actionResults}>
            {(run.actionRuns||[]).map(a=><Badge key={a.id} tone={a.status==='COMPLETED'?'success':a.status==='FAILED'?'danger':'neutral'}>{a.actionKey}: {a.status}</Badge>)}
          </div>
          <Badge tone={tone(run.status)}>{run.status}</Badge>
        </article>)}
      </div>
    </Card>:null}
  </div>;
}
