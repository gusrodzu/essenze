import {X, Search, SlidersHorizontal, Columns3, FileText, Info, CheckCircle2} from 'lucide-react';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import styles from './ModuleSystem.module.css';

export function ModuleHeader({eyebrow,title,description,status,actions,children}){
  return <header className={styles.moduleHeader}>
    <div className={styles.headerCopy}>
      {eyebrow?<span className={styles.eyebrow}>{eyebrow}</span>:null}
      <h1>{title}</h1>
      {description?<p>{description}</p>:null}
      {children}
    </div>
    <div className={styles.headerSide}>
      {status?<div className={styles.statusSlot}>{status}</div>:null}
      {actions?<div className={styles.headerActions}>{actions}</div>:null}
    </div>
  </header>;
}

export function ModuleTabs({items=[],active,onChange,inline=false,label='Navegación interna'}){
  const [target,setTarget]=useState(null);

  useEffect(()=>{
    if(inline)return;
    setTarget(document.getElementById('module-local-tabs'));
  },[inline]);

  const content=<nav className={styles.tabs} aria-label={label} data-module-local-tabs="true">
    {items.map(item=>{
      const Icon=item.icon;
      const selected=item.id===active;
      if(item.to){
        return <Link key={item.id} to={item.to} className={selected?styles.tabActive:styles.tab}>
          {Icon?<Icon size={16}/>:null}<span>{item.label}</span>
          {item.count!==undefined?<b>{item.count}</b>:null}
        </Link>;
      }
      return <button type="button" key={item.id} onClick={()=>onChange?.(item.id)} className={selected?styles.tabActive:styles.tab}>
        {Icon?<Icon size={16}/>:null}<span>{item.label}</span>
        {item.count!==undefined?<b>{item.count}</b>:null}
      </button>;
    })}
  </nav>;

  if(inline)return content;
  return target?createPortal(content,target):null;
}

export function ModuleToolbar({
  title,description,query,onQueryChange,placeholder='Buscar…',
  filtersLabel='Filtros',columnsLabel='Columnas',actions,children
}){
  return <div className={styles.toolbar}>
    <div className={styles.toolbarCopy}>
      {title?<h2>{title}</h2>:null}
      {description?<p>{description}</p>:null}
    </div>
    <div className={styles.toolbarActions}>
      {query!==undefined?<label className={styles.search}>
        <Search size={16}/>
        <input value={query} onChange={e=>onQueryChange?.(e.target.value)} placeholder={placeholder}/>
      </label>:null}
      {children}
      {filtersLabel?<button type="button" className={styles.utilityButton} disabled title="Los filtros avanzados se habilitan cuando el módulo los define"><SlidersHorizontal size={15}/>{filtersLabel}</button>:null}
      {columnsLabel?<button type="button" className={styles.utilityButton} disabled title="La selección de columnas se habilita cuando la tabla la define"><Columns3 size={15}/>{columnsLabel}</button>:null}
      {actions}
    </div>
  </div>;
}

export function DataTableFrame({children,empty,footer}){
  return <div className={styles.tableFrame}>
    <div className={styles.tableScroller}>{children}</div>
    {empty?<div className={styles.empty}>{empty}</div>:null}
    {footer?<div className={styles.tableFooter}>{footer}</div>:null}
  </div>;
}

export function AttentionPanel({title='Requiere atención',description,icon:Icon,children,className=''}) {
  return <section className={`${styles.attentionPanel} ${className}`}>
    <header>
      <div><h2>{title}</h2>{description?<p>{description}</p>:null}</div>
      {Icon?<Icon size={20}/>:null}
    </header>
    <div className={styles.attentionBody}>{children}</div>
  </section>;
}

export function RecordModal({
  open,onClose,title,subtitle,tabs=[],activeTab,onTabChange,children,footer,size='md',
  eyebrow='Detalle',icon:Icon=FileText,status,meta=[]
}){
  if(!open)return null;
  return <div className={styles.drawerLayer}>
    <button type="button" className={styles.drawerBackdrop} aria-label="Cerrar modal" onClick={onClose}/>
    <section
      className={`${styles.drawer} ${size==='lg'?styles.modalLarge:size==='sm'?styles.modalSmall:''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title||'Detalle'}
    >
      <header className={styles.recordModalHeader}>
        <div className={styles.recordModalIdentity}>
          <span className={styles.recordModalIcon}><Icon size={23}/></span>
          <div className={styles.recordModalCopy}>
            <span className={styles.recordModalEyebrow}>{eyebrow}</span>
            <strong>{title}</strong>
            {subtitle?<span className={styles.recordModalSubtitle}>{subtitle}</span>:null}
            {meta?.length?<div className={styles.recordModalMeta}>{meta.filter(Boolean).map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>:null}
          </div>
        </div>
        <div className={styles.recordModalHeaderActions}>
          {status?<div className={styles.recordModalStatus}>{status}</div>:null}
          <button type="button" className={styles.recordModalClose} onClick={onClose} aria-label="Cerrar"><X size={19}/></button>
        </div>
      </header>
      {tabs.length?<ModuleTabs items={tabs} active={activeTab} onChange={onTabChange} inline label="Pestañas del modal"/>:null}
      <div className={styles.drawerBody}>{children}</div>
      {footer?<footer className={styles.drawerFooter}>{footer}</footer>:null}
    </section>
  </div>;
}


export function ModalSection({title,icon:Icon=Info,description,children,className=''}) {
  return <section className={`${styles.modalSection} ${className}`}>
    {(title||description)?<header className={styles.modalSectionHeader}>
      {Icon?<span className={styles.modalSectionIcon}><Icon size={17}/></span>:null}
      <div>{title?<h3>{title}</h3>:null}{description?<p>{description}</p>:null}</div>
    </header>:null}
    <div className={styles.modalSectionBody}>{children}</div>
  </section>;
}

export function ModalInfoGrid({items=[],columns=2}) {
  return <dl className={styles.modalInfoGrid} style={{'--modal-info-columns':columns}}>
    {items.filter(Boolean).map((item,index)=><div key={item.key||item.label||index}>
      <dt>{item.label}</dt>
      <dd>{item.value??'—'}</dd>
    </div>)}
  </dl>;
}

export function ModalNote({title,children,tone='neutral',icon:Icon}) {
  return <div className={`${styles.modalNote} ${styles[`modalNote_${tone}`]||''}`}>
    {Icon?<Icon size={18}/>:tone==='success'?<CheckCircle2 size={18}/>:null}
    <div>{title?<strong>{title}</strong>:null}<p>{children}</p></div>
  </div>;
}

export function ModalFormSection({title,description,children}) {
  return <section className={styles.modalFormSection}>
    {(title||description)?<header><div>{title?<h3>{title}</h3>:null}{description?<p>{description}</p>:null}</div></header>:null}
    <div className={styles.modalFormSectionBody}>{children}</div>
  </section>;
}

/* Backwards compatibility:
   Existing modules can keep importing DetailDrawer while the canonical UX
   is now a centered modal. This avoids invasive business-logic changes. */
export function DetailDrawer(props){
  return <RecordModal {...props}/>;
}
