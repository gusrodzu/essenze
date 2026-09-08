import fs from 'node:fs';

const rail=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
const shell=fs.readFileSync('apps/web/src/layout/AppShell.module.css','utf8');

for (const token of [
  'height:100%',
  'grid-template-rows:minmax(0,1.18fr) minmax(0,.82fr)',
  'display:flex',
  'overflow:hidden'
]) {
  if (!rail.includes(token)) {
    console.error('Falta regla rail:', token);
    process.exit(1);
  }
}

for (const token of ['align-self:stretch', 'height:100%']) {
  if (!shell.includes(token)) {
    console.error('Falta regla rightColumn:', token);
    process.exit(1);
  }
}

console.log('OK: v7.4.2 BuzzBee AI y Aplicaciones ocupan todo el alto útil de la sección.');
