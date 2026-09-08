import fs from 'node:fs';

const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const sidebar=fs.readFileSync('apps/web/src/layout/Sidebar.jsx','utf8');
const manifest=fs.readFileSync('apps/web/src/data/routeManifest.js','utf8');

const expectedKeys=[
  'inicio','ventas','compras','inventario','crm','proyectos',
  'marketing','produccion','pos','finanzas','rrhh','facturacion-fiscal','reportes'
];

for(const key of expectedKeys){
  if(!nav.includes(`moduleKey: '${key}'`)){
    console.error(`Falta moduleKey ${key}`);
    process.exit(1);
  }
}
if(!nav.includes("label: 'Módulos y planes'") || !nav.includes("to: '/configuracion/modulos'")){
  console.error('Falta acceso Módulos y planes en adminNavigation');
  process.exit(1);
}
if(!sidebar.includes("apiRequest('/modules/dashboard')")){
  console.error('Sidebar no consulta configuración modular');
  process.exit(1);
}
if(!sidebar.includes('visibleNavigation.map')){
  console.error('Sidebar no usa navegación filtrada');
  process.exit(1);
}
if(!manifest.includes("'/configuracion/modulos'")){
  console.error('routeManifest no contiene configuración/modulos');
  process.exit(1);
}
console.log('OK: acceso visible y navegación modular dinámica v5.5.1.');
