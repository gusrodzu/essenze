import {useEffect, useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  BadgeDollarSign,
  FileMinus2,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './SalesReturns.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const returnBlank = () => ({
  salesDeliveryId: '',
  warehouseId: '',
  returnDate: new Date().toISOString().slice(0, 10),
  reason: '',
  reference: '',
  notes: '',
  items: [],
});

const creditBlank = () => ({
  salesInvoiceId: '',
  salesReturnId: '',
  issueDate: new Date().toISOString().slice(0, 10),
  subtotal: '',
  taxTotal: '',
  reason: '',
  notes: '',
});

export default function SalesReturns() {
  const [data, setData] = useState({
    deliveries: [],
    returns: [],
    invoices: [],
    creditNotes: [],
    warehouses: [],
    stats: {},
  });
  const [tab, setTab] = useState('returns');
  const [query, setQuery] = useState('');
  const [returnModal, setReturnModal] = useState(null);
  const [creditModal, setCreditModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/sales-returns');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visibleReturns = useMemo(
    () =>
      data.returns.filter((item) =>
        `${item.folio} ${item.salesDelivery.folio} ${
          item.salesDelivery.salesOrder.customer.commercialName ||
          item.salesDelivery.salesOrder.customer.legalName
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.returns, query],
  );

  const visibleCredits = useMemo(
    () =>
      data.creditNotes.filter((item) =>
        `${item.folio} ${item.salesInvoice.invoiceNumber} ${
          item.salesInvoice.customer.commercialName ||
          item.salesInvoice.customer.legalName
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.creditNotes, query],
  );

  function selectDelivery(deliveryId) {
    const delivery = data.deliveries.find((item) => item.id === deliveryId);

    setReturnModal((current) => ({
      ...current,
      salesDeliveryId: deliveryId,
      warehouseId: delivery?.warehouseId || '',
      items:
        delivery?.items.map((item) => {
          const alreadyReturned = item.returnItems.reduce(
            (sum, row) => sum + Number(row.quantity),
            0,
          );
          const available = Number(item.quantity) - alreadyReturned;

          return {
            salesDeliveryItemId: item.id,
            productName: item.product.name,
            sku: item.product.sku,
            available,
            quantity: available,
          };
        }) || [],
    }));
  }

  async function saveReturn(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/sales-returns/returns', {
        method: 'POST',
        body: {
          ...returnModal,
          reference: returnModal.reference || null,
          notes: returnModal.notes || null,
          items: returnModal.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
              salesDeliveryItemId: item.salesDeliveryItemId,
              quantity: Number(item.quantity),
            })),
        },
      });

      setReturnModal(null);
      setMessage(['success', 'Devolución registrada y existencias actualizadas']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveCredit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/sales-returns/credit-notes', {
        method: 'POST',
        body: {
          ...creditModal,
          salesReturnId: creditModal.salesReturnId || null,
          subtotal: Number(creditModal.subtotal),
          taxTotal: Number(creditModal.taxTotal),
          notes: creditModal.notes || null,
        },
      });

      setCreditModal(null);
      setMessage(['success', 'Nota de crédito aplicada a la cuenta por cobrar']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  const availableReturns = data.returns.filter(
    (item) => item.status === 'POSTED' && !item.creditNote,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Postventa</span>
          <h1>Devoluciones y notas de crédito</h1>
          <p>
            Reingresa mercancía al inventario y ajusta el saldo del cliente sin
            eliminar la factura original.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={FileMinus2}
            onClick={() => setCreditModal(creditBlank())}
          >
            Nueva nota de crédito
          </Button>
          <Button
            icon={RotateCcw}
            onClick={() => setReturnModal(returnBlank())}
          >
            Nueva devolución
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
          <RotateCcw />
          <span>Devoluciones aplicadas</span><KpiInfo title="Devoluciones registradas">Devoluciones confirmadas que reingresaron mercancía.</KpiInfo>
          <strong>{data.stats.returns || 0}</strong>
        </KpiCard>
        <KpiCard>
          <PackageOpen />
          <span>Unidades devueltas</span><KpiInfo title="Cantidad retornada">Suma de unidades devueltas por los clientes.</KpiInfo>
          <strong>{data.stats.returnedUnits || 0}</strong>
        </KpiCard>
        <KpiCard>
          <FileMinus2 />
          <span>Notas de crédito</span><KpiInfo title="Notas aplicadas">Cantidad de notas de crédito comerciales emitidas.</KpiInfo>
          <strong>{data.stats.creditNotes || 0}</strong>
        </KpiCard>
        <KpiCard>
          <BadgeDollarSign />
          <span>Total acreditado</span><KpiInfo title="Importe acreditado">Valor total reducido mediante notas de crédito.</KpiInfo>
          <strong>{money(data.stats.creditedTotal)}</strong>
        </KpiCard>
        <KpiCard>
          <ArrowDownLeft />
          <span>Pendientes de acreditar</span><KpiInfo title="Devoluciones sin nota">Devoluciones aplicadas que todavía no tienen nota de crédito.</KpiInfo>
          <strong>{data.stats.pendingCreditNotes || 0}</strong>
        </KpiCard>
      </section>

      <Card className={styles.workspace}>
        <div className={styles.tabs}>
          <button
            className={tab === 'returns' ? styles.active : ''}
            onClick={() => setTab('returns')}
          >
            Devoluciones
          </button>
          <button
            className={tab === 'credits' ? styles.active : ''}
            onClick={() => setTab('credits')}
          >
            Notas de crédito
          </button>
        </div>

        <div className={styles.toolbar}>
          <div>
            <h2>
              {tab === 'returns'
                ? 'Historial de devoluciones'
                : 'Ajustes comerciales'}
            </h2>
            <p>
              {tab === 'returns'
                ? `${visibleReturns.length} devoluciones`
                : `${visibleCredits.length} notas`}
            </p>
          </div>

          <label className={styles.search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar folio, factura o cliente"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          {tab === 'returns' ? (
            <table>
              <thead>
                <tr>
                  <th>Devolución</th>
                  <th>Remisión</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Motivo</th>
                  <th>Partidas</th>
                  <th>Estado</th>
                  <th>Nota de crédito</th>
                </tr>
              </thead>
              <tbody>
                {visibleReturns.length ? (
                  visibleReturns.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.folio}</strong></td>
                      <td>{item.salesDelivery.folio}</td>
                      <td>
                        {item.salesDelivery.salesOrder.customer.commercialName ||
                          item.salesDelivery.salesOrder.customer.legalName}
                      </td>
                      <td>{date(item.returnDate)}</td>
                      <td>{item.reason}</td>
                      <td>{item.items.length}</td>
                      <td><Badge tone="success">{item.status}</Badge></td>
                      <td>{item.creditNote?.folio || 'Pendiente'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No hay devoluciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nota</th>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Motivo</th>
                  <th>Subtotal</th>
                  <th>Impuestos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleCredits.length ? (
                  visibleCredits.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.folio}</strong></td>
                      <td>{item.salesInvoice.invoiceNumber}</td>
                      <td>
                        {item.salesInvoice.customer.commercialName ||
                          item.salesInvoice.customer.legalName}
                      </td>
                      <td>{date(item.issueDate)}</td>
                      <td>{item.reason}</td>
                      <td>{money(item.subtotal)}</td>
                      <td>{money(item.taxTotal)}</td>
                      <td><strong>{money(item.total)}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No hay notas de crédito registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {returnModal ? (
        <div className={styles.overlay}>
          <form
            className={`${styles.modal} ${styles.largeModal}`}
            onSubmit={saveReturn}
          >
            <header>
              <div>
                <span>Postventa</span>
                <h2>Nueva devolución</h2>
              </div>
              <button type="button" onClick={() => setReturnModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Remisión
                <select
                  required
                  value={returnModal.salesDeliveryId}
                  onChange={(event) => selectDelivery(event.target.value)}
                >
                  <option value="">Selecciona una remisión</option>
                  {data.deliveries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.folio} · {item.salesOrder.folio} ·{' '}
                      {item.salesOrder.customer.commercialName ||
                        item.salesOrder.customer.legalName}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <label>
                  Almacén de reingreso
                  <select
                    required
                    value={returnModal.warehouseId}
                    onChange={(event) =>
                      setReturnModal((current) => ({
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
                  label="Fecha"
                  type="date"
                  required
                  value={returnModal.returnDate}
                  onChange={(event) =>
                    setReturnModal((current) => ({
                      ...current,
                      returnDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Motivo"
                  required
                  value={returnModal.reason}
                  onChange={(event) =>
                    setReturnModal((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Referencia"
                  value={returnModal.reference}
                  onChange={(event) =>
                    setReturnModal((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.items}>
                {returnModal.items.map((item, index) => (
                  <div key={item.salesDeliveryItemId} className={styles.itemRow}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{item.sku}</span>
                    </div>
                    <div>
                      <span>Disponible</span>
                      <strong>{item.available}</strong>
                    </div>
                    <Input
                      label="Cantidad a devolver"
                      type="number"
                      min="0"
                      max={item.available}
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) =>
                        setReturnModal((current) => ({
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
                  value={returnModal.notes}
                  onChange={(event) =>
                    setReturnModal((current) => ({
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
                onClick={() => setReturnModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Registrar devolución
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {creditModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveCredit}>
            <header>
              <div>
                <span>Ajuste comercial</span>
                <h2>Nueva nota de crédito</h2>
              </div>
              <button type="button" onClick={() => setCreditModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Factura
                <select
                  required
                  value={creditModal.salesInvoiceId}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      salesInvoiceId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {data.invoices.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.invoiceNumber} ·{' '}
                      {item.customer.commercialName || item.customer.legalName} ·{' '}
                      {money(item.total)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Devolución relacionada
                <select
                  value={creditModal.salesReturnId}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      salesReturnId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sin devolución vinculada</option>
                  {availableReturns.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.folio} · {item.reason}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={creditModal.issueDate}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      issueDate: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Motivo"
                  required
                  value={creditModal.reason}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={creditModal.subtotal}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      subtotal: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Impuestos"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={creditModal.taxTotal}
                  onChange={(event) =>
                    setCreditModal((current) => ({
                      ...current,
                      taxTotal: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.totalBox}>
                <span>Total de la nota</span>
                <strong>
                  {money(
                    Number(creditModal.subtotal || 0) +
                      Number(creditModal.taxTotal || 0),
                  )}
                </strong>
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={creditModal.notes}
                  onChange={(event) =>
                    setCreditModal((current) => ({
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
                onClick={() => setCreditModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Aplicar nota de crédito
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
