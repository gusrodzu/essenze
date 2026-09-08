import fs from 'node:fs';
const shell=fs.readFileSync('apps/web/src/layout/AppShell.jsx','utf8');
const shellCss=fs.readFileSync('apps/web/src/layout/AppShell.module.css','utf8');
const bannerCss=fs.readFileSync('apps/web/src/framework/PowerBanner.module.css','utf8');
const railCss=fs.readFileSync('apps/web/src/framework/BuzzBeeRightRail.module.css','utf8');
if(!shell.includes('<PowerBanner />')||!shell.includes('powerBannerSlot'))process.exit(1);
if(bannerCss.includes('position:fixed')){console.error('PowerBanner must not overlay');process.exit(1)}
if(!shellCss.includes('.powerBannerSlot')||!railCss.includes('v7.4 balanced global rail'))process.exit(1);
console.log('OK: v7.4 usa BuzzBee AI + Apps + Power Banner como módulos globales sin superposición.');
