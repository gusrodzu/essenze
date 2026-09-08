import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const service=fs.readFileSync('apps/api/src/services/intelligence.js','utf8');
const route=fs.readFileSync('apps/api/src/routes/intelligence.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/Intelligence.jsx','utf8');
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
const api=JSON.parse(fs.readFileSync('apps/api/package.json','utf8'));
const updater=fs.readFileSync('scripts/safe-update.mjs','utf8');

for(const x of ['model IntelligenceMetricSnapshot','intelligenceMetricSnapshots'])
  if(!schema.includes(x)){console.error('schema',x);process.exit(1)}

for(const x of ['captureMetricSnapshots','metricHistory','linearForecast','projectedChangePct'])
  if(!service.includes(x)){console.error('service',x);process.exit(1)}

for(const x of ["/history",'metricHistory'])
  if(!route.includes(x)){console.error('route',x);process.exit(1)}

for(const x of ['Intelligence v2','Tendencias','trendGrid','Proyección lineal simple'])
  if(!ui.includes(x)){console.error('ui',x);process.exit(1)}

if(root.scripts.update!=='node scripts/safe-update.mjs')process.exit(1);
if(!api.scripts.dev.includes('nodemon'))process.exit(1);

for(const forbidden of ['migrate reset','--force-reset','--accept-data-loss','docker compose down -v']){
  if(updater.includes(forbidden)){
    console.error('forbidden updater token',forbidden);
    process.exit(1);
  }
}

if(!updater.includes("CI:'1'")){
  console.error('safe CI mode missing');
  process.exit(1);
}

console.log('OK: Intelligence v2 tiene snapshots, tendencias, proyección explicable y Safe Update.');
