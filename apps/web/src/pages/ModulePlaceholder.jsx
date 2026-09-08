import {Construction, Plus} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {Badge, Button, Card} from '../design-system/components';
import styles from './ModulePlaceholder.module.css';

const names = {
  '/compras/solicitudes': 'Solicitudes de compra',
  '/compras/ordenes': 'Órdenes de compra',
  '/compras/proveedores': 'Proveedores',
  '/inventario/productos': 'Productos',
  '/inventario/existencias': 'Existencias',
  '/inventario/movimientos': 'Movimientos de inventario',
  '/almacenes': 'Almacenes',
  '/recursos-humanos': 'Recursos humanos',
  '/reportes': 'Reportes',
  '/configuracion/empresa': 'Configuración de empresa',
  '/configuracion/usuarios': 'Usuarios y roles',
  '/configuracion': 'Configuración general',
  '/ayuda': 'Centro de ayuda',
};

export default function ModulePlaceholder() {
  const {pathname} = useLocation();
  const title = names[pathname] ?? 'Módulo';
  return (
    <div className={styles.page}>
      <header><div><Badge tone="info">Sprint 2</Badge><h1>{title}</h1><p>La navegación y el espacio de trabajo están listos para integrar este módulo.</p></div><Button icon={Plus}>Nuevo registro</Button></header>
      <Card className={styles.empty}>
        <span><Construction size={28} /></span>
        <h2>Base del módulo preparada</h2>
        <p>El desarrollo funcional de esta sección se realizará en los próximos sprints sin modificar el layout principal.</p>
      </Card>
    </div>
  );
}
