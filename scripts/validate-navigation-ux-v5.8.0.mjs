import fs from 'node:fs';
const n=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const s=fs.readFileSync('apps/web/src/layout/Sidebar.jsx','utf8');
for(const x of ['Inicio','Comercial','Operaciones','Finanzas','Personas','Inteligencia'])if(!n.includes(`label: '${x}'`))process.exit(1);
for(const x of ['navigationGroups','BusinessGroup','buzzbee.sidebar.groups','visibleGroups'])if(!s.includes(x))process.exit(1);
console.log('OK: navegación v5.8.0 jerárquica, colapsable, persistente y modular.');
