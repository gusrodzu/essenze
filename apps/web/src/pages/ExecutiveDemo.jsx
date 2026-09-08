import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AlertTriangle,ArrowRight,BrainCircuit,Building2,CheckCircle2,
  CircleDollarSign,ClipboardCheck,HeartPulse,PackageCheck,
  RefreshCw,ShoppingCart,Sparkles,UsersRound,WalletCards,XCircle
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './ExecutiveDemo.module.css';

const money=(value,currency='MXN')=>
  new Intl.NumberFormat('es-MX',{
    style:'currency',currency,maximumFractionDigits:0
  }).format(Number(value||0));

const healthLabel={
  HEALTHY:'Saludable',
  WATCH:'En observación',
  RISK:'En riesgo',
  CRITICAL:'Crítico'
};

const healthTone={
  HEALTHY:'success',
  WATCH:'warning',
  RISK:'warning',
  CRITICAL:'danger'
};

const priorityTone={
  HIGH:'danger',
  MEDIUM:'warning',
  LOW:'neutral'
};

export default function ExecutiveDemo(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [briefing,setBriefing]=useState(null);
  const [readiness,setReadiness]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      const [demo,ready]=await Promise.all([
        apiRequest('/reports/demo'),
        apiRequest('/reports/demo-readiness')
      ]);
      setData(demo);
      setReadiness(ready);
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const askAI=async()=>{
    setAiLoading(true);
    try{
      const response=await apiRequest('/ai/ask',{
        method:'POST',
        body:{
          context:'executive',
          route:'/reportes/demo',
          question:'Dame un briefing ejecutivo de la empresa: qué está funcionando, qué requiere atención y cuáles son las tres prioridades operativas más importantes con base únicamente en los datos disponibles.'
        }
      });
      setBriefing(response);
    }catch(err){
      setBriefing({error:err.message});
    }finally{
      setAiLoading(false);
    }
  };

  const currency=data?.company?.currency||'MXN';

  const healthCategories=useMemo(()=>{
    const categories=data?.health?.categories||{};
    return [
      ['Comercial',categories.comercial||0],
      ['Operaciones',categories.operaciones||0],
      ['Finanzas',categories.finanzas||0],
      ['Plataforma',categories.plataforma||0]
    ];
  },[data]);

  if(loading){
    return <div className={styles.page}><Card className={styles.loading}>Preparando vista ejecutiva…</Card></div>;
  }

  if(error){
    return <div className={styles.page}><Card className={styles.loading}><strong>No fue posible cargar la demo ejecutiva</strong><p>{error}</p><Button onClick={load}>Reintentar</Button></Card></div>;
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>ERP Cliente · Demo comercial</span>
        <h1>Vista ejecutiva de {data.company?.name}</h1>
        <p>Operación, personas, finanzas e inteligencia conectadas en una sola historia de negocio.</p>
      </div>
      <div className={styles.actions}>
        <Badge tone={readiness?.ok?'success':'warning'}>
          Demo Readiness {readiness?.score??0}%
        </Badge>
        <Badge tone={healthTone[data.health?.level]||'neutral'}>
          Health Score {data.health?.score||0}/100 · {healthLabel[data.health?.level]||data.health?.level}
        </Badge>
        <Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button>
        <Button onClick={askAI} disabled={aiLoading}><Sparkles size={16}/> {aiLoading?'Analizando…':'Briefing con BuzzBee AI'}</Button>
      </div>
    </header>

    <KpiGrid>
      <KpiCard>
        <HeartPulse/>
        <span>Business Health Score</span>
        <KpiInfo title="Business Health Score">Indicador compuesto de comercial, operaciones, finanzas y plataforma.</KpiInfo>
        <strong>{data.health?.score||0}/100</strong>
        <small>{healthLabel[data.health?.level]||data.health?.level}</small>
      </KpiCard>

      <KpiCard>
        <ShoppingCart/>
        <span>Compras 30 días</span>
        <KpiInfo title="Compras 30 días">Importe de órdenes de compra registradas durante los últimos 30 días.</KpiInfo>
        <strong>{money(data.summary?.purchases30d,currency)}</strong>
        <small>{data.purchasePipeline?.pendingApprovals||0} aprobación(es) pendientes</small>
      </KpiCard>

      <KpiCard>
        <WalletCards/>
        <span>Saldo operativo</span>
        <KpiInfo title="Saldo operativo">Cuentas por cobrar menos cuentas por pagar abiertas.</KpiInfo>
        <strong>{money((data.summary?.receivableBalance||0)-(data.summary?.payableBalance||0),currency)}</strong>
        <small>CxC {money(data.summary?.receivableBalance,currency)} · CxP {money(data.summary?.payableBalance,currency)}</small>
      </KpiCard>

      <KpiCard>
        <UsersRound/>
        <span>Equipo activo</span>
        <KpiInfo title="Equipo activo">Empleados activos y nivel de asistencia registrado hoy.</KpiInfo>
        <strong>{data.summary?.activeEmployees||0}</strong>
        <small>{data.summary?.attendanceRate||0}% asistencia hoy</small>
      </KpiCard>
    </KpiGrid>

    <section className={styles.storySection}>
      <div className={styles.sectionHead}>
        <div>
          <span>Historia de la demo</span>
          <h2>Del requerimiento a la decisión ejecutiva</h2>
          <p>Cada etapa está enlazada a un módulo real del ERP.</p>
        </div>
        <Badge tone="success">Flujo conectado</Badge>
      </div>

      <div className={styles.story}>
        {data.demoStory?.map((item,index)=><div className={styles.storyItem} key={item.step}>
          <Link to={item.to}>
            <i>{item.step}</i>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Link>
          {index<data.demoStory.length-1?<ArrowRight className={styles.storyArrow}/>:null}
        </div>)}
      </div>
    </section>

    <div className={styles.mainGrid}>
      <Card className={styles.healthCard}>
        <div className={styles.cardHead}>
          <div><h2>Salud del negocio</h2><p>Las cuatro dimensiones del Business Health Score.</p></div>
          <HeartPulse/>
        </div>
        <div className={styles.healthScore}>
          <div className={styles.scoreRing}>
            <strong>{data.health?.score||0}</strong>
            <span>/100</span>
          </div>
          <div className={styles.healthBars}>
            {healthCategories.map(([label,value])=><div key={label}>
              <header><span>{label}</span><strong>{Math.round(value)}%</strong></header>
              <div><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>
            </div>)}
          </div>
        </div>
      </Card>

      <Card className={styles.attentionCard}>
        <div className={styles.cardHead}>
          <div><h2>Requiere atención</h2><p>Prioridades derivadas de la operación actual.</p></div>
          <AlertTriangle/>
        </div>
        <div className={styles.attentionList}>
          {data.actionItems?.length?data.actionItems.map((item,index)=><Link to={item.to} key={`${item.title}-${index}`}>
            <Badge tone={priorityTone[item.priority]||'neutral'}>{item.priority}</Badge>
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
            <ArrowRight size={17}/>
          </Link>):<div className={styles.empty}><CheckCircle2/><strong>Sin alertas operativas prioritarias</strong><p>La operación no presenta pendientes críticos en esta vista.</p></div>}
        </div>
      </Card>
    </div>

    <div className={styles.financeGrid}>
      <Card className={styles.metricPanel}>
        <header><CircleDollarSign/><div><span>Finanzas</span><h2>Posición administrativa</h2></div></header>
        <div className={styles.metricRows}>
          <div><span>Por cobrar</span><strong>{money(data.summary?.receivableBalance,currency)}</strong></div>
          <div><span>Por pagar</span><strong>{money(data.summary?.payableBalance,currency)}</strong></div>
          <div><span>Cartera vencida</span><strong>{money(data.summary?.overdueReceivables,currency)}</strong></div>
          <div><span>Proveedores vencidos</span><strong>{money(data.summary?.overduePayables,currency)}</strong></div>
        </div>
      </Card>

      <Card className={styles.metricPanel}>
        <header><PackageCheck/><div><span>Operaciones</span><h2>Compras e inventario</h2></div></header>
        <div className={styles.metricRows}>
          <div><span>SOLPED pendientes</span><strong>{data.purchasePipeline?.pendingRequests||0}</strong></div>
          <div><span>Aprobaciones</span><strong>{data.purchasePipeline?.pendingApprovals||0}</strong></div>
          <div><span>OC en proceso</span><strong>{(data.purchasePipeline?.issuedOrders||0)+(data.purchasePipeline?.partialOrders||0)}</strong></div>
          <div><span>Stock crítico</span><strong>{data.summary?.lowStock||0}</strong></div>
        </div>
      </Card>

      <Card className={styles.metricPanel}>
        <header><Building2/><div><span>Personas</span><h2>RR. HH.</h2></div></header>
        <div className={styles.metricRows}>
          <div><span>Empleados activos</span><strong>{data.summary?.activeEmployees||0}</strong></div>
          <div><span>Asistencia hoy</span><strong>{data.summary?.attendanceRate||0}%</strong></div>
          <div><span>Permisos pendientes</span><strong>{data.summary?.pendingLeaves||0}</strong></div>
          <div><span>Incidencias del mes</span><strong>{data.summary?.incidentsMonth||0}</strong></div>
        </div>
      </Card>
    </div>

    <div className={styles.bottomGrid}>
      <Card className={styles.insightsCard}>
        <div className={styles.cardHead}>
          <div><h2>Inteligencia</h2><p>Hallazgos abiertos detectados por BuzzBee.</p></div>
          <BrainCircuit/>
        </div>
        <div className={styles.insightList}>
          {data.insights?.length?data.insights.map(item=><div key={item.id}>
            <div>
              <Badge tone={item.severity==='CRITICAL'?'danger':item.severity==='HIGH'?'warning':'neutral'}>{item.severity}</Badge>
              <strong>{item.title}</strong>
            </div>
            <p>{item.message}</p>
            {item.recommendation?<small>{item.recommendation}</small>:null}
          </div>):<div className={styles.empty}><CheckCircle2/><strong>Sin insights abiertos</strong><p>Ejecuta un escaneo en Analytics & Forecast para actualizar recomendaciones.</p></div>}
        </div>
      </Card>

      <Card className={styles.readinessCard}>
        <div className={styles.cardHead}>
          <div><h2>Preparación de la demo</h2><p>Capacidades clave que ya forman la historia comercial.</p></div>
          <ClipboardCheck/>
        </div>
        <div className={styles.readiness}>
          {readiness?.checks?.map(item=><div key={item.label}>
            {item.ready?<CheckCircle2 className={styles.ready}/>:<XCircle className={styles.notReady}/>}
            <div><strong>{item.label}</strong><p>{item.count} registro(s) disponibles para demo.</p></div>
          </div>)}
          {data.readiness?.map(item=><div key={item.key}>
            {item.ready?<CheckCircle2 className={styles.ready}/>:<XCircle className={styles.notReady}/>}
            <div><strong>{item.label}</strong><p>{item.detail}</p></div>
          </div>)}
        </div>
      </Card>
    </div>

    {briefing?<Card className={styles.aiBriefing}>
      <header>
        <div><Sparkles/><div><span>BuzzBee AI</span><h2>Briefing ejecutivo</h2></div></div>
        <Badge tone="info">{briefing.provider||'ERP DATA'} · Solo lectura</Badge>
      </header>
      {briefing.error?<p className={styles.aiError}>{briefing.error}</p>:<>
        <div className={styles.aiAnswer}>{briefing.answer}</div>
        <footer>
          <span>{briefing.sources?.length||0} fuente(s) ERP consultadas</span>
          <Link to="/inteligencia">Abrir BuzzBee AI <ArrowRight size={15}/></Link>
        </footer>
      </>}
    </Card>:null}
  </div>;
}
