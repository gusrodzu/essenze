import {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  FileText,
  Plus,
  ShoppingBag,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Sales.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import {DataTableFrame,DetailDrawer,ModuleHeader,ModuleToolbar} from '../components/module-system';
const currency = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const quoteStatus = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
  CONVERTED: 'Convertida',
  CANCELLED: 'Cancelada',
};

const orderStatus = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  PARTIALLY_DELIVERED: 'Entrega parcial',
  DELIVERED: 'Entregado',
  INVOICED: 'Facturado',
  CANCELLED: 'Cancelado',
};

const quoteTones = {
  DRAFT: 'neutral',
  SENT: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
  CONVERTED: 'success',
  CANCELLED: 'neutral',
};

const orderTones = {
  DRAFT: 'neutral',
  CONFIRMED: 'warning',
  PARTIALLY_DELIVERED: 'warning',
  DELIVERED: 'success',
  INVOICED: 'success',
  CANCELLED: 'danger',
};

const emptyItem = () => ({
  productId: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 16,
});

const emptyQuote = () => {
  const today = new Date();
  const valid = new Date();
  valid.setDate(valid.getDate() + 15);

  return {
    customerId: '',
    quoteDate: today.toISOString().slice(0, 10),
    validUntil: valid.toISOString().slice(0, 10),
    currency: 'MXN',
    notes: '',
    terms: 'Precios sujetos a disponibilidad.',
    items: [emptyItem()],
  };
};

export default function Sales() {
  const [tab, setTab] = useState('quotes');
  const [data, setData] = useState({
    quotes: [],
    orders: [],
    customers: [],
    products: [],
    stats: {},
  });
  const [query, setQuery] = useState('');
  const [quoteModal, setQuoteModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/sales');
    setData(response);
    if (detail) {
      const list = detail.type === 'quote' ? response.quotes : response.orders;
      const refreshed = list.find((item) => item.id === detail.item.id);
      if (refreshed) setDetail({type: detail.type, item: refreshed});
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visible = useMemo(() => {
    const list = tab === 'quotes' ? data.quotes : data.orders;
    return list.filter((item) =>
      `${item.folio} ${item.customer.commercialName || item.customer.legalName} ${
        tab === 'quotes' ? quoteStatus[item.status] : orderStatus[item.status]
      }`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [tab, data.quotes, data.orders, query]);

  function updateItem(index, field, value) {
    setQuoteModal((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? {...item, [field]: value} : item,
      ),
    }));
  }

  function selectProduct(index, productId) {
    const product = data.products.find((item) => item.id === productId);
    setQuoteModal((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              unitPrice: Number(product?.salePrice || 0),
              description: product?.name || '',
            }
          : item,
      ),
    }));
  }

  async function saveQuote(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/sales/quotes', {
        method: 'POST',
        body: {
          ...quoteModal,
          items: quoteModal.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
          })),
        },
      });

      setQuoteModal(null);
      setMessage(['success', 'Cotización creada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function updateQuoteStatus(item, status) {
    try {
      await apiRequest(`/sales/quotes/${item.id}/status`, {
        method: 'PATCH',
        body: {status},
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function convertQuote(item) {
    if (!window.confirm(`¿Convertir ${item.folio} en pedido?`)) return;

    try {
      await apiRequest(`/sales/quotes/${item.id}/convert`, {
        method: 'POST',
        body: {},
      });
      setMessage(['success', 'Cotización convertida en pedido']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function updateOrderStatus(item, status) {
    try {
      await apiRequest(`/sales/orders/${item.id}/status`, {
        method: 'PATCH',
        body: {status},
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const modalTotal = quoteModal
    ? quoteModal.items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.unitPrice || 0) *
            (1 + Number(item.taxRate || 0) / 100),
        0,
      )
    : 0;

  const attention = [
    ...(data.quotes.filter((item) => item.status === 'SENT').length
      ? [{level:'warning',title:`${data.quotes.filter((item) => item.status === 'SENT').length} cotización(es) requieren seguimiento`,detail:'Propuestas enviadas pendientes de decisión del cliente.'}]
      : []),
    ...(data.orders.filter((item) => ['CONFIRMED','PARTIALLY_DELIVERED'].includes(item.status)).length
      ? [{level:'warning',title:`${data.orders.filter((item) => ['CONFIRMED','PARTIALLY_DELIVERED'].includes(item.status)).length} pedido(s) siguen abiertos`,detail:'Revisa entrega, facturación o cierre comercial.'}]
      : []),
    ...(data.quotes.filter((item) => item.status === 'EXPIRED').length
      ? [{level:'danger',title:`${data.quotes.filter((item) => item.status === 'EXPIRED').length} cotización(es) vencidas`,detail:'Conviene renovar vigencia o cerrar la oportunidad.'}]
      : []),
  ].slice(0,3);

  const monthSeries = Array.from({length:6},(_,offset)=>{
    const point=new Date();
    point.setDate(1);
    point.setMonth(point.getMonth()-(5-offset));
    const year=point.getFullYear();
    const month=point.getMonth();
    const total=data.orders
      .filter((item)=>{const created=new Date(item.orderDate);return created.getFullYear()===year&&created.getMonth()===month;})
      .reduce((sum,item)=>sum+Number(item.total||0),0);
    return {label:point.toLocaleDateString('es-MX',{month:'short'}).replace('.',''),total};
  });
  const maxMonth=Math.max(1,...monthSeries.map((item)=>item.total));

  return (
    <div className={styles.page}>
      <ModuleHeader
        eyebrow="Ventas · Operación comercial"
        title="Cotizaciones y pedidos"
        description="Gestiona propuestas comerciales, seguimiento de clientes y pedidos confirmados."
        actions={<Button icon={Plus} onClick={() => setQuoteModal(emptyQuote())}>Nueva cotización</Button>}
      />

      {message ? <div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div> : null}

      <KpiGrid>
        <KpiCard><FileText/><span>Cotizaciones</span><KpiInfo title="Cotizaciones registradas">Cantidad total de cotizaciones comerciales.</KpiInfo><strong>{data.stats.quotes||0}</strong><small>{data.stats.openQuotes||0} abiertas</small></KpiCard>
        <KpiCard><CheckCircle2/><span>Aceptadas</span><KpiInfo title="Cotizaciones ganadas">Cotizaciones aceptadas por el cliente.</KpiInfo><strong>{data.stats.acceptedQuotes||0}</strong><small>propuestas ganadas</small></KpiCard>
        <KpiCard><ShoppingBag/><span>Pedidos confirmados</span><KpiInfo title="Pedidos activos">Pedidos confirmados pendientes de completar su ciclo.</KpiInfo><strong>{data.stats.confirmedOrders||0}</strong><small>operación comercial</small></KpiCard>
        <KpiCard><BadgeDollarSign/><span>Venta acumulada</span><KpiInfo title="Valor comercial">Importe acumulado de los documentos comerciales considerados.</KpiInfo><strong>{currency(data.stats.salesTotal)}</strong><small>valor del periodo</small></KpiCard>
      </KpiGrid>

      <section className={styles.overviewGrid}>
        <div className={styles.attentionCard}>
          <div className={styles.panelHeader}>
            <div><span>Prioridad</span><h2>Requiere atención</h2></div>
            <AlertTriangle size={19}/>
          </div>
          <div className={styles.attentionList}>
            {attention.length ? attention.map((item,index)=>(
              <button type="button" key={`${item.title}-${index}`} onClick={()=>setTab(index===1?'orders':'quotes')}>
                <i className={styles[item.level]}><AlertTriangle size={15}/></i>
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              </button>
            )) : (
              <div className={styles.healthy}><CheckCircle2 size={20}/><div><strong>Flujo comercial saludable</strong><span>No hay pendientes prioritarios en cotizaciones o pedidos.</span></div></div>
            )}
          </div>
        </div>

        <div className={styles.activityCard}>
          <div className={styles.panelHeader}>
            <div><span>Actividad</span><h2>Pedidos de los últimos 6 meses</h2></div>
            <BarChart3 size={19}/>
          </div>
          <div className={styles.miniChart} aria-label="Valor mensual de pedidos">
            {monthSeries.map((item)=>(
              <div key={item.label} className={styles.barColumn}>
                <div className={styles.barTrack}><i style={{height:`${Math.max(7,(item.total/maxMonth)*100)}%`}}/></div>
                <strong>{item.label}</strong>
                <span>{item.total?currency(item.total):'—'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.recordTabs}>
          <button type="button" className={tab==='quotes'?styles.activeRecordTab:''} onClick={()=>setTab('quotes')}>Cotizaciones <b>{data.quotes.length}</b></button>
          <button type="button" className={tab==='orders'?styles.activeRecordTab:''} onClick={()=>setTab('orders')}>Pedidos <b>{data.orders.length}</b></button>
        </div>

        <ModuleToolbar
          title={tab==='quotes'?'Cotizaciones comerciales':'Pedidos de venta'}
          description={`${visible.length} registros visibles`}
          query={query}
          onQueryChange={setQuery}
          placeholder="Buscar por folio, cliente o estado"
        />

        <DataTableFrame empty={!visible.length?'No hay registros para mostrar.':null}>
          <table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>{tab==='quotes'?'Vigencia':'Entrega'}</th><th>Total</th><th>Estado</th><th>Responsable</th><th>Acciones</th></tr></thead>
            <tbody>
              {visible.map((item)=>(
                <tr key={item.id} className={styles.clickableRow} onClick={()=>setDetail({type:tab==='quotes'?'quote':'order',item})}>
                  <td><strong>{item.folio}</strong></td>
                  <td><strong>{item.customer.commercialName||item.customer.legalName}</strong><small>{item.customer.code}</small></td>
                  <td>{date(tab==='quotes'?item.quoteDate:item.orderDate)}</td>
                  <td>{date(tab==='quotes'?item.validUntil:item.deliveryDate)}</td>
                  <td><strong>{currency(item.total)}</strong></td>
                  <td><Badge tone={tab==='quotes'?quoteTones[item.status]:orderTones[item.status]}>{tab==='quotes'?quoteStatus[item.status]:orderStatus[item.status]}</Badge></td>
                  <td>{item.createdBy.firstName} {item.createdBy.lastName}</td>
                  <td className={styles.actions} onClick={(event)=>event.stopPropagation()}>
                    <button onClick={()=>setDetail({type:tab==='quotes'?'quote':'order',item})}>Ver</button>
                    {tab==='quotes'&&item.status==='DRAFT'?<button onClick={()=>updateQuoteStatus(item,'SENT')}>Enviar</button>:null}
                    {tab==='quotes'&&item.status==='SENT'?<button onClick={()=>updateQuoteStatus(item,'ACCEPTED')}>Aceptar</button>:null}
                    {tab==='quotes'&&['SENT','ACCEPTED'].includes(item.status)?<button onClick={()=>convertQuote(item)}>Crear pedido</button>:null}
                    {tab==='orders'&&item.status==='DRAFT'?<button onClick={()=>updateOrderStatus(item,'CONFIRMED')}>Confirmar</button>:null}
                    {tab==='orders'&&item.status==='CONFIRMED'?<button onClick={()=>updateOrderStatus(item,'DELIVERED')}>Entregar</button>:null}
                    {tab==='orders'&&item.status==='DELIVERED'?<button onClick={()=>updateOrderStatus(item,'INVOICED')}>Facturar</button>:null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableFrame>
      </section>

      {quoteModal ? (
        <div className={styles.overlay}>
          <form className={`${styles.modal} ${styles.largeModal}`} onSubmit={saveQuote}>
            <div className={styles.modalHeader}>
              <div>
                <span>Ventas</span>
                <h2>Nueva cotización</h2>
              </div>
              <button type="button" onClick={() => setQuoteModal(null)}><X /></button>
            </div>

            <div className={styles.modalBody}>
              <label>
                Cliente
                <select
                  required
                  value={quoteModal.customerId}
                  onChange={(event) =>
                    setQuoteModal((current) => ({...current, customerId: event.target.value}))
                  }
                >
                  <option value="">Selecciona un cliente</option>
                  {data.customers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.commercialName || item.legalName}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid3}>
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={quoteModal.quoteDate}
                  onChange={(event) =>
                    setQuoteModal((current) => ({...current, quoteDate: event.target.value}))
                  }
                />
                <Input
                  label="Válida hasta"
                  type="date"
                  required
                  value={quoteModal.validUntil}
                  onChange={(event) =>
                    setQuoteModal((current) => ({...current, validUntil: event.target.value}))
                  }
                />
                <Input
                  label="Moneda"
                  value={quoteModal.currency}
                  onChange={(event) =>
                    setQuoteModal((current) => ({...current, currency: event.target.value.toUpperCase()}))
                  }
                />
              </div>

              <div className={styles.itemsHeader}>
                <div>
                  <strong>Partidas</strong>
                  <span>Productos incluidos en la propuesta.</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  onClick={() =>
                    setQuoteModal((current) => ({
                      ...current,
                      items: [...current.items, emptyItem()],
                    }))
                  }
                >
                  Agregar partida
                </Button>
              </div>

              <div className={styles.items}>
                {quoteModal.items.map((item, index) => (
                  <div className={styles.itemRow} key={index}>
                    <label>
                      Producto
                      <select
                        required
                        value={item.productId}
                        onChange={(event) => selectProduct(index, event.target.value)}
                      >
                        <option value="">Selecciona</option>
                        {data.products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} · {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Cantidad"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    />
                    <Input
                      label="Precio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                    />
                    <Input
                      label="IVA %"
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={(event) => updateItem(index, 'taxRate', event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() =>
                        setQuoteModal((current) => ({
                          ...current,
                          items: current.items.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      disabled={quoteModal.items.length === 1}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.totalBox}>
                <span>Total estimado</span>
                <strong>{currency(modalTotal)}</strong>
              </div>

              <div className={styles.grid2}>
                <label>
                  Notas
                  <textarea
                    rows="4"
                    value={quoteModal.notes}
                    onChange={(event) =>
                      setQuoteModal((current) => ({...current, notes: event.target.value}))
                    }
                  />
                </label>
                <label>
                  Términos
                  <textarea
                    rows="4"
                    value={quoteModal.terms}
                    onChange={(event) =>
                      setQuoteModal((current) => ({...current, terms: event.target.value}))
                    }
                  />
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button type="button" variant="ghost" onClick={() => setQuoteModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Crear cotización
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <DetailDrawer
        open={Boolean(detail)}
        onClose={()=>setDetail(null)}
        title={detail?.item?.folio}
        subtitle={detail?.type==='quote'?'Cotización comercial':'Pedido de venta'}
      >
        {detail ? <div className={styles.drawerContent}>
          <div className={styles.detailSummaryNew}>
            <div><span>Cliente</span><strong>{detail.item.customer.commercialName||detail.item.customer.legalName}</strong></div>
            <div><span>Total</span><strong>{currency(detail.item.total)}</strong></div>
            <div><span>Estado</span><Badge tone={detail.type==='quote'?quoteTones[detail.item.status]:orderTones[detail.item.status]}>{detail.type==='quote'?quoteStatus[detail.item.status]:orderStatus[detail.item.status]}</Badge></div>
          </div>
          <div className={styles.drawerItems}>
            <h3>Partidas</h3>
            {detail.item.items.map((item)=><article key={item.id}>
              <div><strong>{item.product.name}</strong><span>{item.product.sku}</span></div>
              <div><strong>{Number(item.quantity)} × {currency(item.unitPrice)}</strong><span>IVA {Number(item.taxRate)}%</span></div>
              <b>{currency(item.total)}</b>
            </article>)}
          </div>
        </div> : null}
      </DetailDrawer>
    </div>
  );
}
