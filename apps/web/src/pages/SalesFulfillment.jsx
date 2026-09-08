import {statusLabel} from '../design-system/i18n/uiLanguage.js';
import {useEffect, useMemo, useState} from 'react';
import {
  BadgeDollarSign,
  Box,
  CheckCircle2,
  FileText,
  PackageCheck,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './SalesFulfillment.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const deliveryBlank = () => ({
  salesOrderId: '',
  warehouseId: '',
  deliveryDate: new Date().toISOString().slice(0, 10),
  recipientName: '',
  reference: '',
  shippingAddress: '',
  notes: '',
  items: [],
});

const invoiceBlank = () => {
  const issue = new Date();
  const due = new Date();
  due.setDate(due.getDate() + 30);

  return {
    salesOrderId: '',
    issueDate: issue.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    notes: '',
  };
};

export default function SalesFulfillment() {
  const [data, setData] = useState({
    orders: [],
    warehouses: [],
    deliveries: [],
    invoices: [],
    stats: {},
  });
  const [tab, setTab] = useState('deliveries');
  const [query, setQuery] = useState('');
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/sales-fulfillment');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visibleDeliveries = useMemo(
    () =>
      data.deliveries.filter((item) =>
        `${item.folio} ${item.salesOrder.folio} ${
          item.salesOrder.customer.commercialName ||
          item.salesOrder.customer.legalName
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.deliveries, query],
  );

  const visibleInvoices = useMemo(
    () =>
      data.invoices.filter((item) =>
        `${item.invoiceNumber} ${item.salesOrder.folio} ${
          item.customer.commercialName || item.customer.legalName
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.invoices, query],
  );

  function selectDeliveryOrder(orderId) {
    const order = data.orders.find((item) => item.id === orderId);

    setDeliveryModal((current) => ({
      ...current,
      salesOrderId: orderId,
      shippingAddress: order?.shippingAddress || '',
      items:
        order?.items.map((item) => ({
          salesOrderItemId: item.id,
          productName: item.product.name,
          sku: item.product.sku,
          pending:
            Number(item.quantity) - Number(item.deliveredQty),
          quantity: Number(item.quantity) - Number(item.deliveredQty),
        })) || [],
    }));
  }

  async function saveDelivery(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/sales-fulfillment/deliveries', {
        method: 'POST',
        body: {
          ...deliveryModal,
          recipientName: deliveryModal.recipientName || null,
          reference: deliveryModal.reference || null,
          shippingAddress: deliveryModal.shippingAddress || null,
          notes: deliveryModal.notes || null,
          items: deliveryModal.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
              salesOrderItemId: item.salesOrderItemId,
              quantity: Number(item.quantity),
            })),
        },
      });

      setDeliveryModal(null);
      setMessage(['success', 'Remisión registrada y existencias actualizadas']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoice(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/sales-fulfillment/invoices', {
        method: 'POST',
        body: {
          ...invoiceModal,
          notes: invoiceModal.notes || null,
        },
      });

      setInvoiceModal(null);
      setMessage(['success', 'Factura comercial y cuenta por cobrar creadas']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  const invoiceOrders = data.orders.filter(
    (item) =>
      ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(item.status) &&
      !item.invoice,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Sales Operations</span>
          <h1>Entregas y facturación</h1>
          <p>
            Registra remisiones, descuenta inventario y genera cuentas por cobrar.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={FileText}
            onClick={() => setInvoiceModal(invoiceBlank())}
          >
            Nueva factura
          </Button>
          <Button
            icon={Truck}
            onClick={() => setDeliveryModal(deliveryBlank())}
          >
            Nueva remisión
          </Button>
        </div>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <section className={styles.metrics}>
        <KpiCard>
          <PackageCheck />
          <span>Pedidos pendientes</span><KpiInfo title="Pedidos por entregar">Pedidos comerciales todavía no entregados completamente.</KpiInfo>
          <strong>{data.stats.pendingOrders || 0}</strong>
        </KpiCard>
        <KpiCard>
          <Truck />
          <span>Remisiones aplicadas</span><KpiInfo title="Entregas registradas">Remisiones aplicadas que afectaron el inventario.</KpiInfo>
          <strong>{data.stats.deliveries || 0}</strong>
        </KpiCard>
        <KpiCard>
          <FileText />
          <span>Facturas emitidas</span><KpiInfo title="Facturas comerciales">Facturas internas emitidas y no canceladas.</KpiInfo>
          <strong>{data.stats.invoices || 0}</strong>
        </KpiCard>
        <KpiCard>
          <BadgeDollarSign />
          <span>Total facturado</span><KpiInfo title="Importe facturado">Importe acumulado de las facturas comerciales vigentes.</KpiInfo>
          <strong>{money(data.stats.billedTotal)}</strong>
        </KpiCard>
        <KpiCard>
          <Box />
          <span>Saldo pendiente</span><KpiInfo title="Facturaci\u00f3n por cobrar">Saldo de facturas comerciales todavía no liquidado.</KpiInfo>
          <strong>{money(data.stats.pendingBalance)}</strong>
        </KpiCard>
      </section>

      <Card className={styles.workspace}>
        <div className={styles.tabs}>
          <button
            className={tab === 'deliveries' ? styles.active : ''}
            onClick={() => setTab('deliveries')}
          >
            Remisiones
          </button>
          <button
            className={tab === 'invoices' ? styles.active : ''}
            onClick={() => setTab('invoices')}
          >
            Facturación
          </button>
        </div>

        <div className={styles.toolbar}>
          <div>
            <h2>{tab === 'deliveries' ? 'Historial de entregas' : 'Facturas comerciales'}</h2>
            <p>
              {tab === 'deliveries'
                ? `${visibleDeliveries.length} remisiones`
                : `${visibleInvoices.length} facturas`}
            </p>
          </div>

          <label className={styles.search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar folio, pedido o cliente"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          {tab === 'deliveries' ? (
            <table>
              <thead>
                <tr>
                  <th>Remisión</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Almacén</th>
                  <th>Fecha</th>
                  <th>Partidas</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.length ? (
                  visibleDeliveries.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.folio}</strong></td>
                      <td>{item.salesOrder.folio}</td>
                      <td>
                        {item.salesOrder.customer.commercialName ||
                          item.salesOrder.customer.legalName}
                      </td>
                      <td>{item.warehouse.name}</td>
                      <td>{date(item.deliveryDate)}</td>
                      <td>{item.items.length}</td>
                      <td><Badge tone="success">{statusLabel(item.status)}</Badge></td>
                      <td>
                        {item.createdBy.firstName} {item.createdBy.lastName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No hay remisiones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.length ? (
                  visibleInvoices.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.invoiceNumber}</strong></td>
                      <td>{item.salesOrder.folio}</td>
                      <td>
                        {item.customer.commercialName || item.customer.legalName}
                      </td>
                      <td>{date(item.issueDate)}</td>
                      <td>{date(item.dueDate)}</td>
                      <td><strong>{money(item.total)}</strong></td>
                      <td>{money(Number(item.total) - Number(item.paidAmount))}</td>
                      <td>
                        <Badge tone={item.status === 'PAID' ? 'success' : 'warning'}>
                          {statusLabel(item.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No hay facturas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {deliveryModal ? (
        <div className={styles.overlay}>
          <form className={`${styles.modal} ${styles.largeModal}`} onSubmit={saveDelivery}>
            <header>
              <div>
                <span>Logística comercial</span>
                <h2>Nueva remisión</h2>
              </div>
              <button type="button" onClick={() => setDeliveryModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Pedido
                <select
                  required
                  value={deliveryModal.salesOrderId}
                  onChange={(event) => selectDeliveryOrder(event.target.value)}
                >
                  <option value="">Selecciona un pedido</option>
                  {data.orders
                    .filter((item) => item.status !== 'DELIVERED')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.folio} ·{' '}
                        {item.customer.commercialName || item.customer.legalName}
                      </option>
                    ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <label>
                  Almacén de salida
                  <select
                    required
                    value={deliveryModal.warehouseId}
                    onChange={(event) =>
                      setDeliveryModal((current) => ({
                        ...current,
                        warehouseId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {data.warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name} · {item.branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label="Fecha de entrega"
                  type="date"
                  required
                  value={deliveryModal.deliveryDate}
                  onChange={(event) =>
                    setDeliveryModal((current) => ({
                      ...current,
                      deliveryDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Recibe"
                  value={deliveryModal.recipientName}
                  onChange={(event) =>
                    setDeliveryModal((current) => ({
                      ...current,
                      recipientName: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Referencia"
                  value={deliveryModal.reference}
                  onChange={(event) =>
                    setDeliveryModal((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Dirección de entrega
                <textarea
                  rows="3"
                  value={deliveryModal.shippingAddress}
                  onChange={(event) =>
                    setDeliveryModal((current) => ({
                      ...current,
                      shippingAddress: event.target.value,
                    }))
                  }
                />
              </label>

              <div className={styles.items}>
                {deliveryModal.items.map((item, index) => (
                  <div key={item.salesOrderItemId} className={styles.itemRow}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{item.sku}</span>
                    </div>
                    <div>
                      <span>Pendiente</span>
                      <strong>{item.pending}</strong>
                    </div>
                    <Input
                      label="Cantidad a entregar"
                      type="number"
                      min="0"
                      max={item.pending}
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) =>
                        setDeliveryModal((current) => ({
                          ...current,
                          items: current.items.map((row, rowIndex) =>
                            rowIndex === index
                              ? {...row, quantity: event.target.value}
                              : row,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={deliveryModal.notes}
                  onChange={(event) =>
                    setDeliveryModal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeliveryModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Registrar remisión
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {invoiceModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveInvoice}>
            <header>
              <div>
                <span>Facturación comercial</span>
                <h2>Nueva factura</h2>
              </div>
              <button type="button" onClick={() => setInvoiceModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Pedido entregado
                <select
                  required
                  value={invoiceModal.salesOrderId}
                  onChange={(event) =>
                    setInvoiceModal((current) => ({
                      ...current,
                      salesOrderId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {invoiceOrders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.folio} ·{' '}
                      {item.customer.commercialName || item.customer.legalName} ·{' '}
                      {money(item.total)}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <Input
                  label="Fecha de emisión"
                  type="date"
                  required
                  value={invoiceModal.issueDate}
                  onChange={(event) =>
                    setInvoiceModal((current) => ({
                      ...current,
                      issueDate: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Fecha de vencimiento"
                  type="date"
                  required
                  value={invoiceModal.dueDate}
                  onChange={(event) =>
                    setInvoiceModal((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Notas
                <textarea
                  rows="4"
                  value={invoiceModal.notes}
                  onChange={(event) =>
                    setInvoiceModal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              <div className={styles.notice}>
                <CheckCircle2 size={18} />
                <span>
                  Al emitir la factura se creará automáticamente una cuenta por cobrar.
                </span>
              </div>
            </div>

            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInvoiceModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Emitir factura
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
