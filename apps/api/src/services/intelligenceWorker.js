import {prisma} from '../lib/prisma.js';
import {scanIntelligence} from './intelligence.js';
import {configureWorker,workerFailed,workerStarted,workerSucceeded} from './workerHealth.js';

let timer=null;
let startupTimer=null;
let running=false;
let stopping=false;

async function runScan(){
  if(running||stopping)return;
  running=true; workerStarted('intelligence');
  let processed=0;
  try{
    const companies=await prisma.company.findMany({where:{active:true},select:{id:true,name:true}});
    for(const company of companies){
      try{
        const result=await scanIntelligence(company.id);
        processed+=1;
        console.log(`[IntelligenceWorker] ${company.name}: ${result.detected} activos, ${result.resolved} resueltos.`);
      }catch(error){console.error(`[IntelligenceWorker] ${company.name}`,error);}
    }
    workerSucceeded('intelligence',{processed});
  }catch(error){
    workerFailed('intelligence',error);
    console.error('[IntelligenceWorker]',error);
  }finally{running=false;}
}

export function startIntelligenceWorker(){
  if(timer)return;
  const intervalMs=Math.max(Number(process.env.INTELLIGENCE_SCAN_INTERVAL_MS)||6*60*60*1000,15*60*1000);
  const startupDelay=Math.max(Number(process.env.INTELLIGENCE_SCAN_STARTUP_DELAY_MS)||60_000,10_000);
  configureWorker('intelligence',{enabled:true,intervalMs});
  timer=setInterval(runScan,intervalMs); timer.unref?.();
  startupTimer=setTimeout(runScan,startupDelay); startupTimer.unref?.();
  console.log(`[IntelligenceWorker] activo cada ${Math.round(intervalMs/60000)} min.`);
}
export function stopIntelligenceWorker(){
  stopping=true;
  if(timer)clearInterval(timer);
  if(startupTimer)clearTimeout(startupTimer);
  timer=null; startupTimer=null;
  configureWorker('intelligence',{enabled:false});
}
