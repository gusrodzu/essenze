import {useEffect,useMemo,useState} from 'react';
import {
  Banknote,
  Boxes,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Filter,
  Grid2X2,
  MonitorSmartphone,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingCart,
  Store,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import {DetailDrawer} from '../components/module-system';
import styles from './Pos.module.css';

const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v||0));
const date=v=>v?new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
const methodLabel={CASH:'Efectivo',CARD:'Tarjeta',TRANSFER:'Transferencia',WALLET:'Wallet',CREDIT:'Crédito',OTHER:'Otro'};
const methodIcon={CASH:Banknote,CARD:CreditCard,TRANSFER:WalletCards,WALLET:WalletCards,CREDIT:CreditCard,OTHER:CircleDollarSign};

function getStock(product,warehouseId){
  const rows=product.inventoryBalances||[];
  if(warehouseId){
    const row=rows.find(item=>item.warehouseId===warehouseId);
    if(row)return Number(row.quantity||0);
  }
  return rows.reduce((sum,item)=>sum+Number(item.quantity||0),0);
}

export default function Pos(){
  const [data,setData]=useState({terminals:[],sessions:[],sales:[],products:[],customers:[],warehouses:[],summary:{}});
  const [tab,setTab]=useState('sell');
  const [sessionId,setSessionId]=useState('');
  const [cart,setCart]=useState([]);
  const [customerId,setCustomerId]=useState('');
  const [productQuery,setProductQuery]=useState('');
  const [categoryId,setCategoryId]=useState('ALL');
  const [folio,setFolio]=useState('');
  const [discount,setDiscount]=useState(0);
  const [ticketNote,setTicketNote]=useState('');
  const [payments,setPayments]=useState([{method:'CASH',amount:'',reference:'',authorization:''}]);
  const [terminalModal,setTerminalModal]=useState(null);
  const [openModal,setOpenModal]=useState(null);
  const [closeModal,setCloseModal]=useState(null);
  const [movementModal,setMovementModal]=useState(null);
  const [message,setMessage]=useState(null);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await apiRequest('/pos/dashboard');
      setData(r);
      const open=r.sessions.find(s=>s.status==='OPEN');
      if(open&&!sessionId)setSessionId(open.id);
      if(!folio)setFolio(`POS-${String(r.sales.length+1).padStart(5,'0')}`);
    }catch(e){setMessage(['error',e.message])}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function submit(path,body,success,method='POST'){
    setSaving(true);
    try{
      const r=await apiRequest(path,{method,body});
      setMessage(['success',success]);
      await load();
      return r;
    }catch(e){setMessage(['error',e.message]);return null}
    finally{setSaving(false)}
  }

  const activeSession=data.sessions.find(s=>s.id===sessionId&&s.status==='OPEN')||data.sessions.find(s=>s.status==='OPEN')||null;
  const activeWarehouseId=activeSession?.terminal?.warehouseId||activeSession?.terminal?.warehouse?.id||null;

  const categories=useMemo(()=>{
    const map=new Map();
    data.products.forEach(product=>{
      if(product.category?.id)map.set(product.category.id,product.category);
    });
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  },[data.products]);

  const categoryCounts=useMemo(()=>{
    const counts={ALL:data.products.length};
    data.products.forEach(product=>{
      if(product.category?.id)counts[product.category.id]=(counts[product.category.id]||0)+1;
    });
    return counts;
  },[data.products]);

  const filteredProducts=useMemo(()=>{
    const q=productQuery.trim().toLowerCase();
    return data.products.filter(product=>{
      const matchesCategory=categoryId==='ALL'||product.categoryId===categoryId;
      const matchesText=!q||`${product.sku} ${product.name} ${product.category?.name||''}`.toLowerCase().includes(q);
      return matchesCategory&&matchesText;
    }).slice(0,48);
  },[productQuery,categoryId,data.products]);

  const subtotal=cart.reduce((s,i)=>s+i.quantity*i.unitPrice,0);
  const lineDiscount=cart.reduce((s,i)=>s+(i.discount||0),0);
  const taxable=Math.max(0,subtotal-lineDiscount-discount);
  const tax=cart.reduce((s,i)=>s+Math.max(0,(i.quantity*i.unitPrice-(i.discount||0)))*(i.taxRate/100),0);
  const total=Math.max(0,taxable+tax);
  const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const pending=total-paid;
  const selectedCustomer=data.customers.find(customer=>customer.id===customerId)||null;

  function addProduct(p){
    const stock=getStock(p,activeWarehouseId);
    if(stock<=0&&activeWarehouseId){
      setMessage(['error',`${p.name} no tiene existencia disponible en la caja actual.`]);
      return;
    }
    setCart(current=>{
      const existing=current.find(item=>item.productId===p.id);
      if(existing){
        if(activeWarehouseId && existing.quantity+1>stock){
          setMessage(['error',`Solo hay ${stock} unidad(es) disponibles de ${p.name}.`]);
          return current;
        }
        return current.map(item=>item.productId===p.id?{...item,quantity:item.quantity+1}:item);
      }
      return [...current,{productId:p.id,sku:p.sku,name:p.name,quantity:1,unitPrice:Number(p.salePrice||p.price||0),discount:0,taxRate:16,stock}];
    });
  }
  function updateItem(id,key,value){setCart(current=>current.map(item=>item.productId===id?{...item,[key]:Number(value)}:item))}
  function removeItem(id){setCart(current=>current.filter(item=>item.productId!==id))}
  function clearCart(){setCart([]);setDiscount(0);setTicketNote('');setPayments([{method:'CASH',amount:'',reference:'',authorization:''}])}
  function addPayment(method='CARD'){setPayments(rows=>[...rows,{method,amount:'',reference:'',authorization:''}])}

  async function completeSale(){
    if(!activeSession){setMessage(['error','Abre una sesión de caja primero']);return}
    if(!cart.length){setMessage(['error','Agrega productos al ticket']);return}
    const body={
      sessionId:activeSession.id,
      customerId:customerId||null,
      folio,
      notes:ticketNote||null,
      items:cart.map(i=>({productId:i.productId,quantity:i.quantity,unitPrice:i.unitPrice,discount:i.discount||0,taxRate:i.taxRate})),
      payments:payments.map(p=>({...p,amount:Number(p.amount),reference:p.reference||null,authorization:p.authorization||null})),
      discount:discount>0?{description:'Descuento general POS',amount:discount}:null,
    };
    const r=await submit('/pos/sales',body,'Venta POS completada');
    if(r){
      clearCart();
      setCustomerId('');
      setFolio(`POS-${String(data.sales.length+2).padStart(5,'0')}`);
    }
  }

  if(loading&&!data.terminals.length&&!data.sales.length)return <Card className={styles.loading}>Cargando POS…</Card>;

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div className={styles.titleGroup}>
        <span className={styles.moduleIcon}><MonitorSmartphone size={22}/></span>
        <div><span className={styles.eyebrow}>Retail · Checkout · Cash control</span><h1>Punto de venta</h1><p>Vende, cobra y administra tickets con inventario y clientes conectados al ERP.</p></div>
      </div>
      <div className={styles.headerActions}>
        <Button variant="secondary" icon={UserRound} onClick={()=>setCustomerId(customerId?'':data.customers[0]?.id||'')}>Clientes</Button>
        <button className={styles.iconAction} type="button" title="Configuración POS" onClick={()=>setTerminalModal({code:'',name:'',warehouseId:'',active:true,notes:''})}><MoreHorizontal size={19}/></button>
      </div>
    </header>

    {message?<div className={`${styles.message} ${styles[message[0]]}`}><span>{message[1]}</span><button onClick={()=>setMessage(null)}><X size={16}/></button></div>:null}

    <KpiGrid>
      <KpiCard><Store/><span>Cajas abiertas</span><KpiInfo title="Cajas abiertas">Sesiones POS actualmente abiertas.</KpiInfo><strong>{data.summary.openSessions||0}</strong><small>{data.terminals.length} terminales</small></KpiCard>
      <KpiCard><CircleDollarSign/><span>Venta de hoy</span><KpiInfo title="Venta de hoy">Tickets pagados desde el inicio del día.</KpiInfo><strong>{money(data.summary.totalToday)}</strong><small>{data.summary.tickets||0} tickets</small></KpiCard>
      <KpiCard><ReceiptText/><span>Ticket promedio</span><KpiInfo title="Ticket promedio">Venta total del día entre número de tickets.</KpiInfo><strong>{money(data.summary.avgTicket)}</strong><small>Promedio operativo</small></KpiCard>
      <KpiCard><WalletCards/><span>Pagos electrónicos</span><KpiInfo title="Pagos electrónicos">Cobros de hoy por tarjeta y otros medios electrónicos.</KpiInfo><strong>{money(data.summary.cardToday)}</strong><small>Efectivo {money(data.summary.cashToday)}</small></KpiCard>
    </KpiGrid>

    <nav className={styles.tabs}>
      <button className={tab==='sell'?styles.active:''} onClick={()=>setTab('sell')}><ShoppingCart size={16}/> Punto de venta</button>
      <button className={tab==='sales'?styles.active:''} onClick={()=>setTab('sales')}><ReceiptText size={16}/> Tickets</button>
      <button className={tab==='sessions'?styles.active:''} onClick={()=>setTab('sessions')}><Calculator size={16}/> Turnos de caja</button>
    </nav>

    {tab==='sell'?<div className={styles.posWorkspace}>
      <section className={styles.catalogPane}>
        <div className={styles.catalogToolbar}>
          <button className={styles.categorySelect} type="button"><Boxes size={16}/><span>{categoryId==='ALL'?'Todas las categorías':categories.find(item=>item.id===categoryId)?.name||'Categoría'}</span><ChevronRight size={15}/></button>
          <label className={styles.search}><Search size={16}/><input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Buscar SKU o producto…"/></label>
          <button className={styles.filterButton} type="button"><Filter size={16}/> Filtros</button>
        </div>

        <div className={styles.categoryRail}>
          <button className={categoryId==='ALL'?styles.categoryActive:styles.categoryCard} onClick={()=>setCategoryId('ALL')}>
            <span className={styles.categoryIcon}><Grid2X2 size={19}/></span><strong>Todos</strong><small>{categoryCounts.ALL||0} productos</small>
          </button>
          {categories.slice(0,6).map(category=><button key={category.id} className={categoryId===category.id?styles.categoryActive:styles.categoryCard} onClick={()=>setCategoryId(category.id)}>
            <span className={styles.categoryIcon}><Package size={19}/></span><strong>{category.name}</strong><small>{categoryCounts[category.id]||0} productos</small>
          </button>)}
        </div>

        <div className={styles.productsHeader}><div><h2>Productos</h2><p>{filteredProducts.length} resultados visibles</p></div><small>{activeSession?`${activeSession.terminal.code} · ${activeSession.terminal.name}`:'Abre una caja para comenzar'}</small></div>
        <div className={styles.productGrid}>
          {filteredProducts.map(product=>{
            const stock=getStock(product,activeWarehouseId);
            return <button key={product.id} className={styles.productCard} onClick={()=>addProduct(product)}>
              <span className={styles.productVisual}><ShoppingCart size={26}/></span>
              <span className={styles.productCategory}>{product.category?.name||'General'}</span>
              <strong>{product.name}</strong>
              <small>{product.sku}</small>
              <b>{money(product.salePrice||product.price||0)}</b>
              <em className={stock<=0?styles.stockDanger:stock<=Number(product.minStock||0)?styles.stockWarning:styles.stockOk}>Stock {stock.toLocaleString('es-MX',{maximumFractionDigits:2})}</em>
            </button>;
          })}
          {!filteredProducts.length?<div className={styles.emptyProducts}>No encontramos productos con estos filtros.</div>:null}
        </div>

        <footer className={styles.catalogFooter}>
          <span>Mostrando {filteredProducts.length} de {data.products.length} productos</span>
          <div className={styles.quickActions}>
            <Button variant="secondary" icon={Plus}>Producto rápido</Button>
            <Button variant="secondary" icon={Settings2} onClick={()=>setDiscount(discount?0:Math.min(100,total*.05))}>Descuento</Button>
            <Button variant="secondary" icon={ReceiptText} onClick={()=>setTicketNote(ticketNote?'':'Venta mostrador')}>Nota</Button>
            <Button variant="secondary" icon={Trash2} onClick={clearCart}>Limpiar carrito</Button>
          </div>
        </footer>
      </section>

      <aside className={styles.liveTicket}>
        <header className={styles.ticketHeader}>
          <div className={styles.ticketIdentity}><span className={styles.ticketIcon}><ShoppingCart size={20}/></span><div><h3>Ticket {folio}</h3><small>{activeSession?`${activeSession.terminal.code} · ${activeSession.terminal.name}`:'Sin caja abierta'}</small></div></div>
          <Badge tone={activeSession?'success':'warning'}>{activeSession?'Caja abierta':'Caja cerrada'}</Badge>
        </header>

        <div className={styles.ticketMiniTabs}><button className={styles.ticketTabActive}>Venta</button><button>Cliente</button><button>Detalles</button></div>

        <div className={styles.customerCard}>
          <span className={styles.customerIcon}><UserRound size={18}/></span>
          <div><strong>{selectedCustomer?.commercialName||selectedCustomer?.legalName||'Público general'}</strong><small>{selectedCustomer?selectedCustomer.code:'Sin cliente'}</small></div>
          <select aria-label="Seleccionar cliente" value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">Cambiar</option>{data.customers.map(customer=><option key={customer.id} value={customer.id}>{customer.code} · {customer.commercialName||customer.legalName}</option>)}</select>
        </div>

        <div className={styles.cart}>
          {cart.map(item=><article key={item.productId}>
            <span className={styles.cartVisual}><Package size={18}/></span>
            <div className={styles.cartCopy}><strong>{item.name}</strong><small>{item.sku}</small><b>{money(item.unitPrice)}</b></div>
            <div className={styles.quantityControl}><button type="button" onClick={()=>item.quantity<=1?removeItem(item.productId):updateItem(item.productId,'quantity',item.quantity-1)}>−</button><span>{item.quantity}</span><button type="button" onClick={()=>updateItem(item.productId,'quantity',item.quantity+1)}>+</button></div>
            <button className={styles.removeButton} type="button" onClick={()=>removeItem(item.productId)}><Trash2 size={15}/></button>
          </article>)}
          {!cart.length?<div className={styles.emptyCart}><ShoppingCart size={25}/><strong>Tu ticket está vacío</strong><span>Selecciona productos para comenzar la venta.</span></div>:null}
        </div>

        <label className={styles.ticketNote}><input value={ticketNote} onChange={e=>setTicketNote(e.target.value)} placeholder="Agregar nota al ticket…"/></label>

        <div className={styles.ticketTotals}>
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div><span>Descuento</span><input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value||0))}/><strong>{money(discount)}</strong></div>
          <div><span>Impuestos (IVA 16%)</span><strong>{money(tax)}</strong></div>
          <div className={styles.totalRow}><span>Total</span><strong>{money(total)}</strong></div>
        </div>

        <div className={styles.paymentSection}>
          <div className={styles.paymentTitle}><strong>Forma de pago</strong><button type="button" onClick={()=>addPayment('CARD')}><Plus size={14}/> Agregar</button></div>
          <div className={styles.paymentMethods}>
            {['CASH','CARD','TRANSFER'].map(method=>{const Icon=methodIcon[method];const active=payments[0]?.method===method;return <button key={method} className={active?styles.paymentMethodActive:styles.paymentMethod} type="button" onClick={()=>setPayments(rows=>rows.length?[{...rows[0],method},...rows.slice(1)]:[{method,amount:'',reference:'',authorization:''}])}><Icon size={15}/>{methodLabel[method]}</button>})}
            <button className={styles.paymentMethod} type="button" onClick={()=>addPayment('OTHER')}><Plus size={15}/></button>
          </div>
          <div className={styles.paymentRows}>{payments.map((payment,index)=><div key={index}>
            <select value={payment.method} onChange={e=>setPayments(rows=>rows.map((row,i)=>i===index?{...row,method:e.target.value}:row))}>{Object.entries(methodLabel).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
            <input type="number" min="0.01" step="0.01" value={payment.amount} onChange={e=>setPayments(rows=>rows.map((row,i)=>i===index?{...row,amount:e.target.value}:row))} placeholder="Monto recibido"/>
            <input value={payment.reference} onChange={e=>setPayments(rows=>rows.map((row,i)=>i===index?{...row,reference:e.target.value}:row))} placeholder="Referencia"/>
            {payments.length>1?<button type="button" onClick={()=>setPayments(rows=>rows.filter((_,i)=>i!==index))}><X size={14}/></button>:null}
          </div>)}</div>
        </div>

        <div className={styles.checkoutSummary}>
          <div><span>Pagado</span><strong>{money(paid)}</strong></div>
          <div><span>{pending<0?'Cambio':'Pendiente'}</span><strong className={Math.abs(pending)<0.01||pending<0?styles.ok:styles.pending}>{money(Math.abs(pending))}</strong></div>
        </div>
        <Button className={styles.checkoutButton} disabled={!activeSession||!cart.length||Math.abs(pending)>0.01} onClick={completeSale} loading={saving} icon={CreditCard}>Cobrar {money(total)}</Button>
      </aside>
    </div>:null}

    {tab==='sales'?<Tickets sales={data.sales} onVoid={async sale=>{if(confirm(`¿Anular ${sale.folio}?`))await submit(`/pos/sales/${sale.id}/void`,{},'Venta anulada')}}/>:null}
    {tab==='sessions'?<Sessions data={data} onOpen={()=>setOpenModal({terminalId:data.terminals[0]?.id||'',openingAmount:'0',notes:''})} onMovement={session=>setMovementModal({session,type:'CASH_IN',amount:'',reference:'',description:''})}/>:null}

    <ContextDrawer open={Boolean(terminalModal)} title="Nueva terminal POS" subtitle="Configuración de punto de venta" saving={saving} onClose={()=>setTerminalModal(null)} formId="terminal-pos-form" onSubmit={async e=>{e.preventDefault();const r=await submit('/pos/terminals',{...terminalModal,warehouseId:terminalModal.warehouseId||null},'Terminal creada');if(r)setTerminalModal(null)}}>
      {terminalModal?<><div className={styles.grid2}><Input label="Código" required value={terminalModal.code} onChange={e=>setTerminalModal(v=>({...v,code:e.target.value.toUpperCase()}))}/><Input label="Nombre" required value={terminalModal.name} onChange={e=>setTerminalModal(v=>({...v,name:e.target.value}))}/></div><label className={styles.drawerField}>Almacén<select value={terminalModal.warehouseId} onChange={e=>setTerminalModal(v=>({...v,warehouseId:e.target.value}))}><option value="">Sin almacén</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></>:null}
    </ContextDrawer>

    <ContextDrawer open={Boolean(openModal)} title="Abrir caja" subtitle="Inicio de turno" saving={saving} onClose={()=>setOpenModal(null)} formId="open-pos-form" onSubmit={async e=>{e.preventDefault();const r=await submit('/pos/sessions/open',{...openModal,openingAmount:Number(openModal.openingAmount||0)},'Caja abierta');if(r){setOpenModal(null);setSessionId(r.session.id)}}}>
      {openModal?<><label className={styles.drawerField}>Terminal<select required value={openModal.terminalId} onChange={e=>setOpenModal(v=>({...v,terminalId:e.target.value}))}><option value="">Seleccionar…</option>{data.terminals.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}</select></label><Input label="Fondo inicial" type="number" min="0" step="0.01" value={openModal.openingAmount} onChange={e=>setOpenModal(v=>({...v,openingAmount:e.target.value}))}/></>:null}
    </ContextDrawer>

    <ContextDrawer open={Boolean(closeModal&&activeSession)} title="Cerrar caja" subtitle={activeSession?.terminal?.code||'POS'} saving={saving} onClose={()=>setCloseModal(null)} formId="close-pos-form" onSubmit={async e=>{e.preventDefault();const r=await submit(`/pos/sessions/${activeSession.id}/close`,{...closeModal,countedAmount:Number(closeModal.countedAmount)},'Caja cerrada');if(r){setCloseModal(null);setSessionId('')}}}>
      {closeModal?<Input label="Efectivo contado" type="number" min="0" step="0.01" required value={closeModal.countedAmount} onChange={e=>setCloseModal(v=>({...v,countedAmount:e.target.value}))}/>:null}
    </ContextDrawer>

    <ContextDrawer open={Boolean(movementModal)} title="Movimiento de caja" subtitle={movementModal?.session?.terminal?.code||'POS'} saving={saving} onClose={()=>setMovementModal(null)} formId="movement-pos-form" onSubmit={async e=>{e.preventDefault();const {session,...body}=movementModal;const r=await submit(`/pos/sessions/${session.id}/movements`,{...body,amount:Number(body.amount)},'Movimiento registrado');if(r)setMovementModal(null)}}>
      {movementModal?<><label className={styles.drawerField}>Tipo<select value={movementModal.type} onChange={e=>setMovementModal(v=>({...v,type:e.target.value}))}><option value="CASH_IN">Entrada</option><option value="CASH_OUT">Salida</option><option value="ADJUSTMENT">Ajuste</option></select></label><Input label="Monto" type="number" min="0.01" step="0.01" required value={movementModal.amount} onChange={e=>setMovementModal(v=>({...v,amount:e.target.value}))}/><Input label="Descripción" value={movementModal.description} onChange={e=>setMovementModal(v=>({...v,description:e.target.value}))}/></>:null}
    </ContextDrawer>
  </div>;
}

function ContextDrawer({open,title,subtitle,saving,onClose,formId,onSubmit,children}){
  return <DetailDrawer open={open} onClose={onClose} title={title} subtitle={subtitle} footer={<div className={styles.drawerActions}><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={saving}>Guardar</Button></div>}>
    <form id={formId} className={styles.drawerForm} onSubmit={onSubmit}>{children}</form>
  </DetailDrawer>;
}

function Tickets({sales,onVoid}){
  const [selected,setSelected]=useState(null);
  const [drawerTab,setDrawerTab]=useState('summary');
  const openTicket=sale=>{setSelected(sale);setDrawerTab('summary')};
  const voidSelected=async()=>{if(!selected)return;await onVoid(selected);setSelected(null)};

  return <>
    <Card className={styles.historyCard}>
      <div className={styles.section}><span>Historial</span><h3>Tickets POS</h3><p>Consulta el detalle completo de cada venta sin salir del módulo.</p></div>
      <div className={styles.table}><header><span>Ticket</span><span>Cliente</span><span>Fecha</span><span>Pagos</span><span>Total</span><span>Estado</span><span></span></header>{sales.map(s=><article key={s.id} className={styles.ticketRow} onClick={()=>openTicket(s)}><div><strong>{s.folio}</strong><small>{s.terminal?.name}</small></div><span>{s.customer?.commercialName||s.customer?.legalName||'Público general'}</span><span>{date(s.saleDate)}</span><span>{s.payments.map(p=>methodLabel[p.method]).join(', ')}</span><b>{money(s.total)}</b><Badge tone={s.status==='PAID'?'success':s.status==='VOID'?'danger':'neutral'}>{s.status}</Badge><div><button type="button" className={styles.viewTicketButton} onClick={e=>{e.stopPropagation();openTicket(s)}}>Ver</button></div></article>)}</div>
    </Card>

    <DetailDrawer open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.folio||'Ticket POS'} subtitle={selected?`${selected.terminal?.code||'POS'} · ${date(selected.saleDate)}`:'Punto de venta'} activeTab={drawerTab} onTabChange={setDrawerTab} tabs={[{id:'summary',label:'Resumen'},{id:'items',label:`Partidas${selected?` (${selected.items?.length||0})`:''}`},{id:'payments',label:`Pagos${selected?` (${selected.payments?.length||0})`:''}`},{id:'trace',label:'Trazabilidad'}]} footer={selected?.status==='PAID'?<Button variant="secondary" onClick={voidSelected}>Anular ticket</Button>:null}>
      {selected&&drawerTab==='summary'?<div className={styles.posTicketDetail}><div className={styles.posTicketSummary}><div><span>Estado</span><strong><Badge tone={selected.status==='PAID'?'success':selected.status==='VOID'?'danger':'neutral'}>{selected.status}</Badge></strong></div><div><span>Total</span><strong>{money(selected.total)}</strong></div><div><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></div><div><span>Impuestos</span><strong>{money(selected.taxTotal)}</strong></div><div><span>Descuentos</span><strong>{money(selected.discountTotal)}</strong></div><div><span>Cliente</span><strong>{selected.customer?.commercialName||selected.customer?.legalName||'Público general'}</strong></div><div><span>Terminal</span><strong>{selected.terminal?.name||'—'}</strong></div><div><span>Vendedor</span><strong>{selected.createdBy?`${selected.createdBy.firstName||''} ${selected.createdBy.lastName||''}`.trim():'—'}</strong></div></div>{selected.notes?<section className={styles.posTicketNote}><strong>Notas</strong><p>{selected.notes}</p></section>:null}</div>:null}
      {selected&&drawerTab==='items'?<div className={styles.posTicketItems}>{selected.items?.map(item=><article key={item.id}><div><strong>{item.description||item.product?.name||'Producto'}</strong><span>{item.sku||item.product?.sku||'Sin SKU'}</span></div><div><span>Cantidad</span><strong>{Number(item.quantity||0).toLocaleString('es-MX',{maximumFractionDigits:3})}</strong></div><div><span>P. unitario</span><strong>{money(item.unitPrice)}</strong></div><div><span>Total</span><strong>{money(item.total)}</strong></div></article>)}{!selected.items?.length?<p className={styles.posTicketEmpty}>El ticket no contiene partidas.</p>:null}</div>:null}
      {selected&&drawerTab==='payments'?<div className={styles.posTicketPayments}>{selected.payments?.map(payment=>{const Icon=methodIcon[payment.method]||WalletCards;return <article key={payment.id}><span className={styles.paymentIcon}><Icon size={17}/></span><div><strong>{methodLabel[payment.method]||payment.method}</strong><small>{payment.reference||payment.authorization||'Sin referencia'}</small></div><b>{money(payment.amount)}</b></article>})}{!selected.payments?.length?<p className={styles.posTicketEmpty}>No hay pagos registrados.</p>:null}</div>:null}
      {selected&&drawerTab==='trace'?<div className={styles.posTicketTrace}><article><i><Store size={15}/></i><div><strong>Terminal</strong><span>{selected.terminal?.code||'—'} · {selected.terminal?.name||'Sin terminal'}</span></div></article><article><i><Calculator size={15}/></i><div><strong>Sesión de caja</strong><span>{selected.session?.status||'—'} · apertura {date(selected.session?.openedAt)}</span></div></article><article><i><ReceiptText size={15}/></i><div><strong>Ticket generado</strong><span>{date(selected.saleDate)} · {selected.folio}</span></div></article><article><i><WalletCards size={15}/></i><div><strong>Pago</strong><span>{selected.payments?.map(p=>`${methodLabel[p.method]||p.method} ${money(p.amount)}`).join(' · ')||'Sin pagos'}</span></div></article></div>:null}
    </DetailDrawer>
  </>;
}

function Sessions({data,onOpen,onMovement}){
  return <div className={styles.sessionsGrid}>
    <Card className={styles.sessionCard}><div className={styles.cardAction}><div className={styles.section}><span>Caja</span><h3>Sesiones</h3><p>Control de aperturas, movimientos y diferencias.</p></div><Button icon={Plus} onClick={onOpen}>Abrir caja</Button></div><div className={styles.sessionList}>{data.sessions.map(session=><article key={session.id}><span className={styles.sessionIcon}><Calculator size={18}/></span><div><strong>{session.terminal.code} · {session.terminal.name}</strong><small>{date(session.openedAt)} · {session.openedBy?.firstName} {session.openedBy?.lastName}</small></div><Badge tone={session.status==='OPEN'?'success':'neutral'}>{session.status}</Badge><div className={styles.sessionAmounts}><small>Inicial</small><b>{money(session.openingAmount)}</b></div>{session.status==='OPEN'?<Button variant="ghost" onClick={()=>onMovement(session)}>Movimiento</Button>:<div className={styles.sessionAmounts}><small>Diferencia</small><b>{money(session.difference)}</b></div>}</article>)}</div></Card>
    <Card className={styles.terminalCard}><div className={styles.section}><span>Hardware lógico</span><h3>Terminales</h3><p>Cajas disponibles para operación.</p></div><div className={styles.terminalList}>{data.terminals.map(terminal=><article key={terminal.id}><span className={styles.sessionIcon}><MonitorSmartphone size={18}/></span><div><strong>{terminal.name}</strong><small>{terminal.code} · {terminal.warehouse?.name||'Sin almacén'}</small></div><Badge tone={terminal.active?'success':'neutral'}>{terminal.active?'Activa':'Inactiva'}</Badge></article>)}</div></Card>
  </div>;
}
