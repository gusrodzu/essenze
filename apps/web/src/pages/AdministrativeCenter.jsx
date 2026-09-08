import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AlertTriangle,ArrowRight,Building2,CircleDollarSign,CreditCard,
  Landmark,PackageOpen,ReceiptText,RefreshCw,WalletCards
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './AdministrativeCenter.module.css';
import {ModuleHeader,AttentionPanel} from '../components/module-system';

const money=(value,currency='MXN')=>new Intl.NumberFormat('es-MX',{
  style:'currency',currency,maximumFractionDigits:0
}).format(Number(value||0));

const tone={HIGH:'danger',MEDIUM:'warning',LOW:'neutral'};

export default function AdministrativeCenter(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      setData(await apiRequest('/administration/dashboard'));
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  if(loading){
    return <div className={styles.page}>
      <Card className={styles.state}><RefreshCw className={styles.spin}/><strong>Preparando Centro Administrativo…</strong></Card>
    </div>;
  }

  if(error){
    return <div className={styles.page}>
      <Card className={styles.state}><strong>No fue posible cargar Administración</strong><p>{error}</p><Button onClick={load}>Reintentar</Button></Card>
    </div>;
  }

  const currency=data?.company?.currency||'MXN';

  const modules=[
    {title:'Cuentas por pagar',desc:'Facturas, vencimientos y pagos a proveedores.',to:'/finanzas/cuentas-por-pagar',icon:CreditCard,value:data.counts?.payables||0},
    {title:'Cuentas por cobrar',desc:'Cartera, vencimientos y cobranza.',to:'/finanzas/cuentas-por-cobrar',icon:WalletCards,value:data.counts?.receivables||0},
    {title:'Tesorería',desc:'Caja, bancos y movimientos de efectivo.',to:'/finanzas/tesoreria',icon:Landmark,value:data.counts?.treasuryAccounts||0},
    {title:'Gastos y viáticos',desc:'Control, aprobación y comprobación de gastos.',to:'/gastos',icon:ReceiptText,value:data.counts?.expenses||0},
    {title:'Presupuestos',desc:'Planeación y control presupuestal.',to:'/finanzas/presupuestos',icon:CircleDollarSign,value:data.counts?.budgets||0},
    {title:'Activos fijos',desc:'Activos, depreciación y valor neto.',to:'/activos-fijos',icon:PackageOpen,value:data.counts?.assets||0},
    {title:'Contabilidad',desc:'Pólizas, periodos y cuentas contables.',to:'/finanzas/contabilidad',icon:Building2,value:'→'}
  ];

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Administración · Centro de control"
      title="Centro Administrativo"
      description="Vista ejecutiva de la operación administrativa. Cada proceso se gestiona en su aplicación canónica sin duplicar rutas."
      actions={<Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button>}
    />

    <KpiGrid>
      <KpiCard>
        <WalletCards/>
        <span>Por cobrar</span>
        <KpiInfo title="Por cobrar">Saldo pendiente de clientes.</KpiInfo>
        <strong>{money(data.summary?.receivableBalance,currency)}</strong>
        <small>{data.counts?.overdueReceivables||0} vencida(s)</small>
      </KpiCard>

      <KpiCard>
        <CreditCard/>
        <span>Por pagar</span>
        <KpiInfo title="Por pagar">Saldo pendiente con proveedores.</KpiInfo>
        <strong>{money(data.summary?.payableBalance,currency)}</strong>
        <small>{data.counts?.overduePayables||0} vencida(s)</small>
      </KpiCard>

      <KpiCard>
        <Landmark/>
        <span>Tesorería</span>
        <KpiInfo title="Tesorería">Saldo actual de cuentas activas.</KpiInfo>
        <strong>{money(data.summary?.treasuryBalance,currency)}</strong>
        <small>{data.counts?.treasuryAccounts||0} cuenta(s)</small>
      </KpiCard>

      <KpiCard>
        <ReceiptText/>
        <span>Gastos del mes</span>
        <KpiInfo title="Gastos del mes">Gastos registrados durante el mes actual.</KpiInfo>
        <strong>{money(data.summary?.expensesMonth,currency)}</strong>
        <small>{data.counts?.expenses||0} movimiento(s)</small>
      </KpiCard>
    </KpiGrid>

    <div className={styles.mainGrid}>
      <Card className={styles.attention}>
        <div className={styles.cardHead}>
          <div><h2>Requiere atención</h2><p>Pendientes administrativos con impacto operativo.</p></div>
          <AlertTriangle/>
        </div>
        <div className={styles.attentionList}>
          {data.attention?.length?data.attention.map(item=><Link key={item.key} to={item.to}>
            <Badge tone={tone[item.level]||'neutral'}>{item.level}</Badge>
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
            <ArrowRight size={17}/>
          </Link>):<div className={styles.empty}>
            <strong>Sin pendientes críticos</strong>
            <p>No hay alertas administrativas prioritarias en este momento.</p>
          </div>}
        </div>
      </Card>

      <Card className={styles.position}>
        <div className={styles.cardHead}>
          <div><h2>Posición administrativa</h2><p>Lectura rápida del balance operativo.</p></div>
          <CircleDollarSign/>
        </div>
        <div className={styles.positionGrid}>
          <div><span>Cartera vencida</span><strong>{money(data.summary?.overdueReceivableBalance,currency)}</strong></div>
          <div><span>Proveedores vencidos</span><strong>{money(data.summary?.overduePayableBalance,currency)}</strong></div>
          <div><span>Presupuesto anual</span><strong>{money(data.summary?.budgetTotal,currency)}</strong></div>
          <div><span>Valor neto activos</span><strong>{money(data.summary?.assetNet,currency)}</strong></div>
          <div><span>Ingresos tesorería mes</span><strong>{money(data.summary?.treasuryIncome,currency)}</strong></div>
          <div><span>Salidas tesorería mes</span><strong>{money(data.summary?.treasuryOut,currency)}</strong></div>
        </div>
      </Card>
    </div>

    <section className={styles.moduleSection}>
      <div className={styles.sectionHead}>
        <div><span>Aplicaciones administrativas</span><h2>Controla la operación financiera desde aquí</h2></div>
      </div>
      <div className={styles.moduleGrid}>
        {modules.map(item=>{
          const Icon=item.icon;
          return <Link to={item.to} key={item.title}>
            <div className={styles.icon}><Icon size={20}/></div>
            <div><strong>{item.title}</strong><p>{item.desc}</p></div>
            <b>{item.value}</b>
          </Link>;
        })}
      </div>
    </section>
  </div>;
}
