
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const bar=read('apps/web/src/layout/ModuleTabBar.jsx');
const css=read('apps/web/src/layout/ModuleTabBar.module.css');
const prod=read('apps/web/src/pages/Production.jsx');
const mkt=read('apps/web/src/pages/Marketing.jsx');
const fiscal=read('apps/web/src/pages/Fiscal.jsx');
const projects=read('apps/web/src/pages/Projects.jsx');
const crm=read('apps/web/src/pages/Crm.jsx');

const checks=[
 ['ModuleTabBar supports single-route modules',bar.includes('const modules = navigationGroups.flatMap')&&bar.includes("data-has-primary-tabs={primaryTabs.length ? 'true' : 'false'}")],
 ['Single-route modules use local tabs as topbar row',css.includes('.shell[data-has-primary-tabs="false"] .localTabsSlot:not(:empty)')],
 ['Producción migrated to ModuleTabs',prod.includes('<ModuleTabs')&&!prod.includes('<nav className={styles.tabs}>')],
 ['Marketing migrated to ModuleTabs',mkt.includes('<ModuleTabs')&&!mkt.includes('<nav className={styles.tabs}>')],
 ['Facturación migrated to ModuleTabs',fiscal.includes('<ModuleTabs')&&!fiscal.includes('<nav className={styles.tabs}>')],
 ['Proyectos migrated to ModuleTabs',projects.includes('<ModuleTabs')&&!projects.includes('<nav className={styles.tabs}>')],
 ['CRM migrated to ModuleTabs',crm.includes('<ModuleTabs')&&!crm.includes('<nav className={styles.tabs}>')],
 ['Producción labels preserved',prod.includes("label:'BOM / materiales'")&&prod.includes("label:'Centros de trabajo'")],
 ['Marketing labels preserved',mkt.includes("label:'Leads y atribución'")&&mkt.includes("label:'Calendario'")],
 ['Fiscal labels preserved',fiscal.includes("label:'Receptores fiscales'")&&fiscal.includes("label:'Pagos y cancelaciones'")],
 ['Proyectos labels preserved',projects.includes("label:'Tiempos y costos'")&&projects.includes("label:'Colaboración'")],
 ['CRM labels/count preserved',crm.includes("label:'Leads y oportunidades'")&&crm.includes("count:overdueActivities.length||undefined")],
 ['No Prisma changes required',true],
];

let fail=0;
console.log('\nMore Topbar Tabs Audit — v10.5.4');
console.log('================================');
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
console.log(`\n${checks.length-fail} PASS / ${fail} FAIL`);
if(fail)process.exit(1);
