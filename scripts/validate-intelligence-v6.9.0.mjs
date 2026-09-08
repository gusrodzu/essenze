import fs from 'node:fs';

const service=fs.readFileSync('apps/api/src/services/intelligence.js','utf8');
const worker=fs.readFileSync('apps/api/src/services/intelligenceWorker.js','utf8');
const flow=fs.readFileSync('apps/api/src/routes/flow.js','utf8');
const integrations=fs.readFileSync('apps/api/src/routes/integrations.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/Intelligence.jsx','utf8');
const root=JSON.parse(fs.readFileSync('package.json','utf8'));

for(const x of ['intelligence.health_score','finance.collection_pressure','healthScore','healthLevel','intelligence.insight.created','intelligence.insight.escalated'])
  if(!service.includes(x)){console.error('service',x);process.exit(1)}

for(const x of ['startIntelligenceWorker','INTELLIGENCE_SCAN_INTERVAL_MS','scanIntelligence'])
  if(!worker.includes(x)){console.error('worker',x);process.exit(1)}

for(const x of ['intelligence.insight.created','intelligence.insight.escalated']){
  if(!flow.includes(x)){console.error('flow',x);process.exit(1)}
  if(!integrations.includes(x)){console.error('integrations',x);process.exit(1)}
}

for(const x of ['Intelligence v3','Business Health','healthGrid','Configurar Flow'])
  if(!ui.includes(x)){console.error('ui',x);process.exit(1)}

if(root.scripts.update!=='node scripts/safe-update.mjs')process.exit(1);

console.log('OK: Intelligence v3 tiene health score, scanner automático y eventos hacia BuzzBee Flow.');
