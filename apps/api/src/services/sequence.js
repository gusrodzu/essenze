import {prisma} from '../lib/prisma.js';

function modelClient(db, model) {
  const client=db?.[model];
  if(!client||typeof client.count!=='function'){
    throw new Error(`Modelo Prisma no soportado para secuencia: ${model}`);
  }
  return client;
}

export async function nextSequence({
  companyId,
  scope,
  period=String(new Date().getFullYear()),
  model,
  where={},
  db=prisma
}) {
  const existing=await db.sequenceCounter.findUnique({
    where:{companyId_scope_period:{companyId,scope,period}}
  });

  if(existing){
    const updated=await db.sequenceCounter.update({
      where:{id:existing.id},
      data:{value:{increment:1}},
      select:{value:true}
    });
    return updated.value;
  }

  const baseCount=model
    ?await modelClient(db,model).count({where})
    :0;

  try{
    const created=await db.sequenceCounter.create({
      data:{companyId,scope,period,value:baseCount+1},
      select:{value:true}
    });
    return created.value;
  }catch(error){
    if(error?.code!=='P2002')throw error;
    const updated=await db.sequenceCounter.update({
      where:{companyId_scope_period:{companyId,scope,period}},
      data:{value:{increment:1}},
      select:{value:true}
    });
    return updated.value;
  }
}

export async function nextFolio({
  companyId,
  scope,
  prefix,
  digits=4,
  model,
  where,
  period=String(new Date().getFullYear()),
  db=prisma,
  separator='-'
}) {
  const value=await nextSequence({companyId,scope,period,model,where,db});
  return `${prefix}${separator}${period}${separator}${String(value).padStart(digits,'0')}`;
}
