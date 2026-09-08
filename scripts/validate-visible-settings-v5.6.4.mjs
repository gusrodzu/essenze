import fs from 'node:fs';
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const side=fs.readFileSync('apps/web/src/layout/Sidebar.jsx','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');

for(const token of [
  "label: 'Plan y facturación'",
  "to: '/configuracion/facturacion'",
  "label: 'Configuración de módulos'",
  "to: '/configuracion/modulos'",
]){
  if(!nav.includes(token)){console.error('Falta '+token);process.exit(1)}
}
if(!side.includes('adminNavigation.slice(0, 2)')){
  console.error('Los controles SaaS no están priorizados en Sistema');process.exit(1)
}
if(!app.includes('<Route path="configuracion/facturacion" element={<Billing />} />') ||
   !app.includes('<Route path="configuracion/modulos" element={<Modules />} />')){
  console.error('Faltan rutas exactas');process.exit(1)
}
console.log('OK: Plan y facturación + Configuración de módulos son accesos visibles prioritarios.');
