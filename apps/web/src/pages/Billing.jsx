import {useEffect,useMemo,useState} from 'react';
import {CreditCard,Receipt,RefreshCcw,ArrowUpRight,ArrowDownRight,CalendarDays,WalletCards} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import styles from './Billing.module.css';

const money=(v,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';

export default function Billing(){
  const [data,setData]=useState({subscription:null,invoices:[],credits:[],methods:[],changes:[]});
  const [plans,setPlans]=useState([]);
  const [cycle,setCycle]=useState('MONTHLY');
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);

  async function load(){
    try{
      const [billing,modules]=await Promise.all([apiRequest('/billing/dashboard'),apiRequest('/modules/dashboard')]);
      setData(billing);setPlans(modules.plans||[]);
      if(billing.subscription?.billingCycle)setCycle(billing.subscription.billingCycle);
    }catch(e){setMessage(['error',e.message])}
  }
  useEffect(()=>{load()},[]);

  async function changePlan(planId){
    setSaving(true);
    try{
      const r=await apiRequest('/billing/change-plan',{method:'POST',body:{planId,billingCycle:cycle}});
      setMessage(['success',r.message]);
      await load();
    }catch(e){setMessage(['error',e.message])}
    finally{setSaving(false)}
  }

  const current=data.subscription;
  const nextInvoice=data.invoices.find(x=>x.status==='OPEN')||data.invoices[0];
  const defaultMethod=data.methods.find(x=>x.isDefault)||data.methods[0];

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Billing & Subscriptions</span><h1>Plan y facturación</h1><p>Administra tu plan, ciclo, facturas y método de pago.</p></div>
      <div className={styles.cycle}>
        <button className={cycle==='MONTHLY'?styles.active:''} onClick={()=>setCycle('MONTHLY')}>Mensual</button>
        <button className={cycle==='ANNUAL'?styles.active:''} onClick={()=>setCycle('ANNUAL')}>Anual</button>
      </div>
    </header>

    {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}

    <KpiGrid>
      <KpiCard><WalletCards/><span>Plan actual</span><KpiInfo title="Plan">Plan SaaS activo.</KpiInfo><strong>{current?.plan?.name||'Sin plan'}</strong><small>{current?.billingCycle==='ANNUAL'?'Anual':'Mensual'}</small></KpiCard>
      <KpiCard><CalendarDays/><span>Próxima factura</span><KpiInfo title="Renovación">Fecha del siguiente ciclo.</KpiInfo><strong>{date(current?.nextBillingAt||current?.currentPeriodEnd)}</strong><small>Renovación automática</small></KpiCard>
      <KpiCard><CreditCard/><span>Método de pago</span><KpiInfo title="Pago">Método predeterminado.</KpiInfo><strong>{defaultMethod?`${defaultMethod.brand||defaultMethod.provider} •••• ${defaultMethod.last4||'—'}`:'Sin método'}</strong><small>{defaultMethod?.provider||'Configurar pago'}</small></KpiCard>
      <KpiCard><Receipt/><span>Última factura</span><KpiInfo title="Factura">Último documento de billing.</KpiInfo><strong>{nextInvoice?money(nextInvoice.total,nextInvoice.currency):money(0)}</strong><small>{nextInvoice?.status||'Sin facturas'}</small></KpiCard>
    </KpiGrid>

    <Card className={styles.current}>
      <div><span>PLAN ACTUAL</span><h2>{current?.plan?.name||'Sin plan'}</h2><p>{current?`${money(current.billingCycle==='ANNUAL'?current.plan.annualPrice:current.plan.monthlyPrice,current.plan.currency)} / ${current.billingCycle==='ANNUAL'?'año':'mes'}`:'—'}</p></div>
      {current?.scheduledPlan?<div className={styles.scheduled}><Badge tone="warning">Cambio programado</Badge><strong>{current.scheduledPlan.name}</strong><small>Se aplicará el {date(current.scheduledChangeAt)}</small></div>:null}
    </Card>

    <section className={styles.planGrid}>
      {plans.map(plan=>{
        const active=current?.planId===plan.id;
        const targetPrice=Number(cycle==='ANNUAL'?plan.annualPrice:plan.monthlyPrice);
        const currentPrice=current?Number(current.billingCycle==='ANNUAL'?current.plan.annualPrice:current.plan.monthlyPrice):0;
        const upgrade=!active&&targetPrice>currentPrice;
        return <Card key={plan.id} className={styles.plan}>
          <div className={styles.planHead}><div><span>Plan</span><h3>{plan.name}</h3></div>{active?<Badge tone="success">Actual</Badge>:null}</div>
          <div className={styles.price}>{money(targetPrice,plan.currency)}<small>/{cycle==='ANNUAL'?'año':'mes'}</small></div>
          <p>{plan.description||'Plan modular BuzzBee.'}</p>
          <div className={styles.modules}>{plan.modules.slice(0,8).map(x=><span key={x.id}>✓ {x.module.name}</span>)}</div>
          <Button disabled={saving||active} icon={upgrade?ArrowUpRight:ArrowDownRight} onClick={()=>changePlan(plan.id)}>
            {active?'Plan activo':upgrade?'Mejorar ahora':'Cambiar al próximo ciclo'}
          </Button>
        </Card>
      })}
    </section>

    <div className={styles.twoCols}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}><div><span>FACTURAS</span><h3>Historial de cobros</h3></div><RefreshCcw size={18}/></div>
        <div className={styles.list}>{data.invoices.map(i=><article key={i.id}><div><strong>{i.number}</strong><small>{date(i.createdAt)} · {i.status}</small></div><b>{money(i.total,i.currency)}</b></article>)}</div>
      </Card>
      <Card className={styles.panel}>
        <div className={styles.panelHead}><div><span>CAMBIOS</span><h3>Historial de plan</h3></div></div>
        <div className={styles.list}>{data.changes.map(c=><article key={c.id}><div><strong>{c.fromPlan.name} → {c.toPlan.name}</strong><small>{c.type} · {c.status} · {date(c.effectiveAt)}</small></div>{c.chargeAmount!=null?<b>{money(c.chargeAmount)}</b>:null}</article>)}</div>
      </Card>
    </div>
  </div>
}
