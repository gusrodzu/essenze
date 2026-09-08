import {prisma} from '../lib/prisma.js';
import {configureWorker,workerFailed,workerStarted,workerSucceeded} from './workerHealth.js';
let timer=null,startupTimer=null,running=false,stopping=false;
export async function runHousekeeping(){
  if(running||stopping)return {skipped:true};
  running=true; workerStarted('housekeeping');
  try{
    const now=new Date();
    const expired=await prisma.idempotencyRecord.deleteMany({where:{expiresAt:{lt:now}}});
    workerSucceeded('housekeeping',{processed:expired.count});
    return {expiredIdempotencyRecords:expired.count};
  }catch(error){workerFailed('housekeeping',error);throw error;}
  finally{running=false;}
}
export function startHousekeepingWorker(){
  if(timer)return;
  const intervalMs=Math.max(Number(process.env.HOUSEKEEPING_INTERVAL_MS)||6*60*60*1000,60*60*1000);
  configureWorker('housekeeping',{enabled:true,intervalMs});
  timer=setInterval(()=>runHousekeeping().catch(error=>console.error('[HousekeepingWorker]',error)),intervalMs); timer.unref?.();
  startupTimer=setTimeout(()=>runHousekeeping().catch(error=>console.error('[HousekeepingWorker]',error)),5*60_000); startupTimer.unref?.();
}
export function stopHousekeepingWorker(){
  stopping=true;
  if(timer)clearInterval(timer); if(startupTimer)clearTimeout(startupTimer);
  timer=null; startupTimer=null; configureWorker('housekeeping',{enabled:false});
}
