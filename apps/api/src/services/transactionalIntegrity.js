const RETRYABLE_CODES=new Set(['P2034','40001','40P01']);

function isRetryable(error){
  if(RETRYABLE_CODES.has(error?.code))return true;
  const message=String(error?.message||'');
  return message.includes('Transaction failed due to a write conflict')||
    message.includes('deadlock detected')||
    message.includes('could not serialize access');
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export class ConcurrencyConflictError extends Error{
  constructor(message='La operación cambió mientras se procesaba. Intenta nuevamente.'){
    super(message);
    this.name='ConcurrencyConflictError';
    this.code='CONCURRENCY_CONFLICT';
    this.statusCode=409;
    this.expose=true;
  }
}

export async function runSerializable(db,work,{retries=3,maxWait=5000,timeout=20000}={}){
  let attempt=0;
  while(true){
    try{
      return await db.$transaction(
        async tx=>work(tx),
        {isolationLevel:'Serializable',maxWait,timeout}
      );
    }catch(error){
      if(!isRetryable(error))throw error;
      attempt+=1;
      if(attempt>retries)throw new ConcurrencyConflictError();
      const base=40*(2**(attempt-1));
      await sleep(base+Math.floor(Math.random()*base));
    }
  }
}
