import {useEffect, useMemo, useState} from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Budgets.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const statusLabels = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

const statusTones = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  CLOSED: 'warning',
  CANCELLED: 'danger',
};

const currency = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const blankCenter = () => ({
  code: '',
  name: '',
  description: '',
  active: true,
});

const blankBudget = (year) => ({
  name: `Presupuesto ${year}`,
  year,
  notes: '',
});

const blankLine = () => ({
  costCenterId: '',
  category: '',
  month: 1,
  amount: '',
  notes: '',
});

export default function Budgets() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState({
    costCenters: [],
    budgets: [],
    monthly: [],
    summary: {
      plannedTotal: 0,
      actualTotal: 0,
      variance: 0,
      utilization: 0,
      activeCostCenters: 0,
    },
  });
  const [query, setQuery] = useState('');
  const [centerModal, setCenterModal] = useState(null);
  const [budgetModal, setBudgetModal] = useState(null);
  const [lineModal, setLineModal] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load(selectedYear = year) {
    const response = await apiRequest(`/budgets?year=${selectedYear}`);
    setData(response);

    if (selectedBudget) {
      const refreshed = response.budgets.find(
        (item) => item.id === selectedBudget.id,
      );
      setSelectedBudget(refreshed || null);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const visibleBudgets = useMemo(
    () =>
      data.budgets.filter((item) =>
        `${item.name} ${item.year} ${statusLabels[item.status]}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.budgets, query],
  );

  async function applyYear(value) {
    const selected = Number(value);
    setYear(selected);
    setSelectedBudget(null);

    try {
      await load(selected);
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function saveCenter(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const method = centerModal.id ? 'PUT' : 'POST';
      const url = centerModal.id
        ? `/budgets/cost-centers/${centerModal.id}`
        : '/budgets/cost-centers';

      await apiRequest(url, {
        method,
        body: centerModal,
      });

      setCenterModal(null);
      setMessage(['success', 'Centro de costo guardado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveBudget(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const method = budgetModal.id ? 'PUT' : 'POST';
      const url = budgetModal.id
        ? `/budgets/budgets/${budgetModal.id}`
        : '/budgets/budgets';

      await apiRequest(url, {
        method,
        body: {
          ...budgetModal,
          year: Number(budgetModal.year),
          notes: budgetModal.notes || null,
        },
      });

      setBudgetModal(null);
      setMessage(['success', 'Presupuesto guardado']);
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
      await apiRequest(`/budgets/budgets/${lineModal.budgetId}/lines`, {
        method: 'POST',
        body: {
          costCenterId: lineModal.costCenterId,
          category: lineModal.category,
          month: Number(lineModal.month),
          amount: Number(lineModal.amount),
          notes: lineModal.notes || null,
        },
      });

      setLineModal(null);
      setMessage(['success', 'Partida presupuestal guardada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, status) {
    try {
      await apiRequest(`/budgets/budgets/${item.id}/status`, {
        method: 'PATCH',
        body: {status},
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function removeLine(budgetId, lineId) {
    if (!window.confirm('¿Eliminar esta partida presupuestal?')) return;

    try {
      await apiRequest(`/budgets/budgets/${budgetId}/lines/${lineId}`, {
        method: 'DELETE',
      });
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const summary = data.summary;
  const maxMonthly = Math.max(
    1,
    ...data.monthly.flatMap((item) => [item.planned, item.actual]),
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Planeación financiera</span>
          <h1>Presupuestos</h1>
          <p>
            Planea el gasto por centro de costo y compara el presupuesto contra
            la ejecución real.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={Building2}
            onClick={() => setCenterModal(blankCenter())}
          >
            Centro de costo
          </Button>
          <Button
            icon={Plus}
            onClick={() => setBudgetModal(blankBudget(year))}
          >
            Nuevo presupuesto
          </Button>
        </div>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          {message[1]}
        </div>
      ) : null}

      <Card className={styles.yearFilter}>
        <CalendarDays size={20} />
        <div>
          <strong>Año presupuestal</strong>
          <span>Selecciona el ejercicio que deseas analizar.</span>
        </div>
        <select value={year} onChange={(event) => applyYear(event.target.value)}>
          {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </select>
      </Card>

      <section className={styles.metrics}>
        <KpiCard>
          <Target />
          <span>Presupuesto anual</span><KpiInfo title="Presupuesto aprobado">Importe total asignado al ejercicio y sus partidas.</KpiInfo>
          <strong>{currency(summary.plannedTotal)}</strong>
        </KpiCard>
        <KpiCard>
          <CircleDollarSign />
          <span>Gasto ejecutado</span><KpiInfo title="Ejecuci\u00f3n presupuestal">Importe consumido por movimientos asociados al presupuesto.</KpiInfo>
          <strong>{currency(summary.actualTotal)}</strong>
        </KpiCard>
        <KpiCard>
          {summary.variance >= 0 ? <TrendingUp /> : <TrendingDown />}
          <span>Disponible</span><KpiInfo title="Saldo presupuestal">Presupuesto todavía disponible después del gasto ejecutado.</KpiInfo>
          <strong>{currency(summary.variance)}</strong>
        </KpiCard>
        <KpiCard>
          <BarChart3 />
          <span>Utilización</span><KpiInfo title="Porcentaje utilizado">Proporción del presupuesto que ya fue ejercida.</KpiInfo>
          <strong>{summary.utilization}%</strong>
        </KpiCard>
      </section>

      <section className={styles.mainGrid}>
        <Card className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Presupuesto vs. gasto real</h2>
              <p>Comparativo mensual del ejercicio {year}.</p>
            </div>
            <Badge
              tone={summary.utilization > 100 ? 'danger' : 'success'}
            >
              {summary.utilization}% utilizado
            </Badge>
          </div>

          <div className={styles.chart}>
            {data.monthly.map((item) => (
              <div className={styles.month} key={item.month}>
                <div className={styles.bars}>
                  <span
                    className={styles.plannedBar}
                    style={{
                      height: `${Math.max(
                        4,
                        (item.planned / maxMonthly) * 100,
                      )}%`,
                    }}
                    title={`Presupuestado: ${currency(item.planned)}`}
                  />
                  <span
                    className={styles.actualBar}
                    style={{
                      height: `${Math.max(
                        4,
                        (item.actual / maxMonthly) * 100,
                      )}%`,
                    }}
                    title={`Ejecutado: ${currency(item.actual)}`}
                  />
                </div>
                <small>{months[item.month - 1].slice(0, 3)}</small>
              </div>
            ))}
          </div>

          <div className={styles.legend}>
            <span><i className={styles.plannedLegend} />Presupuestado</span>
            <span><i className={styles.actualLegend} />Ejecutado</span>
          </div>
        </Card>

        <Card className={styles.centersCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Centros de costo</h2>
              <p>{summary.activeCostCenters} activos</p>
            </div>
          </div>

          <div className={styles.centerList}>
            {data.costCenters.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.code}</span>
                </div>
                <div className={styles.centerActions}>
                  <Badge tone={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <button onClick={() => setCenterModal({...item})}>
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}

            {!data.costCenters.length ? (
              <div className={styles.empty}>No hay centros de costo.</div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div>
            <h2>Presupuestos del ejercicio</h2>
            <p>{visibleBudgets.length} registros</p>
          </div>

          <label className={styles.search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar presupuesto"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Presupuesto</th>
                <th>Año</th>
                <th>Partidas</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleBudgets.length ? (
                visibleBudgets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.notes || 'Sin notas'}</small>
                    </td>
                    <td>{item.year}</td>
                    <td>{item.lines.length}</td>
                    <td><strong>{currency(item.totalAmount)}</strong></td>
                    <td>
                      <Badge tone={statusTones[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                    </td>
                    <td>
                      {item.createdBy.firstName} {item.createdBy.lastName}
                    </td>
                    <td className={styles.actions}>
                      <button onClick={() => setSelectedBudget(item)}>
                        Ver detalle
                      </button>
                      <button
                        onClick={() =>
                          setLineModal({
                            ...blankLine(),
                            budgetId: item.id,
                          })
                        }
                      >
                        Agregar partida
                      </button>
                      {item.status === 'DRAFT' ? (
                        <button onClick={() => changeStatus(item, 'ACTIVE')}>
                          Activar
                        </button>
                      ) : null}
                      {item.status === 'ACTIVE' ? (
                        <button onClick={() => changeStatus(item, 'CLOSED')}>
                          Cerrar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyCell}>
                    No hay presupuestos para este ejercicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {centerModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveCenter}>
            <div className={styles.modalHeader}>
              <div>
                <span>Estructura financiera</span>
                <h2>
                  {centerModal.id ? 'Editar centro de costo' : 'Nuevo centro de costo'}
                </h2>
              </div>
              <button type="button" onClick={() => setCenterModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <Input
                  label="Código"
                  required
                  value={centerModal.code}
                  onChange={(event) =>
                    setCenterModal((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Nombre"
                  required
                  value={centerModal.name}
                  onChange={(event) =>
                    setCenterModal((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <label>
                Descripción
                <textarea
                  rows="4"
                  value={centerModal.description || ''}
                  onChange={(event) =>
                    setCenterModal((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={centerModal.active}
                  onChange={(event) =>
                    setCenterModal((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                Centro de costo activo
              </label>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCenterModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {budgetModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveBudget}>
            <div className={styles.modalHeader}>
              <div>
                <span>Planeación</span>
                <h2>Nuevo presupuesto</h2>
              </div>
              <button type="button" onClick={() => setBudgetModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <Input
                label="Nombre"
                required
                value={budgetModal.name}
                onChange={(event) =>
                  setBudgetModal((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <Input
                label="Año"
                type="number"
                min="2020"
                max="2100"
                required
                value={budgetModal.year}
                onChange={(event) =>
                  setBudgetModal((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
              />

              <label>
                Notas
                <textarea
                  rows="4"
                  value={budgetModal.notes}
                  onChange={(event) =>
                    setBudgetModal((current) => ({
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
                onClick={() => setBudgetModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Crear presupuesto
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {lineModal ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveLine}>
            <div className={styles.modalHeader}>
              <div>
                <span>Partida presupuestal</span>
                <h2>Agregar o actualizar partida</h2>
              </div>
              <button type="button" onClick={() => setLineModal(null)}>
                <X />
              </button>
            </div>

            <div className={styles.modalBody}>
              <label>
                Centro de costo
                <select
                  required
                  value={lineModal.costCenterId}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      costCenterId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {data.costCenters
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className={styles.grid2}>
                <Input
                  label="Categoría"
                  required
                  placeholder="Servicios, nómina, mantenimiento..."
                  value={lineModal.category}
                  onChange={(event) =>
                    setLineModal((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />

                <label>
                  Mes
                  <select
                    value={lineModal.month}
                    onChange={(event) =>
                      setLineModal((current) => ({
                        ...current,
                        month: event.target.value,
                      }))
                    }
                  >
                    {months.map((item, index) => (
                      <option key={item} value={index + 1}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Input
                label="Importe"
                type="number"
                min="0"
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

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLineModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar partida
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedBudget ? (
        <div className={styles.overlay}>
          <div className={`${styles.modal} ${styles.detailModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <span>{selectedBudget.year}</span>
                <h2>{selectedBudget.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedBudget(null)}>
                <X />
              </button>
            </div>

            <div className={styles.detailSummary}>
              <div>
                <span>Total presupuestado</span>
                <strong>{currency(selectedBudget.totalAmount)}</strong>
              </div>
              <div>
                <span>Partidas</span>
                <strong>{selectedBudget.lines.length}</strong>
              </div>
              <div>
                <span>Estado</span>
                <Badge tone={statusTones[selectedBudget.status]}>
                  {statusLabels[selectedBudget.status]}
                </Badge>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Centro de costo</th>
                    <th>Categoría</th>
                    <th>Mes</th>
                    <th>Importe</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBudget.lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.costCenter.name}</strong>
                        <small>{line.costCenter.code}</small>
                      </td>
                      <td>{line.category}</td>
                      <td>{months[line.month - 1]}</td>
                      <td><strong>{currency(line.amount)}</strong></td>
                      <td>{line.notes || '—'}</td>
                      <td>
                        <button
                          className={styles.iconButton}
                          onClick={() =>
                            removeLine(selectedBudget.id, line.id)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!selectedBudget.lines.length ? (
                    <tr>
                      <td colSpan="6" className={styles.emptyCell}>
                        Este presupuesto todavía no tiene partidas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
