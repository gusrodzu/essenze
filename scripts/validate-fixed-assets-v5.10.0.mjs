import fs from 'node:fs';
const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const api=fs.readFileSync('apps/api/src/routes/fixedAssets.js','utf8');
const app=fs.readFileSync('apps/web/src/App.jsx','utf8');
const nav=fs.readFileSync('apps/web/src/data/navigation.js','utf8');
for(const x of ['model FixedAssetCategory','model FixedAsset','enum FixedAssetStatus'])if(!schema.includes(x))process.exit(1);
for(const x of ['/dashboard','/:id/recalculate','/:id/dispose','monthlyDepreciation'])if(!api.includes(x))process.exit(1);
if(!app.includes('path="activos-fijos"')||!nav.includes("label: 'Activos fijos'"))process.exit(1);
console.log('OK: Activos Fijos v5.10.0 tiene dominio, API, depreciación, UI y navegación.');
