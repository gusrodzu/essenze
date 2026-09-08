import fs from 'node:fs';
const text=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
const importBlock=text.match(/import\s*\{([\s\S]*?)\}\s*from\s*'lucide-react';/)?.[1] ?? '';
const imported=new Set(importBlock.split(',').map(x=>x.trim()).filter(Boolean));
const icons=[...text.matchAll(/\bicon:\s*([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const missing=[...new Set(icons.filter(x=>!imported.has(x)))];
if(missing.length){
  console.error('Iconos usados pero no importados:',missing.join(', '));
  process.exit(1);
}
console.log(`OK: ${icons.length} referencias de iconos tienen import válido.`);
