import fs from 'node:fs';

const css=fs.readFileSync('apps/web/src/layout/AppShell.module.css','utf8');
const rail=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
const banner=fs.readFileSync('apps/web/src/framework/PowerBanner.module.css','utf8');

for (const token of [
  'height:100vh',
  'grid-template-rows:auto minmax(0,1fr) auto',
  'overflow-y:auto',
  'overflow:hidden',
  '.powerBannerSlot'
]) {
  if (!css.includes(token)) {
    console.error('Falta regla AppShell:', token);
    process.exit(1);
  }
}

if (!rail.includes('position:relative')) {
  console.error('Rail no está desacoplado del scroll principal');
  process.exit(1);
}

if (!banner.includes('position:relative')) {
  console.error('PowerBanner no está dentro del flujo del shell');
  process.exit(1);
}

console.log('OK: v7.4.1 mantiene shell global visible y solo desplaza contenido central.');
