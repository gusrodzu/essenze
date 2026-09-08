import {statusLabel} from '../design-system/i18n/uiLanguage.js';
import {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CircleDollarSign,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './CashFlow.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactMoney = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-MX') : '—';

const scenarioBlank = () => {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 89);

  return {
    name: '',
    description: '',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: 'DRAFT',
  };
};

const adjustmentBlank = () => ({
  date: new Date().toISOString().slice(0, 10),
  type: 'INFLOW',
  category: '',
  concept: '',
  amount: '',
  probability: 100,
  notes: '',
});

const riskTones = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

export default function CashFlow() {
  const today = new Date();
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 89);

  const [filters, setFilters] = useState({
    startDate: today.toISOString().slice(0, 10),
    endDate: defaultEnd.toISOString().slice(0, 10),
    scenarioId: '',
  });
  const [data, setData] = useState({
    summary: {},
    timeline: [],
    monthly: [],
    accounts: [],
    scenarios: [],
    selectedScenario: null,
    receivables: [],
    payables: [],
    recentMovements: [],
    risks: [],
  });
  const [scenarioModal, setScenarioModal] = useState(null);
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load(nextFilters = filters) {
    const params = new URLSearchParams({
      startDate: nextFilters.startDate,
      endDate: nextFilters.endDate,
    });

    if (nextFilters.scenarioId) {
      params.set('scenarioId', nextFilters.scenarioId);
    }

    const response = await apiRequest(`/cash-flow?${params.toString()}`);
    setData(response);
    setFilters((current) => ({
      ...current,
      scenarioId: response.filters.scenarioId || '',
    }));
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  async function applyFilters(event) {
    event.preventDefault();

    try {
      await load(filters);
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function saveScenario(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/cash-flow/scenarios', {
        method: 'POST',
        body: {
          ...scenarioModal,
          description: scenarioModal.description || null,
        },
      });

      setScenarioModal(null);
      setMessage(['success', 'Escenario financiero creado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function changeScenarioStatus(scenario, status) {
    try {
      await apiRequest(`/cash-flow/scenarios/${scenario.id}/status`, {
        method: 'PATCH',
        body: {status},
      });

      setMessage(['success', 'Estado del escenario actualizado']);
      await load({
        ...filters,
        scenarioId: status === 'ACTIVE' ? scenario.id : filters.scenarioId,
      });
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function saveAdjustment(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest(
        `/cash-flow/scenarios/${data.selectedScenario.id}/adjustments`,
        {
          method: 'POST',
          body: {
            ...adjustmentModal,
            amount: Number(adjustmentModal.amount),
            probability: Number(adjustmentModal.probability),
            notes: adjustmentModal.notes || null,
          },
        },
      );

      setAdjustmentModal(null);
      setMessage(['success', 'Ajuste agregado a la proyección']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function removeAdjustment(adjustmentId) {
    if (!data.selectedScenario) return;
    if (!window.confirm('¿Eliminar este ajuste del escenario?')) return;

    try {
      await apiRequest(
        `/cash-flow/scenarios/${data.selectedScenario.id}/adjustments/${adjustmentId}`,
        {method: 'DELETE'},
      );
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const maxMonthly = Math.max(
    1,
    ...data.monthly.flatMap((item) => [item.inflow, item.outflow]),
  );

  const filteredMovements = useMemo(
    () =>
      data.recentMovements.filter((item) =>
        `${item.folio} ${item.concept} ${item.category || ''} ${
          item.account?.name || ''
        }`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.recentMovements, query],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Planeación financiera</span>
          <h1>Flujo de efectivo</h1>
          <p>
            Analiza la liquidez actual, las obligaciones próximas y el saldo
            proyectado del negocio.
          </p>
        </div>

        <div className={styles.headerActions}>
          {data.selectedScenario ? (
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => setAdjustmentModal(adjustmentBlank())}
            >
              Agregar supuesto
            </Button>
          ) : null}
          <Button
            icon={Target}
            onClick={() => setScenarioModal(scenarioBlank())}
          >
            Nuevo escenario
          </Button>
        </div>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <Card className={styles.filtersCard}>
        <form className={styles.filters} onSubmit={applyFilters}>
          <CalendarRange size={20} />
          <Input
            label="Desde"
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
          />

          <label>
            Escenario
            <select
              value={filters.scenarioId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  scenarioId: event.target.value,
                }))
              }
            >
              <option value="">Sin escenario manual</option>
              {data.scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {statusLabel(item.status)}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit">Actualizar proyección</Button>
        </form>
      </Card>

      <section className={styles.metrics}>
        <KpiCard>
          <WalletCards />
          <span>Liquidez actual</span><KpiInfo title="Liquidez disponible">Saldo consolidado actual de cajas y cuentas bancarias activas.</KpiInfo>
          <strong>{money(data.summary.openingBalance)}</strong>
          <small>Saldo consolidado en cajas y bancos</small>
        </KpiCard>
        <KpiCard>
          <ArrowUpRight />
          <span>Cobros proyectados</span><KpiInfo title="Entradas previstas">Saldo de cuentas por cobrar con vencimiento dentro del periodo.</KpiInfo>
          <strong>{money(data.summary.totalReceivables)}</strong>
          <small>Cuentas por cobrar dentro del periodo</small>
        </KpiCard>
        <KpiCard>
          <ArrowDownRight />
          <span>Pagos proyectados</span><KpiInfo title="Salidas previstas">Saldo de cuentas por pagar con vencimiento dentro del periodo.</KpiInfo>
          <strong>{money(data.summary.totalPayables)}</strong>
          <small>Cuentas por pagar dentro del periodo</small>
        </KpiCard>
        <KpiCard>
          {Number(data.summary.netProjection) >= 0 ? (
            <TrendingUp />
          ) : (
            <TrendingDown />
          )}
          <span>Variación proyectada</span><KpiInfo title="Cambio neto esperado">Diferencia entre el saldo final proyectado y la liquidez actual.</KpiInfo>
          <strong>{money(data.summary.netProjection)}</strong>
          <small>Cambio esperado contra el saldo actual</small>
        </KpiCard>
        <KpiCard>
          <CircleDollarSign />
          <span>Saldo final proyectado</span><KpiInfo title="Liquidez futura">Saldo estimado al final del periodo considerando operaciones y escenarios.</KpiInfo>
          <strong>{money(data.summary.projectedClosingBalance)}</strong>
          <small>
            Mínimo del periodo: {money(data.summary.minimumBalance)}
          </small>
        </KpiCard>
      </section>

      <section className={styles.mainGrid}>
        <Card className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardEyebrow}>Proyección mensual</span>
              <h2>Entradas, salidas y saldo</h2>
            </div>
            {data.selectedScenario ? (
              <Badge
                tone={
                  data.selectedScenario.status === 'ACTIVE'
                    ? 'success'
                    : 'neutral'
                }
              >
                {data.selectedScenario.name}
              </Badge>
            ) : (
              <Badge tone="neutral">Proyección base</Badge>
            )}
          </div>

          <div className={styles.chart}>
            {data.monthly.map((item) => (
              <div className={styles.month} key={item.month}>
                <div className={styles.bars}>
                  <span
                    className={styles.inflowBar}
                    style={{
                      height: `${Math.max(
                        4,
                        (Number(item.inflow) / maxMonthly) * 100,
                      )}%`,
                    }}
                    title={`Entradas: ${money(item.inflow)}`}
                  />
                  <span
                    className={styles.outflowBar}
                    style={{
                      height: `${Math.max(
                        4,
                        (Number(item.outflow) / maxMonthly) * 100,
                      )}%`,
                    }}
                    title={`Salidas: ${money(item.outflow)}`}
                  />
                </div>
                <small>{item.month}</small>
                <strong>{compactMoney(item.closingBalance)}</strong>
              </div>
            ))}
          </div>

          <div className={styles.legend}>
            <span><i className={styles.inflowLegend} />Entradas</span>
            <span><i className={styles.outflowLegend} />Salidas</span>
            <span>La cifra inferior muestra el saldo final del mes.</span>
          </div>
        </Card>

        <Card className={styles.riskCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardEyebrow}>Alertas</span>
              <h2>Riesgos de liquidez</h2>
            </div>
          </div>

          <div className={styles.riskList}>
            {data.risks.map((risk, index) => (
              <article key={`${risk.title}-${index}`}>
                <div className={styles.riskIcon}>
                  <AlertTriangle size={17} />
                </div>
                <div>
                  <div className={styles.riskTitle}>
                    <strong>{risk.title}</strong>
                    <Badge tone={riskTones[risk.level]}>
                      {risk.level}
                    </Badge>
                  </div>
                  <p>{risk.description}</p>
                  <span>{money(risk.amount)}</span>
                </div>
              </article>
            ))}

            {!data.risks.length ? (
              <div className={styles.healthy}>
                <TrendingUp size={26} />
                <strong>Sin alertas relevantes</strong>
                <span>
                  La proyección no muestra déficits ni vencimientos críticos.
                </span>
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className={styles.secondaryGrid}>
        <Card className={styles.scenarioCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardEyebrow}>Escenarios</span>
              <h2>Supuestos financieros</h2>
            </div>
          </div>

          <div className={styles.scenarioList}>
            {data.scenarios.map((scenario) => (
              <article key={scenario.id}>
                <div>
                  <strong>{scenario.name}</strong>
                  <span>
                    {date(scenario.startDate.slice(0, 10))} a{' '}
                    {date(scenario.endDate.slice(0, 10))}
                  </span>
                  <small>
                    {scenario.adjustments.length} supuestos ·{' '}
                    {scenario.createdBy.firstName}{' '}
                    {scenario.createdBy.lastName}
                  </small>
                </div>

                <div className={styles.scenarioActions}>
                  <Badge
                    tone={
                      scenario.status === 'ACTIVE'
                        ? 'success'
                        : scenario.status === 'ARCHIVED'
                          ? 'neutral'
                          : 'warning'
                    }
                  >
                    {scenario.status}
                  </Badge>

                  {scenario.status !== 'ACTIVE' ? (
                    <button
                      onClick={() =>
                        changeScenarioStatus(scenario, 'ACTIVE')
                      }
                    >
                      Activar
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        changeScenarioStatus(scenario, 'DRAFT')
                      }
                    >
                      Desactivar
                    </button>
                  )}
                </div>
              </article>
            ))}

            {!data.scenarios.length ? (
              <div className={styles.empty}>
                Crea un escenario para agregar supuestos de ingresos y gastos.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className={styles.adjustmentsCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardEyebrow}>Escenario seleccionado</span>
              <h2>
                {data.selectedScenario
                  ? data.selectedScenario.name
                  : 'Sin escenario activo'}
              </h2>
            </div>
          </div>

          <div className={styles.adjustmentList}>
            {data.selectedScenario?.adjustments.map((item) => (
              <article key={item.id}>
                <div
                  className={
                    item.type === 'INFLOW'
                      ? styles.adjustmentIn
                      : styles.adjustmentOut
                  }
                >
                  {item.type === 'INFLOW' ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                </div>
                <div>
                  <strong>{item.concept}</strong>
                  <span>
                    {item.category} · {date(item.date.slice(0, 10))}
                  </span>
                  <small>
                    Probabilidad {item.probability}% ·{' '}
                    {money(
                      Number(item.amount) *
                        (Number(item.probability) / 100),
                    )}{' '}
                    ponderado
                  </small>
                </div>
                <button
                  onClick={() => removeAdjustment(item.id)}
                  aria-label="Eliminar supuesto"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}

            {!data.selectedScenario?.adjustments.length ? (
              <div className={styles.empty}>
                El escenario no contiene supuestos manuales.
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className={styles.movementsCard}>
        <div className={styles.toolbar}>
          <div>
            <h2>Movimientos recientes de Tesorería</h2>
            <p>{filteredMovements.length} movimientos visibles</p>
          </div>

          <label className={styles.search}>
            <Search size={17} />
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
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length ? (
                filteredMovements.map((item) => (
                  <tr key={item.id}>
                    <td>{date(item.movementDate.slice(0, 10))}</td>
                    <td><strong>{item.folio}</strong></td>
                    <td>{item.account.name}</td>
                    <td>{item.concept}</td>
                    <td>{item.category || '—'}</td>
                    <td>
                      <Badge
                        tone={
                          ['INCOME', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(
                            item.type,
                          )
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {item.type}
                      </Badge>
                    </td>
                    <td><strong>{money(item.amount)}</strong></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyCell}>
                    No hay movimientos dentro del periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {scenarioModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveScenario}>
            <header>
              <div>
                <span>Planeación</span>
                <h2>Nuevo escenario</h2>
              </div>
              <button type="button" onClick={() => setScenarioModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <Input
                label="Nombre"
                required
                value={scenarioModal.name}
                onChange={(event) =>
                  setScenarioModal((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <div className={styles.grid2}>
                <Input
                  label="Fecha inicial"
                  type="date"
                  required
                  value={scenarioModal.startDate}
                  onChange={(event) =>
                    setScenarioModal((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Fecha final"
                  type="date"
                  required
                  value={scenarioModal.endDate}
                  onChange={(event) =>
                    setScenarioModal((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Descripción
                <textarea
                  rows="4"
                  value={scenarioModal.description}
                  onChange={(event) =>
                    setScenarioModal((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setScenarioModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Crear escenario
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {adjustmentModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveAdjustment}>
            <header>
              <div>
                <span>Supuesto financiero</span>
                <h2>Agregar ajuste</h2>
              </div>
              <button type="button" onClick={() => setAdjustmentModal(null)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <Input
                  label="Fecha"
                  type="date"
                  required
                  value={adjustmentModal.date}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
                <label>
                  Tipo
                  <select
                    value={adjustmentModal.type}
                    onChange={(event) =>
                      setAdjustmentModal((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="INFLOW">Entrada</option>
                    <option value="OUTFLOW">Salida</option>
                  </select>
                </label>
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Categoría"
                  required
                  value={adjustmentModal.category}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Concepto"
                  required
                  value={adjustmentModal.concept}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
                      ...current,
                      concept: event.target.value,
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
                  value={adjustmentModal.amount}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Probabilidad %"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={adjustmentModal.probability}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
                      ...current,
                      probability: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Notas
                <textarea
                  rows="3"
                  value={adjustmentModal.notes}
                  onChange={(event) =>
                    setAdjustmentModal((current) => ({
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
                onClick={() => setAdjustmentModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Agregar supuesto
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
