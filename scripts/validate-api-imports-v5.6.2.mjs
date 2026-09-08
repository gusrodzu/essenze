import fs from 'node:fs';

const billing=fs.readFileSync('apps/api/src/routes/billing.js','utf8');
const auth=fs.readFileSync('apps/api/src/middleware/auth.js','utf8');
const permissions=fs.readFileSync('apps/api/src/middleware/permissions.js','utf8');

if(!billing.includes("import {requireAuth} from '../middleware/auth.js';")){
  console.error('billing.js no importa requireAuth desde auth.js');
  process.exit(1);
}
if(!billing.includes("import {requirePermission} from '../middleware/permissions.js';")){
  console.error('billing.js no importa requirePermission desde permissions.js');
  process.exit(1);
}
if(!auth.includes('export function requireAuth')){
  console.error('auth.js no exporta requireAuth');
  process.exit(1);
}
if(!permissions.includes('export function requirePermission')){
  console.error('permissions.js no exporta requirePermission');
  process.exit(1);
}
if(billing.includes("requireAuth,requirePermission} from '../middleware/auth.js'")){
  console.error('Sigue presente el import incorrecto');
  process.exit(1);
}
console.log('OK: imports de autenticación/permisos de Billing v5.6.2 son consistentes con los exports reales.');
