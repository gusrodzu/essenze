import {prisma} from '../lib/prisma.js';

function normalize(value){
  return String(value||'').trim().toLowerCase();
}

function normalizeTaxId(value){
  return normalize(value).replace(/[\s-]/g,'');
}

function normalizePhone(value){
  return String(value||'').replace(/\D/g,'').slice(-10);
}

function partyKey(entity){
  if(entity.taxId)return `tax:${normalizeTaxId(entity.taxId)}`;
  if(entity.email)return `email:${normalize(entity.email)}`;
  return `name:${normalize(entity.legalName||entity.commercialName)}`;
}

async function ensureRole(tx,partyId,role){
  return tx.businessPartyRole.upsert({
    where:{partyId_role:{partyId,role}},
    create:{partyId,role,active:true},
    update:{active:true}
  });
}

async function ensureLegacyContact(tx,{companyId,party,source}){
  if(!source?.contactName&&!source?.email&&!source?.phone)return;

  const existing=await tx.businessPartyContact.findFirst({
    where:{
      companyId,
      partyId:party.id,
      OR:[
        ...(source.email?[{email:source.email}]:[]),
        ...(source.contactName?[{name:source.contactName}]:[])
      ]
    }
  });

  const data={
    name:source.contactName||source.commercialName||source.legalName||party.displayName,
    email:source.email||null,
    phone:source.phone||null,
    primary:true,
    active:true
  };

  if(existing){
    await tx.businessPartyContact.update({where:{id:existing.id},data});
  }else{
    await tx.businessPartyContact.create({
      data:{companyId,partyId:party.id,...data}
    });
  }
}

async function ensureLegacyAddress(tx,{companyId,party,source}){
  if(!source?.address)return;

  const existing=await tx.businessPartyAddress.findFirst({
    where:{companyId,partyId:party.id,label:'Principal'}
  });

  const data={
    type:'OTHER',
    label:'Principal',
    street:source.address,
    country:'MX',
    primary:true,
    active:true
  };

  if(existing){
    await tx.businessPartyAddress.update({where:{id:existing.id},data});
  }else{
    await tx.businessPartyAddress.create({
      data:{companyId,partyId:party.id,...data}
    });
  }
}

export function businessPartyProfileScore(party){
  let score=0;
  const details=[];

  const add=(points,label,condition)=>{
    if(condition){
      score+=points;
      details.push({label,points,complete:true});
    }else{
      details.push({label,points,complete:false});
    }
  };

  add(10,'Nombre',Boolean(party.displayName));
  add(15,'RFC / Tax ID',Boolean(party.taxId));
  add(5,'Correo',Boolean(party.email));
  add(5,'Teléfono',Boolean(party.phone));
  add(5,'Sitio web',Boolean(party.website));
  add(15,'Rol empresarial',Boolean(party.roles?.some(r=>r.active!==false)));
  add(15,'Contacto',Boolean(party.contacts?.some(c=>c.active!==false)));
  add(15,'Dirección',Boolean(party.addresses?.some(a=>a.active!==false)));
  add(5,'Tags',Boolean(party.tags?.length));
  add(10,'Vínculo operativo',Boolean(party.customerId||party.supplierId));

  return {
    score:Math.min(score,100),
    level:score>=85?'EXCELLENT':score>=65?'GOOD':score>=40?'INCOMPLETE':'CRITICAL',
    details
  };
}

export async function syncBusinessParties(companyId){
  const [customers,suppliers]=await Promise.all([
    prisma.customer.findMany({where:{companyId}}),
    prisma.supplier.findMany({where:{companyId}})
  ]);

  const groups=new Map();

  for(const customer of customers){
    const key=partyKey(customer);
    const current=groups.get(key)||{customers:[],suppliers:[]};
    current.customers.push(customer);
    groups.set(key,current);
  }

  for(const supplier of suppliers){
    const key=partyKey(supplier);
    const current=groups.get(key)||{customers:[],suppliers:[]};
    current.suppliers.push(supplier);
    groups.set(key,current);
  }

  let created=0;
  let updated=0;
  let merged=0;

  for(const group of groups.values()){
    const customer=group.customers[0]||null;
    const supplier=group.suppliers[0]||null;
    const source=customer||supplier;

    const existing=await prisma.businessParty.findFirst({
      where:{
        companyId,
        OR:[
          ...(customer?[{customerId:customer.id}]:[]),
          ...(supplier?[{supplierId:supplier.id}]:[]),
          ...(source.taxId?[{taxId:source.taxId}]:[]),
          ...(source.email?[{email:source.email}]:[])
        ]
      },
      include:{roles:true}
    });

    const payload={
      type:'ORGANIZATION',
      displayName:source.commercialName||source.legalName,
      legalName:source.legalName||null,
      commercialName:source.commercialName||null,
      taxId:source.taxId||null,
      email:source.email||null,
      phone:source.phone||null,
      active:(customer?.active??true)||(supplier?.active??true),
      customerId:customer?.id||existing?.customerId||null,
      supplierId:supplier?.id||existing?.supplierId||null
    };

    await prisma.$transaction(async tx=>{
      let party;
      if(existing){
        party=await tx.businessParty.update({
          where:{id:existing.id},
          data:payload
        });
        updated++;
      }else{
        party=await tx.businessParty.create({
          data:{companyId,...payload}
        });
        created++;
      }

      if(customer)await ensureRole(tx,party.id,'CUSTOMER');
      if(supplier)await ensureRole(tx,party.id,'SUPPLIER');

      await ensureLegacyContact(tx,{
        companyId,
        party,
        source:customer||supplier
      });
      await ensureLegacyAddress(tx,{
        companyId,
        party,
        source:customer||supplier
      });
    });

    if(customer&&supplier)merged++;
  }

  return {
    customers:customers.length,
    suppliers:suppliers.length,
    created,
    updated,
    merged,
    processed:groups.size
  };
}

export async function getBusinessPartyDetail(companyId,id){
  const party=await prisma.businessParty.findFirst({
    where:{id,companyId},
    include:{
      roles:{orderBy:{role:'asc'}},
      contacts:{orderBy:[{primary:'desc'},{active:'desc'},{name:'asc'}]},
      addresses:{orderBy:[{primary:'desc'},{active:'desc'},{label:'asc'}]},
      customer:{select:{
        id:true,code:true,legalName:true,commercialName:true,
        creditDays:true,creditLimit:true,active:true
      }},
      supplier:{select:{
        id:true,code:true,legalName:true,commercialName:true,
        paymentTerms:true,active:true
      }}
    }
  });

  if(!party)return null;

  const history=await prisma.businessPartyMergeHistory.findMany({
    where:{
      companyId,
      OR:[{targetPartyId:id},{sourcePartyId:id}]
    },
    orderBy:{createdAt:'desc'},
    take:30
  });

  return {
    ...party,
    profile:businessPartyProfileScore(party),
    mergeHistory:history
  };
}

function duplicateReason(a,b){
  const reasons=[];
  if(a.taxId&&b.taxId&&normalizeTaxId(a.taxId)===normalizeTaxId(b.taxId)){
    reasons.push({key:'TAX_ID',label:'Mismo RFC / Tax ID',weight:100});
  }
  if(a.email&&b.email&&normalize(a.email)===normalize(b.email)){
    reasons.push({key:'EMAIL',label:'Mismo correo',weight:85});
  }
  if(a.phone&&b.phone&&normalizePhone(a.phone)&&normalizePhone(a.phone)===normalizePhone(b.phone)){
    reasons.push({key:'PHONE',label:'Mismo teléfono',weight:60});
  }

  const names=[
    normalize(a.displayName),
    normalize(a.legalName),
    normalize(a.commercialName)
  ].filter(Boolean);

  const otherNames=[
    normalize(b.displayName),
    normalize(b.legalName),
    normalize(b.commercialName)
  ].filter(Boolean);

  if(names.some(name=>otherNames.includes(name))){
    reasons.push({key:'NAME',label:'Mismo nombre',weight:55});
  }

  return reasons;
}

export async function findBusinessPartyDuplicates(companyId){
  const parties=await prisma.businessParty.findMany({
    where:{companyId,active:true},
    include:{
      roles:{where:{active:true}},
      contacts:{where:{active:true},take:1},
      addresses:{where:{active:true},take:1}
    },
    orderBy:{displayName:'asc'},
    take:1500
  });

  const buckets=new Map();

  const add=(key,party)=>{
    if(!key)return;
    const list=buckets.get(key)||[];
    list.push(party);
    buckets.set(key,list);
  };

  for(const party of parties){
    if(party.taxId)add(`tax:${normalizeTaxId(party.taxId)}`,party);
    if(party.email)add(`email:${normalize(party.email)}`,party);
    if(party.phone&&normalizePhone(party.phone))add(`phone:${normalizePhone(party.phone)}`,party);
    if(party.displayName)add(`name:${normalize(party.displayName)}`,party);
    if(party.legalName)add(`name:${normalize(party.legalName)}`,party);
    if(party.commercialName)add(`name:${normalize(party.commercialName)}`,party);
  }

  const pairMap=new Map();

  for(const list of buckets.values()){
    if(list.length<2)continue;

    for(let i=0;i<list.length;i++){
      for(let j=i+1;j<list.length;j++){
        const a=list[i];
        const b=list[j];
        if(a.id===b.id)continue;
        const ids=[a.id,b.id].sort();
        const key=ids.join(':');
        if(pairMap.has(key))continue;

        const reasons=duplicateReason(a,b);
        if(!reasons.length)continue;

        pairMap.set(key,{
          id:key,
          confidence:Math.min(100,reasons.reduce((max,r)=>Math.max(max,r.weight),0)),
          reasons,
          left:{
            ...a,
            profile:businessPartyProfileScore(a)
          },
          right:{
            ...b,
            profile:businessPartyProfileScore(b)
          }
        });
      }
    }
  }

  const candidates=[...pairMap.values()].sort((a,b)=>
    b.confidence-a.confidence ||
    a.left.displayName.localeCompare(b.left.displayName,'es')
  );

  return {
    total:candidates.length,
    highConfidence:candidates.filter(x=>x.confidence>=85).length,
    candidates
  };
}

function fillMissing(target,source){
  const fields=[
    'legalName','commercialName','taxId','email','phone','website','notes'
  ];
  const data={};

  for(const field of fields){
    if(!target[field]&&source[field])data[field]=source[field];
  }

  data.tags=[...new Set([...(target.tags||[]),...(source.tags||[])])];
  return data;
}

export async function mergeBusinessParties({
  companyId,
  sourcePartyId,
  targetPartyId,
  userId,
  reason
}){
  if(sourcePartyId===targetPartyId){
    const error=new Error('El tercero origen y destino deben ser diferentes.');
    error.status=400;
    throw error;
  }

  const [source,target]=await Promise.all([
    prisma.businessParty.findFirst({
      where:{id:sourcePartyId,companyId},
      include:{
        roles:true,
        contacts:true,
        addresses:true
      }
    }),
    prisma.businessParty.findFirst({
      where:{id:targetPartyId,companyId},
      include:{
        roles:true,
        contacts:true,
        addresses:true
      }
    })
  ]);

  if(!source||!target){
    const error=new Error('No se encontró uno de los terceros seleccionados.');
    error.status=404;
    throw error;
  }

  if(!source.active){
    const error=new Error('El tercero origen ya está inactivo o fue fusionado.');
    error.status=409;
    throw error;
  }

  if(source.customerId&&target.customerId&&source.customerId!==target.customerId){
    const error=new Error(
      'Fusión bloqueada: ambos terceros están vinculados a clientes operativos distintos. '+
      'Resuelve primero el vínculo de Cliente para evitar pérdida de trazabilidad.'
    );
    error.status=409;
    throw error;
  }

  if(source.supplierId&&target.supplierId&&source.supplierId!==target.supplierId){
    const error=new Error(
      'Fusión bloqueada: ambos terceros están vinculados a proveedores operativos distintos. '+
      'Resuelve primero el vínculo de Proveedor para evitar pérdida de trazabilidad.'
    );
    error.status=409;
    throw error;
  }

  const snapshot={
    source:{
      id:source.id,
      displayName:source.displayName,
      customerId:source.customerId,
      supplierId:source.supplierId,
      tags:source.tags,
      roles:source.roles.map(r=>r.role)
    },
    target:{
      id:target.id,
      displayName:target.displayName,
      customerId:target.customerId,
      supplierId:target.supplierId,
      tags:target.tags,
      roles:target.roles.map(r=>r.role)
    }
  };

  return prisma.$transaction(async tx=>{
    for(const role of source.roles.filter(r=>r.active)){
      await ensureRole(tx,target.id,role.role);
    }

    // Liberar primero las FK únicas del origen.
    await tx.businessParty.update({
      where:{id:source.id},
      data:{
        customerId:null,
        supplierId:null,
        active:false,
        notes:source.notes
          ?`${source.notes}\n\nFusionado en ${target.displayName}.`
          :`Fusionado en ${target.displayName}.`
      }
    });

    const targetUpdate=fillMissing(target,source);
    targetUpdate.customerId=target.customerId||source.customerId||null;
    targetUpdate.supplierId=target.supplierId||source.supplierId||null;

    const merged=await tx.businessParty.update({
      where:{id:target.id},
      data:targetUpdate
    });

    await tx.businessPartyContact.updateMany({
      where:{companyId,partyId:source.id},
      data:{partyId:target.id}
    });

    await tx.businessPartyAddress.updateMany({
      where:{companyId,partyId:source.id},
      data:{partyId:target.id}
    });

    await tx.businessPartyRole.updateMany({
      where:{partyId:source.id},
      data:{active:false}
    });

    const history=await tx.businessPartyMergeHistory.create({
      data:{
        companyId,
        targetPartyId:target.id,
        sourcePartyId:source.id,
        mergedByUserId:userId||null,
        reason:reason||null,
        snapshot
      }
    });

    return {merged,history};
  });
}

export async function businessPartyDashboard(companyId){
  const [parties,roleGroups,customers,suppliers]=await Promise.all([
    prisma.businessParty.findMany({
      where:{companyId},
      include:{
        roles:{where:{active:true},orderBy:{role:'asc'}},
        contacts:{where:{active:true},orderBy:{primary:'desc'},take:3},
        addresses:{where:{active:true},orderBy:{primary:'desc'},take:2},
        customer:{select:{id:true,code:true,creditDays:true,creditLimit:true}},
        supplier:{select:{id:true,code:true,paymentTerms:true}}
      },
      orderBy:[{active:'desc'},{displayName:'asc'}],
      take:500
    }),
    prisma.businessPartyRole.groupBy({
      by:['role'],
      where:{party:{companyId},active:true},
      _count:{_all:true}
    }),
    prisma.customer.count({where:{companyId}}),
    prisma.supplier.count({where:{companyId}})
  ]);

  const enhanced=parties.map(p=>({
    ...p,
    profile:businessPartyProfileScore(p)
  }));

  const roles=Object.fromEntries(roleGroups.map(x=>[x.role,x._count._all]));
  const unified=parties.filter(x=>
    x.roles.some(r=>r.role==='CUSTOMER')&&
    x.roles.some(r=>r.role==='SUPPLIER')
  ).length;

  const linkedCustomers=parties.filter(x=>x.customerId).length;
  const linkedSuppliers=parties.filter(x=>x.supplierId).length;
  const avgProfile=enhanced.length
    ?Math.round(enhanced.reduce((sum,x)=>sum+x.profile.score,0)/enhanced.length)
    :100;

  return {
    summary:{
      parties:parties.length,
      active:parties.filter(x=>x.active).length,
      unified,
      averageProfileScore:avgProfile,
      coverage:{
        customers:customers?Math.round(linkedCustomers/customers*100):100,
        suppliers:suppliers?Math.round(linkedSuppliers/suppliers*100):100
      }
    },
    roles,
    parties:enhanced
  };
}
