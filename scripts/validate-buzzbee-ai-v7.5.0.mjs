import fs from 'node:fs';
const idx=fs.readFileSync('apps/api/src/index.js','utf8');
const route=fs.readFileSync('apps/api/src/routes/ai.js','utf8');
const service=fs.readFileSync('apps/api/src/services/buzzbeeAI.js','utf8');
const ui=fs.readFileSync('apps/web/src/framework/AIAssistant.jsx','utf8');
const seed=fs.readFileSync('apps/api/prisma/seed.js','utf8');
for(const [name,text,tokens] of [
 ['index',idx,["app.use('/api/ai', aiRouter)"]],
 ['route',route,["requirePermission('ai.read')","req.auth.companyId","req.auth.sub","AI_QUERY"]],
 ['service',service,["mode:'READ_ONLY'","OPENAI_API_KEY","/v1/responses","userPermissions","companyId"]],
 ['ui',ui,["apiRequest('/ai/ask'","result.sources","Solo lectura"]],
 ['seed',seed,["['ai.read'"]]
]){
 for(const token of tokens)if(!text.includes(token)){console.error(name,'falta',token);process.exit(1)}
}
if(/queryRaw|executeRaw|\$queryRaw|\$executeRaw/.test(service)){console.error('AI no debe usar SQL raw');process.exit(1)}
console.log('OK: BuzzBee AI v7.5.0 read-only, tenant-scoped, permission-aware y conectado al UI.');
