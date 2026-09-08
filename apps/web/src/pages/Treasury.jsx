import {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CircleDollarSign,
  Landmark,
  Pencil,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Treasury.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const currency = (value, code = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: code,
  }).format(Number(value || 0));

const date = (value) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
      }).format(new Date(value))
    : '—';

const accountBlank = () => ({
  code: '',
  name: '',
  type: 'BANK',
  bankName: '',
  accountNumber: '',
  currency: 'MXN',
  openingBalance: 0,
  active: true,
});

const movementBlank = () => ({
  accountId: '',
  type: 'INCOME',
  movementDate: new Date().toISOString().slice(0, 10),
  amount: '',
  concept: '',
  category: '',
  reference: '',
  notes: '',
});

const transferBlank = () => ({
  fromAccountId: '',
  toAccountId: '',
  movementDate: new Date().toISOString().slice(0, 10),
  amount: '',
  concept: '',
  reference: '',
  notes: '',
});

const typeLabels = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  TRANSFER_IN: 'Transferencia entrada',
  TRANSFER_OUT: 'Transferencia salida',
  ADJUSTMENT_IN: 'Ajuste entrada',
  ADJUSTMENT_OUT: 'Ajuste salida',
};

const typeTones = {
  INCOME: 'success',
  EXPENSE: 'danger',
  TRANSFER_IN: 'neutral',
  TRANSFER_OUT: 'neutral',
  ADJUSTMENT_IN: 'warning',
  ADJUSTMENT_OUT: 'warning',
};

export default function Treasury() {
  const [data, setData] = useState({
    accounts: [],
    movements: [],
    stats: {
      accounts: 0,
      activeAccounts: 0,
      cashBalance: 0,
      bankBalance: 0,
      totalBalance: 0,
    },
  });
  const [query, setQuery] = useState('');
  const [accountModal, setAccountModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/treasury');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const movements = useMemo(
    () =>
      data.movements.filter((item) =>
        `${item.folio} ${item.concept} ${item.account.name} ${item.reference || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.movements, query],
  );

  async function saveAccount(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const method = accountModal.id ? 'PUT' : 'POST';
      const url = accountModal.id
        ? `/treasury/accounts/${accountModal.id}`
        : '/treasury/accounts';

      const payload = {
        ...accountModal,
        openingBalance: Number(accountModal.openingBalance || 0),
      };

      if (accountModal.id) delete payload.openingBalance;

      await apiRequest(url, {method, body: payload});
      setAccountModal(null);
      setMessage(['success', 'Cuenta guardada correctamente']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveMovement(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/treasury/movements', {
        method: 'POST',
        body: {
          ...movementModal,
          amount: Number(movementModal.amount),
          category: movementModal.category || null,
          reference: movementModal.reference || null,
          notes: movementModal.notes || null,
        },
      });

      setMovementModal(null);
      setMessage(['success', 'Movimiento registrado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveTransfer(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/treasury/transfers', {
        method: 'POST',
        body: {
          ...transferModal,
          amount: Number(transferModal.amount),
          reference: transferModal.reference || null,
          notes: transferModal.notes || null,
        },
      });

      setTransferModal(null);
      setMessage(['success', 'Transferencia realizada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccount(item) {
    try {
      await apiRequest(`/treasury/accounts/${item.id}/status`, {
        method: 'PATCH',
        body: {active: !item.active},
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Finanzas</span>
          <h1>Tesorería</h1>
          <p>
            Controla saldos, ingresos, egresos y transferencias entre cajas y
            cuentas bancarias.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={ArrowLeftRight}
            onClick={() => setTransferModal(transferBlank())}
          >
            Transferir
          </Button>
          <Button
            variant="secondary"
            icon={CircleDollarSign}
            onClick={() => setMovementModal(movementBlank())}
          >
            Nuevo movimiento
          </Button>
          <Button icon={Plus} onClick={() => setAccountModal(accountBlank())}>
            Nueva cuenta
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
          <Wallet />
          <span>Saldo total</span><KpiInfo title="Liquidez consolidada">Suma del saldo disponible en todas las cuentas activas.</KpiInfo>
          <strong>{currency(data.stats.totalBalance)}</strong>
        </KpiCard>
        <KpiCard>
          <Landmark />
          <span>Saldo en bancos</span><KpiInfo title="Disponibilidad bancaria">Saldo acumulado de las cuentas bancarias.</KpiInfo>
          <strong>{currency(data.stats.bankBalance)}</strong>
        </KpiCard>
        <KpiCard>
          <Banknote />
          <span>Saldo en cajas</span><KpiInfo title="Disponibilidad en efectivo">Saldo acumulado de las cuentas tipo caja.</KpiInfo>
          <strong>{currency(data.stats.cashBalance)}</strong>
        </KpiCard>
        <KpiCard>
          <Building2 />
          <span>Cuentas activas</span><KpiInfo title="Cuentas disponibles">Cajas y bancos habilitados para registrar movimientos.</KpiInfo>
          <strong>{data.stats.activeAccounts}</strong>
        </KpiCard>
      </section>

      <section className={styles.accountsGrid}>
        {data.accounts.map((item) => (
          <Card className={styles.accountCard} key={item.id}>
            <div className={styles.accountHeader}>
              <div className={styles.accountIcon}>
                {item.type === 'BANK' ? <Landmark /> : <Wallet />}
              </div>
              <div>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </div>
              <Badge tone={item.active ? 'success' : 'neutral'}>
                {item.active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>

            <div className={styles.accountBalance}>
              <span>Saldo disponible</span>
              <strong>{currency(item.currentBalance, item.currency)}</strong>
            </div>

            <div className={styles.accountMeta}>
              <span>{item.type === 'BANK' ? item.bankName || 'Banco' : 'Caja'}</span>
              <span>{item.accountNumber || item.currency}</span>
            </div>

            <div className={styles.accountActions}>
              <button
                onClick={() =>
                  setAccountModal({
                    ...item,
                    openingBalance: Number(item.openingBalance),
                  })
                }
              >
                <Pencil size={16} /> Editar
              </button>
              <button onClick={() => toggleAccount(item)}>
                {item.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </Card>
        ))}

        {!data.accounts.length ? (
          <Card className={styles.emptyAccount}>
            <Wallet />
            <strong>No hay cuentas registradas</strong>
            <span>Crea una caja o cuenta bancaria para empezar.</span>
          </Card>
        ) : null}
      </section>

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div>
            <h2>Movimientos recientes</h2>
            <p>{movements.length} registros visibles</p>
          </div>

          <label className={styles.search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar folio, concepto o cuenta"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Folio</th>
                <th>Cuenta</th>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Importe</th>
                <th>Saldo posterior</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movements.length ? (
                movements.map((item) => (
                  <tr key={item.id}>
                    <td>{date(item.movementDate)}</td>
                    <td><strong>{item.folio}</strong></td>
                    <td>
                      <strong>{item.account.name}</strong>
                      <small>{item.account.code}</small>
                    </td>
                    <td>
                      <strong>{item.concept}</strong>
                      <small>{item.reference || item.category || 'Sin referencia'}</small>
                    </td>
                    <td>
                      <Badge tone={typeTones[item.type]}>
                        {typeLabels[item.type]}
                      </Badge>
                    </td>
                    <td
                      className={
                        ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(item.type)
                          ? styles.positive
                          : styles.negative
                      }
                    >
                      {['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(item.type)
                        ? '+'
                        : '-'}
                      {currency(item.amount, item.account.currency)}
                    </td>
                    <td>{currency(item.balanceAfter, item.account.currency)}</td>
                    <td>
                      {item.createdBy.firstName} {item.createdBy.lastName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyCell}>
                    No hay movimientos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {accountModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveAccount}>
            <div className={styles.modalHeader}>
              <div>
                <span>Cuenta de tesorería</span>
                <h2>{accountModal.id ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
              </div>
              <button type="button" onClick={() => setAccountModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <Input
                  label="Código"
                  required
                  value={accountModal.code}
                  onChange={(event) =>
                    setAccountModal((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Nombre"
                  required
                  value={accountModal.name}
                  onChange={(event) =>
                    setAccountModal((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <label>
                  Tipo
                  <select
                    value={accountModal.type}
                    onChange={(event) =>
                      setAccountModal((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="BANK">Cuenta bancaria</option>
                    <option value="CASH">Caja</option>
                  </select>
                </label>

                <Input
                  label="Moneda"
                  maxLength="3"
                  value={accountModal.currency}
                  onChange={(event) =>
                    setAccountModal((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              {accountModal.type === 'BANK' ? (
                <div className={styles.grid2}>
                  <Input
                    label="Banco"
                    value={accountModal.bankName || ''}
                    onChange={(event) =>
                      setAccountModal((current) => ({
                        ...current,
                        bankName: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Número de cuenta"
                    value={accountModal.accountNumber || ''}
                    onChange={(event) =>
                      setAccountModal((current) => ({
                        ...current,
                        accountNumber: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {!accountModal.id ? (
                <Input
                  label="Saldo inicial"
                  type="number"
                  min="0"
                  step="0.01"
                  value={accountModal.openingBalance}
                  onChange={(event) =>
                    setAccountModal((current) => ({
                      ...current,
                      openingBalance: event.target.value,
                    }))
                  }
                />
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAccountModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar cuenta
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {movementModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveMovement}>
            <div className={styles.modalHeader}>
              <div>
                <span>Tesorería</span>
                <h2>Registrar movimiento</h2>
              </div>
              <button type="button" onClick={() => setMovementModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <label>
                Cuenta
                <select
                  required
                  value={movementModal.accountId}
                  onChange={(event) =>
                    setMovementModal((current) => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona una cuenta</option>
                  {data.accounts
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <label>
                  Tipo
                  <select
                    value={movementModal.type}
                    onChange={(event) =>
                      setMovementModal((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="INCOME">Ingreso</option>
                    <option value="EXPENSE">Egreso</option>
                    <option value="ADJUSTMENT_IN">Ajuste de entrada</option>
                    <option value="ADJUSTMENT_OUT">Ajuste de salida</option>
                  </select>
                </label>

                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={movementModal.movementDate}
                  onChange={(event) =>
                    setMovementModal((current) => ({
                      ...current,
                      movementDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Importe"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={movementModal.amount}
                  onChange={(event) =>
                    setMovementModal((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Categoría"
                  value={movementModal.category}
                  onChange={(event) =>
                    setMovementModal((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </div>

              <Input
                label="Concepto"
                required
                value={movementModal.concept}
                onChange={(event) =>
                  setMovementModal((current) => ({
                    ...current,
                    concept: event.target.value,
                  }))
                }
              />

              <Input
                label="Referencia"
                value={movementModal.reference}
                onChange={(event) =>
                  setMovementModal((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
              />

              <label>
                Notas
                <textarea
                  rows="3"
                  value={movementModal.notes}
                  onChange={(event) =>
                    setMovementModal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMovementModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Registrar
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {transferModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveTransfer}>
            <div className={styles.modalHeader}>
              <div>
                <span>Movimiento interno</span>
                <h2>Transferir entre cuentas</h2>
              </div>
              <button type="button" onClick={() => setTransferModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <label>
                  Cuenta origen
                  <select
                    required
                    value={transferModal.fromAccountId}
                    onChange={(event) =>
                      setTransferModal((current) => ({
                        ...current,
                        fromAccountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {data.accounts
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} · {item.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Cuenta destino
                  <select
                    required
                    value={transferModal.toAccountId}
                    onChange={(event) =>
                      setTransferModal((current) => ({
                        ...current,
                        toAccountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {data.accounts
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} · {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Importe"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={transferModal.amount}
                  onChange={(event) =>
                    setTransferModal((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={transferModal.movementDate}
                  onChange={(event) =>
                    setTransferModal((current) => ({
                      ...current,
                      movementDate: event.target.value,
                    }))
                  }
                />
              </div>

              <Input
                label="Concepto"
                required
                value={transferModal.concept}
                onChange={(event) =>
                  setTransferModal((current) => ({
                    ...current,
                    concept: event.target.value,
                  }))
                }
              />

              <Input
                label="Referencia"
                value={transferModal.reference}
                onChange={(event) =>
                  setTransferModal((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
              />

              <label>
                Notas
                <textarea
                  rows="3"
                  value={transferModal.notes}
                  onChange={(event) =>
                    setTransferModal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTransferModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Realizar transferencia
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
