import {AlertTriangle,Boxes,CircleDollarSign,Warehouse} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {apiRequest} from '../api';
import {Badge,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import {DataTableFrame,ModuleHeader,ModuleToolbar} from '../components/module-system';
import styles from './Inventory.module.css';

const num=v=>Number(v||0).toLocaleString('es-MX',{maximumFractionDigits:3});
const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

export default function InventoryBalances(){
  const [balances,setBalances]=useState([]);
  const [summary,setSummary]=useState({});
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    apiRequest('/inventory/balances')
      .then(d=>{setBalances(d.balances||[]);setSummary(d.summary||{});})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    return q
      ?balances.filter(b=>[b.product?.sku,b.product?.name,b.warehouse?.name,b.warehouse?.branch?.name].join(' ').toLowerCase().includes(q))
      :balances;
  },[balances,query]);

  if(loading)return <div className={styles.loading}>Cargando existencias…</div>;

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Inventario · Control de existencias"
      title="Existencias"
      description="Consulta inventario por producto, almacén y sucursal con valorización y alertas de stock."
    />

    {error?<div className={styles.error}>{error}</div>:null}

    <KpiGrid>
      <KpiCard><Boxes/><span>Posiciones</span><KpiInfo title="Posiciones de inventario">Combinaciones de producto y almacén con saldo registrado.</KpiInfo><strong>{summary.records||0}</strong><small>producto × almacén</small></KpiCard>
      <KpiCard><Warehouse/><span>Unidades disponibles</span><KpiInfo title="Existencia total">Suma de las unidades disponibles en todos los almacenes.</KpiInfo><strong>{num(summary.units)}</strong><small>existencia consolidada</small></KpiCard>
      <KpiCard><CircleDollarSign/><span>Valor de inventario</span><KpiInfo title="Valuación de inventario">Existencia multiplicada por el costo promedio.</KpiInfo><strong>{money(summary.value)}</strong><small>costo promedio</small></KpiCard>
      <KpiCard><AlertTriangle/><span>Stock bajo</span><KpiInfo title="Productos por reabastecer">Posiciones cuya existencia es igual o menor al mínimo configurado.</KpiInfo><strong>{summary.lowStock||0}</strong><small>requieren atención</small></KpiCard>
    </KpiGrid>

    <Card className={styles.tableCard}>
      <ModuleToolbar
        title="Inventario actual"
        description={`${filtered.length} posiciones visibles`}
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar producto, SKU o almacén"
      />
      <DataTableFrame empty={!filtered.length?'No hay existencias. Registra una recepción de mercancía.':null}>
        <table>
          <thead><tr><th>Producto</th><th>Almacén</th><th>Existencia</th><th>Mínimo</th><th>Costo promedio</th><th>Valor</th><th>Estado</th></tr></thead>
          <tbody>
            {filtered.map(b=>{
              const low=Number(b.quantity)<=Number(b.product?.minStock);
              return <tr key={b.id}>
                <td><strong>{b.product?.name}</strong><small>{b.product?.sku} · {b.product?.category?.name||'Sin categoría'}</small></td>
                <td><strong>{b.warehouse?.name}</strong><small>{b.warehouse?.branch?.name}</small></td>
                <td>{num(b.quantity)} {b.product?.unit}</td>
                <td>{num(b.product?.minStock)}</td>
                <td>{money(b.averageCost)}</td>
                <td>{money(Number(b.quantity)*Number(b.averageCost))}</td>
                <td><Badge tone={low?'warning':'success'}>{low?'Reabastecer':'Disponible'}</Badge></td>
              </tr>;
            })}
          </tbody>
        </table>
      </DataTableFrame>
    </Card>
  </div>;
}
