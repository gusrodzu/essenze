import {useEffect,useMemo,useState} from 'react';
import {
  Building2,Check,ChevronRight,ContactRound,GitMerge,MapPin,
  Plus,RefreshCw,Search,ShieldCheck,Tags,UsersRound,Waypoints,X
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import {DetailDrawer} from '../components/module-system';
import styles from './BusinessParties.module.css';

const roleLabel={
  CUSTOMER:'Cliente',
  SUPPLIER:'Proveedor',
  LEAD:'Lead',
  CONTACT:'Contacto',
  PARTNER:'Socio',
  OTHER:'Otro'
};

const addressLabel={
  FISCAL:'Fiscal',
  BILLING:'Facturación',
  SHIPPING:'Envío',
  OFFICE:'Oficina',
  OTHER:'Otro'
};

const emptyParty={
  type:'ORGANIZATION',
  displayName:'',
  legalName:'',
  commercialName:'',
  taxId:'',
  email:'',
  phone:'',
  website:'',
  notes:'',
  tags:[],
  active:true,
  roles:['OTHER']
};

const emptyContact={
  name:'',
  jobTitle:'',
  department:'',
  email:'',
  phone:'',
  mobile:'',
  primary:false,
  active:true
};

const emptyAddress={
  type:'FISCAL',
  label:'Fiscal',
  street:'',
  exterior:'',
  interior:'',
  neighborhood:'',
  city:'',
  state:'',
  postalCode:'',
  country:'MX',
  primary:false,
  active:true
};

function scoreTone(score){
  if(score>=85)return 'success';
  if(score>=65)return 'info';
  if(score>=40)return 'warning';
  return 'danger';
}

function displayAddress(address){
  return [
    address.street,
    address.exterior,
    address.interior&&`Int. ${address.interior}`,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
    address.country
  ].filter(Boolean).join(', ');
}

export default function BusinessParties(){
  const [data,setData]=useState({summary:{coverage:{}},roles:{},parties:[]});
  const [query,setQuery]=useState('');
  const [role,setRole]=useState('ALL');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);

  const [selectedId,setSelectedId]=useState(null);
  const [detail,setDetail]=useState(null);
  const [detailBusy,setDetailBusy]=useState(false);
  const [drawerTab,setDrawerTab]=useState('summary');

  const [partyModal,setPartyModal]=useState(false);
  const [partyForm,setPartyForm]=useState(emptyParty);

  const [contactModal,setContactModal]=useState(false);
  const [contactForm,setContactForm]=useState(emptyContact);

  const [addressModal,setAddressModal]=useState(false);
  const [addressForm,setAddressForm]=useState(emptyAddress);

  const [duplicatesOpen,setDuplicatesOpen]=useState(false);
  const [duplicates,setDuplicates]=useState({total:0,highConfidence:0,candidates:[]});
  const [duplicatesBusy,setDuplicatesBusy]=useState(false);

  const load=async()=>{
    try{
      const next=await apiRequest('/business-parties/dashboard');
      setData(next);
      return next;
    }catch(error){
      setMsg(['error',error.message]);
    }
  };

  const loadDetail=async id=>{
    if(!id)return;
    setDrawerTab('summary');
    setSelectedId(id);
    setDetail(null);
    setDetailBusy(true);
    try{
      const result=await apiRequest(`/business-parties/${id}`);
      setDetail(result.party);
      setSelectedId(id);
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setDetailBusy(false);
    }
  };

  useEffect(()=>{load()},[]);

  const sync=async()=>{
    setBusy(true);
    try{
      const result=await apiRequest('/business-parties/sync',{method:'POST',body:{}});
      setMsg([
        'success',
        `Sincronización completa: ${result.created} nuevos, ${result.updated} actualizados y ${result.merged} unificados.`
      ]);
      await load();
      if(selectedId)await loadDetail(selectedId);
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return (data.parties||[]).filter(p=>{
      const matchesText=!needle||[
        p.displayName,p.legalName,p.commercialName,p.taxId,p.email,p.phone,
        ...(p.tags||[])
      ].some(x=>String(x||'').toLowerCase().includes(needle));

      const matchesRole=role==='ALL'||p.roles?.some(r=>r.active&&r.role===role);
      return matchesText&&matchesRole;
    });
  },[data.parties,query,role]);

  const openCreate=()=>{
    setSelectedId(null);
    setPartyForm(emptyParty);
    setPartyModal(true);
  };

  const openEdit=()=>{
    if(!detail)return;
    setSelectedId(null);
    setPartyForm({
      type:detail.type,
      displayName:detail.displayName||'',
      legalName:detail.legalName||'',
      commercialName:detail.commercialName||'',
      taxId:detail.taxId||'',
      email:detail.email||'',
      phone:detail.phone||'',
      website:detail.website||'',
      notes:detail.notes||'',
      tags:detail.tags||[],
      active:detail.active,
      roles:detail.roles?.filter(r=>r.active).map(r=>r.role)||['OTHER']
    });
    setPartyModal(true);
  };

  const saveParty=async event=>{
    event.preventDefault();
    setBusy(true);
    try{
      const body={
        ...partyForm,
        tags:(partyForm.tags||[]).map(x=>String(x).trim()).filter(Boolean)
      };

      const result=detail&&partyForm.__editing
        ?await apiRequest(`/business-parties/${detail.id}`,{method:'PUT',body})
        :await apiRequest('/business-parties',{method:'POST',body});

      setPartyModal(false);
      setMsg(['success',partyForm.__editing?'Tercero actualizado.':'Tercero creado.']);
      await load();
      await loadDetail(result.party.id);
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const editParty=()=>{
    openEdit();
    setPartyForm(current=>({...current,__editing:true}));
  };

  const saveContact=async event=>{
    event.preventDefault();
    if(!detail)return;
    setBusy(true);
    try{
      await apiRequest(`/business-parties/${detail.id}/contacts`,{
        method:'POST',
        body:contactForm
      });
      setContactModal(false);
      setContactForm(emptyContact);
      setMsg(['success','Contacto agregado.']);
      await loadDetail(detail.id);
      await load();
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const saveAddress=async event=>{
    event.preventDefault();
    if(!detail)return;
    setBusy(true);
    try{
      await apiRequest(`/business-parties/${detail.id}/addresses`,{
        method:'POST',
        body:addressForm
      });
      setAddressModal(false);
      setAddressForm(emptyAddress);
      setMsg(['success','Dirección agregada.']);
      await loadDetail(detail.id);
      await load();
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const scanDuplicates=async()=>{
    setDuplicatesOpen(true);
    setDuplicatesBusy(true);
    try{
      setDuplicates(await apiRequest('/business-parties/duplicates'));
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setDuplicatesBusy(false);
    }
  };

  const mergeCandidate=async(candidate,targetSide)=>{
    const target=targetSide==='left'?candidate.left:candidate.right;
    const source=targetSide==='left'?candidate.right:candidate.left;

    const ok=window.confirm(
      `¿Fusionar "${source.displayName}" dentro de "${target.displayName}"?\n\n`+
      'El origen quedará inactivo y BuzzBee conservará el historial de la operación.'
    );
    if(!ok)return;

    setBusy(true);
    try{
      await apiRequest('/business-parties/merge',{
        method:'POST',
        body:{
          sourcePartyId:source.id,
          targetPartyId:target.id,
          reason:'Fusión manual desde Terceros 360'
        }
      });

      setMsg(['success',`"${source.displayName}" fue fusionado en "${target.displayName}".`]);
      await load();
      await scanDuplicates();
      await loadDetail(target.id);
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  return <div className={styles.page}>
    <header className={styles.header}>
      <div>
        <span>BuzzBee Core · Business Data</span>
        <h1>Terceros 360</h1>
        <p>Una sola identidad para clientes, proveedores, contactos, direcciones y relaciones empresariales.</p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={scanDuplicates}><GitMerge size={16}/> Duplicados</Button>
        <Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualizar</Button>
        <Button disabled={busy} onClick={sync}><Waypoints size={16}/> {busy?'Sincronizando...':'Sincronizar'}</Button>
        <Button onClick={openCreate}><Plus size={16}/> Nuevo tercero</Button>
      </div>
    </header>

    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}

    <KpiGrid>
      <KpiCard>
        <UsersRound/>
        <span>Terceros únicos</span>
        <KpiInfo title="Terceros únicos">Identidades empresariales consolidadas sin duplicar el mismo tercero por módulo.</KpiInfo>
        <strong>{data.summary.parties||0}</strong>
        <small>{data.summary.active||0} activos</small>
      </KpiCard>

      <KpiCard>
        <Waypoints/>
        <span>Roles combinados</span>
        <KpiInfo title="Roles combinados">Terceros que operan simultáneamente como cliente y proveedor.</KpiInfo>
        <strong>{data.summary.unified||0}</strong>
        <small>Cliente + proveedor</small>
      </KpiCard>

      <KpiCard>
        <ShieldCheck/>
        <span>Calidad de perfiles</span>
        <KpiInfo title="Calidad de perfiles">Promedio de completitud de identidad, contacto, dirección, roles y vínculos operativos.</KpiInfo>
        <strong>{data.summary.averageProfileScore??0}%</strong>
        <small>Score promedio Core</small>
      </KpiCard>

      <KpiCard>
        <Building2/>
        <span>Cobertura operativa</span>
        <KpiInfo title="Cobertura operativa">Promedio de clientes y proveedores existentes vinculados con el núcleo de terceros.</KpiInfo>
        <strong>{Math.round(((data.summary.coverage?.customers??0)+(data.summary.coverage?.suppliers??0))/2)}%</strong>
        <small>Clientes {data.summary.coverage?.customers??0}% · Proveedores {data.summary.coverage?.suppliers??0}%</small>
      </KpiCard>
    </KpiGrid>

    <Card className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={16}/>
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="Buscar nombre, RFC, correo, teléfono o tag..."
        />
      </label>

      <select value={role} onChange={e=>setRole(e.target.value)}>
        <option value="ALL">Todos los roles</option>
        {Object.entries(roleLabel).map(([value,label])=>
          <option value={value} key={value}>{label}</option>
        )}
      </select>
    </Card>

    <div className={styles.workspace}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Directorio empresarial</h2>
            <p>{filtered.length} tercero(s) visibles</p>
          </div>
        </div>

        <div className={styles.list}>
          {filtered.length===0?<div className={styles.empty}>
            <UsersRound size={26}/>
            <strong>No hay terceros visibles</strong>
            <p>Sincroniza clientes y proveedores existentes o crea una nueva identidad.</p>
          </div>:filtered.map(p=><button
            type="button"
            className={`${styles.partyRow} ${selectedId===p.id?styles.selected:''}`}
            key={p.id}
            onClick={()=>loadDetail(p.id)}
          >
            <div className={styles.identity}>
              <span>{p.type==='PERSON'?'Persona':'Organización'}</span>
              <h3>{p.displayName}</h3>
              <p>{p.taxId||p.email||'Sin identificador fiscal/correo'}</p>
            </div>

            <div className={styles.roles}>
              {p.roles?.filter(r=>r.active).map(r=>
                <Badge key={r.id} tone={r.role==='CUSTOMER'?'info':r.role==='SUPPLIER'?'warning':'neutral'}>
                  {roleLabel[r.role]||r.role}
                </Badge>
              )}
            </div>

            <div className={styles.links}>
              {p.contacts?.[0]?<span><ContactRound size={13}/> {p.contacts[0].name}</span>:null}
              {p.addresses?.[0]?<span><MapPin size={13}/> {p.addresses[0].city||p.addresses[0].state||p.addresses[0].label}</span>:null}
            </div>

            <div className={styles.rowEnd}>
              <Badge tone={scoreTone(p.profile?.score||0)}>{p.profile?.score||0}%</Badge>
              <ChevronRight size={17}/>
            </div>
          </button>)}
        </div>
      </Card>

    </div>

    <DetailDrawer
      open={Boolean(selectedId)}
      onClose={()=>{setSelectedId(null);setDetail(null)}}
      title={detail?.displayName||'Tercero'}
      subtitle={detail?.type==='PERSON'?'Persona':'Organización'}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      tabs={[
        {id:'summary',label:'Resumen'},
        {id:'contacts',label:'Contactos'},
        {id:'addresses',label:'Direcciones'},
        {id:'roles',label:'Roles y tags'},
        {id:'links',label:'Vínculos'}
      ]}
      footer={detail?<Button variant="secondary" onClick={editParty}>Editar tercero</Button>:null}
    >
      {detailBusy?<div className={styles.detailEmpty}>Cargando perfil…</div>:null}
      {!detailBusy&&detail&&drawerTab==='summary'?<>
        <section className={styles.summaryGrid}>
          <div><span>RFC / Tax ID</span><strong>{detail.taxId||'—'}</strong></div>
          <div><span>Correo</span><strong>{detail.email||'—'}</strong></div>
          <div><span>Teléfono</span><strong>{detail.phone||'—'}</strong></div>
          <div><span>Web</span><strong>{detail.website||'—'}</strong></div>
        </section>
        <section className={styles.detailSection}>
          <div className={styles.sectionHead}><div><Waypoints size={17}/><strong>Perfil 360</strong></div></div>
          <div className={styles.operationalLinks}>
            <div><span>Score de perfil</span><strong>{detail.profile?.score||0}%</strong></div>
            <div><span>Nombre legal / comercial</span><strong>{detail.legalName||detail.commercialName||detail.displayName}</strong></div>
          </div>
        </section>
        {detail.mergeHistory?.length?<section className={styles.detailSection}>
          <div className={styles.sectionHead}><div><GitMerge size={17}/><strong>Historial de fusiones</strong></div></div>
          <div className={styles.history}>{detail.mergeHistory.map(item=><div key={item.id}>
            <strong>{item.targetPartyId===detail.id?'Recibió una identidad':'Fue fusionado'}</strong>
            <span>{new Date(item.createdAt).toLocaleString('es-MX')}</span>
            {item.reason?<p>{item.reason}</p>:null}
          </div>)}</div>
        </section>:null}
      </>:null}

      {!detailBusy&&detail&&drawerTab==='contacts'?<section className={styles.detailSection}>
        <div className={styles.sectionHead}>
          <div><ContactRound size={17}/><strong>Contactos</strong></div>
          <button onClick={()=>{setSelectedId(null);setContactForm(emptyContact);setContactModal(true)}}><Plus size={15}/> Agregar</button>
        </div>
        <div className={styles.miniList}>
          {detail.contacts?.length?detail.contacts.map(contact=><div key={contact.id}>
            <div><strong>{contact.name}</strong><span>{contact.jobTitle||contact.department||'Contacto'}</span></div>
            <p>{[contact.email,contact.phone||contact.mobile].filter(Boolean).join(' · ')||'Sin datos de contacto'}</p>
            {contact.primary?<Badge tone="info">Principal</Badge>:null}
          </div>):<p className={styles.muted}>No hay contactos registrados.</p>}
        </div>
      </section>:null}

      {!detailBusy&&detail&&drawerTab==='addresses'?<section className={styles.detailSection}>
        <div className={styles.sectionHead}>
          <div><MapPin size={17}/><strong>Direcciones</strong></div>
          <button onClick={()=>{setSelectedId(null);setAddressForm(emptyAddress);setAddressModal(true)}}><Plus size={15}/> Agregar</button>
        </div>
        <div className={styles.miniList}>
          {detail.addresses?.length?detail.addresses.map(address=><div key={address.id}>
            <div><strong>{address.label}</strong><span>{addressLabel[address.type]||address.type}</span></div>
            <p>{displayAddress(address)||'Dirección incompleta'}</p>
            {address.primary?<Badge tone="info">Principal</Badge>:null}
          </div>):<p className={styles.muted}>No hay direcciones registradas.</p>}
        </div>
      </section>:null}

      {!detailBusy&&detail&&drawerTab==='roles'?<section className={styles.detailSection}>
        <div className={styles.sectionHead}><div><Tags size={17}/><strong>Roles y tags</strong></div></div>
        <div className={styles.tagCloud}>
          {detail.roles?.filter(r=>r.active).map(r=><Badge key={r.id} tone="neutral">{roleLabel[r.role]||r.role}</Badge>)}
          {detail.tags?.map(tag=><Badge key={tag} tone="info">#{tag}</Badge>)}
        </div>
      </section>:null}

      {!detailBusy&&detail&&drawerTab==='links'?<section className={styles.detailSection}>
        <div className={styles.sectionHead}><div><Building2 size={17}/><strong>Vínculos operativos</strong></div></div>
        <div className={styles.operationalLinks}>
          <div><span>Cliente</span><strong>{detail.customer?`${detail.customer.code} · ${detail.customer.commercialName||detail.customer.legalName}`:'Sin vínculo'}</strong></div>
          <div><span>Proveedor</span><strong>{detail.supplier?`${detail.supplier.code} · ${detail.supplier.commercialName||detail.supplier.legalName}`:'Sin vínculo'}</strong></div>
        </div>
      </section>:null}
    </DetailDrawer>


    <Card className={styles.note}>
      <Waypoints size={20}/>
      <div>
        <strong>El núcleo de terceros mantiene compatibilidad con Clientes y Proveedores</strong>
        <p>La unificación es progresiva. Las entidades operativas actuales continúan funcionando mientras BuzzBee construye una identidad maestra para CRM, compras, ventas, finanzas, integraciones e IA.</p>
      </div>
    </Card>

    <DetailDrawer
      open={partyModal}
      onClose={()=>setPartyModal(false)}
      title={partyForm.__editing?'Editar tercero':'Nuevo tercero'}
      subtitle="Identidad maestra · Business Party"
      footer={<div className={styles.drawerFormActions}>
        <Button type="button" variant="secondary" onClick={()=>setPartyModal(false)}>Cancelar</Button>
        <Button type="submit" form="party-drawer-form" disabled={busy}><Check size={16}/> Guardar</Button>
      </div>}
    >
      <form id="party-drawer-form" className={styles.drawerForm} onSubmit={saveParty}>
        <div className={styles.formGrid}>
          <label>Tipo<select value={partyForm.type} onChange={e=>setPartyForm({...partyForm,type:e.target.value})}>
            <option value="ORGANIZATION">Organización</option>
            <option value="PERSON">Persona</option>
          </select></label>
          <label className={styles.span2}>Nombre visible<input required value={partyForm.displayName} onChange={e=>setPartyForm({...partyForm,displayName:e.target.value})}/></label>
          <label>Razón social<input value={partyForm.legalName} onChange={e=>setPartyForm({...partyForm,legalName:e.target.value})}/></label>
          <label>Nombre comercial<input value={partyForm.commercialName} onChange={e=>setPartyForm({...partyForm,commercialName:e.target.value})}/></label>
          <label>RFC / Tax ID<input value={partyForm.taxId} onChange={e=>setPartyForm({...partyForm,taxId:e.target.value})}/></label>
          <label>Correo<input type="email" value={partyForm.email} onChange={e=>setPartyForm({...partyForm,email:e.target.value})}/></label>
          <label>Teléfono<input value={partyForm.phone} onChange={e=>setPartyForm({...partyForm,phone:e.target.value})}/></label>
          <label>Website<input value={partyForm.website} onChange={e=>setPartyForm({...partyForm,website:e.target.value})}/></label>
          <fieldset className={styles.span2}>
            <legend>Roles</legend>
            <div className={styles.checks}>
              {Object.entries(roleLabel).map(([value,label])=><label key={value}>
                <input
                  type="checkbox"
                  checked={partyForm.roles.includes(value)}
                  onChange={e=>{
                    const next=e.target.checked
                      ?[...new Set([...partyForm.roles,value])]
                      :partyForm.roles.filter(x=>x!==value);
                    setPartyForm({...partyForm,roles:next.length?next:['OTHER']});
                  }}
                /> {label}
              </label>)}
            </div>
          </fieldset>
          <label className={styles.span2}>Tags
            <input
              value={(partyForm.tags||[]).join(', ')}
              onChange={e=>setPartyForm({...partyForm,tags:e.target.value.split(',')})}
              placeholder="premium, distribuidor, norte..."
            />
          </label>
          <label className={styles.span2}>Notas<textarea rows="3" value={partyForm.notes} onChange={e=>setPartyForm({...partyForm,notes:e.target.value})}/></label>
        </div>
      </form>
    </DetailDrawer>

    <DetailDrawer
      open={contactModal}
      onClose={()=>setContactModal(false)}
      title="Agregar contacto"
      subtitle={detail?.displayName||'Tercero'}
      footer={<div className={styles.drawerFormActions}>
        <Button type="button" variant="secondary" onClick={()=>setContactModal(false)}>Cancelar</Button>
        <Button type="submit" form="contact-drawer-form" disabled={busy}>Agregar contacto</Button>
      </div>}
    >
      <form id="contact-drawer-form" className={styles.drawerForm} onSubmit={saveContact}>
        <div className={styles.formGrid}>
          <label className={styles.span2}>Nombre<input required value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})}/></label>
          <label>Cargo<input value={contactForm.jobTitle} onChange={e=>setContactForm({...contactForm,jobTitle:e.target.value})}/></label>
          <label>Área<input value={contactForm.department} onChange={e=>setContactForm({...contactForm,department:e.target.value})}/></label>
          <label>Correo<input type="email" value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})}/></label>
          <label>Teléfono<input value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})}/></label>
          <label>Móvil<input value={contactForm.mobile} onChange={e=>setContactForm({...contactForm,mobile:e.target.value})}/></label>
          <label className={styles.checkbox}><input type="checkbox" checked={contactForm.primary} onChange={e=>setContactForm({...contactForm,primary:e.target.checked})}/> Contacto principal</label>
        </div>
      </form>
    </DetailDrawer>

    <DetailDrawer
      open={addressModal}
      onClose={()=>setAddressModal(false)}
      title="Agregar dirección"
      subtitle={detail?.displayName||'Tercero'}
      footer={<div className={styles.drawerFormActions}>
        <Button type="button" variant="secondary" onClick={()=>setAddressModal(false)}>Cancelar</Button>
        <Button type="submit" form="address-drawer-form" disabled={busy}>Agregar dirección</Button>
      </div>}
    >
      <form id="address-drawer-form" className={styles.drawerForm} onSubmit={saveAddress}>
        <div className={styles.formGrid}>
          <label>Tipo<select value={addressForm.type} onChange={e=>setAddressForm({...addressForm,type:e.target.value})}>
            {Object.entries(addressLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Etiqueta<input value={addressForm.label} onChange={e=>setAddressForm({...addressForm,label:e.target.value})}/></label>
          <label className={styles.span2}>Calle<input value={addressForm.street} onChange={e=>setAddressForm({...addressForm,street:e.target.value})}/></label>
          <label>Exterior<input value={addressForm.exterior} onChange={e=>setAddressForm({...addressForm,exterior:e.target.value})}/></label>
          <label>Interior<input value={addressForm.interior} onChange={e=>setAddressForm({...addressForm,interior:e.target.value})}/></label>
          <label>Colonia<input value={addressForm.neighborhood} onChange={e=>setAddressForm({...addressForm,neighborhood:e.target.value})}/></label>
          <label>Ciudad<input value={addressForm.city} onChange={e=>setAddressForm({...addressForm,city:e.target.value})}/></label>
          <label>Estado<input value={addressForm.state} onChange={e=>setAddressForm({...addressForm,state:e.target.value})}/></label>
          <label>Código postal<input value={addressForm.postalCode} onChange={e=>setAddressForm({...addressForm,postalCode:e.target.value})}/></label>
          <label>País<input maxLength="2" value={addressForm.country} onChange={e=>setAddressForm({...addressForm,country:e.target.value.toUpperCase()})}/></label>
          <label className={styles.checkbox}><input type="checkbox" checked={addressForm.primary} onChange={e=>setAddressForm({...addressForm,primary:e.target.checked})}/> Dirección principal</label>
        </div>
      </form>
    </DetailDrawer>

    {duplicatesOpen?<div className={styles.backdrop}>
      <div className={styles.duplicatesModal}>
        <header>
          <div>
            <strong>Centro de deduplicación</strong>
            <span>{duplicates.highConfidence} coincidencia(s) de alta confianza · {duplicates.total} candidato(s)</span>
          </div>
          <button type="button" onClick={()=>setDuplicatesOpen(false)}><X size={18}/></button>
        </header>

        <div className={styles.duplicateBody}>
          {duplicatesBusy?<div className={styles.detailEmpty}>Analizando identidades…</div>:
          duplicates.candidates.length===0?<div className={styles.detailEmpty}>
            <ShieldCheck size={28}/>
            <strong>No encontramos duplicados evidentes</strong>
            <p>RFC, correo, teléfono y nombres fueron comparados.</p>
          </div>:duplicates.candidates.map(candidate=><div className={styles.duplicateCard} key={candidate.id}>
            <div className={styles.confidence}>
              <Badge tone={candidate.confidence>=85?'warning':'neutral'}>{candidate.confidence}% coincidencia</Badge>
              <span>{candidate.reasons.map(x=>x.label).join(' · ')}</span>
            </div>

            <div className={styles.compare}>
              {[['left',candidate.left],['right',candidate.right]].map(([side,party])=><div key={side}>
                <strong>{party.displayName}</strong>
                <p>{party.taxId||party.email||party.phone||'Sin identificador'}</p>
                <small>Score {party.profile?.score||0}%</small>
                <Button
                  disabled={busy}
                  variant={side==='left'?'primary':'secondary'}
                  onClick={()=>mergeCandidate(candidate,side)}
                >
                  <GitMerge size={15}/> Conservar este
                </Button>
              </div>)}
            </div>
          </div>)}
        </div>
      </div>
    </div>:null}
  </div>;
}
