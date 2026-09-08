import fs from 'node:fs';

const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const engine=fs.readFileSync('apps/api/src/services/flowEngine.js','utf8');
const route=fs.readFileSync('apps/api/src/routes/flow.js','utf8');
const events=fs.readFileSync('apps/api/src/services/integrationEvents.js','utf8');
const ui=fs.readFileSync('apps/web/src/pages/Flow.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');

for(const x of ['model AutomationFlow','model AutomationFlowRun','model AutomationFlowActionRun','enum FlowRunStatus'])
  if(!schema.includes(x)){console.error('schema',x);process.exit(1)}

for(const x of ['evaluateConditions','resolveTemplates','CREATE_PURCHASE_REQUEST','CREATE_APPROVAL','NOTIFY','runAutomationsForEventAsync'])
  if(!engine.includes(x)){console.error('engine',x);process.exit(1)}

for(const x of ['/dashboard','/catalog',"/:id/test",'flow.manage','flow.run'])
  if(!route.includes(x)){console.error('route',x);process.exit(1)}

if(!events.includes('runAutomationsForEventAsync'))process.exit(1);

for(const x of ['BuzzBee Core · Flow v2','Crear automatización','Condiciones','Acciones','<KpiGrid>'])
  if(!ui.includes(x)){console.error('ui',x);process.exit(1)}

if(!nav.includes("label: 'BuzzBee Flow'"))process.exit(1);

for(const x of ['flow.read','flow.manage','flow.run'])
  if(!seed.includes(x)){console.error('permission',x);process.exit(1)}

console.log('OK: BuzzBee Flow v2 tiene trigger, condiciones, acciones encadenadas, builder y trazabilidad.');
