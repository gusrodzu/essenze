import {useEffect, useMemo, useState} from 'react';
import {
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Stamp,
  Users,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import {ModuleTabs} from '../components/module-system';
import styles from './Fiscal.module.css';

const statusLabel={DRAFT:'Borrador',READY:'Listo para PAC',STAMPED:'Timbrado',CANCEL_PENDING:'Cancelación pendiente',CANCELLED:'Cancelado',ERROR:'Error'};
const statusTone={DRAFT:'neutral',READY:'info',STAMPED:'success',CANCEL_PENDING:'warning',CANCELLED:'danger',ERROR:'danger'};
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';

export default function Fiscal(){
  const [data,setData]=useState({issuer:null,invoices:[],customers:[],salesInvoices:[],receipts:[],paymentComplements:[],summary:{}});
  const [tab,setTab]=useState('overview');
  const [query,setQuery]=useState('');
  const [issuerModal,setIssuerModal]=useState(null);
  const [customerModal,setCustomerModal]=useState(null);
  const [invoiceModal,setInvoiceModal]=useState(null);
  const [stampModal,setStampModal]=useState(null);
  const [cancelModal,setCancelModal]=useState(null);
  const [paymentModal,setPaymentModal]=useState(null);
  const [paymentStampModal,setPaymentStampModal]=useState(null);
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{setData(await apiRequest('/fiscal/dashboard'))}
    catch(error){setMessage(['error',error.message])}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function submit(path,body,success,method='POST'){
    setSaving(true);
    try{
      const response=await apiRequest(path,{method,body});
      setMessage(['success',success]);
      await load();
      return response;
    }catch(error){setMessage(['error',error.message]);return null}
    finally{setSaving(false)}
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return data.invoices;
    return data.invoices.filter(i=>`${i.series||''} ${i.folio} ${i.uuid||''} ${i.customer?.legalName||''} ${i.customer?.commercialName||''}`.toLowerCase().includes(q))
  },[data.invoices,query]);

  if(loading&&!data.invoices.length)return <Card className={styles.loading}>Cargando Facturación fiscal…</Card>;

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>México · Fiscal · CFDI</span><h1>Facturación fiscal</h1><p>Controla la información fiscal, prepara CFDI 4.0, registra resultados de timbrado PAC, cancelaciones y complementos de recepción de pagos 2.0.</p></div>
      <div className={styles.headerActions}><Button variant="secondary" icon={Settings2} onClick={()=>setIssuerModal(data.issuer?{...data.issuer}:{rfc:'',legalName:'',fiscalRegime:'601',postalCode:'',certificateNumber:'',pacProvider:'',active:true})}>Emisor</Button><Button icon={Plus} onClick={()=>setInvoiceModal({salesInvoiceId:'',series:'A',folio:`CFDI-${String(data.invoices.length+1).padStart(5,'0')}`,paymentMethod:'PUE',paymentForm:'03',placeOfIssue:data.issuer?.postalCode||'',exportCode:'01',useCfdi:'G03',satProductCode:'01010101',unitCode:'ACT',taxObject:'02',notes:''})}>Preparar CFDI</Button></div>
    </header>

    <div className={styles.notice}><ShieldCheck size={18}/><div><strong>Capa fiscal preparada para PAC</strong><span>Esta versión administra y valida la información del ERP; el timbrado real requiere conectar un PAC o servicio SAT. No simula certificación fiscal.</span></div></div>
    {message?<div className={`${styles.message} ${styles[message[0]]}`}><span>{message[1]}</span><button onClick={()=>setMessage(null)}><X size={16}/></button></div>:null}

    <KpiGrid>
      <KpiCard><FileCheck2/><span>CFDI timbrados</span><KpiInfo title="CFDI timbrados">Documentos con UUID registrado como resultado de certificación externa.</KpiInfo><strong>{data.summary.stamped||0}</strong><small>{data.summary.totalInvoices||0} documentos fiscales</small></KpiCard>
      <KpiCard><CircleDollarSign/><span>Monto timbrado</span><KpiInfo title="Monto timbrado">Total de CFDI en estado Timbrado.</KpiInfo><strong>{money(data.summary.stampedTotal)}</strong><small>Base comercial fiscalizada</small></KpiCard>
      <KpiCard><Landmark/><span>Impuestos trasladados</span><KpiInfo title="Impuestos">Impuestos trasladados menos retenciones en CFDI timbrados.</KpiInfo><strong>{money(data.summary.taxes)}</strong><small>Según registros fiscales del ERP</small></KpiCard>
      <KpiCard><FileClock/><span>Pendientes</span><KpiInfo title="Pendientes">Borradores, documentos listos para PAC y documentos con error.</KpiInfo><strong>{data.summary.pending||0}</strong><small>{data.summary.cancelled||0} cancelados</small></KpiCard>
      <KpiCard><Users/><span>Clientes incompletos</span><KpiInfo title="Clientes incompletos">Clientes activos sin perfil fiscal de receptor.</KpiInfo><strong>{data.summary.missingFiscalCustomers||0}</strong><small>{data.summary.paymentComplements||0} complementos de pago</small></KpiCard>
    </KpiGrid>

    <ModuleTabs
      active={tab}
      onChange={setTab}
      items={[
        {id:'overview',label:'Resumen',icon:ReceiptText},
        {id:'invoices',label:'CFDI',icon:FileText},
        {id:'customers',label:'Receptores fiscales',icon:Users},
        {id:'payments',label:'Pagos y cancelaciones',icon:Stamp}
      ]}
    />

    {tab==='overview'?<Overview data={data} onIssuer={()=>setIssuerModal(data.issuer?{...data.issuer}:{rfc:'',legalName:'',fiscalRegime:'601',postalCode:'',certificateNumber:'',pacProvider:'',active:true})}/>:null}
    {tab==='invoices'?<Invoices invoices={filtered} query={query} setQuery={setQuery} onStamp={setStampModal} onCancel={setCancelModal}/>:null}
    {tab==='customers'?<Customers customers={data.customers} onEdit={c=>setCustomerModal({customer:c,rfc:c.fiscalProfile?.rfc||c.taxId||'',legalName:c.fiscalProfile?.legalName||c.legalName||'',fiscalRegime:c.fiscalProfile?.fiscalRegime||'601',postalCode:c.fiscalProfile?.postalCode||'',defaultUseCfdi:c.fiscalProfile?.defaultUseCfdi||'G03',foreignTaxId:c.fiscalProfile?.foreignTaxId||'',countryCode:c.fiscalProfile?.countryCode||'MEX'})}/>:null}
    {tab==='payments'?<Payments data={data} onNew={()=>setPaymentModal({collectionReceiptId:'',series:'P',folio:`CP-${String(data.paymentComplements.length+1).padStart(5,'0')}`,placeOfIssue:data.issuer?.postalCode||'',paymentForm:'03',fiscalInvoiceId:'',documentUuid:'',installment:1,previousBalance:'',paidAmount:'',notes:''})} onStamp={setPaymentStampModal}/>:null}

    {issuerModal?<Modal title="Datos fiscales del emisor" eyebrow="CFDI 4.0" onClose={()=>setIssuerModal(null)}><form onSubmit={async e=>{e.preventDefault();const r=await submit('/fiscal/issuer',{...issuerModal,certificateNumber:issuerModal.certificateNumber||null,pacProvider:issuerModal.pacProvider||null},'Datos fiscales del emisor guardados','PUT');if(r)setIssuerModal(null)}}><div className={styles.modalBody}><div className={styles.grid2}><Input label="RFC" required value={issuerModal.rfc} onChange={e=>setIssuerModal(v=>({...v,rfc:e.target.value.toUpperCase()}))}/><Input label="Razón social" required value={issuerModal.legalName} onChange={e=>setIssuerModal(v=>({...v,legalName:e.target.value}))}/></div><div className={styles.grid2}><Input label="Régimen fiscal" required value={issuerModal.fiscalRegime} onChange={e=>setIssuerModal(v=>({...v,fiscalRegime:e.target.value}))}/><Input label="Código postal fiscal" required pattern="\d{5}" value={issuerModal.postalCode} onChange={e=>setIssuerModal(v=>({...v,postalCode:e.target.value}))}/></div><div className={styles.grid2}><Input label="No. certificado" value={issuerModal.certificateNumber||''} onChange={e=>setIssuerModal(v=>({...v,certificateNumber:e.target.value}))}/><Input label="PAC / proveedor" value={issuerModal.pacProvider||''} onChange={e=>setIssuerModal(v=>({...v,pacProvider:e.target.value}))}/></div></div><Footer onClose={()=>setIssuerModal(null)} saving={saving}/></form></Modal>:null}

    {customerModal?<Modal title="Perfil fiscal del receptor" eyebrow={customerModal.customer.code} onClose={()=>setCustomerModal(null)}><form onSubmit={async e=>{e.preventDefault();const {customer,...body}=customerModal;const r=await submit(`/fiscal/customers/${customer.id}/profile`,{...body,foreignTaxId:body.foreignTaxId||null},'Perfil fiscal del cliente actualizado','PUT');if(r)setCustomerModal(null)}}><div className={styles.modalBody}><div className={styles.grid2}><Input label="RFC" required value={customerModal.rfc} onChange={e=>setCustomerModal(v=>({...v,rfc:e.target.value.toUpperCase()}))}/><Input label="Razón social SAT" required value={customerModal.legalName} onChange={e=>setCustomerModal(v=>({...v,legalName:e.target.value}))}/></div><div className={styles.grid3}><Input label="Régimen fiscal" required value={customerModal.fiscalRegime} onChange={e=>setCustomerModal(v=>({...v,fiscalRegime:e.target.value}))}/><Input label="Código postal" required pattern="\d{5}" value={customerModal.postalCode} onChange={e=>setCustomerModal(v=>({...v,postalCode:e.target.value}))}/><Input label="Uso CFDI default" required value={customerModal.defaultUseCfdi} onChange={e=>setCustomerModal(v=>({...v,defaultUseCfdi:e.target.value}))}/></div></div><Footer onClose={()=>setCustomerModal(null)} saving={saving}/></form></Modal>:null}

    {invoiceModal?<Modal title="Preparar CFDI desde factura comercial" eyebrow="CFDI 4.0" onClose={()=>setInvoiceModal(null)}><form onSubmit={async e=>{e.preventDefault();const r=await submit('/fiscal/invoices/from-sales-invoice',invoiceModal,'CFDI preparado para envío al PAC');if(r)setInvoiceModal(null)}}><div className={styles.modalBody}><label>Factura comercial<select required value={invoiceModal.salesInvoiceId} onChange={e=>setInvoiceModal(v=>({...v,salesInvoiceId:e.target.value}))}><option value="">Seleccionar…</option>{data.salesInvoices.filter(i=>!i.fiscalInvoice).map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} · {i.customer?.commercialName||i.customer?.legalName} · {money(i.total)} {i.customer?.fiscalProfile?'':'· FALTA PERFIL FISCAL'}</option>)}</select></label><div className={styles.grid3}><Input label="Serie" value={invoiceModal.series} onChange={e=>setInvoiceModal(v=>({...v,series:e.target.value}))}/><Input label="Folio" required value={invoiceModal.folio} onChange={e=>setInvoiceModal(v=>({...v,folio:e.target.value}))}/><Input label="Lugar expedición CP" required value={invoiceModal.placeOfIssue} onChange={e=>setInvoiceModal(v=>({...v,placeOfIssue:e.target.value}))}/></div><div className={styles.grid3}><label>Método<select value={invoiceModal.paymentMethod} onChange={e=>setInvoiceModal(v=>({...v,paymentMethod:e.target.value}))}><option value="PUE">PUE</option><option value="PPD">PPD</option></select></label><Input label="Forma pago" value={invoiceModal.paymentForm} onChange={e=>setInvoiceModal(v=>({...v,paymentForm:e.target.value}))}/><Input label="Uso CFDI" value={invoiceModal.useCfdi} onChange={e=>setInvoiceModal(v=>({...v,useCfdi:e.target.value}))}/></div><div className={styles.grid3}><Input label="Clave ProdServ" value={invoiceModal.satProductCode} onChange={e=>setInvoiceModal(v=>({...v,satProductCode:e.target.value}))}/><Input label="Clave unidad" value={invoiceModal.unitCode} onChange={e=>setInvoiceModal(v=>({...v,unitCode:e.target.value}))}/><Input label="Objeto impuesto" value={invoiceModal.taxObject} onChange={e=>setInvoiceModal(v=>({...v,taxObject:e.target.value}))}/></div></div><Footer onClose={()=>setInvoiceModal(null)} saving={saving}/></form></Modal>:null}

    {stampModal?<StampModal title="Registrar resultado de timbrado" doc={stampModal} saving={saving} onClose={()=>setStampModal(null)} onSubmit={async body=>{const r=await submit(`/fiscal/invoices/${stampModal.id}/stamp-result`,body,'Resultado de timbrado registrado');if(r)setStampModal(null)}}/>:null}

    {cancelModal?<Modal title="Registrar cancelación" eyebrow={cancelModal.folio} onClose={()=>setCancelModal(null)}><CancelForm saving={saving} onClose={()=>setCancelModal(null)} onSubmit={async body=>{const r=await submit(`/fiscal/invoices/${cancelModal.id}/cancellations`,body,'Estado de cancelación registrado');if(r)setCancelModal(null)}}/></Modal>:null}

    {paymentModal?<PaymentModal value={paymentModal} setValue={setPaymentModal} data={data} saving={saving} onClose={()=>setPaymentModal(null)} onSubmit={async e=>{e.preventDefault();const r=await submit('/fiscal/payment-complements/from-receipt',{...paymentModal,installment:Number(paymentModal.installment),previousBalance:Number(paymentModal.previousBalance),paidAmount:Number(paymentModal.paidAmount)},'Complemento de pago preparado');if(r)setPaymentModal(null)}}/>:null}

    {paymentStampModal?<StampModal title="Registrar timbrado del complemento" doc={paymentStampModal} saving={saving} onClose={()=>setPaymentStampModal(null)} onSubmit={async body=>{const r=await submit(`/fiscal/payment-complements/${paymentStampModal.id}/stamp-result`,body,'Timbrado del complemento registrado');if(r)setPaymentStampModal(null)}}/>:null}
  </div>
}

function Overview({data,onIssuer}){return <div className={styles.overviewGrid}><Card className={styles.issuerCard}><Section title="Emisor fiscal" eyebrow="Configuración"/>{data.issuer?<div className={styles.issuerBody}><span className={styles.bigIcon}><Building2 size={25}/></span><div><strong>{data.issuer.legalName}</strong><p>{data.issuer.rfc}</p><small>Régimen {data.issuer.fiscalRegime} · CP {data.issuer.postalCode}</small></div><Badge tone="success">Configurado</Badge></div>:<div className={styles.emptyAction}><p>Falta configurar RFC, razón social, régimen y código postal del emisor.</p><Button onClick={onIssuer}>Configurar emisor</Button></div>}</Card><Card className={styles.recentCard}><Section title="CFDI recientes" eyebrow="Emisión"/><div className={styles.rows}>{data.invoices.slice(0,6).map(i=><article key={i.id}><span className={styles.docIcon}><FileText size={17}/></span><div><strong>{i.series?`${i.series}-`:''}{i.folio}</strong><small>{i.customer?.commercialName||i.customer?.legalName} · {date(i.issueDate)}</small></div><Badge tone={statusTone[i.status]}>{statusLabel[i.status]}</Badge><b>{money(i.total)}</b></article>)}</div></Card><Card className={styles.healthCard}><Section title="Checklist fiscal" eyebrow="Preparación"/><div className={styles.checks}><Check ok={Boolean(data.issuer)} text="Perfil del emisor"/><Check ok={Boolean(data.issuer?.pacProvider)} text="Proveedor/PAC identificado"/><Check ok={data.summary.missingFiscalCustomers===0} text="Perfiles fiscales de clientes"/><Check ok={data.summary.pending===0} text="Sin CFDI pendientes"/></div></Card></div>}
function Invoices({invoices,query,setQuery,onStamp,onCancel}){return <Card className={styles.tableCard}><div className={styles.toolbar}><div><span className={styles.eyebrow}>CFDI 4.0</span><h3>Documentos fiscales</h3></div><label className={styles.search}><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Folio, UUID o cliente…"/></label></div><div className={styles.table}><header><span>CFDI</span><span>Receptor</span><span>Fecha</span><span>Estado</span><span>Total</span><span>Acciones</span></header>{invoices.map(i=><article key={i.id}><div><strong>{i.series?`${i.series}-`:''}{i.folio}</strong><small>{i.uuid||'Sin UUID · pendiente PAC'}</small></div><div><strong>{i.customer?.fiscalProfile?.legalName||i.customer?.legalName}</strong><small>{i.customer?.fiscalProfile?.rfc||i.customer?.taxId||'Sin RFC fiscal'}</small></div><span>{date(i.issueDate)}</span><Badge tone={statusTone[i.status]}>{statusLabel[i.status]}</Badge><b>{money(i.total)}</b><div className={styles.actions}>{i.status==='READY'||i.status==='ERROR'?<button onClick={()=>onStamp(i)}><Stamp size={15}/> Timbrado</button>:null}{i.status==='STAMPED'||i.status==='CANCEL_PENDING'?<button onClick={()=>onCancel(i)}><Ban size={15}/> Cancelar</button>:null}{i.xmlUrl?<a href={i.xmlUrl} target="_blank" rel="noreferrer">XML</a>:null}{i.pdfUrl?<a href={i.pdfUrl} target="_blank" rel="noreferrer">PDF</a>:null}</div></article>)}</div></Card>}
function Customers({customers,onEdit}){return <Card className={styles.tableCard}><Section title="Receptores fiscales" eyebrow="CFDI 4.0"/><div className={styles.customerGrid}>{customers.map(c=><article key={c.id}><span className={styles.bigIcon}><Users size={20}/></span><div><strong>{c.commercialName||c.legalName}</strong><small>{c.fiscalProfile?.legalName||'Sin razón social fiscal'}</small><p>{c.fiscalProfile?`${c.fiscalProfile.rfc} · Régimen ${c.fiscalProfile.fiscalRegime} · CP ${c.fiscalProfile.postalCode}`:'Completa RFC, régimen y domicilio fiscal para poder facturar.'}</p></div><Badge tone={c.fiscalProfile?'success':'warning'}>{c.fiscalProfile?'Completo':'Pendiente'}</Badge><Button variant="ghost" onClick={()=>onEdit(c)}>Editar</Button></article>)}</div></Card>}
function Payments({data,onNew,onStamp}){return <div className={styles.paymentsGrid}><Card className={styles.paymentCard}><div className={styles.cardAction}><Section title="Complementos de pago" eyebrow="Recepción de pagos 2.0"/><Button icon={Plus} onClick={onNew}>Preparar complemento</Button></div><div className={styles.rows}>{data.paymentComplements.map(p=><article key={p.id}><span className={styles.docIcon}><ReceiptText size={17}/></span><div><strong>{p.series?`${p.series}-`:''}{p.folio}</strong><small>{p.customer?.commercialName||p.customer?.legalName} · {p.uuid||'Sin UUID'}</small></div><Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>{p.status==='READY'?<button className={styles.linkButton} onClick={()=>onStamp(p)}>Registrar timbrado</button>:null}</article>)}</div></Card><Card className={styles.cancelCard}><Section title="Cancelaciones" eyebrow="Historial"/><div className={styles.rows}>{data.invoices.flatMap(i=>i.cancellations.map(c=>({...c,invoice:i}))).slice(0,12).map(c=><article key={c.id}><span className={styles.docIcon}><Ban size={17}/></span><div><strong>{c.invoice.folio}</strong><small>Motivo {c.reasonCode} · {date(c.requestedAt)}</small></div><Badge tone={c.status==='ACCEPTED'?'success':c.status==='REQUESTED'?'warning':'danger'}>{c.status}</Badge></article>)}</div></Card></div>}
function PaymentModal({value,setValue,data,saving,onClose,onSubmit}){const selected=data.invoices.find(i=>i.id===value.fiscalInvoiceId);return <Modal title="Preparar complemento de pago" eyebrow="Pagos 2.0" onClose={onClose}><form onSubmit={onSubmit}><div className={styles.modalBody}><label>Cobro aplicado<select required value={value.collectionReceiptId} onChange={e=>setValue(v=>({...v,collectionReceiptId:e.target.value}))}><option value="">Seleccionar…</option>{data.receipts.filter(r=>!r.fiscalPaymentComplement).map(r=><option key={r.id} value={r.id}>{r.folio} · {r.customer?.commercialName||r.customer?.legalName} · {money(r.amount)}</option>)}</select></label><label>CFDI relacionado<select required value={value.fiscalInvoiceId} onChange={e=>{const i=data.invoices.find(x=>x.id===e.target.value);setValue(v=>({...v,fiscalInvoiceId:e.target.value,documentUuid:i?.uuid||'',previousBalance:i?String(i.total):''}))}}><option value="">Seleccionar CFDI timbrado…</option>{data.invoices.filter(i=>i.status==='STAMPED'&&i.uuid).map(i=><option key={i.id} value={i.id}>{i.folio} · {i.uuid} · {money(i.total)}</option>)}</select></label><div className={styles.grid3}><Input label="Serie" value={value.series} onChange={e=>setValue(v=>({...v,series:e.target.value}))}/><Input label="Folio" required value={value.folio} onChange={e=>setValue(v=>({...v,folio:e.target.value}))}/><Input label="CP expedición" required value={value.placeOfIssue} onChange={e=>setValue(v=>({...v,placeOfIssue:e.target.value}))}/></div><div className={styles.grid3}><Input label="Forma pago" required value={value.paymentForm} onChange={e=>setValue(v=>({...v,paymentForm:e.target.value}))}/><Input label="Parcialidad" type="number" min="1" value={value.installment} onChange={e=>setValue(v=>({...v,installment:e.target.value}))}/><Input label="Saldo anterior" type="number" min="0.01" required value={value.previousBalance} onChange={e=>setValue(v=>({...v,previousBalance:e.target.value}))}/></div><Input label="Monto pagado aplicado" type="number" min="0.01" required value={value.paidAmount} onChange={e=>setValue(v=>({...v,paidAmount:e.target.value}))}/>{selected?<small className={styles.helper}>UUID relacionado: {selected.uuid}</small>:null}</div><Footer onClose={onClose} saving={saving}/></form></Modal>}
function StampModal({title,doc,saving,onClose,onSubmit}){const [v,setV]=useState({uuid:doc.uuid||'',stampedAt:new Date().toISOString().slice(0,16),pacProvider:doc.pacProvider||'',xmlUrl:doc.xmlUrl||'',pdfUrl:doc.pdfUrl||'',certificateNumber:'',satCertificate:'',satStatus:'Vigente'});return <Modal title={title} eyebrow={doc.folio} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSubmit({...v,stampedAt:v.stampedAt})}}><div className={styles.modalBody}><Input label="UUID" required value={v.uuid} onChange={e=>setV(x=>({...x,uuid:e.target.value.toUpperCase()}))}/><div className={styles.grid2}><Input label="Fecha/hora timbrado" type="datetime-local" required value={v.stampedAt} onChange={e=>setV(x=>({...x,stampedAt:e.target.value}))}/><Input label="PAC / proveedor" value={v.pacProvider} onChange={e=>setV(x=>({...x,pacProvider:e.target.value}))}/></div><div className={styles.grid2}><Input label="XML URL" value={v.xmlUrl} onChange={e=>setV(x=>({...x,xmlUrl:e.target.value}))}/><Input label="PDF URL" value={v.pdfUrl} onChange={e=>setV(x=>({...x,pdfUrl:e.target.value}))}/></div></div><Footer onClose={onClose} saving={saving}/></form></Modal>}
function CancelForm({saving,onClose,onSubmit}){const [v,setV]=useState({reasonCode:'02',replacementUuid:'',status:'REQUESTED',satResponse:'',notes:''});return <form onSubmit={e=>{e.preventDefault();onSubmit({...v,replacementUuid:v.replacementUuid||null,satResponse:v.satResponse||null,notes:v.notes||null})}}><div className={styles.modalBody}><div className={styles.grid2}><Input label="Motivo cancelación" required value={v.reasonCode} onChange={e=>setV(x=>({...x,reasonCode:e.target.value}))}/><label>Resultado<select value={v.status} onChange={e=>setV(x=>({...x,status:e.target.value}))}><option value="REQUESTED">Solicitada</option><option value="ACCEPTED">Aceptada</option><option value="REJECTED">Rechazada</option><option value="NOT_REQUIRED">No requerida</option><option value="ERROR">Error</option></select></label></div><Input label="UUID sustitución (si aplica)" value={v.replacementUuid} onChange={e=>setV(x=>({...x,replacementUuid:e.target.value}))}/></div><Footer onClose={onClose} saving={saving}/></form>}
function Check({ok,text}){return <div className={ok?styles.checkOk:styles.checkPending}>{ok?<CheckCircle2 size={18}/>:<FileClock size={18}/>}<span>{text}</span><b>{ok?'Listo':'Pendiente'}</b></div>}
function Section({title,eyebrow}){return <header className={styles.section}><span>{eyebrow}</span><h3>{title}</h3></header>}
function Modal({title,eyebrow,onClose,children}){return <div className={styles.overlay} onMouseDown={onClose}><div className={styles.modal} onMouseDown={e=>e.stopPropagation()}><header className={styles.modalHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={19}/></button></header>{children}</div></div>}
function Footer({onClose,saving}){return <footer className={styles.modalFooter}><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>Guardar</Button></footer>}
