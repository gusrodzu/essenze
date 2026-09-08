import fs from 'node:fs';

const shell=fs.readFileSync('apps/web/src/layout/AppShell.jsx','utf8');
const banner=fs.readFileSync('apps/web/src/framework/PowerBanner.jsx','utf8');
const css=fs.readFileSync('apps/web/src/framework/PowerBanner.module.css','utf8');

for(const x of ['PowerBanner','<PowerBanner />']){
  if(!shell.includes(x)){console.error('shell',x);process.exit(1)}
}
for(const x of ['Explora todo el poder de BuzzBee','Ver consejos']){
  if(!banner.includes(x)){console.error('banner',x);process.exit(1)}
}
for(const x of ['position:fixed','--sidebar-width','--sidebar-collapsed-width']){
  if(!css.includes(x)){console.error('css',x);process.exit(1)}
}
console.log('OK: Power Banner global v7.3 está fijo y montado desde AppShell.');
