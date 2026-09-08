import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  Building2,CheckCircle2,ClipboardCheck,KeyRound,
  PlayCircle,RefreshCw,Route,ShieldCheck
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './DemoCompany.module.css';

export default function DemoCompany(){
  const [readiness,setReadiness]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      setReadiness(await apiRequest('/reports/demo-readiness'));
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const readyCount=readiness?.checks?.filter(x=>x.ready).length||0;
  const total=readiness?.checks?.length||0;

  if(loading && !readiness){
    return <div className={styles.page}>
      <Card className={styles.stateCard}>
        <RefreshCw className={styles.spin}/>
        <strong>Validando empresa demo…</strong>
        <p>Comprobando datos operativos, finanzas, RR. HH. y preparación comercial.</p>
      </Card>
    </div>;
  }

  if(error && !readiness){
    return <div className={styles.page}>
      <Card className={styles.stateCard}>
        <strong>No fue posible validar Demo Company</strong>
        <p>{error}</p>
        <Button onClick={load}>Reintentar validación</Button>
      </Card>
    </div>;
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>BuzzBee v8.0 · Demo Company</span>
        <h1>Centro de preparación comercial</h1>
        <p>Valida que la empresa demo tenga una historia operativa completa antes de presentarla al cliente.</p>
      </div>
      <div className={styles.actions}>
        <Badge tone={readiness?.ok?'success':'warning'}>{readiness?.score??0}% Demo Ready</Badge>
        <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Validar</Button>
        <Link className={styles.primaryLink} to="/reportes/demo"><PlayCircle size={16}/> Abrir demo ejecutiva</Link>
      </div>
    </header>

    {error?<div className={styles.error}>{error}</div>:null}

    <KpiGrid>
      <KpiCard>
        <ShieldCheck/>
        <span>Demo Readiness</span>
        <KpiInfo title="Demo Readiness">Cobertura de datos necesarios para recorrer la demostración completa.</KpiInfo>
        <strong>{readiness?.score??0}%</strong>
        <small>{readyCount}/{total} bloques listos</small>
      </KpiCard>
      <KpiCard>
        <Building2/>
        <span>Empresa demo</span>
        <KpiInfo title="Empresa demo">Dataset aislado para pruebas, demos y entrenamiento.</KpiInfo>
        <strong>BuzzBee</strong>
        <small>Demo Company</small>
      </KpiCard>
      <KpiCard>
        <Route/>
        <span>Historia comercial</span>
        <KpiInfo title="Historia comercial">Recorrido end-to-end preparado para el cliente.</KpiInfo>
        <strong>8 pasos</strong>
        <small>Compras → Administración → RRHH → Intelligence</small>
      </KpiCard>
      <KpiCard>
        <KeyRound/>
        <span>Acceso demo</span>
        <KpiInfo title="Acceso demo">Usuario dedicado para demostraciones internas.</KpiInfo>
        <strong>Demo</strong>
        <small>demo@buzzbee.mx</small>
      </KpiCard>
    </KpiGrid>

    <div className={styles.grid}>
      <Card className={styles.checkCard}>
        <div className={styles.cardHead}>
          <div><h2>Checklist de datos</h2><p>Validación directa contra PostgreSQL.</p></div>
          <ClipboardCheck/>
        </div>
        <div className={styles.checks}>
          {readiness?.checks?.map(item=><div key={item.label}>
            <CheckCircle2 className={item.ready?styles.ready:styles.pending}/>
            <div><strong>{item.label}</strong><p>{item.count} registro(s)</p></div>
            <Badge tone={item.ready?'success':'warning'}>{item.ready?'Listo':'Pendiente'}</Badge>
          </div>)}
        </div>
      </Card>

      <Card className={styles.scriptCard}>
        <div className={styles.cardHead}>
          <div><h2>Guion recomendado</h2><p>Recorrido para presentar el ERP al cliente.</p></div>
          <Route/>
        </div>
        <ol>
          <li><span>1</span><div><strong>Inicio ejecutivo</strong><p>Abre Reportes → Demo ejecutiva y explica el Health Score.</p></div></li>
          <li><span>2</span><div><strong>SOLPED</strong><p>Muestra una solicitud y su flujo de aprobación.</p></div></li>
          <li><span>3</span><div><strong>Orden de compra</strong><p>Conecta proveedor, condiciones y autorización.</p></div></li>
          <li><span>4</span><div><strong>Recepción</strong><p>Demuestra entrada parcial y trazabilidad.</p></div></li>
          <li><span>5</span><div><strong>Inventario</strong><p>Revisa existencias y stock crítico.</p></div></li>
          <li><span>6</span><div><strong>Administración</strong><p>Muestra CxP/CxC y vencimientos.</p></div></li>
          <li><span>7</span><div><strong>RR. HH.</strong><p>Empleados, asistencia, permiso y prenómina.</p></div></li>
          <li><span>8</span><div><strong>BuzzBee AI</strong><p>Cierra con un briefing ejecutivo basado en datos del ERP.</p></div></li>
        </ol>
      </Card>
    </div>

    <Card className={styles.credentials}>
      <KeyRound/>
      <div>
        <strong>Credenciales internas de demo</strong>
        <p>Usuario: <code>demo@buzzbee.mx</code> · Contraseña inicial: <code>BuzzBee2026!</code></p>
        <small>Cámbiala antes de usar esta empresa en un entorno expuesto públicamente.</small>
      </div>
    </Card>
  </div>;
}
