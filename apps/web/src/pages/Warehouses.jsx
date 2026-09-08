import {Building2, Edit3, Plus, Search, Trash2, Warehouse, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input, Switch} from '../design-system/components';
import styles from './Warehouses.module.css';

import KpiInfo from '../components/KpiInfo';
const emptyForm = {branchId: '', name: '', code: '', active: true};

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const result = await apiRequest('/warehouses');
      setWarehouses(result.warehouses ?? []);
      setBranches(result.branches ?? []);
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return warehouses;
    return warehouses.filter((item) =>
      [item.name, item.code, item.branch?.name, item.branch?.code]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query, warehouses]);

  function openCreate() {
    setForm({...emptyForm, branchId: branches.find((branch) => branch.active)?.id ?? ''});
  }

  function openEdit(item) {
    setForm({id: item.id, branchId: item.branchId, name: item.name, code: item.code, active: item.active});
  }

  async function saveWarehouse(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const editing = Boolean(form.id);
      await apiRequest(editing ? `/warehouses/${form.id}` : '/warehouses', {
        method: editing ? 'PUT' : 'POST',
        body: form,
      });
      setForm(null);
      await loadData();
      setMessage({type: 'success', text: editing ? 'Almacén actualizado.' : 'Almacén creado.'});
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    try {
      await apiRequest(`/warehouses/${item.id}/status`, {method: 'PATCH', body: {active: !item.active}});
      setWarehouses((current) => current.map((warehouse) => warehouse.id === item.id ? {...warehouse, active: !warehouse.active} : warehouse));
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    }
  }

  async function removeWarehouse(item) {
    if (!window.confirm(`¿Eliminar el almacén ${item.name}?`)) return;
    try {
      await apiRequest(`/warehouses/${item.id}`, {method: 'DELETE'});
      setWarehouses((current) => current.filter((warehouse) => warehouse.id !== item.id));
      setMessage({type: 'success', text: 'Almacén eliminado.'});
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    }
  }

  if (loading) return <div className={styles.loading}>Cargando almacenes…</div>;

  const activeCount = warehouses.filter((item) => item.active).length;
  const branchCount = new Set(warehouses.map((item) => item.branchId)).size;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Operación e inventario</span>
          <h1>Almacenes</h1>
          <p>Administra los centros físicos donde se recibirán, resguardarán y moverán productos.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Nuevo almacén</Button>
      </header>

      {message ? <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div> : null}

      <div className={styles.metrics}>
        <Card className={styles.metric}><Warehouse size={20}/><span>Total</span><KpiInfo title="Almacenes registrados">Cantidad total de almacenes configurados.</KpiInfo><strong>{warehouses.length}</strong></Card>
        <Card className={styles.metric}><Warehouse size={20}/><span>Activos</span><KpiInfo title="Almacenes activos">Almacenes habilitados para recibir y mover inventario.</KpiInfo><strong>{activeCount}</strong></Card>
        <Card className={styles.metric}><Building2 size={20}/><span>Sucursales cubiertas</span><KpiInfo title="Cobertura operativa">Cantidad de sucursales que cuentan con al menos un almacén.</KpiInfo><strong>{branchCount}</strong></Card>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div>
            <h2>Directorio de almacenes</h2>
            <p>{filtered.length} resultados</p>
          </div>
          <label className={styles.search}>
            <Search size={18}/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, código o sucursal" />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Almacén</th><th>Sucursal</th><th>Estado</th><th>Disponibilidad</th><th></th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><div className={styles.nameCell}><span className={styles.icon}><Warehouse size={18}/></span><div><strong>{item.name}</strong><small>{item.code}</small></div></div></td>
                  <td><strong>{item.branch?.name}</strong><small className={styles.block}>{item.branch?.code}</small></td>
                  <td><Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td><Switch checked={item.active} onChange={() => toggleStatus(item)} /></td>
                  <td><div className={styles.actions}><button onClick={() => openEdit(item)} aria-label="Editar"><Edit3 size={17}/></button><button onClick={() => removeWarehouse(item)} aria-label="Eliminar"><Trash2 size={17}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <div className={styles.empty}>No se encontraron almacenes.</div> : null}
        </div>
      </Card>

      {form ? (
        <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && setForm(null)}>
          <form className={styles.modal} onSubmit={saveWarehouse}>
            <div className={styles.modalHeader}><div><span>{form.id ? 'Editar registro' : 'Nuevo registro'}</span><h2>{form.id ? 'Editar almacén' : 'Crear almacén'}</h2></div><button type="button" onClick={() => setForm(null)}><X size={20}/></button></div>
            <div className={styles.modalBody}>
              <label className={styles.selectField}><span>Sucursal</span><select value={form.branchId} onChange={(event) => setForm((current) => ({...current, branchId: event.target.value}))} required><option value="">Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}</option>)}</select></label>
              <Input label="Nombre del almacén" value={form.name} onChange={(event) => setForm((current) => ({...current, name: event.target.value}))} required />
              <Input label="Código" value={form.code} onChange={(event) => setForm((current) => ({...current, code: event.target.value.toUpperCase()}))} required />
              <div className={styles.statusField}><div><strong>Almacén activo</strong><p>Permite usarlo en movimientos y recepciones.</p></div><Switch checked={form.active} onChange={(active) => setForm((current) => ({...current, active}))}/></div>
            </div>
            <div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar almacén</Button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
