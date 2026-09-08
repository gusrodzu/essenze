const state=new Map();

function ensure(name){
  if(!state.has(name)){
    state.set(name,{
      name,running:false,enabled:true,intervalMs:null,
      lastStartedAt:null,lastCompletedAt:null,lastSuccessAt:null,
      lastErrorAt:null,lastError:null,lastDurationMs:null,
      runs:0,successes:0,failures:0,processed:0
    });
  }
  return state.get(name);
}
export function configureWorker(name,{enabled=true,intervalMs=null}={}){
  const row=ensure(name); row.enabled=enabled; row.intervalMs=intervalMs; return row;
}
export function workerStarted(name){
  const row=ensure(name); row.running=true; row.lastStartedAt=new Date().toISOString(); row._startedAt=Date.now(); row.runs+=1;
}
export function workerSucceeded(name,{processed=0}={}){
  const row=ensure(name); row.running=false; row.successes+=1; row.processed+=Number(processed||0);
  row.lastCompletedAt=new Date().toISOString(); row.lastSuccessAt=row.lastCompletedAt;
  row.lastDurationMs=row._startedAt?Date.now()-row._startedAt:null; row.lastError=null; delete row._startedAt;
}
export function workerFailed(name,error){
  const row=ensure(name); row.running=false; row.failures+=1; row.lastCompletedAt=new Date().toISOString();
  row.lastErrorAt=row.lastCompletedAt; row.lastDurationMs=row._startedAt?Date.now()-row._startedAt:null;
  row.lastError=String(error?.message||error||'Worker error').slice(0,1000); delete row._startedAt;
}
export function getWorkerHealth(){
  return [...state.values()].map(({_startedAt,...row})=>({...row}));
}
