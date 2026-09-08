import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/dataHub.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/DataHub.jsx','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');

for(const token of [
  'enum DataImportMode',
  'enum DataImportAction',
  'ROLLING_BACK',
  'ROLLED_BACK',
  'ROLLBACK_PARTIAL',
  'beforeData',
  'rollbackError'
]){
  if(!schema.includes(token)){
    console.error(`Falta schema token: ${token}`);
    process.exit(1);
  }
}

for(const token of [
  "mode==='UPSERT'",
  "row.action==='UPDATE'",
  "/jobs/:id/rollback",
  'restoreTarget',
  'deleteCreatedTarget',
  'snapshotFor',
  'ensureCategory',
  'ensureDepartment',
  'ensurePosition'
]){
  if(!api.includes(token)){
    console.error(`Falta API token: ${token}`);
    process.exit(1);
  }
}

for(const token of [
  'Crear y actualizar',
  'Comparación y vista previa',
  'beforeData={row.beforeData}',
  'Revertir',
  '<KpiGrid>',
  '<KpiCard>',
  '<KpiInfo'
]){
  if(!ui.includes(token)){
    console.error(`Falta UI token: ${token}`);
    process.exit(1);
  }
}

for(const permission of [
  'master_data.read',
  'master_data.manage',
  'data_hub.read',
  'data_hub.import',
  'data_hub.rollback'
]){
  if(!seed.includes(permission)){
    console.error(`Falta permiso en seed: ${permission}`);
    process.exit(1);
  }
}

if(api.includes('companyId_name')){
  console.error('Data Hub todavía contiene companyId_name inválido.');
  process.exit(1);
}

console.log('OK: Data Hub v2 tiene create/update, diff, snapshots, rollback y permisos corregidos.');
