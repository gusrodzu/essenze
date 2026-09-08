import {useEffect, useMemo, useState} from 'react';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FilePlus2,
  Landmark,
  Plus,
  Search,
  Scale,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './Accounting.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
import {ModuleTabs} from '../components/module-system';
const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value || 0));

const date = (value) =>
  value ? new Date(value).toLocaleDateString('es-MX') : '—';

const accountBlank = () => ({
  parentId: '',
  code: '',
  name: '',
  type: 'ASSET',
  nature: 'DEBIT',
  level: 1,
  allowsPosting: true,
  active: true,
});

const periodBlank = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    name: now.toLocaleDateString('es-MX', {month: 'long', year: 'numeric'}),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const entryBlank = (periodId = '') => ({
  periodId,
  entryDate: new Date().toISOString().slice(0, 10),
  concept: '',
  notes: '',
  lines: [
    {accountId: '', concept: '', debit: '', credit: '', reference: ''},
    {accountId: '', concept: '', debit: '', credit: '', reference: ''},
  ],
});

export default function Accounting() {
  const [data, setData] = useState({
    accounts: [],
    periods: [],
    entries: [],
    trialBalance: [],
    sources: {},
    stats: {},
  });
  const [tab, setTab] = useState('entries');
  const [query, setQuery] = useState('');
  const [accountModal, setAccountModal] = useState(null);
  const [periodModal, setPeriodModal] = useState(null);
  const [entryModal, setEntryModal] = useState(null);
  const [autoModal, setAutoModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await apiRequest('/accounting');
    setData(response);
  }

  useEffect(() => {
    load().catch((error) => setMessage(['error', error.message]));
  }, []);

  const openPeriods = data.periods.filter((item) => item.status === 'OPEN');
  const postingAccounts = data.accounts.filter((item) => item.active && item.allowsPosting);

  const visibleEntries = useMemo(
    () =>
      data.entries.filter((item) =>
        `${item.folio} ${item.concept} ${item.sourceFolio || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.entries, query],
  );

  async function saveAccount(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/accounting/accounts', {
        method: 'POST',
        body: {...accountModal, parentId: accountModal.parentId || null},
      });
      setAccountModal(null);
      setMessage(['success', 'Cuenta contable creada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function savePeriod(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/accounting/periods', {method: 'POST', body: periodModal});
      setPeriodModal(null);
      setMessage(['success', 'Periodo contable creado']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index, field, value) {
    setEntryModal((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? {...line, [field]: value} : line,
      ),
    }));
  }

  async function saveEntry(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/accounting/entries', {
        method: 'POST',
        body: {
          ...entryModal,
          notes: entryModal.notes || null,
          lines: entryModal.lines.map((line) => ({
            ...line,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            concept: line.concept || null,
            reference: line.reference || null,
          })),
        },
      });
      setEntryModal(null);
      setMessage(['success', 'Póliza creada en borrador']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function createAutomatic(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/accounting/entries/automatic', {
        method: 'POST',
        body: autoModal,
      });
      setAutoModal(null);
      setMessage(['success', 'Póliza automática generada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function postEntry(entry) {
    if (!window.confirm(`¿Contabilizar la póliza ${entry.folio}?`)) return;
    try {
      await apiRequest(`/accounting/entries/${entry.id}/post`, {method: 'PATCH'});
      setMessage(['success', 'Póliza contabilizada']);
      await load();
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  const debit = entryModal?.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0) || 0;
  const credit = entryModal?.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0) || 0;

  const sourceOptions = {
    SALES_INVOICE: data.sources.salesInvoices || [],
    ACCOUNTS_PAYABLE: data.sources.payables || [],
    TREASURY_MOVEMENT: data.sources.movements || [],
    SALES_CREDIT_NOTE: data.sources.creditNotes || [],
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Finanzas</span>
          <h1>Contabilidad</h1>
          <p>Catálogo de cuentas, periodos, pólizas y balanza de comprobación.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={FilePlus2} onClick={() => setAutoModal({sourceType: 'SALES_INVOICE', sourceId: '', periodId: openPeriods[0]?.id || ''})}>
            Póliza automática
          </Button>
          <Button icon={Plus} onClick={() => setEntryModal(entryBlank(openPeriods[0]?.id || ''))}>
            Nueva póliza
          </Button>
        </div>
      </header>

      {message ? <div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div> : null}

      <section className={styles.metrics}>
        <KpiCard><BookOpen /><span>Cuentas activas</span><KpiInfo title="Cat\u00e1logo contable">Número de cuentas activas disponibles para registrar cargos y abonos.</KpiInfo><strong>{data.stats.accounts || 0}</strong></KpiCard>
        <KpiCard><CalendarDays /><span>Periodos abiertos</span><KpiInfo title="Periodos contables">Periodos que todavía permiten crear y contabilizar pólizas.</KpiInfo><strong>{data.stats.openPeriods || 0}</strong></KpiCard>
        <KpiCard><FilePlus2 /><span>Pólizas en borrador</span><KpiInfo title="P\u00f3lizas pendientes">Pólizas capturadas que aún no afectan la balanza de comprobación.</KpiInfo><strong>{data.stats.draftEntries || 0}</strong></KpiCard>
        <KpiCard><BadgeCheck /><span>Pólizas contabilizadas</span><KpiInfo title="P\u00f3lizas aplicadas">Pólizas revisadas y contabilizadas que ya afectan los saldos contables.</KpiInfo><strong>{data.stats.postedEntries || 0}</strong></KpiCard>
        <KpiCard><Scale /><span>Diferencia global</span><KpiInfo title="Control de cuadratura">Diferencia entre cargos y abonos contabilizados. Debe permanecer en cero.</KpiInfo><strong>{money(Number(data.stats.totalDebit || 0) - Number(data.stats.totalCredit || 0))}</strong></KpiCard>
      </section>

      <Card className={styles.workspace}>
        <ModuleTabs
          active={tab}
          onChange={setTab}
          items={[
            {id:'entries',label:'Pólizas'},
            {id:'accounts',label:'Catálogo de cuentas'},
            {id:'balance',label:'Balanza'},
            {id:'periods',label:'Periodos'}
          ]}
        />

        <div className={styles.toolbar}>
          <div>
            <h2>{tab === 'entries' ? 'Diario contable' : tab === 'accounts' ? 'Catálogo de cuentas' : tab === 'balance' ? 'Balanza de comprobación' : 'Periodos contables'}</h2>
            <p>Información financiera integrada y trazable.</p>
          </div>
          {tab === 'entries' ? (
            <label className={styles.search}><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar póliza o concepto" /></label>
          ) : tab === 'accounts' ? (
            <Button variant="secondary" icon={Plus} onClick={() => setAccountModal(accountBlank())}>Nueva cuenta</Button>
          ) : tab === 'periods' ? (
            <Button variant="secondary" icon={Plus} onClick={() => setPeriodModal(periodBlank())}>Nuevo periodo</Button>
          ) : null}
        </div>

        <div className={styles.tableWrap}>
          {tab === 'entries' ? (
            <table><thead><tr><th>Folio</th><th>Fecha</th><th>Concepto</th><th>Origen</th><th>Cargos</th><th>Abonos</th><th>Estado</th><th></th></tr></thead>
              <tbody>{visibleEntries.length ? visibleEntries.map((entry) => {
                const totals = entry.lines.reduce((r, l) => ({debit: r.debit + Number(l.debit), credit: r.credit + Number(l.credit)}), {debit: 0, credit: 0});
                return <tr key={entry.id}><td><strong>{entry.folio}</strong></td><td>{date(entry.entryDate)}</td><td>{entry.concept}</td><td>{entry.sourceFolio || 'Manual'}</td><td>{money(totals.debit)}</td><td>{money(totals.credit)}</td><td><Badge tone={entry.status === 'POSTED' ? 'success' : 'warning'}>{entry.status}</Badge></td><td>{entry.status === 'DRAFT' ? <button className={styles.link} onClick={() => postEntry(entry)}>Contabilizar</button> : null}</td></tr>;
              }) : <tr><td colSpan="8" className={styles.empty}>No hay pólizas.</td></tr>}</tbody></table>
          ) : tab === 'accounts' ? (
            <table><thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Naturaleza</th><th>Nivel</th><th>Movimiento</th><th>Estado</th></tr></thead>
              <tbody>{data.accounts.map((account) => <tr key={account.id}><td><strong>{account.code}</strong></td><td>{account.name}<small>{account.parent ? `${account.parent.code} · ${account.parent.name}` : ''}</small></td><td>{account.type}</td><td>{account.nature}</td><td>{account.level}</td><td>{account.allowsPosting ? 'Sí' : 'No'}</td><td><Badge tone={account.active ? 'success' : 'neutral'}>{account.active ? 'Activa' : 'Inactiva'}</Badge></td></tr>)}</tbody></table>
          ) : tab === 'balance' ? (
            <table><thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Cargos</th><th>Abonos</th><th>Saldo</th></tr></thead>
              <tbody>{data.trialBalance.length ? data.trialBalance.map((row) => <tr key={row.accountId}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.type}</td><td>{money(row.debit)}</td><td>{money(row.credit)}</td><td><strong>{money(row.balance)}</strong></td></tr>) : <tr><td colSpan="6" className={styles.empty}>Contabiliza pólizas para generar la balanza.</td></tr>}</tbody></table>
          ) : (
            <table><thead><tr><th>Periodo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th></th></tr></thead>
              <tbody>{data.periods.map((period) => <tr key={period.id}><td><strong>{period.name}</strong></td><td>{date(period.startDate)}</td><td>{date(period.endDate)}</td><td><Badge tone={period.status === 'OPEN' ? 'success' : 'neutral'}>{period.status}</Badge></td><td></td></tr>)}</tbody></table>
          )}
        </div>
      </Card>

      {accountModal ? <div className={styles.overlay}><form className={styles.modal} onSubmit={saveAccount}><header><div><span>Catálogo</span><h2>Nueva cuenta</h2></div><button type="button" onClick={() => setAccountModal(null)}><X /></button></header><div className={styles.modalBody}>
        <div className={styles.grid2}><Input label="Código" required value={accountModal.code} onChange={(e) => setAccountModal({...accountModal, code: e.target.value})}/><Input label="Nombre" required value={accountModal.name} onChange={(e) => setAccountModal({...accountModal, name: e.target.value})}/></div>
        <div className={styles.grid3}><label>Tipo<select value={accountModal.type} onChange={(e) => setAccountModal({...accountModal, type: e.target.value})}><option value="ASSET">Activo</option><option value="LIABILITY">Pasivo</option><option value="EQUITY">Capital</option><option value="REVENUE">Ingreso</option><option value="EXPENSE">Gasto</option></select></label><label>Naturaleza<select value={accountModal.nature} onChange={(e) => setAccountModal({...accountModal, nature: e.target.value})}><option value="DEBIT">Deudora</option><option value="CREDIT">Acreedora</option></select></label><Input label="Nivel" type="number" min="1" max="10" value={accountModal.level} onChange={(e) => setAccountModal({...accountModal, level: e.target.value})}/></div>
        <label>Cuenta padre<select value={accountModal.parentId} onChange={(e) => setAccountModal({...accountModal, parentId: e.target.value})}><option value="">Sin cuenta padre</option>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
      </div><footer><Button type="button" variant="ghost" onClick={() => setAccountModal(null)}>Cancelar</Button><Button type="submit" loading={saving}>Crear cuenta</Button></footer></form></div> : null}

      {periodModal ? <div className={styles.overlay}><form className={styles.modal} onSubmit={savePeriod}><header><div><span>Contabilidad</span><h2>Nuevo periodo</h2></div><button type="button" onClick={() => setPeriodModal(null)}><X /></button></header><div className={styles.modalBody}><Input label="Nombre" required value={periodModal.name} onChange={(e) => setPeriodModal({...periodModal, name: e.target.value})}/><div className={styles.grid2}><Input label="Inicio" type="date" required value={periodModal.startDate} onChange={(e) => setPeriodModal({...periodModal, startDate: e.target.value})}/><Input label="Fin" type="date" required value={periodModal.endDate} onChange={(e) => setPeriodModal({...periodModal, endDate: e.target.value})}/></div></div><footer><Button type="button" variant="ghost" onClick={() => setPeriodModal(null)}>Cancelar</Button><Button type="submit" loading={saving}>Crear periodo</Button></footer></form></div> : null}

      {entryModal ? <div className={styles.overlay}><form className={`${styles.modal} ${styles.large}`} onSubmit={saveEntry}><header><div><span>Diario</span><h2>Nueva póliza manual</h2></div><button type="button" onClick={() => setEntryModal(null)}><X /></button></header><div className={styles.modalBody}>
        <div className={styles.grid2}><label>Periodo<select required value={entryModal.periodId} onChange={(e) => setEntryModal({...entryModal, periodId: e.target.value})}><option value="">Selecciona</option>{openPeriods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Input label="Fecha" type="date" required value={entryModal.entryDate} onChange={(e) => setEntryModal({...entryModal, entryDate: e.target.value})}/></div>
        <Input label="Concepto" required value={entryModal.concept} onChange={(e) => setEntryModal({...entryModal, concept: e.target.value})}/>
        <div className={styles.lines}>{entryModal.lines.map((line, index) => <div className={styles.line} key={index}><label>Cuenta<select required value={line.accountId} onChange={(e) => updateLine(index, 'accountId', e.target.value)}><option value="">Selecciona</option>{postingAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label><Input label="Cargo" type="number" min="0" step="0.01" value={line.debit} onChange={(e) => updateLine(index, 'debit', e.target.value)}/><Input label="Abono" type="number" min="0" step="0.01" value={line.credit} onChange={(e) => updateLine(index, 'credit', e.target.value)}/><button type="button" onClick={() => setEntryModal((c) => ({...c, lines: c.lines.filter((_, i) => i !== index)}))}><X size={16}/></button></div>)}</div>
        <Button type="button" variant="secondary" icon={Plus} onClick={() => setEntryModal((c) => ({...c, lines: [...c.lines, {accountId:'', concept:'', debit:'', credit:'', reference:''}]}))}>Agregar partida</Button>
        <div className={styles.totals}><span>Cargos <strong>{money(debit)}</strong></span><span>Abonos <strong>{money(credit)}</strong></span><span>Diferencia <strong>{money(debit-credit)}</strong></span></div>
      </div><footer><Button type="button" variant="ghost" onClick={() => setEntryModal(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar póliza</Button></footer></form></div> : null}

      {autoModal ? <div className={styles.overlay}><form className={styles.modal} onSubmit={createAutomatic}><header><div><span>Automatización</span><h2>Generar póliza</h2></div><button type="button" onClick={() => setAutoModal(null)}><X /></button></header><div className={styles.modalBody}>
        <label>Tipo de documento<select value={autoModal.sourceType} onChange={(e) => setAutoModal({...autoModal, sourceType: e.target.value, sourceId: ''})}><option value="SALES_INVOICE">Factura de venta</option><option value="ACCOUNTS_PAYABLE">Factura de proveedor</option><option value="TREASURY_MOVEMENT">Movimiento de Tesorería</option><option value="SALES_CREDIT_NOTE">Nota de crédito</option></select></label>
        <label>Documento<select required value={autoModal.sourceId} onChange={(e) => setAutoModal({...autoModal, sourceId: e.target.value})}><option value="">Selecciona</option>{(sourceOptions[autoModal.sourceType] || []).filter((s) => !s.posted).map((s) => <option key={s.id} value={s.id}>{s.invoiceNumber || s.folio} · {money(s.total || s.amount)}</option>)}</select></label>
        <label>Periodo<select required value={autoModal.periodId} onChange={(e) => setAutoModal({...autoModal, periodId: e.target.value})}><option value="">Selecciona</option>{openPeriods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <div className={styles.notice}>La póliza se genera en borrador y debe contabilizarse después de revisarla.</div>
      </div><footer><Button type="button" variant="ghost" onClick={() => setAutoModal(null)}>Cancelar</Button><Button type="submit" loading={saving}>Generar póliza</Button></footer></form></div> : null}
    </div>
  );
}
