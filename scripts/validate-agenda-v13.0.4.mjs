import fs from 'node:fs';

const checks=[];
function assert(label,condition){checks.push([label,Boolean(condition)]);if(!condition)process.exitCode=1;}
function text(path){return fs.readFileSync(path,'utf8');}
function balanced(path){const s=text(path);return (s.match(/{/g)||[]).length===(s.match(/}/g)||[]).length;}

const schema=text('apps/api/prisma/schema.prisma');
const api=text('apps/api/src/routes/agenda.js');
const worker=text('apps/api/src/services/agendaReminderWorker.js');
const index=text('apps/api/src/index.js');
const app=text('apps/web/src/App.jsx');
const agenda=text('apps/web/src/pages/Agenda.jsx');
const rail=text('apps/web/src/framework/BuzzBeeRightRail.jsx');
const topbar=text('apps/web/src/layout/Topbar.jsx');

assert('Prisma AgendaEvent model',schema.includes('model AgendaEvent {'));
assert('Company Agenda relation',schema.includes('agendaEvents AgendaEvent[]'));
assert('Agenda CRUD create',api.includes("router.post('/events'"));
assert('Agenda CRUD update',api.includes("router.put('/events/:id'"));
assert('Agenda CRUD status',api.includes("router.patch('/events/:id/status'"));
assert('Agenda CRUD delete',api.includes("router.delete('/events/:id'"));
assert('Agenda employee metadata',api.includes("router.get('/meta'"));
assert('Agenda reminder worker',worker.includes('runAgendaReminders'));
assert('Reminder worker starts',index.includes('startAgendaReminderWorker();'));
assert('Reminder worker stops',index.includes('stopAgendaReminderWorker();'));
assert('Agenda route registered',app.includes('<Route path="agenda" element={<Agenda />} />'));
assert('Month/week views',agenda.includes("setView('month')")&&agenda.includes("setView('week')"));
assert('Manual event form',agenda.includes('Nuevo evento')&&agenda.includes('Recordatorio'));
assert('Right rail Agenda entry',rail.includes('Sincronizada con el sistema')&&rail.includes('/agenda?new=1'));
assert('Topbar uses real notifications',topbar.includes("apiRequest('/activity/notifications')"));
assert('Hardcoded demo notifications removed',!topbar.includes('Solicitud SOL-00024 requiere aprobación'));
assert('Agenda CSS balanced',balanced('apps/web/src/pages/Agenda.module.css'));
assert('Rail CSS balanced',balanced('apps/web/src/framework/BuzzBeeRightRail.module.css'));

for(const [label,ok] of checks)console.log(`${ok?'✓':'✗'} ${label}`);
if(process.exitCode)console.error('\nAgenda v13.0.4 validation failed.');
else console.log(`\nAgenda v13.0.4 OK · ${checks.length} checks passed.`);
