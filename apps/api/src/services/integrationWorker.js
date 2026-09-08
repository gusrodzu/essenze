import {processDueWebhookDeliveries} from './integrationEvents.js';
import {configureWorker,workerFailed,workerStarted,workerSucceeded} from './workerHealth.js';

let timer=null;
let startupTimer=null;
let running=false;
let stopping=false;

export function startIntegrationWorker(){
  if(timer)return;
  const intervalMs=Math.max(Number(process.env.INTEGRATION_WORKER_INTERVAL_MS)||30000,5000);
  configureWorker('integration',{enabled:true,intervalMs});

  async function tick(){
    if(running||stopping)return;
    running=true; workerStarted('integration');
    try{
      const result=await processDueWebhookDeliveries({limit:25});
      workerSucceeded('integration',{processed:result.processed});
      if(result.processed>0)console.log(`[IntegrationWorker] ${result.processed} entregas procesadas, ${result.succeeded} exitosas, ${result.failed} pendientes/fallidas.`);
    }catch(error){
      workerFailed('integration',error);
      console.error('[IntegrationWorker]',error);
    }finally{running=false;}
  }

  timer=setInterval(tick,intervalMs); timer.unref?.();
  startupTimer=setTimeout(tick,1500); startupTimer.unref?.();
  console.log(`[IntegrationWorker] activo cada ${intervalMs} ms`);
}

export function stopIntegrationWorker(){
  stopping=true;
  if(timer)clearInterval(timer);
  if(startupTimer)clearTimeout(startupTimer);
  timer=null; startupTimer=null;
  configureWorker('integration',{enabled:false});
}
