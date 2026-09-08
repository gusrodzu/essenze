import fs from 'node:fs';

const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const main=fs.readFileSync('apps/web/src/main.jsx','utf8');

const importBlock=nav.slice(0,nav.indexOf("from 'lucide-react';"));
if(!importBlock.includes('CreditCard,')){
  console.error('CreditCard se usa en navegación pero no está importado.');
  process.exit(1);
}
if(!nav.includes("label: 'Plan y facturación'") || !nav.includes('icon: CreditCard')){
  console.error('Falta navegación de Plan y facturación.');
  process.exit(1);
}
if(!app.includes("import Billing from './pages/Billing';")){
  console.error('Billing no está importado en App.jsx.');
  process.exit(1);
}
if(!app.includes('<Route path="configuracion/facturacion" element={<Billing />} />')){
  console.error('Falta ruta de Billing.');
  process.exit(1);
}
if(!main.includes('createRoot(rootElement).render')){
  console.error('main.jsx no monta React.');
  process.exit(1);
}
console.log('OK: frontend v5.6.3 tiene imports/ruta necesarios para montar React y Plan y facturación.');
