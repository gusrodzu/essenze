import {useEffect, useMemo, useState} from 'react';
import {
  BadgeDollarSign,
  Banknote,
  CircleDollarSign,
  FileCheck2,
  Plus,
  Search,
  WalletCards,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Collections.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const paymentBlank = () => ({
  customerId: '',
  treasuryAccountId: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: '',
  method: 'TRANSFER',
  reference: '',
  notes: '',
  applications: [],
});

export default function Collections() {
  const [data, setData] = useState({
    customers: [],
    receivables: [],
    accounts: [],
    payments: [],
    stats: {},
  });
  const [query, setQuery] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/collections');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visiblePayments = useMemo(
    () =>
      data.payments.filter((item) =>
        `${item.folio} ${
          item.customer.commercialName || item.customer.legalName
        } ${item.reference || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.payments, query],
  );

  function selectCustomer(customerId) {
    const receivables = data.receivables
      .filter((item) => item.customerId === customerId)
      .map((item) => ({
        accountsReceivableId: item.id,
        invoiceNumber: item.invoiceNumber,
        dueDate: item.dueDate,
        balance: Number(item.total) - Number(item.paidAmount),
        amount: 0,
      }));

    setPaymentModal((current) => ({
      ...current,
      customerId,
      applications: receivables,
    }));
  }

  const appliedTotal = paymentModal
    ? paymentModal.applications.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      )
    : 0;

  async function savePayment(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/collections/payments', {
        method: 'POST',
        body: {
          ...paymentModal,
          amount: Number(paymentModal.amount),
          reference: paymentModal.reference || null,
          notes: paymentModal.notes || null,
          applications: paymentModal.applications
            .filter((item) => Number(item.amount) > 0)
            .map((item) => ({
              accountsReceivableId: item.accountsReceivableId,
              amount: Number(item.amount),
            })),
        },
      });

      setPaymentModal(null);
      setMessage(['success', 'Pago registrado y aplicado correctamente']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Finanzas comerciales</span>
          <h1>Cobranza</h1>
          <p>
            Registra pagos, aplícalos a facturas y deposítalos en caja o banco.
          </p>
        </div>

        <Button
          icon={Plus}
          onClick={() => setPaymentModal(paymentBlank())}
        >
          Registrar cobro
        </Button>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <section className={styles.metrics}>
        <KpiCard>
          <CircleDollarSign />
          <span>Cartera pendiente</span><KpiInfo title="Saldo por cobrar">Saldo total abierto de las cuentas por cobrar.</KpiInfo>
          <strong>{money(data.stats.outstanding)}</strong>
        </KpiCard>
        <KpiCard>
          <FileCheck2 />
          <span>Facturas abiertas</span><KpiInfo title="Documentos pendientes">Cantidad de facturas con saldo pendiente o vencido.</KpiInfo>
          <strong>{data.stats.openInvoices || 0}</strong>
        </KpiCard>
        <KpiCard>
          <BadgeDollarSign />
          <span>Cartera vencida</span><KpiInfo title="Cobranza vencida">Saldo pendiente de facturas cuya fecha de vencimiento ya pasó.</KpiInfo>
          <strong>{money(data.stats.overdue)}</strong>
        </KpiCard>
        <KpiCard>
          <Banknote />
          <span>Cobrado acumulado</span><KpiInfo title="Cobros registrados">Importe total de recibos de cobranza aplicados.</KpiInfo>
          <strong>{money(data.stats.collected)}</strong>
        </KpiCard>
        <KpiCard>
          <WalletCards />
          <span>Saldo no aplicado</span><KpiInfo title="Anticipos disponibles">Importe recibido que aún no se ha relacionado con facturas.</KpiInfo>
          <strong>{money(data.stats.unapplied)}</strong>
        </KpiCard>
      </section>

      <Card className={styles.workspace}>
        <div className={styles.toolbar}>
          <div>
            <h2>Historial de cobranza</h2>
            <p>{visiblePayments.length} pagos registrados</p>
          </div>

          <label className={styles.search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar folio, cliente o referencia"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Método</th>
                <th>Cuenta</th>
                <th>Importe</th>
                <th>Aplicado</th>
                <th>No aplicado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.length ? (
                visiblePayments.map((item) => {
                  const applied = item.applications.reduce(
                    (sum, row) => sum + Number(row.amount),
                    0,
                  );

                  return (
                    <tr key={item.id}>
                      <td><strong>{item.folio}</strong></td>
                      <td>
                        {item.customer.commercialName ||
                          item.customer.legalName}
                      </td>
                      <td>{date(item.paymentDate)}</td>
                      <td>{item.method}</td>
                      <td>{item.treasuryAccount.name}</td>
                      <td><strong>{money(item.amount)}</strong></td>
                      <td>{money(applied)}</td>
                      <td>{money(item.unappliedAmount)}</td>
                      <td>
                        <Badge tone="success">{item.status}</Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className={styles.emptyCell}>
                    No hay pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {paymentModal ? (
        <div className={styles.overlay}>
          <form className={`${styles.modal} ${styles.largeModal}`} onSubmit={savePayment}>
            <header>
              <div>
                <span>Cobranza</span>
                <h2>Registrar pago</h2>
              </div>
              <button type="button" onClick={() => setPaymentModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Cliente
                <select
                  required
                  value={paymentModal.customerId}
                  onChange={(event) => selectCustomer(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {data.customers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} ·{' '}
                      {item.commercialName || item.legalName}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid3}>
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={paymentModal.paymentDate}
                  onChange={(event) =>
                    setPaymentModal((current) => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Importe"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentModal.amount}
                  onChange={(event) =>
                    setPaymentModal((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />

                <label>
                  Método
                  <select
                    value={paymentModal.method}
                    onChange={(event) =>
                      setPaymentModal((current) => ({
                        ...current,
                        method: event.target.value,
                      }))
                    }
                  >
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="CHECK">Cheque</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
              </div>

              <div className={styles.grid2}>
                <label>
                  Cuenta de depósito
                  <select
                    required
                    value={paymentModal.treasuryAccountId}
                    onChange={(event) =>
                      setPaymentModal((current) => ({
                        ...current,
                        treasuryAccountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {data.accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label="Referencia"
                  value={paymentModal.reference}
                  onChange={(event) =>
                    setPaymentModal((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.applicationHeader}>
                <div>
                  <strong>Aplicación a facturas</strong>
                  <span>
                    Distribuye el pago entre las facturas pendientes.
                  </span>
                </div>
                <div>
                  <span>Aplicado</span>
                  <strong>{money(appliedTotal)}</strong>
                </div>
              </div>

              <div className={styles.applications}>
                {paymentModal.applications.map((item, index) => (
                  <div className={styles.applicationRow} key={item.accountsReceivableId}>
                    <div>
                      <strong>{item.invoiceNumber}</strong>
                      <span>Vence {date(item.dueDate)}</span>
                    </div>
                    <div>
                      <span>Saldo</span>
                      <strong>{money(item.balance)}</strong>
                    </div>
                    <Input
                      label="Aplicar"
                      type="number"
                      min="0"
                      max={item.balance}
                      step="0.01"
                      value={item.amount}
                      onChange={(event) =>
                        setPaymentModal((current) => ({
                          ...current,
                          applications: current.applications.map(
                            (row, rowIndex) =>
                              rowIndex === index
                                ? {...row, amount: event.target.value}
                                : row,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}

                {paymentModal.customerId &&
                !paymentModal.applications.length ? (
                  <div className={styles.emptyApplication}>
                    El cliente no tiene facturas pendientes.
                  </div>
                ) : null}
              </div>

              <div className={styles.summary}>
                <div>
                  <span>Importe del pago</span>
                  <strong>{money(paymentModal.amount)}</strong>
                </div>
                <div>
                  <span>Total aplicado</span>
                  <strong>{money(appliedTotal)}</strong>
                </div>
                <div>
                  <span>Saldo no aplicado</span>
                  <strong>
                    {money(
                      Math.max(
                        0,
                        Number(paymentModal.amount || 0) - appliedTotal,
                      ),
                    )}
                  </strong>
                </div>
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={paymentModal.notes}
                  onChange={(event) =>
                    setPaymentModal((current) => ({
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
                onClick={() => setPaymentModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Registrar cobro
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
