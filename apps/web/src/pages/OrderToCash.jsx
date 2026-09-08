import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AlertTriangle,ArrowRight,BadgeDollarSign,ClipboardCheck,
  FileCheck2,PackageCheck,RefreshCw,ShoppingBag,WalletCards
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './OrderToCash.module.css';
import {ModuleHeader,AttentionPanel} from '../components/module-system';

const money=(value,currency='MXN')=>new Intl.NumberFormat('es-MX',{
  style:'currency',currency,maximumFractionDigits:0
}).format(Number(value||0));

const tone={HIGH:'danger',MEDIUM:'warning',LOW:'neutral'};

export default function OrderToCash(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      setData(await apiRequest('/order-to-cash/dashboard'));
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  if(loading){
    return <div className={styles.page}><Card className={styles.state}><RefreshCw className={styles.spin}/><strong>Preparando pedido a cobro…</strong></Card></div>;
  }

  if(error){
    return <div className={styles.page}><Card className={styles.state}><strong>No fue posible cargar Pedido a Cobro</strong><p>{error}</p><Button onClick={load}>Reintentar</Button></Card></div>;
  }

  const currency=data?.company?.currency||'MXN';

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Ventas · Ciclo comercial completo"
      title="Order-to-Cash"
      description="Cotización → pedido → entrega → factura → cuenta por cobrar → cobranza, en una sola vista."
      actions={<Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button>}
    />

    <KpiGrid>
      <KpiCard>
        <ShoppingBag/>
        <span>Pedidos activos</span>
        <KpiInfo title="Pedidos activos">Valor de pedidos en proceso comercial y operativo.</KpiInfo>
        <strong>{money(data.summary?.activeOrderValue,currency)}</strong>
        <small>{data.counts?.orders||0} pedido(s)</small>
      </KpiCard>

      <KpiCard>
        <WalletCards/>
        <span>Cartera abierta</span>
        <KpiInfo title="Cartera abierta">Saldo total pendiente de cobro.</KpiInfo>
        <strong>{money(data.summary?.receivableBalance,currency)}</strong>
        <small>{data.counts?.openReceivables||0} cuenta(s)</small>
      </KpiCard>

      <KpiCard>
        <AlertTriangle/>
        <span>Cartera vencida</span>
        <KpiInfo title="Cartera vencida">Saldo que ya superó su fecha de vencimiento.</KpiInfo>
        <strong>{money(data.summary?.overdueBalance,currency)}</strong>
        <small>{data.counts?.overdueReceivables||0} vencida(s)</small>
      </KpiCard>

      <KpiCard>
        <BadgeDollarSign/>
        <span>Cobrado este mes</span>
        <KpiInfo title="Cobrado este mes">Cobros aplicados durante el mes actual.</KpiInfo>
        <strong>{money(data.summary?.collectedMonth,currency)}</strong>
        <small>Conversión cotización {data.summary?.conversionRate||0}%</small>
      </KpiCard>
    </KpiGrid>

    <section className={styles.flowCard}>
      <div className={styles.sectionHead}>
        <div><span>Flujo operativo</span><h2>Del interés del cliente al dinero en banco</h2></div>
        <Badge tone="success">Ciclo conectado</Badge>
      </div>
      <div className={styles.flow}>
        {data.stages?.map((stage,index)=><div className={styles.stage} key={stage.key}>
          <Link to={stage.to}>
            <i>{index+1}</i>
            <span>{stage.label}</span>
            <strong>{stage.count}</strong>
            {stage.value!==null?<small>{money(stage.value,currency)}</small>:<small>registros</small>}
          </Link>
          {index<data.stages.length-1?<ArrowRight className={styles.arrow}/>:null}
        </div>)}
      </div>
    </section>

    <div className={styles.mainGrid}>
      <Card className={styles.attention}>
        <div className={styles.cardHead}>
          <div><h2>Requiere atención</h2><p>Cuellos de botella del ciclo comercial.</p></div>
          <AlertTriangle/>
        </div>
        <div className={styles.attentionList}>
          {data.attention?.length?data.attention.map(item=><Link to={item.to} key={item.key}>
            <Badge tone={tone[item.level]||'neutral'}>{item.level}</Badge>
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
            <ArrowRight size={17}/>
          </Link>):<div className={styles.empty}><strong>Flujo saludable</strong><p>No hay alertas prioritarias en Pedido a Cobro.</p></div>}
        </div>
      </Card>

      <Card className={styles.actionsCard}>
        <div className={styles.cardHead}>
          <div><h2>Acciones del ciclo</h2><p>Acceso rápido a cada etapa.</p></div>
          <ClipboardCheck/>
        </div>
        <div className={styles.actionGrid}>
          <Link to="/ventas"><ShoppingBag/><div><strong>Cotizaciones y pedidos</strong><p>Crear, confirmar y dar seguimiento.</p></div></Link>
          <Link to="/ventas/operacion"><PackageCheck/><div><strong>Entregas</strong><p>Salida de almacén y remisiones.</p></div></Link>
          <Link to="/ventas/operacion"><FileCheck2/><div><strong>Facturación</strong><p>Facturar pedidos entregados.</p></div></Link>
          <Link to="/ventas/cobranza"><BadgeDollarSign/><div><strong>Cobranza</strong><p>Registrar y aplicar pagos.</p></div></Link>
        </div>
      </Card>
    </div>
  </div>;
}
