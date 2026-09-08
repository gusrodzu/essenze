import fs from 'node:fs';
const shell=fs.readFileSync('apps/web/src/layout/AppShell.jsx','utf8');
const rail=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.jsx','utf8');
const ctx=fs.readFileSync('apps/web/src/framework/aiContext.js','utf8');
const ai=fs.readFileSync('apps/web/src/framework/AIAssistant.jsx','utf8');
for(const x of ['BuzzBeeRightRail','onAskAI','initialPrompt'])if(!shell.includes(x)){console.error('shell',x);process.exit(1)}
for(const x of ['Aplicaciones','BuzzBee AI','/modules/dashboard'])if(!rail.includes(x)){console.error('rail',x);process.exit(1)}
for(const x of ['sales','purchases','inventory','finance','hr','production','projects','marketing'])if(!ctx.includes(`key:'${x}'`)){console.error('context',x);process.exit(1)}
for(const x of ['getAIContext','initialPrompt','Contexto:'])if(!ai.includes(x)){console.error('assistant',x);process.exit(1)}
console.log('OK: v7.2 tiene BuzzBee AI contextual y lanzador de Apps persistentes en AppShell.');
