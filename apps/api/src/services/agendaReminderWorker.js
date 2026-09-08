import {prisma} from '../lib/prisma.js';
import {configureWorker,workerFailed,workerStarted,workerSucceeded} from './workerHealth.js';

let timer=null;
let startupTimer=null;
let running=false;
let stopping=false;

function minutesBeforeLabel(minutes){
  if(minutes===0)return 'ahora';
  if(minutes<60)return `${minutes} min`;
  if(minutes%1440===0)return `${minutes/1440} día${minutes===1440?'':'s'}`;
  if(minutes%60===0)return `${minutes/60} h`;
  return `${minutes} min`;
}

export async function runAgendaReminders(){
  if(running||stopping)return {skipped:true};
  running=true;
  workerStarted('agenda-reminders');
  try{
    const now=new Date();
    const horizon=new Date(now.getTime()+31*24*60*60*1000);
    const recentPast=new Date(now.getTime()-6*60*60*1000);
    const events=await prisma.agendaEvent.findMany({
      where:{
        status:'ACTIVE',
        reminderMinutes:{not:null},
        reminderSentAt:null,
        startAt:{gte:recentPast,lte:horizon},
      },
      select:{
        id:true,companyId:true,title:true,startAt:true,priority:true,reminderMinutes:true,createdById:true,
        assignee:{select:{email:true,firstName:true,lastName:true}},
        company:{select:{timezone:true}},
      },
      take:500,
    });

    let processed=0;
    for(const event of events){
      const reminderAt=new Date(event.startAt.getTime()-(event.reminderMinutes||0)*60_000);
      if(reminderAt>now)continue;

      const recipients=new Set([event.createdById]);
      if(event.assignee?.email){
        const assignedUser=await prisma.user.findFirst({
          where:{companyId:event.companyId,email:event.assignee.email,active:true},
          select:{id:true},
        });
        if(assignedUser?.id)recipients.add(assignedUser.id);
      }

      const when=event.startAt.toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:event.company?.timezone||'America/Monterrey'});
      const lead=minutesBeforeLabel(event.reminderMinutes||0);
      await prisma.$transaction([
        prisma.notification.createMany({
          data:[...recipients].map(userId=>({
            companyId:event.companyId,
            userId,
            type:['HIGH','URGENT'].includes(event.priority)?'WARNING':'INFO',
            title:'Recordatorio de agenda',
            message:`${event.title} · ${when}${lead==='ahora'?'':` · recordatorio ${lead} antes`}`,
            link:'/agenda',
          })),
        }),
        prisma.agendaEvent.update({where:{id:event.id},data:{reminderSentAt:now}}),
      ]);
      processed+=1;
    }

    workerSucceeded('agenda-reminders',{processed});
    return {processed};
  }catch(error){
    workerFailed('agenda-reminders',error);
    throw error;
  }finally{
    running=false;
  }
}

export function startAgendaReminderWorker(){
  if(timer)return;
  stopping=false;
  const intervalMs=Math.max(Number(process.env.AGENDA_REMINDER_INTERVAL_MS)||2*60_000,60_000);
  configureWorker('agenda-reminders',{enabled:true,intervalMs});
  timer=setInterval(()=>runAgendaReminders().catch(error=>console.error('[AgendaReminderWorker]',error)),intervalMs);
  timer.unref?.();
  startupTimer=setTimeout(()=>runAgendaReminders().catch(error=>console.error('[AgendaReminderWorker]',error)),15_000);
  startupTimer.unref?.();
}

export function stopAgendaReminderWorker(){
  stopping=true;
  if(timer)clearInterval(timer);
  if(startupTimer)clearTimeout(startupTimer);
  timer=null;
  startupTimer=null;
  configureWorker('agenda-reminders',{enabled:false});
}
