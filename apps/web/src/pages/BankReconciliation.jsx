import {useEffect, useMemo, useState} from 'react';
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Link2,
  Plus,
  Search,
  Unlink,
  WalletCards,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './BankReconciliation.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const statementBlank = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    treasuryAccountId: '',
    statementDate: today.toISOString().slice(0, 10),
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: today.toISOString().slice(0, 10),
    openingBalance: '',
    closingBalance: '',
    notes: '',
  };
};

const lineBlank = () => ({
  transactionDate: new Date().toISOString().slice(0, 10),
  description: '',
  reference: '',
  type: 'CREDIT',
  amount: '',
  bankBalance: '',
  notes: '',
});

export default function BankReconciliation() {
  const [data, setData] = useState({
    accounts: [],
    statements: [],
    stats: {},
  });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [statementModal, setStatementModal] = useState(null);
  const [lineModal, setLineModal] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/bank-reconciliation');
    setData(response);

    if (selected) {
      const refreshed = response.statements.find(
        (item) => item.id === selected.id,
      );
      setSelected(refreshed || null);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visibleStatements = useMemo(
    () =>
      data.statements.filter((item) =>
        `${item.folio} ${item.treasuryAccount.name} ${
          item.treasuryAccount.bankName || ''
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.statements, query],
  );

  async function saveStatement(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/bank-reconciliation/statements', {
        method: 'POST',
        body: {
          ...statementModal,
          openingBalance: Number(statementModal.openingBalance),
          closingBalance: Number(statementModal.closingBalance),
          notes: statementModal.notes || null,
        },
      });

      setStatementModal(null);
      setMessage(['success', 'Conciliación creada correctamente']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveLine(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest(
        `/bank-reconciliation/statements/${selected.id}/lines`,
        {
          method: 'POST',
          body: {
            ...lineModal,
            amount: Number(lineModal.amount),
            bankBalance:
              lineModal.bankBalance === ''
                ? null
                : Number(lineModal.bankBalance),
            reference: lineModal.reference || null,
            notes: lineModal.notes || null,
          },
        },
      );

      setLineModal(null);
      setMessage(['success', 'Movimiento bancario agregado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function openMatch(line) {
    try {
      const response = await apiRequest(
        `/bank-reconciliation/statements/${selected.id}/candidates`,
      );
      setCandidates(response.movements);
      setMatchModal({line, treasuryMovementId: ''});
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function matchLine(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest(
        `/bank-reconciliation/lines/${matchModal.line.id}/match`,
        {
          method: 'POST',
          body: {
            treasuryMovementId: matchModal.treasuryMovementId,
          },
        },
      );

      setMatchModal(null);
      setMessage(['success', 'Movimiento conciliado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function ignoreLine(line) {
    const notes = window.prompt(
      'Indica el motivo por el que se ignorará este movimiento:',
    );

    if (!notes) return;

    try {
      await apiRequest(
        `/bank-reconciliation/lines/${line.id}/ignore`,
        {
          method: 'PATCH',
          body: {notes},
        },
      );
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function closeStatement() {
    if (
      !selected ||
      !window.confirm(`¿Cerrar la conciliación ${selected.folio}?`)
    ) {
      return;
    }

    try {
      await apiRequest(
        `/bank-reconciliation/statements/${selected.id}/close`,
        {method: 'PATCH'},
      );
      setMessage(['success', 'Conciliación cerrada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const credits =
    selected?.lines
      .filter((item) => item.type === 'CREDIT')
      .reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const debits =
    selected?.lines
      .filter((item) => item.type === 'DEBIT')
      .reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const calculatedClosing = selected
    ? Number(selected.openingBalance) + credits - debits
    : 0;
  const difference = selected
    ? Number(selected.closingBalance) - calculatedClosing
    : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Finanzas</span>
          <h1>Conciliación bancaria</h1>
          <p>
            Compara el estado de cuenta bancario contra los movimientos de
            Tesorería.
          </p>
        </div>

        <Button
          icon={Plus}
          onClick={() => setStatementModal(statementBlank())}
        >
          Nueva conciliación
        </Button>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <section className={styles.metrics}>
        <KpiCard>
          <WalletCards />
          <span>Conciliaciones</span><KpiInfo title="Estados de cuenta">Cantidad de conciliaciones bancarias creadas.</KpiInfo>
          <strong>{data.stats.statements || 0}</strong>
        </KpiCard>
        <KpiCard>
          <Unlink />
          <span>Movimientos pendientes</span><KpiInfo title="Pendientes de conciliar">Movimientos bancarios aún no relacionados ni justificados.</KpiInfo>
          <strong>{data.stats.pendingLines || 0}</strong>
        </KpiCard>
        <KpiCard>
          <Link2 />
          <span>Movimientos conciliados</span><KpiInfo title="Coincidencias confirmadas">Movimientos bancarios relacionados con movimientos de Tesorería.</KpiInfo>
          <strong>{data.stats.matchedLines || 0}</strong>
        </KpiCard>
        <KpiCard>
          <CircleDollarSign />
          <span>Importe pendiente</span><KpiInfo title="Importe sin conciliar">Suma absoluta de movimientos bancarios todavía pendientes.</KpiInfo>
          <strong>{money(data.stats.pendingAmount)}</strong>
        </KpiCard>
        <KpiCard>
          <BadgeCheck />
          <span>Estados cerrados</span><KpiInfo title="Conciliaciones cerradas">Estados de cuenta cuadrados y cerrados sin diferencias pendientes.</KpiInfo>
          <strong>{data.stats.reconciledStatements || 0}</strong>
        </KpiCard>
      </section>

      <section className={styles.layout}>
        <Card className={styles.statements}>
          <div className={styles.toolbar}>
            <div>
              <h2>Estados de cuenta</h2>
              <p>{visibleStatements.length} registros</p>
            </div>

            <label className={styles.search}>
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar cuenta o folio"
              />
            </label>
          </div>

          <div className={styles.statementList}>
            {visibleStatements.map((item) => {
              const pending = item.lines.filter(
                (line) => line.status === 'PENDING',
              ).length;

              return (
                <button
                  key={item.id}
                  className={selected?.id === item.id ? styles.selected : ''}
                  onClick={() => setSelected(item)}
                >
                  <div>
                    <strong>{item.folio}</strong>
                    <span>{item.treasuryAccount.name}</span>
                  </div>
                  <div>
                    <Badge
                      tone={
                        item.status === 'CLOSED'
                          ? 'success'
                          : pending
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {item.status}
                    </Badge>
                    <small>{pending} pendientes</small>
                  </div>
                </button>
              );
            })}

            {!visibleStatements.length ? (
              <div className={styles.empty}>No hay conciliaciones.</div>
            ) : null}
          </div>
        </Card>

        <Card className={styles.detail}>
          {selected ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <span className={styles.eyebrow}>Estado de cuenta</span>
                  <h2>{selected.folio}</h2>
                  <p>
                    {selected.treasuryAccount.name} ·{' '}
                    {date(selected.periodStart)} a {date(selected.periodEnd)}
                  </p>
                </div>

                <div className={styles.detailActions}>
                  {selected.status !== 'CLOSED' ? (
                    <>
                      <Button
                        variant="secondary"
                        icon={Plus}
                        onClick={() => setLineModal(lineBlank())}
                      >
                        Agregar movimiento
                      </Button>
                      <Button
                        icon={CheckCircle2}
                        onClick={closeStatement}
                      >
                        Cerrar conciliación
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <section className={styles.summary}>
                <div>
                  <span>Saldo inicial</span>
                  <strong>{money(selected.openingBalance)}</strong>
                </div>
                <div>
                  <span>Créditos</span>
                  <strong>{money(credits)}</strong>
                </div>
                <div>
                  <span>Débitos</span>
                  <strong>{money(debits)}</strong>
                </div>
                <div>
                  <span>Saldo calculado</span>
                  <strong>{money(calculatedClosing)}</strong>
                </div>
                <div>
                  <span>Saldo bancario</span>
                  <strong>{money(selected.closingBalance)}</strong>
                </div>
                <div
                  className={
                    Math.abs(difference) > 0.01
                      ? styles.difference
                      : styles.balanced
                  }
                >
                  <span>Diferencia</span>
                  <strong>{money(difference)}</strong>
                </div>
              </section>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Referencia</th>
                      <th>Tipo</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>Movimiento ERP</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.length ? (
                      selected.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{date(line.transactionDate)}</td>
                          <td><strong>{line.description}</strong></td>
                          <td>{line.reference || '—'}</td>
                          <td>
                            <Badge
                              tone={
                                line.type === 'CREDIT'
                                  ? 'success'
                                  : 'danger'
                              }
                            >
                              {line.type === 'CREDIT'
                                ? 'Crédito'
                                : 'Débito'}
                            </Badge>
                          </td>
                          <td>{money(line.amount)}</td>
                          <td>
                            <Badge
                              tone={
                                line.status === 'MATCHED'
                                  ? 'success'
                                  : line.status === 'IGNORED'
                                    ? 'neutral'
                                    : 'warning'
                              }
                            >
                              {line.status}
                            </Badge>
                          </td>
                          <td>
                            {line.treasuryMovement
                              ? line.treasuryMovement.folio
                              : 'Sin conciliar'}
                          </td>
                          <td className={styles.actions}>
                            {line.status === 'PENDING' ? (
                              <>
                                <button onClick={() => openMatch(line)}>
                                  Conciliar
                                </button>
                                <button onClick={() => ignoreLine(line)}>
                                  Ignorar
                                </button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className={styles.emptyCell}>
                          Agrega los movimientos del estado de cuenta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <Banknote size={34} />
              <strong>Selecciona una conciliación</strong>
              <span>
                Aquí podrás revisar movimientos, diferencias y coincidencias.
              </span>
            </div>
          )}
        </Card>
      </section>

      {statementModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveStatement}>
            <header>
              <div>
                <span>Finanzas</span>
                <h2>Nueva conciliación</h2>
              </div>
              <button type="button" onClick={() => setStatementModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label>
                Cuenta bancaria
                <select
                  required
                  value={statementModal.treasuryAccountId}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      treasuryAccountId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona una cuenta</option>
                  {data.accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.grid3}>
                <Input
                  label="Fecha del estado"
                  type="date"
                  required
                  value={statementModal.statementDate}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      statementDate: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Inicio del periodo"
                  type="date"
                  required
                  value={statementModal.periodStart}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      periodStart: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Fin del periodo"
                  type="date"
                  required
                  value={statementModal.periodEnd}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      periodEnd: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Saldo inicial"
                  type="number"
                  step="0.01"
                  required
                  value={statementModal.openingBalance}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      openingBalance: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Saldo final del banco"
                  type="number"
                  step="0.01"
                  required
                  value={statementModal.closingBalance}
                  onChange={(event) =>
                    setStatementModal((current) => ({
                      ...current,
                      closingBalance: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={statementModal.notes}
                  onChange={(event) =>
                    setStatementModal((current) => ({
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
                onClick={() => setStatementModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Crear conciliación
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {lineModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveLine}>
            <header>
              <div>
                <span>Estado bancario</span>
                <h2>Agregar movimiento</h2>
              </div>
              <button type="button" onClick={() => setLineModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={lineModal.transactionDate}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      transactionDate: event.target.value,
                    }))
                  }
                />
                <label>
                  Tipo
                  <select
                    value={lineModal.type}
                    onChange={(event) =>
                      setLineModal((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="CREDIT">Crédito / depósito</option>
                    <option value="DEBIT">Débito / cargo</option>
                  </select>
                </label>
              </div>

              <Input
                label="Descripción bancaria"
                required
                value={lineModal.description}
                onChange={(event) =>
                  setLineModal((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />

              <div className={styles.grid3}>
                <Input
                  label="Importe"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={lineModal.amount}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Referencia"
                  value={lineModal.reference}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Saldo bancario"
                  type="number"
                  step="0.01"
                  value={lineModal.bankBalance}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      bankBalance: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={lineModal.notes}
                  onChange={(event) =>
                    setLineModal((current) => ({
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
                onClick={() => setLineModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Agregar movimiento
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {matchModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={matchLine}>
            <header>
              <div>
                <span>Conciliación</span>
                <h2>Relacionar movimiento</h2>
              </div>
              <button type="button" onClick={() => setMatchModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.bankLine}>
                <span>Movimiento bancario</span>
                <strong>{matchModal.line.description}</strong>
                <small>
                  {date(matchModal.line.transactionDate)} ·{' '}
                  {money(matchModal.line.amount)}
                </small>
              </div>

              <label>
                Movimiento de Tesorería
                <select
                  required
                  value={matchModal.treasuryMovementId}
                  onChange={(event) =>
                    setMatchModal((current) => ({
                      ...current,
                      treasuryMovementId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona una coincidencia</option>
                  {candidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.folio} · {date(item.movementDate)} ·{' '}
                      {item.concept} · {money(item.amount)}
                    </option>
                  ))}
                </select>
              </label>

              {!candidates.length ? (
                <div className={styles.empty}>
                  No hay movimientos disponibles para conciliar.
                </div>
              ) : null}
            </div>

            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMatchModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Conciliar movimiento
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
