import {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Reports.module.css';

import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const currency = (value, code = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const initialRange = () => {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: now.toISOString().slice(0, 10),
  };
};

function csvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

export default function Reports() {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiRequest(
        `/reports/executive?from=${range.from}&to=${range.to}`,
      );
      setData(response);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const maxMonthly = useMemo(() => {
    if (!data?.monthly?.length) return 1;
    return Math.max(
      ...data.monthly.flatMap((row) => [
        row.purchases,
        row.receivables,
        row.payroll,
      ]),
      1,
    );
  }, [data]);

  function exportCsv() {
    if (!data) return;

    const rows = [
      ['Reporte ejecutivo', 'Valor'],
      ['Compras', data.summary.purchaseTotal],
      ['Saldo por pagar', data.summary.payableBalance],
      ['Saldo por cobrar', data.summary.receivableBalance],
      ['Valor inventario', data.summary.inventoryValue],
      ['Nómina neta', data.summary.payrollNet],
      [],
      ['Mes', 'Compras', 'Cuentas por cobrar', 'Nómina'],
      ...data.monthly.map((row) => [
        row.label,
        row.purchases,
        row.receivables,
        row.payroll,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `reporte-ejecutivo-${range.from}-${range.to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const summary = data?.summary ?? {};
  const currencyCode = data?.company?.currency || 'MXN';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Inteligencia administrativa</span>
          <h1>Reportes ejecutivos</h1>
          <p>
            Consolida compras, inventario, finanzas y recursos humanos en una
            sola vista.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="secondary" icon={ArrowDownToLine} onClick={exportCsv}>
            Exportar CSV
          </Button>
          <Button icon={RefreshCw} onClick={load} loading={loading}>
            Actualizar
          </Button>
        </div>
      </header>

      <Card className={styles.filters}>
        <div className={styles.filterTitle}>
          <CalendarRange size={20} />
          <div>
            <strong>Periodo de análisis</strong>
            <span>Los indicadores se calculan con el rango seleccionado.</span>
          </div>
        </div>
        <Input
          label="Desde"
          type="date"
          value={range.from}
          onChange={(event) =>
            setRange((current) => ({...current, from: event.target.value}))
          }
        />
        <Input
          label="Hasta"
          type="date"
          value={range.to}
          onChange={(event) =>
            setRange((current) => ({...current, to: event.target.value}))
          }
        />
        <Button onClick={load} loading={loading}>
          Aplicar periodo
        </Button>
      </Card>

      {message ? <div className={styles.error}>{message}</div> : null}

      <KpiGrid>
        <KpiCard>
          <ShoppingCart />
          <span>Compras del periodo</span><KpiInfo title="Compras registradas">Importe de compras dentro del rango seleccionado.</KpiInfo>
          <strong>{currency(summary.purchaseTotal, currencyCode)}</strong>
        </KpiCard>
        <KpiCard>
          <ReceiptText />
          <span>Saldo por pagar</span><KpiInfo title="Cuentas por pagar">Saldo pendiente con proveedores al cierre del rango.</KpiInfo>
          <strong>{currency(summary.payableBalance, currencyCode)}</strong>
        </KpiCard>
        <KpiCard>
          <CircleDollarSign />
          <span>Saldo por cobrar</span><KpiInfo title="Cuentas por cobrar">Saldo pendiente de clientes al cierre del rango.</KpiInfo>
          <strong>{currency(summary.receivableBalance, currencyCode)}</strong>
        </KpiCard>
        <KpiCard>
          <Boxes />
          <span>Valor de inventario</span><KpiInfo title="Valuaci\u00f3n actual">Valor de existencias calculado con costo promedio.</KpiInfo>
          <strong>{currency(summary.inventoryValue, currencyCode)}</strong>
        </KpiCard>
        <KpiCard>
          <Banknote />
          <span>Nómina del periodo</span><KpiInfo title="Costo de n\u00f3mina">Importe de nómina correspondiente al rango seleccionado.</KpiInfo>
          <strong>{currency(summary.payrollNet, currencyCode)}</strong>
        </KpiCard>
        <KpiCard>
          <Users />
          <span>Empleados activos</span><KpiInfo title="Plantilla activa">Cantidad de empleados activos al consultar el reporte.</KpiInfo>
          <strong>{summary.activeEmployees ?? 0}</strong>
        </KpiCard>
      </KpiGrid>

      <section className={styles.mainGrid}>
        <Card className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Evolución mensual</h2>
              <p>Compras, cuentas por cobrar y nómina.</p>
            </div>
            <Badge tone="neutral">{data?.monthly?.length ?? 0} meses</Badge>
          </div>

          <div className={styles.chart}>
            {(data?.monthly ?? []).map((row) => (
              <div className={styles.month} key={row.key}>
                <div className={styles.bars}>
                  <span
                    className={styles.purchaseBar}
                    style={{height: `${Math.max(5, row.purchases / maxMonthly * 100)}%`}}
                    title={`Compras: ${currency(row.purchases, currencyCode)}`}
                  />
                  <span
                    className={styles.receivableBar}
                    style={{height: `${Math.max(5, row.receivables / maxMonthly * 100)}%`}}
                    title={`CxC: ${currency(row.receivables, currencyCode)}`}
                  />
                  <span
                    className={styles.payrollBar}
                    style={{height: `${Math.max(5, row.payroll / maxMonthly * 100)}%`}}
                    title={`Nómina: ${currency(row.payroll, currencyCode)}`}
                  />
                </div>
                <small>{row.label}</small>
              </div>
            ))}
            {!data?.monthly?.length ? (
              <div className={styles.empty}>No hay movimientos en el periodo.</div>
            ) : null}
          </div>

          <div className={styles.legend}>
            <span><i className={styles.purchaseLegend} />Compras</span>
            <span><i className={styles.receivableLegend} />Cuentas por cobrar</span>
            <span><i className={styles.payrollLegend} />Nómina</span>
          </div>
        </Card>

        <Card className={styles.alertCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Alertas administrativas</h2>
              <p>Situaciones que requieren seguimiento.</p>
            </div>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.alertList}>
            <div>
              <span>Por pagar vencido</span><KpiInfo title="Deuda vencida">Saldo de proveedores con vencimiento anterior a la fecha actual.</KpiInfo>
              <strong>{currency(summary.overduePayables, currencyCode)}</strong>
            </div>
            <div>
              <span>Por cobrar vencido</span><KpiInfo title="Cartera vencida">Saldo de clientes con vencimiento anterior a la fecha actual.</KpiInfo>
              <strong>{currency(summary.overdueReceivables, currencyCode)}</strong>
            </div>
            <div>
              <span>Solicitudes pendientes</span><KpiInfo title="Compras pendientes">Solicitudes de compra que todavía requieren atención.</KpiInfo>
              <strong>{summary.pendingPurchaseRequests ?? 0}</strong>
            </div>
            <div>
              <span>Productos en stock crítico</span><KpiInfo title="Inventario cr\u00edtico">Productos con existencia igual o menor a su mínimo.</KpiInfo>
              <strong>{data?.lowStock?.length ?? 0}</strong>
            </div>
          </div>
        </Card>
      </section>

      <section className={styles.tablesGrid}>
        <Card className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Principales proveedores</h2>
              <p>Ordenados por compras del periodo.</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Proveedor</th><th>Órdenes</th><th>Total</th></tr></thead>
            <tbody>
              {(data?.supplierSpend ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.orders}</td>
                  <td><strong>{currency(row.total, currencyCode)}</strong></td>
                </tr>
              ))}
              {!data?.supplierSpend?.length ? (
                <tr><td colSpan="3" className={styles.emptyCell}>Sin compras registradas.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Saldos de clientes</h2>
              <p>Clientes con mayor cuenta por cobrar.</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Cliente</th><th>Facturas</th><th>Saldo</th></tr></thead>
            <tbody>
              {(data?.customerBalances ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.invoices}</td>
                  <td><strong>{currency(row.balance, currencyCode)}</strong></td>
                </tr>
              ))}
              {!data?.customerBalances?.length ? (
                <tr><td colSpan="3" className={styles.emptyCell}>Sin saldos registrados.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>

      <section className={styles.tablesGrid}>
        <Card className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Capital humano por área</h2>
              <p>Plantilla y nómina mensual estimada.</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Departamento</th><th>Empleados</th><th>Nómina mensual</th></tr></thead>
            <tbody>
              {(data?.departments ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.employees}</td>
                  <td><strong>{currency(row.payroll, currencyCode)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Stock crítico</h2>
              <p>Productos por debajo o al nivel mínimo.</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Producto</th><th>Almacén</th><th>Existencia</th></tr></thead>
            <tbody>
              {(data?.lowStock ?? []).map((row) => (
                <tr key={`${row.sku}-${row.warehouse}`}>
                  <td><strong>{row.product}</strong><small>{row.sku}</small></td>
                  <td>{row.warehouse}<small>{row.branch}</small></td>
                  <td><Badge tone="danger">{row.quantity} / mín. {row.minStock}</Badge></td>
                </tr>
              ))}
              {!data?.lowStock?.length ? (
                <tr><td colSpan="3" className={styles.emptyCell}>No hay alertas de inventario.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
