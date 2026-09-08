import fs from 'node:fs';
const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/expenses.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
for(const x of ['model ExpenseCategory','model Expense','enum ExpenseStatus'])if(!schema.includes(x))process.exit(1);
for(const x of ["/dashboard","/:id/submit","/:id/pay","entityType:'EXPENSE'"])if(!api.includes(x))process.exit(1);
if(!app.includes('path="gastos"')||!nav.includes("label: 'Gastos y viáticos'"))process.exit(1);
console.log('OK: Gastos y Viáticos v5.9.0 tiene dominio, API, aprobaciones, UI y navegación.');
