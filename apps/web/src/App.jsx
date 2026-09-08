import {lazy, Suspense} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AuthProvider} from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './layout/AppShell';
const Dashboard=lazy(()=>import('./pages/Dashboard'));
const Agenda=lazy(()=>import('./pages/Agenda'));
const Crm=lazy(()=>import('./pages/Crm'));
const Projects=lazy(()=>import('./pages/Projects'));
const Marketing=lazy(()=>import('./pages/Marketing'));
const Fiscal=lazy(()=>import('./pages/Fiscal'));
const Production=lazy(()=>import('./pages/Production'));
const Pos=lazy(()=>import('./pages/Pos'));
const Modules=lazy(()=>import('./pages/Modules'));
const Billing=lazy(()=>import('./pages/Billing'));
const Approvals=lazy(()=>import('./pages/Approvals'));
const Expenses=lazy(()=>import('./pages/Expenses'));
const FixedAssets=lazy(()=>import('./pages/FixedAssets'));
const MasterData=lazy(()=>import('./pages/MasterData'));
const BusinessParties=lazy(()=>import('./pages/BusinessParties'));
const DataHub=lazy(()=>import('./pages/DataHub'));
const IntegrationHub=lazy(()=>import('./pages/IntegrationHub'));
const Flow=lazy(()=>import('./pages/Flow'));
const Intelligence=lazy(()=>import('./pages/Intelligence'));
const Login=lazy(()=>import('./pages/Login'));
const CompanySettings=lazy(()=>import('./pages/CompanySettings'));
const UsersAccess=lazy(()=>import('./pages/UsersAccess'));
const Warehouses=lazy(()=>import('./pages/Warehouses'));
const Suppliers=lazy(()=>import('./pages/Suppliers'));
const Products=lazy(()=>import('./pages/Products'));
const ProcurementCenter=lazy(()=>import('./pages/ProcurementCenter'));
const PurchaseRequests=lazy(()=>import('./pages/PurchaseRequests'));
const PurchaseOrders=lazy(()=>import('./pages/PurchaseOrders'));
const GoodsReceipts=lazy(()=>import('./pages/GoodsReceipts'));
const InventoryBalances=lazy(()=>import('./pages/InventoryBalances'));
const InventoryMovements=lazy(()=>import('./pages/InventoryMovements'));
const InventoryOperations=lazy(()=>import('./pages/InventoryOperations'));
const AccountsPayable=lazy(()=>import('./pages/AccountsPayable'));
const AccountsReceivable=lazy(()=>import('./pages/AccountsReceivable'));
const HumanResources=lazy(()=>import('./pages/HumanResources'));
const HrOperations=lazy(()=>import('./pages/HrOperations'));
const EmployeeDocuments=lazy(()=>import('./pages/EmployeeDocuments'));
const Payroll=lazy(()=>import('./pages/Payroll'));
const Reports=lazy(()=>import('./pages/Reports'));
const ExecutiveDemo=lazy(()=>import('./pages/ExecutiveDemo'));
const DemoCompany=lazy(()=>import('./pages/DemoCompany'));
const AdministrativeCenter=lazy(()=>import('./pages/AdministrativeCenter'));
const OrderToCash=lazy(()=>import('./pages/OrderToCash'));
const NotFound=lazy(()=>import('./pages/NotFound'));
const ActivityCenter=lazy(()=>import('./pages/ActivityCenter'));
const Treasury=lazy(()=>import('./pages/Treasury'));
const Budgets=lazy(()=>import('./pages/Budgets'));
const Sales=lazy(()=>import('./pages/Sales'));
const SalesEnterprise=lazy(()=>import('./pages/SalesEnterprise'));
const SalesFulfillment=lazy(()=>import('./pages/SalesFulfillment'));
const SalesReturns=lazy(()=>import('./pages/SalesReturns'));
const Collections=lazy(()=>import('./pages/Collections'));
const BankReconciliation=lazy(()=>import('./pages/BankReconciliation'));
const CashFlow=lazy(()=>import('./pages/CashFlow'));
const Accounting=lazy(()=>import('./pages/Accounting'));
const ModulePlaceholder=lazy(()=>import('./pages/ModulePlaceholder'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Cargando módulo…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="crm" element={<Crm />} />
              <Route path="rrhh" element={<Navigate to="/recursos-humanos" replace />} />
              <Route path="proyectos" element={<Projects />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="facturacion-fiscal" element={<Fiscal />} />
              <Route path="produccion" element={<Production />} />
              <Route path="pos" element={<Pos />} />
              <Route path="aprobaciones" element={<Approvals />} />
              <Route path="gastos" element={<Expenses />} />
              <Route path="activos-fijos" element={<FixedAssets />} />
              <Route path="datos-maestros" element={<MasterData />} />
              <Route path="terceros" element={<BusinessParties />} />
              <Route path="data-hub" element={<DataHub />} />
              <Route path="integration-hub" element={<IntegrationHub />} />
              <Route path="flow" element={<Flow />} />
              <Route path="inteligencia" element={<Intelligence />} />
              <Route path="compras" element={<ProcurementCenter />} />
              <Route path="compras/solicitudes" element={<PurchaseRequests />} />
              <Route path="compras/ordenes" element={<PurchaseOrders />} />
              <Route path="compras/recepciones" element={<GoodsReceipts />} />
              <Route path="compras/proveedores" element={<Suppliers />} />
              <Route path="compras/*" element={<ModulePlaceholder />} />
              <Route path="inventario/productos" element={<Products />} />
              <Route path="inventario/existencias" element={<InventoryBalances />} />
              <Route path="inventario/movimientos" element={<InventoryMovements />} />
              <Route path="inventario/operaciones" element={<InventoryOperations />} />
              <Route path="inventario/*" element={<ModulePlaceholder />} />
              <Route path="almacenes" element={<Warehouses />} />
              <Route path="administracion" element={<AdministrativeCenter />} />
              <Route path="finanzas" element={<Navigate to="/finanzas/cuentas-por-pagar" replace />} />
              <Route path="administracion/cuentas-por-pagar" element={<Navigate to="/finanzas/cuentas-por-pagar" replace />} />
              <Route path="administracion/cuentas-por-cobrar" element={<Navigate to="/finanzas/cuentas-por-cobrar" replace />} />
              <Route path="administracion/tesoreria" element={<Navigate to="/finanzas/tesoreria" replace />} />
              <Route path="administracion/presupuestos" element={<Navigate to="/finanzas/presupuestos" replace />} />
              <Route path="finanzas/cuentas-por-pagar" element={<AccountsPayable />} />
              <Route path="finanzas/clientes" element={<Navigate to="/terceros" replace />} />
              <Route path="finanzas/cuentas-por-cobrar" element={<AccountsReceivable />} />
              <Route path="finanzas/tesoreria" element={<Treasury />} />
              <Route path="finanzas/presupuestos" element={<Budgets />} />
              <Route path="finanzas/conciliacion-bancaria" element={<BankReconciliation />} />
              <Route path="finanzas/flujo-efectivo" element={<CashFlow />} />
              <Route path="finanzas/contabilidad" element={<Accounting />} />
              <Route path="recursos-humanos" element={<HumanResources />} />
              <Route path="recursos-humanos/operacion" element={<HrOperations />} />
              <Route path="recursos-humanos/expedientes" element={<EmployeeDocuments />} />
              <Route path="recursos-humanos/prenomina" element={<Payroll />} />
              <Route path="ventas" element={<SalesEnterprise />} />
              <Route path="ventas/order-to-cash" element={<OrderToCash />} />
              <Route path="ventas/operacion" element={<SalesFulfillment />} />
              <Route path="ventas/devoluciones" element={<SalesReturns />} />
              <Route path="ventas/cobranza" element={<Collections />} />
              <Route path="reportes" element={<Reports />} />
              <Route path="reportes/demo" element={<ExecutiveDemo />} />
              <Route path="reportes/demo-company" element={<DemoCompany />} />
              <Route path="configuracion/actividad" element={<ActivityCenter />} />
              <Route path="configuracion/empresa" element={<CompanySettings />} />
              <Route path="configuracion/usuarios" element={<UsersAccess />} />
              <Route path="configuracion/modulos" element={<Modules />} />
              <Route path="configuracion/facturacion" element={<Billing />} />
              <Route path="configuracion/*" element={<ModulePlaceholder />} />
              <Route path="ayuda" element={<ModulePlaceholder />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
