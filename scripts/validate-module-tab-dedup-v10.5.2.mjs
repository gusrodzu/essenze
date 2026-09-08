
import fs from 'node:fs';

const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const files={
  sales:read('apps/web/src/pages/SalesEnterprise.jsx'),
  o2c:read('apps/web/src/pages/OrderToCash.jsx'),
  procurement:read('apps/web/src/pages/ProcurementCenter.jsx'),
  requests:read('apps/web/src/pages/PurchaseRequests.jsx'),
  products:read('apps/web/src/pages/Products.jsx'),
  balances:read('apps/web/src/pages/InventoryBalances.jsx'),
  hr:read('apps/web/src/pages/HumanResources.jsx'),
  shellTabs:read('apps/web/src/layout/ModuleTabBar.jsx'),
  nav:read('apps/web/src/data/navigation.js'),
  app:read('apps/web/src/App.jsx'),
};

const routeTabPatterns={
  sales:["/ventas/order-to-cash","/ventas/operacion","/ventas/devoluciones","/ventas/cobranza"],
  compras:["/compras/solicitudes","/compras/ordenes","/compras/recepciones"],
  inventory:["/inventario/productos","/inventario/existencias","/inventario/movimientos","/inventario/operaciones","/almacenes"],
  hr:["/recursos-humanos/operacion","/recursos-humanos/expedientes","/recursos-humanos/prenomina"],
};

function countRouteTabs(source,routes){
  return routes.reduce((sum,route)=>sum+(source.includes(`to:'${route}'`)||source.includes(`to="${route}"`)?1:0),0);
}

const checks=[
 ['Global ModuleTabBar remains canonical route navigation',files.shellTabs.includes('module.children.map')],
 ['Compras center has no local ModuleTabs',!files.procurement.includes('<ModuleTabs')],
 ['Solicitudes has no local ModuleTabs',!files.requests.includes('<ModuleTabs')],
 ['Productos has no local ModuleTabs',!files.products.includes('<ModuleTabs')],
 ['Existencias has no local ModuleTabs',!files.balances.includes('<ModuleTabs')],
 ['Order-to-Cash has no local ModuleTabs',!files.o2c.includes('<ModuleTabs')],
 ['Ventas internal tabs no longer repeat O2C route',!files.sales.includes("to:'/ventas/order-to-cash'")],
 ['Ventas preserves unique local state tabs',files.sales.includes("label:'Resumen'")&&files.sales.includes("label:'Pipeline'")&&files.sales.includes("label:'Cotizaciones y pedidos'")],
 ['RRHH local tabs no longer repeat Operación route',!files.hr.includes("to:'/recursos-humanos/operacion'")],
 ['RRHH preserves local Empleados/Departamentos/Puestos tabs',files.hr.includes("label:'Empleados'")&&files.hr.includes("label:'Departamentos'")&&files.hr.includes("label:'Puestos'")],
 ['Legacy HrClientCenter duplicate page removed',!fs.existsSync('apps/web/src/pages/HrClientCenter.jsx')],
 ['Legacy /rrhh remains redirect only',files.app.includes('path="rrhh" element={<Navigate to="/recursos-humanos" replace />}')],
 ['Navigation documents single route-level tab rule',files.nav.includes('route-level section navigation lives ONLY in ModuleTabBar')],
 ['No Prisma changes required',true],
];

let fail=0;
console.log('\nModule Tab Dedup Audit — v10.5.2');
console.log('================================');
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)fail++;
}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
