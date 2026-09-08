// v12.2.0 Module Rationalization
// - Sidebar = only business applications / major work areas.
// - route-level section navigation lives ONLY in ModuleTabBar (topbar), never as sidebar submenus.
// - Secondary functions (suppliers, warehouses, expenses, fixed assets, intelligence)
//   are tabs of their natural parent module.
// - Optional/vertical apps remain implemented and are surfaced only when enabled.
// - Platform/SaaS tooling is hidden from the ERP Client profile but remains routable.
// Compatibility marker for navigation QA: to:'/inteligencia'
import {
  Activity, BarChart3, BriefcaseBusiness, Boxes, Building2, ClipboardList, CreditCard,
  Factory, FileText, FolderKanban, Gauge, GitPullRequest, Landmark,
  Megaphone, PackageSearch, Receipt, ReceiptText, Settings, ShieldCheck,
  ShoppingBag, ShoppingCart, SlidersHorizontal, Store, Target, Users,
  UsersRound, WalletCards, Warehouse, Workflow, PlugZap
} from 'lucide-react';

export const PRODUCT_PROFILE = import.meta.env.VITE_PRODUCT_PROFILE || 'erp-client';

export const navigationGroups = [
  {
    label: 'Principal',
    children: [
      {label: 'Inicio', moduleKey: 'inicio', icon: Gauge, to: '/'},
      {label: 'Tareas', moduleKey: 'aprobaciones', icon: GitPullRequest, to: '/aprobaciones'},
    ],
  },
  {
    label: 'Comercial',
    children: [
      {label: 'Ventas', moduleKey: 'ventas', icon: ShoppingBag, children: [
        {label: 'Resumen', to: '/ventas'},
        {label: 'Ciclo de venta', to: '/ventas/order-to-cash'},
        {label: 'Entregas y facturación', to: '/ventas/operacion'},
        {label: 'Devoluciones', to: '/ventas/devoluciones'},
        {label: 'Cobranza', to: '/ventas/cobranza'},
      ]},
      {label: 'CRM', moduleKey: 'crm', icon: Target, children: [
        {label: 'Pipeline', to: '/crm'},
        {label: 'Clientes', to: '/terceros'},
      ]},
    ],
  },
  {
    label: 'Operaciones',
    children: [
      {label: 'Compras', moduleKey: 'compras', icon: ShoppingCart, children: [
        {label: 'Resumen', to: '/compras'},
        {label: 'Solicitudes', to: '/compras/solicitudes'},
        {label: 'Órdenes de compra', to: '/compras/ordenes'},
        {label: 'Recepciones', to: '/compras/recepciones'},
        {label: 'Proveedores', to: '/compras/proveedores'},
      ]},
      {label: 'Inventario', moduleKey: 'inventario', icon: Boxes, children: [
        {label: 'Productos', to: '/inventario/productos'},
        {label: 'Existencias', to: '/inventario/existencias'},
        {label: 'Movimientos', to: '/inventario/movimientos'},
        {label: 'Transferencias y ajustes', to: '/inventario/operaciones'},
        {label: 'Almacenes', to: '/almacenes'},
      ]},
    ],
  },
  {
    label: 'Administración',
    children: [
      {label: 'Centro administrativo', icon: BriefcaseBusiness, to: '/administracion'},
      {label: 'Finanzas', moduleKey: 'finanzas', icon: WalletCards, children: [
        {label: 'Cuentas por pagar', to: '/finanzas/cuentas-por-pagar'},
        {label: 'Cuentas por cobrar', to: '/finanzas/cuentas-por-cobrar'},
        {label: 'Tesorería', to: '/finanzas/tesoreria'},
        {label: 'Gastos', to: '/gastos'},
        {label: 'Presupuestos', to: '/finanzas/presupuestos'},
        {label: 'Flujo de efectivo', to: '/finanzas/flujo-efectivo'},
        {label: 'Conciliación bancaria', to: '/finanzas/conciliacion-bancaria'},
        {label: 'Activos fijos', to: '/activos-fijos'},
        {label: 'Contabilidad', to: '/finanzas/contabilidad'},
      ]},
      {label: 'Facturación', moduleKey: 'facturacion-fiscal', icon: ReceiptText, to: '/facturacion-fiscal'},
      {label: 'Recursos Humanos', moduleKey: 'rrhh', icon: Users, children: [
        {label: 'Empleados y estructura', to: '/recursos-humanos'},
        {label: 'Asistencias e incidencias', to: '/recursos-humanos/operacion'},
        {label: 'Expedientes laborales', to: '/recursos-humanos/expedientes'},
        {label: 'Prenómina', to: '/recursos-humanos/prenomina'},
      ]},
    ],
  },
  {
    label: 'Análisis',
    children: [
      {label: 'Reportes', moduleKey: 'reportes', icon: BarChart3, children: [
        {label: 'Resumen ejecutivo', to: '/reportes'},
        {label: 'Inteligencia', to: '/inteligencia'},
      ]},
    ],
  },
  {
    label: 'Apps opcionales',
    optionalGroup: true,
    children: [
      {label: 'POS', moduleKey: 'pos', icon: Store, to: '/pos', defaultVisible: false},
      {label: 'Producción', moduleKey: 'produccion', icon: Factory, to: '/produccion', defaultVisible: false},
      {label: 'Proyectos', moduleKey: 'proyectos', icon: FolderKanban, to: '/proyectos', defaultVisible: false},
      {label: 'Marketing', moduleKey: 'marketing', icon: Megaphone, to: '/marketing', defaultVisible: false},
    ],
  },
];

export const navigation = navigationGroups.flatMap((group) => group.children);
export const tabbedModuleNavigation = navigation.filter((item) => Array.isArray(item.children) && item.children.length > 0);

// Platform tooling remains available in code for BuzzBee SaaS, but the ERP Client
// shell keeps it out of everyday navigation. Applications remains visible so an
// administrator can enable/disable optional business modules.
export const adminNavigation = [
  {label: 'Empresa', icon: Building2, to: '/configuracion/empresa'},
  {label: 'Usuarios y roles', icon: ShieldCheck, to: '/configuracion/usuarios'},
  {label: 'Actividad y auditoría', icon: Activity, to: '/configuracion/actividad'},
  {label: 'Aplicaciones', icon: SlidersHorizontal, to: '/configuracion/modulos'},
  {label: 'Configuración', icon: Settings, to: '/configuracion'},
  {label: 'Plan y facturación', icon: CreditCard, to: '/configuracion/facturacion', platformOnly: true},
  {label: 'Automatizaciones', icon: Workflow, to: '/flow', platformOnly: true},
  {label: 'Integraciones', icon: PlugZap, to: '/integration-hub', platformOnly: true},
  {label: 'Datos maestros', icon: Boxes, to: '/datos-maestros', platformOnly: true},
  {label: 'Importar datos', icon: FileText, to: '/data-hub', platformOnly: true},
];

export function isProfileVisible(item) {
  if (item.platformOnly && PRODUCT_PROFILE !== 'buzzbee-saas') return false;
  return true;
}

export function isDiscoverable(item) {
  if (!isProfileVisible(item)) return false;
  if (PRODUCT_PROFILE === 'erp-client' && item.defaultVisible === false) return false;
  return true;
}

export const quickActions=[
  {label: 'Nueva venta', moduleKey: 'ventas', icon: ShoppingBag, to: '/ventas'},
  {label: 'Crear cotización', moduleKey: 'ventas', icon: ClipboardList, to: '/ventas'},
  {label: 'Registrar compra', moduleKey: 'compras', icon: ShoppingCart, to: '/compras/ordenes'},
  {label: 'Nuevo gasto', moduleKey: 'finanzas', icon: Receipt, to: '/gastos'},
  {label: 'Transferencia', moduleKey: 'inventario', icon: Warehouse, to: '/inventario/operaciones'},
  {label: 'Agregar cliente', moduleKey: 'crm', icon: UsersRound, to: '/terceros'},
  {label: 'Ver reportes', moduleKey: 'reportes', icon: BarChart3, to: '/reportes'},
  {label: 'Registrar producto', moduleKey: 'inventario', icon: PackageSearch, to: '/inventario/productos'},
];
