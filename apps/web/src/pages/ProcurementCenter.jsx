import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AlertTriangle,ArrowRight,BarChart3,Check,ClipboardCheck,Download,
  FileClock,MoreHorizontal,PackageCheck,Plus,RefreshCw,ShoppingCart,
  Truck,WalletCards,XCircle
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import {
  DataTableFrame,DetailDrawer,ModuleHeader,ModuleToolbar
} from '../components/module-system';
import styles from './ProcurementCenter.module.css';

const statusMap={
  DRAFT:['Borrador','neutral'],
  PENDING:['Pendiente','warning'],
  APPROVED:['Aprobada','success'],
  REJECTED:['Rechazada','danger'],
  ORDERED:['Ordenada','info'],
  CANCELLED:['Cancelada','neutral']
};

const priorityMap={LOW:'Baja',NORMAL:'Normal',HIGH:'Alta',URGENT:'Urgente'};

const money=(value,currency='MXN')=>
  new Intl.NumberFormat('es-MX',{style:'currency',currency,maximumFractionDigits:0})
    .format(Number(value||0));

const requestTotal=(request)=>
  (request.items||[]).reduce(
    (sum,item)=>sum+Number(item.quantity||0)*Number(item.estimatedUnitCost||0),
    0
  );

export default function ProcurementCenter(){
  const [data,setData]=useState({summary:{},pipeline:{requests:{},orders:{}},recent:[]});
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [detail,setDetail]=useState(null);
  const [drawerTab,setDrawerTab]=useState('summary');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState(null);

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      const [dashboardResult,requestsResult]=await Promise.allSettled([
        apiRequest('/procurement/dashboard'),
        apiRequest('/purchase-requests')
      ]);

      if(dashboardResult.status==='fulfilled'){
        setData(dashboardResult.value);
      }else{
        throw dashboardResult.reason;
      }

      if(requestsResult.status==='fulfilled'){
        setRequests(requestsResult.value.requests||[]);
      }else{
        setRequests([]);
      }
    }catch(e){
      setError(e.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=[...requests].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if(!q)return rows;
    return rows.filter(row=>
      [
        row.folio,row.title,row.status,row.requestedBy?.firstName,row.requestedBy?.lastName,
        row.warehouse?.name,row.warehouse?.branch?.name
      ].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  },[requests,query]);

  const pendingRequests=requests.filter(row=>row.status==='PENDING');
  const approvedRequests=requests.filter(row=>row.status==='APPROVED');
  const overdueRequests=requests.filter(row=>
    row.requiredDate &&
    !['ORDERED','CANCELLED','REJECTED'].includes(row.status) &&
    new Date(row.requiredDate)<new Date()
  );
  const urgentRequests=requests.filter(row=>
    ['HIGH','URGENT'].includes(row.priority) &&
    !['ORDERED','CANCELLED','REJECTED'].includes(row.status)
  );

  const monthSeries=useMemo(()=>Array.from({length:6},(_,offset)=>{
    const point=new Date();
    point.setDate(1);
    point.setMonth(point.getMonth()-(5-offset));
    const year=point.getFullYear();
    const month=point.getMonth();
    const rows=requests.filter(item=>{
      const created=new Date(item.createdAt);
      return created.getFullYear()===year&&created.getMonth()===month;
    });
    return {
      label:point.toLocaleDateString('es-MX',{month:'short'}).replace('.',''),
      total:rows.reduce((sum,item)=>sum+requestTotal(item),0),
      count:rows.length
    };
  }),[requests]);

  const maxMonth=Math.max(1,...monthSeries.map(item=>item.total));

  const attention=[
    ...(pendingRequests.length?[{
      icon:ClipboardCheck,
      title:`${pendingRequests.length} solicitud(es) por revisar`,
      detail:'Requieren decisión dentro del flujo de aprobación.',
      tone:'warning'
    }]:[]),
    ...(overdueRequests.length?[{
      icon:FileClock,
      title:`${overdueRequests.length} solicitud(es) con fecha requerida vencida`,
      detail:'Superaron la fecha requerida sin completar el ciclo.',
      tone:'danger'
    }]:[]),
    ...(urgentRequests.length?[{
      icon:Truck,
      title:`${urgentRequests.length} requerimiento(s) de prioridad alta`,
      detail:'Conviene acelerar cotización, compra o entrega.',
      tone:'warning'
    }]:[])
  ].slice(0,3);

  const act=async(id,decision)=>{
    setBusy(true);
    try{
      let note='';
      if(decision==='REJECTED'){
        note=window.prompt('Motivo del rechazo')||'';
        if(!note)return;
      }
      await apiRequest(`/purchase-requests/${id}/resolve`,{
        method:'POST',
        body:{decision,note}
      });
      setDetail(null);
      setMessage({type:'success',text:decision==='APPROVED'?'Solicitud aprobada.':'Solicitud rechazada.'});
      await load();
    }catch(e){
      setMessage({type:'error',text:e.message});
    }finally{
      setBusy(false);
    }
  };

  const exportCsv=()=>{
    const head=['Folio','Fecha','Solicitud','Solicitante','Almacén','Estado','Importe'];
    const rows=filtered.map(row=>[
      row.folio,
      new Date(row.createdAt).toLocaleDateString('es-MX'),
      row.title,
      `${row.requestedBy?.firstName||''} ${row.requestedBy?.lastName||''}`.trim(),
      row.warehouse?.name||'',
      (statusMap[row.status]||[row.status])[0],
      requestTotal(row)
    ]);
    const csv=[head,...rows]
      .map(cols=>cols.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(','))
      .join('\n');
    const blob=new Blob([`\uFEFF${csv}`],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='buzzbee-solicitudes-compra.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Compras · Solicitud a pago"
      title="Compras"
      description="Control del ciclo de abastecimiento. Gestiona solicitudes, órdenes, recepciones y proveedores."
      actions={<>
        <Link className={styles.secondaryAction} to="/compras/ordenes">Más acciones <ArrowRight size={15}/></Link>
        <Link className={styles.primaryLink} to="/compras/solicitudes"><Plus size={16}/> Nueva solicitud</Link>
      </>}
    />

    {message?<div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>:null}
    {error?<div className={styles.error}>{error}</div>:null}

    <KpiGrid>
      <KpiCard>
        <ClipboardCheck/>
        <span>Solicitudes</span>
        <KpiInfo title="Solicitudes">Solicitudes de compra registradas.</KpiInfo>
        <strong>{requests.length||data.summary?.pendingRequests||0}</strong>
        <small>{pendingRequests.length} pendientes</small>
      </KpiCard>
      <KpiCard>
        <ShoppingCart/>
        <span>Órdenes de compra</span>
        <KpiInfo title="Órdenes de compra">Órdenes abiertas dentro del ciclo de compras.</KpiInfo>
        <strong>{data.summary?.issuedOrders||0}</strong>
        <small>{data.summary?.draftOrders||0} en borrador</small>
      </KpiCard>
      <KpiCard>
        <PackageCheck/>
        <span>Por recibir</span>
        <KpiInfo title="Por recibir">Órdenes o recepciones aún pendientes de completarse.</KpiInfo>
        <strong>{data.pipeline?.orders?.partial||0}</strong>
        <small>{data.summary?.receipts||0} recepciones registradas</small>
      </KpiCard>
      <KpiCard>
        <WalletCards/>
        <span>Compra / saldo por pagar</span>
        <KpiInfo title="Saldo por pagar">Obligaciones administrativas abiertas con proveedores.</KpiInfo>
        <strong>{money(data.summary?.openPayableBalance)}</strong>
        <small>{data.summary?.openPayables||0} documento(s)</small>
      </KpiCard>
    </KpiGrid>

    <section className={styles.overviewGrid}>
      <div className={styles.attentionCard}>
        <div className={styles.panelHeader}>
          <div><span>Prioridad</span><h2>Requiere atención</h2></div>
          <Link to="/aprobaciones">Ver todas</Link>
        </div>
        <div className={styles.attentionList}>
          {attention.length?attention.map((item,index)=>{
            const Icon=item.icon;
            return <button type="button" key={`${item.title}-${index}`} onClick={()=>index===0&&pendingRequests[0]&&setDetail(pendingRequests[0])}>
              <i className={styles[item.tone]}><Icon size={16}/></i>
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
            </button>;
          }):<div className={styles.healthy}><Check size={19}/><div><strong>Flujo de compras saludable</strong><span>No hay pendientes críticos por atender.</span></div></div>}
        </div>
      </div>

      <div className={styles.activityCard}>
        <div className={styles.panelHeader}>
          <div><span>Actividad</span><h2>Compras de los últimos 6 meses</h2></div>
          <div className={styles.chartLabel}><BarChart3 size={16}/> Solicitudes</div>
        </div>
        <div className={styles.chart}>
          {monthSeries.map(item=><div className={styles.barColumn} key={item.label}>
            <div className={styles.barTrack}><i style={{height:`${Math.max(8,(item.total/maxMonth)*100)}%`}}/></div>
            <strong>{item.label}</strong>
            <span>{item.count} sol.</span>
          </div>)}
        </div>
      </div>
    </section>

    <section className={styles.tableCard}>
      <ModuleToolbar
        title="Solicitudes recientes"
        description={`${filtered.length} registros visibles`}
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por folio, concepto o solicitante"
        filtersLabel={null}
        columnsLabel={null}
        actions={<>
          <Link className={styles.toolbarButton} to="/compras/solicitudes">Filtros</Link>
          <button type="button" className={styles.toolbarButton} onClick={exportCsv}><Download size={15}/> Exportar</button>
        </>}
      />

      <DataTableFrame
        empty={!filtered.length?'No hay solicitudes para mostrar.':null}
        footer={filtered.length?`Mostrando 1 - ${Math.min(filtered.length,8)} de ${filtered.length} resultados`:null}
      >
        <table>
          <thead><tr>
            <th>Folio</th><th>Fecha</th><th>Solicitud</th><th>Almacén</th>
            <th>Estado</th><th>Importe</th><th>Solicitante</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.slice(0,8).map(row=>{
              const status=statusMap[row.status]||[row.status,'neutral'];
              return <tr key={row.id} className={styles.clickableRow} onClick={()=>{setDetail(row);setDrawerTab('summary')}}>
                <td><strong className={styles.folio}>{row.folio}</strong></td>
                <td>{new Date(row.createdAt).toLocaleDateString('es-MX')}</td>
                <td><strong>{row.title}</strong><small>{priorityMap[row.priority]||row.priority}</small></td>
                <td>{row.warehouse?.name||'—'}</td>
                <td><Badge tone={status[1]}>{status[0]}</Badge></td>
                <td><strong>{money(requestTotal(row))}</strong></td>
                <td>{row.requestedBy?.firstName} {row.requestedBy?.lastName}</td>
                <td onClick={event=>event.stopPropagation()}><button className={styles.moreButton} onClick={()=>setDetail(row)}><MoreHorizontal size={17}/></button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </DataTableFrame>
    </section>

    <DetailDrawer
      open={Boolean(detail)}
      onClose={()=>setDetail(null)}
      title={detail?.folio}
      subtitle={detail?.title||'Solicitud de compra'}
      eyebrow="Solicitud de compra"
      icon={ClipboardCheck}
      size="lg"
      meta={detail?[new Date(detail.createdAt).toLocaleDateString('es-MX'),detail.requestedBy?`${detail.requestedBy.firstName||''} ${detail.requestedBy.lastName||''}`.trim():null,detail.warehouse?.name]:[]}
      status={detail?<Badge tone={(statusMap[detail.status]||[])[1]}>{(statusMap[detail.status]||[detail.status])[0]}</Badge>:null}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      tabs={[
        {id:'summary',label:'Resumen'},
        {id:'items',label:`Partidas${detail?` (${detail.items?.length||0})`:''}`},
        {id:'history',label:'Historial'},
        {id:'approvals',label:'Aprobaciones'},
        {id:'documents',label:'Documentos'}
      ]}
      footer={detail?<>
        {detail.status==='PENDING'?<>
          <Button variant="danger" disabled={busy} onClick={()=>act(detail.id,'REJECTED')}><XCircle size={16}/> Rechazar</Button>
          <Button disabled={busy} onClick={()=>act(detail.id,'APPROVED')}><Check size={16}/> Aprobar</Button>
        </>:null}
        <Link className={styles.drawerDetailLink} to="/compras/solicitudes">Ver detalle</Link>
      </>:null}
    >
      {detail&&drawerTab==='summary'?<div className={styles.drawerSummary}>
        <div><span>Estado</span><Badge tone={(statusMap[detail.status]||[])[1]}>{(statusMap[detail.status]||[detail.status])[0]}</Badge></div>
        <div><span>Fecha</span><strong>{new Date(detail.createdAt).toLocaleDateString('es-MX')}</strong></div>
        <div><span>Solicitante</span><strong>{detail.requestedBy?.firstName} {detail.requestedBy?.lastName}</strong></div>
        <div><span>Almacén</span><strong>{detail.warehouse?.name||'—'}</strong></div>
        <div><span>Prioridad</span><strong>{priorityMap[detail.priority]||detail.priority}</strong></div>
        <div><span>Importe total</span><strong>{money(requestTotal(detail))}</strong></div>
        <div className={styles.drawerWide}><span>Descripción / justificación</span><p>{detail.justification||detail.title||'Sin descripción adicional.'}</p></div>
      </div>:null}

      {detail&&drawerTab==='items'?<div className={styles.drawerItems}>
        {detail.items?.map(item=><article key={item.id}>
          <div><strong>{item.product?.name||'Producto'}</strong><span>{item.product?.sku||''}</span></div>
          <div><strong>{Number(item.quantity)} {item.product?.unit||''}</strong><span>{money(item.estimatedUnitCost)} c/u</span></div>
          <b>{money(Number(item.quantity)*Number(item.estimatedUnitCost))}</b>
        </article>)}
      </div>:null}

      {detail&&drawerTab==='history'?<div className={styles.history}>
        <article><i className={styles.historyDone}><ClipboardCheck size={15}/></i><div><strong>Solicitud creada</strong><span>{detail.requestedBy?.firstName} {detail.requestedBy?.lastName} · {new Date(detail.createdAt).toLocaleString('es-MX')}</span></div></article>
        {detail.status!=='DRAFT'?<article><i className={styles.historyInfo}><ArrowRight size={15}/></i><div><strong>Enviada a aprobación</strong><span>Flujo de solicitud a pago</span></div></article>:null}
        <article><i className={detail.status==='APPROVED'?styles.historyDone:detail.status==='REJECTED'?styles.historyDanger:styles.historyPending}><FileClock size={15}/></i><div><strong>{detail.status==='APPROVED'?'Aprobada':detail.status==='REJECTED'?'Rechazada':'Pendiente de revisión'}</strong><span>Estado actual de la solicitud</span></div></article>
      </div>:null}

      {detail&&drawerTab==='approvals'?<div className={styles.drawerEmpty}>
        <ClipboardCheck size={22}/>
        <strong>Flujo de aprobación</strong>
        <p>Estado actual: {(statusMap[detail.status]||[detail.status])[0]}. Las decisiones se conservan en el flujo de aprobaciones.</p>
        <Link to="/aprobaciones">Abrir centro de aprobaciones</Link>
      </div>:null}

      {detail&&drawerTab==='documents'?<div className={styles.drawerEmpty}>
        <FileClock size={22}/>
        <strong>Documentos relacionados</strong>
        <p>Los adjuntos y documentos derivados se mostrarán aquí conforme avance SOLPED → OC → recepción.</p>
      </div>:null}
    </DetailDrawer>
  </div>;
}
