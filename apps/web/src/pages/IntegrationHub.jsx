import {useEffect,useState} from 'react';
import {
  Activity,Braces,CheckCircle2,Copy,KeyRound,Link2,ListRestart,PlugZap,
  RefreshCw,RotateCw,Send,ShieldCheck,Webhook
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './IntegrationHub.module.css';

const SCOPES=[
  'customers.read','customers.write',
  'products.read','products.write',
  'inventory.read',
  'sales.read','sales.write',
  'purchases.read','purchases.write',
  'reports.read',
  'webhooks.trigger'
];

const tone=status=>{
  if(['ACTIVE','SUCCESS'].includes(status))return 'success';
  if(['ERROR','FAILED','REVOKED'].includes(status))return 'danger';
  return 'neutral';
};

export default function IntegrationHub(){
  const [dashboard,setDashboard]=useState({
    summary:{},connections:[],apiKeys:[],webhooks:[],deliveries:[]
  });
  const [catalog,setCatalog]=useState({providers:[],events:[]});
  const [tab,setTab]=useState('connections');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);
  const [secret,setSecret]=useState(null);

  const [connection,setConnection]=useState({
    name:'',provider:'GENERIC',baseUrl:'',description:''
  });
  const [keyForm,setKeyForm]=useState({
    name:'Integración externa',scopes:['customers.read','products.read']
  });
  const [webhookForm,setWebhookForm]=useState({
    name:'',url:'',events:['customer.created']
  });

  const load=async()=>{
    try{
      const [d,c]=await Promise.all([
        apiRequest('/integrations/dashboard'),
        apiRequest('/integrations/catalog')
      ]);
      setDashboard(d);
      setCatalog(c);
    }catch(e){
      setMsg(['error',e.message]);
    }
  };

  useEffect(()=>{load()},[]);

  async function createConnection(e){
    e.preventDefault();
    setBusy(true);
    try{
      await apiRequest('/integrations/connections',{
        method:'POST',
        body:connection
      });
      setConnection({name:'',provider:'GENERIC',baseUrl:'',description:''});
      setMsg(['success','Conexión registrada.']);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{setBusy(false)}
  }

  async function toggleConnection(row){
    setBusy(true);
    try{
      await apiRequest(`/integrations/connections/${row.id}`,{
        method:'PATCH',
        body:{status:row.status==='ACTIVE'?'DISABLED':'ACTIVE'}
      });
      await load();
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  async function createKey(e){
    e.preventDefault();
    setBusy(true);
    try{
      const result=await apiRequest('/integrations/api-keys',{
        method:'POST',
        body:keyForm
      });
      setSecret({
        title:'Nueva API Key',
        value:result.secret,
        message:result.warning
      });
      setMsg(['success','API Key creada.']);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{setBusy(false)}
  }

  async function revokeKey(row){
    if(!window.confirm(`¿Revocar la API Key "${row.name}"? Esta acción no se puede deshacer.`))return;
    setBusy(true);
    try{
      await apiRequest(`/integrations/api-keys/${row.id}/revoke`,{
        method:'POST',body:{}
      });
      setMsg(['success','API Key revocada.']);
      await load();
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  async function createWebhook(e){
    e.preventDefault();
    setBusy(true);
    try{
      const result=await apiRequest('/integrations/webhooks',{
        method:'POST',
        body:webhookForm
      });
      setSecret({
        title:'Signing secret del webhook',
        value:result.signingSecret,
        message:result.warning
      });
      setWebhookForm({name:'',url:'',events:['customer.created']});
      setMsg(['success','Webhook creado.']);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{setBusy(false)}
  }

  async function testWebhook(row){
    setBusy(true);
    try{
      const result=await apiRequest(`/integrations/webhooks/${row.id}/test`,{
        method:'POST',body:{}
      });
      setMsg([
        result.ok?'success':'error',
        result.ok
          ?`Entrega correcta · HTTP ${result.result.statusCode} · ${result.result.durationMs} ms`
          :(result.result?.error||'La prueba falló.')
      ]);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
      await load();
    }finally{setBusy(false)}
  }

  async function rotateSecret(row){
    if(!window.confirm(`¿Rotar el signing secret de "${row.name}"? El anterior dejará de ser válido.`))return;
    setBusy(true);
    try{
      const result=await apiRequest(`/integrations/webhooks/${row.id}/rotate-secret`,{
        method:'POST',body:{}
      });
      setSecret({
        title:'Nuevo signing secret',
        value:result.signingSecret,
        message:result.warning
      });
    }catch(e){setMsg(['error',e.message])}
    finally{setBusy(false)}
  }

  async function processQueue(){
    setBusy(true);
    try{
      const result=await apiRequest('/integrations/queue/process',{
        method:'POST',
        body:{limit:50}
      });
      setMsg([
        'success',
        `Worker ejecutado: ${result.result.processed} procesadas, ${result.result.succeeded} exitosas.`
      ]);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{
      setBusy(false);
    }
  }

  async function retryDeadLetter(job){
    setBusy(true);
    try{
      await apiRequest(`/integrations/queue/${job.id}/retry`,{
        method:'POST',
        body:{}
      });
      setMsg(['success','Entrega enviada nuevamente a la cola.']);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{
      setBusy(false);
    }
  }

  async function copySecret(){
    try{
      await navigator.clipboard.writeText(secret.value);
      setMsg(['success','Secreto copiado al portapapeles.']);
    }catch{
      setMsg(['error','No fue posible copiar automáticamente. Selecciona el texto manualmente.']);
    }
  }

  function toggleScope(scope){
    setKeyForm(current=>({
      ...current,
      scopes:current.scopes.includes(scope)
        ?current.scopes.filter(x=>x!==scope)
        :[...current.scopes,scope]
    }));
  }

  function toggleEvent(event){
    setWebhookForm(current=>({
      ...current,
      events:current.events.includes(event)
        ?current.events.filter(x=>x!==event)
        :[...current.events,event]
    }));
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>BuzzBee Core · Centro de integraciones v3</span>
        <h1>Integraciones y APIs</h1>
        <p>Event Bus durable, reintentos automáticos y Dead Letter Queue para integrar BuzzBee incluso cuando los servicios externos fallan.</p>
      </div>
      <Button variant="secondary" onClick={load}>
        <RefreshCw size={16}/> Actualizar
      </Button>
    </header>

    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}

    {secret?<Card className={styles.secret}>
      <div>
        <ShieldCheck size={22}/>
        <div>
          <span>{secret.title}</span>
          <code>{secret.value}</code>
          <small>{secret.message}</small>
        </div>
      </div>
      <div className={styles.secretActions}>
        <Button variant="secondary" onClick={copySecret}>
          <Copy size={15}/> Copiar
        </Button>
        <Button onClick={()=>setSecret(null)}>Ya la guardé</Button>
      </div>
    </Card>:null}

    <KpiGrid>
      <KpiCard>
        <PlugZap/><span>Conexiones activas</span>
        <KpiInfo title="Conexiones activas">Sistemas externos registrados como conexiones operativas.</KpiInfo>
        <strong>{dashboard.summary.connections||0}</strong>
        <small>Ecosistema conectado</small>
      </KpiCard>

      <KpiCard>
        <KeyRound/><span>API Keys activas</span>
        <KpiInfo title="API Keys activas">Credenciales vigentes emitidas para integraciones externas.</KpiInfo>
        <strong>{dashboard.summary.activeKeys||0}</strong>
        <small>Acceso programático</small>
      </KpiCard>

      <KpiCard>
        <Webhook/><span>Webhooks activos</span>
        <KpiInfo title="Webhooks activos">Endpoints configurados para recibir eventos de BuzzBee.</KpiInfo>
        <strong>{dashboard.summary.activeWebhooks||0}</strong>
        <small>Automatización saliente</small>
      </KpiCard>

      <KpiCard>
        <CheckCircle2/><span>Éxito de entregas</span>
        <KpiInfo title="Éxito de entregas">Porcentaje histórico de entregas de webhook exitosas.</KpiInfo>
        <strong>{dashboard.summary.successRate??100}%</strong>
        <small>{dashboard.summary.deadLetters||0} en DLQ · {dashboard.summary.queueReady||0} en cola</small>
      </KpiCard>
    </KpiGrid>

    <div className={styles.tabs}>
      {[
        ['connections','Conexiones'],
        ['keys','API Keys'],
        ['webhooks','Webhooks'],
        ['events','Event Bus'],
        ['queue','Cola / DLQ'],
        ['api','API'],
        ['logs','Webhooks']
      ].map(([key,label])=>
        <button key={key} className={tab===key?styles.active:''} onClick={()=>setTab(key)}>
          {label}
        </button>
      )}
    </div>

    {tab==='connections'?<div className={styles.twoCol}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span>Directorio</span><h2>Sistemas conectados</h2></div>
        </div>
        <div className={styles.list}>
          {dashboard.connections.length===0
            ?<div className={styles.empty}>Aún no hay conexiones registradas.</div>
            :dashboard.connections.map(row=><article key={row.id}>
              <div className={styles.itemIcon}><Link2 size={18}/></div>
              <div className={styles.itemMain}>
                <span>{row.provider}</span>
                <strong>{row.name}</strong>
                <small>{row.baseUrl||row.description||'Sin URL configurada'}</small>
              </div>
              <Badge tone={tone(row.status)}>{row.status}</Badge>
              <Button variant="secondary" disabled={busy} onClick={()=>toggleConnection(row)}>
                {row.status==='ACTIVE'?'Desactivar':'Activar'}
              </Button>
            </article>)}
        </div>
      </Card>

      <Card className={styles.formCard}>
        <div className={styles.panelHead}>
          <div><span>Nueva conexión</span><h2>Registrar sistema</h2></div>
        </div>
        <form onSubmit={createConnection} className={styles.form}>
          <label>Nombre<input value={connection.name} onChange={e=>setConnection({...connection,name:e.target.value})} placeholder="Shopify México"/></label>
          <label>Proveedor<select value={connection.provider} onChange={e=>setConnection({...connection,provider:e.target.value})}>
            {(catalog.providers||[]).map(x=><option value={x.key} key={x.key}>{x.label}</option>)}
          </select></label>
          <label>URL base<input value={connection.baseUrl} onChange={e=>setConnection({...connection,baseUrl:e.target.value})} placeholder="https://api.ejemplo.com"/></label>
          <label>Descripción<textarea value={connection.description} onChange={e=>setConnection({...connection,description:e.target.value})} placeholder="Propósito de la integración"/></label>
          <Button disabled={busy}>Registrar conexión</Button>
        </form>
      </Card>
    </div>:null}

    {tab==='keys'?<div className={styles.twoCol}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span>Credenciales</span><h2>API Keys</h2></div>
        </div>
        <div className={styles.list}>
          {dashboard.apiKeys.length===0
            ?<div className={styles.empty}>No hay API Keys emitidas.</div>
            :dashboard.apiKeys.map(row=><article key={row.id}>
              <div className={styles.itemIcon}><KeyRound size={18}/></div>
              <div className={styles.itemMain}>
                <span>{row.prefix}.••••{row.last4}</span>
                <strong>{row.name}</strong>
                <small>{Array.isArray(row.scopes)?row.scopes.join(' · '):'Sin scopes'}</small>
              </div>
              <Badge tone={tone(row.status)}>{row.status}</Badge>
              {row.status==='ACTIVE'
                ?<Button variant="secondary" disabled={busy} onClick={()=>revokeKey(row)}>Revocar</Button>
                :<span/>}
            </article>)}
        </div>
      </Card>

      <Card className={styles.formCard}>
        <div className={styles.panelHead}>
          <div><span>Nueva credencial</span><h2>Emitir API Key</h2></div>
        </div>
        <form onSubmit={createKey} className={styles.form}>
          <label>Nombre<input value={keyForm.name} onChange={e=>setKeyForm({...keyForm,name:e.target.value})}/></label>
          <div className={styles.checks}>
            <span>Scopes</span>
            {SCOPES.map(scope=><label key={scope}>
              <input type="checkbox" checked={keyForm.scopes.includes(scope)} onChange={()=>toggleScope(scope)}/>
              <code>{scope}</code>
            </label>)}
          </div>
          <Button disabled={busy||keyForm.scopes.length===0}>Crear API Key</Button>
        </form>
      </Card>
    </div>:null}

    {tab==='webhooks'?<div className={styles.twoCol}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span>Eventos</span><h2>Webhooks</h2></div>
        </div>
        <div className={styles.list}>
          {dashboard.webhooks.length===0
            ?<div className={styles.empty}>No hay webhooks configurados.</div>
            :dashboard.webhooks.map(row=><article key={row.id} className={styles.webhookRow}>
              <div className={styles.itemIcon}><Webhook size={18}/></div>
              <div className={styles.itemMain}>
                <span>{Array.isArray(row.events)?row.events.join(' · '):''}</span>
                <strong>{row.name}</strong>
                <small>{row.url}</small>
                {row.lastError?<small className={styles.errorText}>{row.lastError}</small>:null}
              </div>
              <Badge tone={row.active?'success':'neutral'}>{row.active?'ACTIVO':'PAUSADO'}</Badge>
              <div className={styles.rowActions}>
                <Button variant="secondary" disabled={busy} onClick={()=>testWebhook(row)}>
                  <Send size={14}/> Probar
                </Button>
                <Button variant="secondary" disabled={busy} onClick={()=>rotateSecret(row)}>
                  <RotateCw size={14}/> Secreto
                </Button>
              </div>
            </article>)}
        </div>
      </Card>

      <Card className={styles.formCard}>
        <div className={styles.panelHead}>
          <div><span>Nuevo webhook</span><h2>Suscribir endpoint</h2></div>
        </div>
        <form onSubmit={createWebhook} className={styles.form}>
          <label>Nombre<input value={webhookForm.name} onChange={e=>setWebhookForm({...webhookForm,name:e.target.value})} placeholder="Automatización de clientes"/></label>
          <label>Endpoint URL<input value={webhookForm.url} onChange={e=>setWebhookForm({...webhookForm,url:e.target.value})} placeholder="https://hooks.ejemplo.com/buzzbee"/></label>
          <div className={styles.checks}>
            <span>Eventos</span>
            {(catalog.events||[]).map(event=><label key={event}>
              <input type="checkbox" checked={webhookForm.events.includes(event)} onChange={()=>toggleEvent(event)}/>
              <code>{event}</code>
            </label>)}
          </div>
          <Button disabled={busy||webhookForm.events.length===0}>Crear webhook</Button>
        </form>
      </Card>
    </div>:null}

    {tab==='events'?<Card className={styles.panel}>
      <div className={styles.panelHead}>
        <div><span>Event Bus</span><h2>Eventos de dominio</h2></div>
        <Activity size={20}/>
      </div>
      <div className={styles.logs}>
        {(dashboard.eventLogs||[]).length===0
          ?<div className={styles.empty}>Todavía no hay eventos de dominio registrados.</div>
          :(dashboard.eventLogs||[]).map(row=><article key={row.id}>
            <div><span>{row.event}</span><strong>{row.entityType||'Evento'}</strong><small>{row.entityId||row.id}</small></div>
            <div><b>{row.endpoints}</b><small>endpoints</small></div>
            <div><b>{row.delivered}</b><small>OK</small></div>
            <Badge tone={tone(row.status==='DISPATCHED'?'SUCCESS':row.status==='FAILED'?'FAILED':'NEUTRAL')}>{row.status}</Badge>
            <small>{new Date(row.createdAt).toLocaleString('es-MX')}</small>
          </article>)}
      </div>
    </Card>:null}

    {tab==='queue'?<Card className={styles.panel}>
      <div className={styles.panelHead}>
        <div><span>Entrega durable</span><h2>Cola y Dead Letter Queue</h2></div>
        <Button variant="secondary" disabled={busy} onClick={processQueue}>
          <ListRestart size={15}/> Procesar ahora
        </Button>
      </div>
      <div className={styles.queueHelp}>
        <p>BuzzBee reintenta automáticamente con backoff: 1 min → 5 min → 15 min → 60 min. Después del cuarto intento la entrega pasa a Dead Letter.</p>
      </div>
      <div className={styles.logs}>
        {(dashboard.queueJobs||[]).length===0
          ?<div className={styles.empty}>La cola está vacía.</div>
          :(dashboard.queueJobs||[]).map(row=><article key={row.id}>
            <div>
              <span>{row.event}</span>
              <strong>{row.webhook?.name||'Webhook'}</strong>
              <small>{row.lastError||row.requestId}</small>
            </div>
            <div><b>{row.attempt}/{row.maxAttempts}</b><small>intentos</small></div>
            <div><b>{row.status==='RETRY_WAIT'?new Date(row.nextAttemptAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}):'—'}</b><small>próximo</small></div>
            <Badge tone={row.status==='COMPLETED'?'success':row.status==='DEAD_LETTER'?'danger':row.status==='RETRY_WAIT'?'warning':'neutral'}>{row.status}</Badge>
            {row.status==='DEAD_LETTER'
              ?<Button variant="secondary" disabled={busy} onClick={()=>retryDeadLetter(row)}>Reintentar</Button>
              :<small>{new Date(row.createdAt).toLocaleString('es-MX')}</small>}
          </article>)}
      </div>
    </Card>:null}

    {tab==='api'?<Card className={styles.panel}>
      <div className={styles.panelHead}>
        <div><span>Public API v1</span><h2>Requests externos</h2></div>
        <Braces size={20}/>
      </div>
      <div className={styles.apiDocs}>
        <p>Base: <code>/api/public/v1</code>. Autentica con <code>Authorization: Bearer bb_live_...</code> o <code>x-api-key</code>.</p>
        <div className={styles.endpointGrid}>
          {[
            ['GET','/customers','customers.read'],
            ['POST','/customers','customers.write'],
            ['GET','/products','products.read'],
            ['POST','/products','products.write'],
            ['GET','/suppliers','purchases.read'],
            ['GET','/sales/orders','sales.read'],
            ['GET','/inventory/stock','inventory.read']
          ].map(([method,path,scope])=><article key={`${method}-${path}`}><b>{method}</b><code>{path}</code><span>{scope}</span></article>)}
        </div>
      </div>
      <div className={styles.logs}>
        {(dashboard.apiAccessLogs||[]).length===0
          ?<div className={styles.empty}>Todavía no hay requests autenticados con API Key.</div>
          :(dashboard.apiAccessLogs||[]).map(row=><article key={row.id}>
            <div><span>{row.method}</span><strong>{row.path}</strong><small>{row.credential?.name||'API Key'} · {row.scope||'—'}</small></div>
            <div><b>{row.statusCode}</b><small>HTTP</small></div>
            <div><b>{row.durationMs??'—'}</b><small>ms</small></div>
            <Badge tone={row.statusCode<400?'success':'danger'}>{row.statusCode<400?'OK':'ERROR'}</Badge>
            <small>{new Date(row.createdAt).toLocaleString('es-MX')}</small>
          </article>)}
      </div>
    </Card>:null}

    {tab==='logs'?<Card className={styles.panel}>
      <div className={styles.panelHead}>
        <div><span>Observabilidad</span><h2>Entregas recientes</h2></div>
        <Activity size={20}/>
      </div>
      <div className={styles.logs}>
        {dashboard.deliveries.length===0
          ?<div className={styles.empty}>Todavía no hay entregas de webhook.</div>
          :dashboard.deliveries.map(row=><article key={row.id}>
            <div>
              <span>{row.event}</span>
              <strong>{row.webhook?.name||'Webhook'}</strong>
              <small>{row.requestId}</small>
            </div>
            <div><b>{row.statusCode||'—'}</b><small>HTTP</small></div>
            <div><b>{row.durationMs??'—'}</b><small>ms</small></div>
            <Badge tone={tone(row.status)}>{row.status}</Badge>
            <small>{row.error||new Date(row.createdAt).toLocaleString('es-MX')}</small>
          </article>)}
      </div>
    </Card>:null}

    <Card className={styles.note}>
      <Braces size={18}/>
      <div>
        <strong>Firma de webhooks</strong>
        <p>BuzzBee envía <code>x-buzzbee-signature</code> con HMAC SHA-256 sobre <code>timestamp.payload</code>. En producción configura <code>INTEGRATION_ENCRYPTION_KEY</code>.</p>
      </div>
    </Card>
  </div>;
}
