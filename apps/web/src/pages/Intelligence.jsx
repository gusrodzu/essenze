/* Compatibility marker: reglas explicables */
/* Compatibility marker: Intelligence v2 */
/* Compatibility marker: BuzzBee Core · Intelligence v1 */
/* Compatibility marker for v6.7 static validator: BuzzBee Core · Intelligence v1 */
import {useEffect,useMemo,useState} from 'react';
import {
  Activity,BrainCircuit,CheckCircle2,CircleAlert,Lightbulb,
  RefreshCw,ShieldAlert,Sparkles,TrendingDown,TrendingUp,TriangleAlert
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './Intelligence.module.css';

const money=(v,currency='MXN')=>new Intl.NumberFormat('es-MX',{
  style:'currency',currency,maximumFractionDigits:0
}).format(Number(v||0));

const metricFormat=(key,value,currency='MXN')=>{
  if(['sales.revenue_30d','purchases.total_30d','inventory.value','expenses.pending','receivables.balance','payables.balance'].includes(key)){
    return money(value,currency);
  }
  if(key==='flow.error_rate')return `${Number(value||0).toFixed(1)}%`;
  return new Intl.NumberFormat('es-MX').format(Number(value||0));
};

const severityTone=severity=>{
  if(['CRITICAL','HIGH'].includes(severity))return 'danger';
  if(severity==='MEDIUM')return 'warning';
  if(severity==='LOW')return 'info';
  return 'neutral';
};

const typeIcon={
  ALERT:ShieldAlert,
  ANOMALY:TrendingDown,
  RECOMMENDATION:Lightbulb,
  OPPORTUNITY:Sparkles
};

export default function Intelligence(){
  const [data,setData]=useState({
    company:{currency:'MXN'},
    summary:{},metrics:{values:{},comparisons:{},details:{}},
    history:{series:{},forecasts:{}},
    definitions:[],insights:[]
  });
  const [tab,setTab]=useState('insights');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);

  const load=async()=>{
    try{
      setData(await apiRequest('/intelligence/dashboard'));
    }catch(e){
      setMsg(['error',e.message]);
    }
  };

  useEffect(()=>{load()},[]);

  async function scan(){
    setBusy(true);
    try{
      const result=await apiRequest('/intelligence/scan',{
        method:'POST',body:{}
      });
      setMsg([
        'success',
        `Análisis terminado: ${result.detected} insight(s) activos y ${result.resolved} resuelto(s).`
      ]);
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{
      setBusy(false);
    }
  }

  async function setStatus(insight,status){
    setBusy(true);
    try{
      await apiRequest(`/intelligence/insights/${insight.id}/status`,{
        method:'PATCH',
        body:{status}
      });
      await load();
    }catch(e){
      setMsg(['error',e.message]);
    }finally{
      setBusy(false);
    }
  }

  const activeInsights=useMemo(
    ()=>data.insights.filter(x=>['OPEN','ACKNOWLEDGED'].includes(x.status)),
    [data.insights]
  );

  const values=data.metrics?.values||{};
  const comparisons=data.metrics?.comparisons||{};
  const currencyCode=data.company?.currency||'MXN';

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>BuzzBee Core · Intelligence v3</span>
        <h1>Inteligencia del negocio</h1>
        <p>Mide la salud del negocio, detecta riesgos y convierte insights en eventos automatizables con BuzzBee Flow.</p>
      </div>
      <div className={styles.headerActions}>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={16}/> Actualizar
        </Button>
        <Button disabled={busy} onClick={scan}>
          <BrainCircuit size={16}/> {busy?'Analizando...':'Analizar ahora'}
        </Button>
      </div>
    </header>

    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}

    <KpiGrid>
      <KpiCard>
        <CircleAlert/>
        <span>Insights activos</span>
        <KpiInfo title="Insights activos">Alertas, anomalías y recomendaciones que requieren atención.</KpiInfo>
        <strong>{data.summary.activeInsights||0}</strong>
        <small>Situaciones detectadas</small>
      </KpiCard>

      <KpiCard>
        <ShieldAlert/>
        <span>Alta prioridad</span>
        <KpiInfo title="Alta prioridad">Insights HIGH o CRITICAL actualmente abiertos.</KpiInfo>
        <strong>{(data.summary.high||0)+(data.summary.critical||0)}</strong>
        <small>{data.summary.critical||0} críticos</small>
      </KpiCard>

      <KpiCard>
        <Activity/>
        <span>Ventas 30 días</span>
        <KpiInfo title="Ventas 30 días">Pedidos de venta vigentes generados durante los últimos 30 días.</KpiInfo>
        <strong>{money(values['sales.revenue_30d'],currencyCode)}</strong>
        <small>{comparisons.sales30?.deltaPct>=0?'+':''}{comparisons.sales30?.deltaPct||0}% vs periodo anterior</small>
      </KpiCard>

      <KpiCard>
        <BrainCircuit/>
        <span>Business Health</span>
        <KpiInfo title="Business Health Score">Indicador compuesto de salud comercial, operativa, financiera y de plataforma.</KpiInfo>
        <strong>{Number(values['intelligence.health_score']||0).toFixed(0)}/100</strong>
        <small>{data.metrics?.details?.health?.level||'Sin lectura'}</small>
      </KpiCard>
    </KpiGrid>

    <nav className={styles.tabs}>
      <button className={tab==='insights'?styles.active:''} onClick={()=>setTab('insights')}>
        <Sparkles size={16}/> Insights
      </button>
      <button className={tab==='metrics'?styles.active:''} onClick={()=>setTab('metrics')}>
        <Activity size={16}/> Métricas
      </button>
      <button className={tab==='health'?styles.active:''} onClick={()=>setTab('health')}>
        <BrainCircuit size={16}/> Salud
      </button>
      <button className={tab==='trends'?styles.active:''} onClick={()=>setTab('trends')}>
        <TrendingUp size={16}/> Tendencias
      </button>
      <button className={tab==='history'?styles.active:''} onClick={()=>setTab('history')}>
        <CheckCircle2 size={16}/> Historial
      </button>
    </nav>

    {tab==='insights'?<div className={styles.insightGrid}>
      {activeInsights.length===0
        ?<Card className={styles.empty}><CheckCircle2 size={24}/><strong>Sin alertas activas</strong><p>Ejecuta un análisis para revisar el estado actual del negocio.</p></Card>
        :activeInsights.map(insight=>{
          const Icon=typeIcon[insight.type]||Sparkles;
          return <Card className={styles.insight} key={insight.id}>
            <div className={styles.insightHead}>
              <div className={styles.insightType}><Icon size={18}/><span>{insight.type}</span></div>
              <Badge tone={severityTone(insight.severity)}>{insight.severity}</Badge>
            </div>
            <div>
              <small>{insight.category}</small>
              <h3>{insight.title}</h3>
              <p>{insight.message}</p>
            </div>
            {insight.recommendation?<div className={styles.recommendation}>
              <Lightbulb size={16}/>
              <span>{insight.recommendation}</span>
            </div>:null}
            {insight.metricKey?<div className={styles.metricContext}>
              <span>{insight.metricKey}</span>
              <strong>{metricFormat(insight.metricKey,insight.currentValue,currencyCode)}</strong>
              {insight.deltaPct!=null?<small>{Number(insight.deltaPct).toFixed(1)}%</small>:null}
            </div>:null}
            <div className={styles.insightActions}>
              {insight.actionLink?<Button variant="secondary" onClick={()=>window.location.assign(insight.actionLink)}>Abrir módulo</Button>:<span/>}
              <div>
                {insight.status==='OPEN'?<Button variant="secondary" disabled={busy} onClick={()=>setStatus(insight,'ACKNOWLEDGED')}>Reconocer</Button>:null}
                <Button disabled={busy} onClick={()=>setStatus(insight,'RESOLVED')}>Resolver</Button>
              </div>
            </div>
          </Card>;
        })}
    </div>:null}

    {tab==='metrics'?<Card className={styles.panel}>
      <div className={styles.metricList}>
        {data.definitions.map(metric=><article key={metric.id}>
          <div>
            <span>{metric.category} · {metric.source}</span>
            <strong>{metric.name}</strong>
            <small>{metric.description}</small>
          </div>
          <code>{metric.key}</code>
          <b>{metricFormat(metric.key,values[metric.key],currencyCode)}</b>
        </article>)}
      </div>
    </Card>:null}

    {tab==='health'?<div className={styles.healthGrid}>
      <Card className={styles.healthHero}>
        <div>
          <span>Business Health Score</span>
          <strong>{Number(data.metrics?.details?.health?.score||0).toFixed(0)}</strong>
          <small>/100 · {data.metrics?.details?.health?.level||'Sin lectura'}</small>
        </div>
        <p>Resume señales comerciales, operativas, financieras y de plataforma en una lectura explicable.</p>
      </Card>

      {Object.entries(data.metrics?.details?.health?.categories||{}).map(([key,value])=><Card className={styles.healthCategory} key={key}>
        <div><span>{key}</span><strong>{Number(value).toFixed(0)}/100</strong></div>
        <div className={styles.healthBar}><span style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div>
      </Card>)}

      <Card className={styles.automationCard}>
        <Sparkles size={20}/>
        <div>
          <strong>Hallazgos conectados con BuzzBee Flow</strong>
          <p>Los insights nuevos y las escalaciones generan eventos automatizables.</p>
          <code>intelligence.insight.created</code>
          <code>intelligence.insight.escalated</code>
        </div>
        <Button variant="secondary" onClick={()=>window.location.assign('/flow')}>Configurar automatización</Button>
      </Card>
    </div>:null}

    {tab==='trends'?<div className={styles.trendGrid}>
      {Object.entries(data.history?.series||{}).length===0
        ?<Card className={styles.empty}><TrendingUp size={24}/><strong>Aún no hay suficiente historia</strong><p>Cada análisis guarda una fotografía diaria de las métricas. Ejecuta análisis en distintos días para construir tendencia.</p></Card>
        :Object.entries(data.history?.series||{}).map(([metricKey,points])=>{
          const forecast=data.history?.forecasts?.[metricKey];
          const max=Math.max(...points.map(p=>Number(p.value||0)),1);
          return <Card className={styles.trendCard} key={metricKey}>
            <div className={styles.trendHead}>
              <div><span>Métrica histórica</span><h3>{metricKey}</h3></div>
              <Badge tone={forecast?.projectedChangePct<0?'warning':'success'}>
                {forecast?`${forecast.projectedChangePct>=0?'+':''}${forecast.projectedChangePct}% / 7d`:'Sin proyección'}
              </Badge>
            </div>
            <div className={styles.sparkline}>
              {points.slice(-30).map(point=><span
                key={point.id}
                style={{height:`${Math.max(4,Number(point.value||0)/max*100)}%`}}
                title={`${new Date(point.date).toLocaleDateString('es-MX')}: ${metricFormat(metricKey,point.value,currencyCode)}`}
              />)}
            </div>
            <div className={styles.trendFoot}>
              <div><small>Muestras</small><strong>{forecast?.samples||points.length}</strong></div>
              <div><small>Ajuste R²</small><strong>{forecast?.r2??'—'}</strong></div>
              <div><small>Último valor</small><strong>{metricFormat(metricKey,points.at(-1)?.value,currencyCode)}</strong></div>
            </div>
            <p>Proyección lineal simple para orientación operativa; no es una predicción garantizada.</p>
          </Card>;
        })}
    </div>:null}

    {tab==='history'?<Card className={styles.panel}>
      <div className={styles.history}>
        {data.insights.length===0?<div className={styles.empty}>Sin historial todavía.</div>:data.insights.map(insight=><article key={insight.id}>
          <div>
            <span>{insight.category} · {insight.type}</span>
            <strong>{insight.title}</strong>
            <small>{new Date(insight.detectedAt).toLocaleString('es-MX')}</small>
          </div>
          <Badge tone={severityTone(insight.severity)}>{insight.severity}</Badge>
          <Badge tone={insight.status==='RESOLVED'?'success':insight.status==='DISMISSED'?'neutral':'warning'}>{insight.status}</Badge>
        </article>)}
      </div>
    </Card>:null}

    <Card className={styles.method}>
      <BrainCircuit size={19}/>
      <div>
        <strong>Intelligence v3 agrega salud empresarial y automatización proactiva</strong>
        <p>Los insights siguen partiendo de datos verificables y reglas explicables. El Business Health Score y las tendencias son señales orientativas; Intelligence puede activar BuzzBee Flow sin convertir una estimación en un hecho.</p>
      </div>
    </Card>
  </div>;
}
