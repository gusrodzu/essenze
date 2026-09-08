import fs from 'node:fs';

const required = [
  ['apps/api/prisma/schema.prisma', [
    'model Project {',
    'model ProjectTask {',
    'model ProjectTimeEntry {',
    'model ProjectDocument {',
    'projectLinks ProjectSalesOrder[]',
    'projectLinks ProjectPurchaseOrder[]',
  ]],
  ['apps/api/src/routes/projects.js', [
    "router.get('/dashboard'",
    "'/:id/tasks'",
    "'/:id/time-entries'",
    "'/:id/documents/upload'",
  ]],
  ['apps/web/src/pages/Projects.jsx', [
    "apiRequest('/projects/dashboard')",
    'Tablero de tareas',
    'Tiempos y costos',
    'Archivos del proyecto',
  ]],
  ['apps/web/src/App.jsx', ['path="proyectos"']],
  ['apps/web/src/data/navigation.js', ["label: 'Proyectos'"]],
];

let failed = false;
for (const [file, tokens] of required) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!text.includes(token)) {
      console.error(`Falta ${token} en ${file}`);
      failed = true;
    }
  }
}

const schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');
const purchaseOrder = schema.slice(
  schema.indexOf('model PurchaseOrder {'),
  schema.indexOf('\nmodel ', schema.indexOf('model PurchaseOrder {') + 1),
);
const purchaseRequest = schema.slice(
  schema.indexOf('model PurchaseRequest {'),
  schema.indexOf('\nmodel ', schema.indexOf('model PurchaseRequest {') + 1),
);
if (!purchaseOrder.includes('projectLinks ProjectPurchaseOrder[]')) {
  console.error('PurchaseOrder no tiene su relación con proyectos.');
  failed = true;
}
if (purchaseRequest.includes('projectLinks ProjectPurchaseOrder[]')) {
  console.error('La relación de ProjectPurchaseOrder quedó en PurchaseRequest incorrectamente.');
  failed = true;
}

if (failed) process.exit(1);
console.log('OK: dominio, API, UI y navegación de Proyectos v5.0.0 presentes.');
