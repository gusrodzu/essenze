import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';
import {
  businessPartyDashboard,
  findBusinessPartyDuplicates,
  getBusinessPartyDetail,
  mergeBusinessParties,
  syncBusinessParties
} from '../services/businessParties.js';

const router=Router();
router.use(requireAuth);

const rolesEnum=z.enum(['CUSTOMER','SUPPLIER','LEAD','CONTACT','PARTNER','OTHER']);

const partySchema=z.object({
  type:z.enum(['ORGANIZATION','PERSON']).default('ORGANIZATION'),
  displayName:z.string().trim().min(2).max(180),
  legalName:z.string().trim().max(180).optional().nullable(),
  commercialName:z.string().trim().max(180).optional().nullable(),
  taxId:z.string().trim().max(40).optional().nullable(),
  email:z.string().trim().email().optional().or(z.literal('')).nullable(),
  phone:z.string().trim().max(50).optional().nullable(),
  website:z.string().trim().max(250).optional().nullable(),
  notes:z.string().trim().max(2000).optional().nullable(),
  tags:z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  active:z.boolean().default(true),
  roles:z.array(rolesEnum).min(1).default(['OTHER'])
});

const contactSchema=z.object({
  name:z.string().trim().min(2).max(180),
  jobTitle:z.string().trim().max(120).optional().nullable(),
  department:z.string().trim().max(120).optional().nullable(),
  email:z.string().trim().email().optional().or(z.literal('')).nullable(),
  phone:z.string().trim().max(50).optional().nullable(),
  mobile:z.string().trim().max(50).optional().nullable(),
  primary:z.boolean().default(false),
  active:z.boolean().default(true)
});

const addressSchema=z.object({
  type:z.enum(['FISCAL','BILLING','SHIPPING','OFFICE','OTHER']).default('OTHER'),
  label:z.string().trim().min(1).max(80).default('Principal'),
  street:z.string().trim().max(250).optional().nullable(),
  exterior:z.string().trim().max(30).optional().nullable(),
  interior:z.string().trim().max(30).optional().nullable(),
  neighborhood:z.string().trim().max(120).optional().nullable(),
  city:z.string().trim().max(120).optional().nullable(),
  state:z.string().trim().max(120).optional().nullable(),
  postalCode:z.string().trim().max(20).optional().nullable(),
  country:z.string().trim().min(2).max(2).default('MX'),
  primary:z.boolean().default(false),
  active:z.boolean().default(true)
});

async function ownedParty(companyId,id){
  return prisma.businessParty.findFirst({where:{id,companyId}});
}

router.get('/dashboard',requirePermission('business_parties.read'),async(req,res,next)=>{
  try{
    res.json(await businessPartyDashboard(req.auth.companyId));
  }catch(error){next(error)}
});

router.get('/duplicates',requirePermission('business_parties.read'),async(req,res,next)=>{
  try{
    res.json(await findBusinessPartyDuplicates(req.auth.companyId));
  }catch(error){next(error)}
});

router.post('/sync',requirePermission('business_parties.sync'),async(req,res,next)=>{
  try{
    const result=await syncBusinessParties(req.auth.companyId);

    await prisma.auditLog.create({
      data:{
        userId:req.auth.sub,
        action:'SYNC',
        entity:'BusinessParty',
        description:`Sincronización de terceros: ${result.processed} entidades procesadas`,
        ipAddress:req.ip
      }
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'business_parties.synced',
      entityType:'BusinessParty',
      payload:result
    });

    res.json({ok:true,...result});
  }catch(error){next(error)}
});

router.post('/merge',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      sourcePartyId:z.string().cuid(),
      targetPartyId:z.string().cuid(),
      reason:z.string().trim().max(500).optional().nullable()
    }).safeParse(req.body);

    if(!parsed.success){
      return res.status(400).json({ok:false,message:'Selección de fusión inválida.'});
    }

    const result=await mergeBusinessParties({
      companyId:req.auth.companyId,
      userId:req.auth.sub,
      ...parsed.data
    });

    await prisma.auditLog.create({
      data:{
        userId:req.auth.sub,
        action:'MERGE',
        entity:'BusinessParty',
        entityId:parsed.data.targetPartyId,
        description:`Tercero ${parsed.data.sourcePartyId} fusionado en ${parsed.data.targetPartyId}`,
        ipAddress:req.ip,
        metadata:{
          sourcePartyId:parsed.data.sourcePartyId,
          targetPartyId:parsed.data.targetPartyId,
          reason:parsed.data.reason||null
        }
      }
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'business_party.merged',
      entityType:'BusinessParty',
      entityId:parsed.data.targetPartyId,
      payload:{
        sourcePartyId:parsed.data.sourcePartyId,
        targetPartyId:parsed.data.targetPartyId
      }
    });

    res.json({ok:true,...result});
  }catch(error){
    if(error.status)return res.status(error.status).json({ok:false,message:error.message});
    next(error);
  }
});

router.post('/',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const parsed=partySchema.safeParse(req.body);
    if(!parsed.success){
      return res.status(400).json({
        ok:false,
        message:parsed.error.issues[0]?.message||'Datos inválidos'
      });
    }

    const {roles,...data}=parsed.data;
    const party=await prisma.$transaction(async tx=>{
      const created=await tx.businessParty.create({
        data:{
          companyId:req.auth.companyId,
          ...data,
          email:data.email||null
        }
      });

      for(const role of roles){
        await tx.businessPartyRole.create({
          data:{partyId:created.id,role}
        });
      }

      return tx.businessParty.findUnique({
        where:{id:created.id},
        include:{roles:true}
      });
    });

    await prisma.auditLog.create({
      data:{
        userId:req.auth.sub,
        action:'CREATE',
        entity:'BusinessParty',
        entityId:party.id,
        description:`Tercero ${party.displayName} creado`,
        ipAddress:req.ip
      }
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'business_party.created',
      entityType:'BusinessParty',
      entityId:party.id,
      payload:{party}
    });

    res.status(201).json({ok:true,party});
  }catch(error){next(error)}
});

router.get('/:id',requirePermission('business_parties.read'),async(req,res,next)=>{
  try{
    const party=await getBusinessPartyDetail(req.auth.companyId,req.params.id);
    if(!party)return res.status(404).json({ok:false,message:'Tercero no encontrado'});
    res.json({ok:true,party});
  }catch(error){next(error)}
});

router.put('/:id',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const parsed=partySchema.safeParse(req.body);
    if(!parsed.success){
      return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Datos inválidos'});
    }

    const exists=await ownedParty(req.auth.companyId,req.params.id);
    if(!exists)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const {roles,...data}=parsed.data;

    const party=await prisma.$transaction(async tx=>{
      await tx.businessPartyRole.updateMany({
        where:{partyId:exists.id},
        data:{active:false}
      });

      for(const role of roles){
        await tx.businessPartyRole.upsert({
          where:{partyId_role:{partyId:exists.id,role}},
          create:{partyId:exists.id,role,active:true},
          update:{active:true}
        });
      }

      return tx.businessParty.update({
        where:{id:exists.id},
        data:{...data,email:data.email||null},
        include:{roles:true}
      });
    });

    await prisma.auditLog.create({
      data:{
        userId:req.auth.sub,
        action:'UPDATE',
        entity:'BusinessParty',
        entityId:party.id,
        description:`Tercero ${party.displayName} actualizado`,
        ipAddress:req.ip
      }
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'business_party.updated',
      entityType:'BusinessParty',
      entityId:party.id,
      payload:{party}
    });

    res.json({ok:true,party});
  }catch(error){next(error)}
});

router.patch('/:id/status',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({active:z.boolean()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:'Estado inválido'});

    const exists=await ownedParty(req.auth.companyId,req.params.id);
    if(!exists)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const party=await prisma.businessParty.update({
      where:{id:exists.id},
      data:{active:parsed.data.active},
      include:{roles:true}
    });

    res.json({ok:true,party});
  }catch(error){next(error)}
});

router.post('/:id/contacts',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const party=await ownedParty(req.auth.companyId,req.params.id);
    if(!party)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const parsed=contactSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Contacto inválido'});

    const contact=await prisma.$transaction(async tx=>{
      if(parsed.data.primary){
        await tx.businessPartyContact.updateMany({
          where:{companyId:req.auth.companyId,partyId:party.id},
          data:{primary:false}
        });
      }

      return tx.businessPartyContact.create({
        data:{
          companyId:req.auth.companyId,
          partyId:party.id,
          ...parsed.data,
          email:parsed.data.email||null
        }
      });
    });

    res.status(201).json({ok:true,contact});
  }catch(error){next(error)}
});

router.put('/:id/contacts/:contactId',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const party=await ownedParty(req.auth.companyId,req.params.id);
    if(!party)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const existing=await prisma.businessPartyContact.findFirst({
      where:{
        id:req.params.contactId,
        companyId:req.auth.companyId,
        partyId:party.id
      }
    });
    if(!existing)return res.status(404).json({ok:false,message:'Contacto no encontrado'});

    const parsed=contactSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Contacto inválido'});

    const contact=await prisma.$transaction(async tx=>{
      if(parsed.data.primary){
        await tx.businessPartyContact.updateMany({
          where:{
            companyId:req.auth.companyId,
            partyId:party.id,
            id:{not:existing.id}
          },
          data:{primary:false}
        });
      }

      return tx.businessPartyContact.update({
        where:{id:existing.id},
        data:{...parsed.data,email:parsed.data.email||null}
      });
    });

    res.json({ok:true,contact});
  }catch(error){next(error)}
});

router.post('/:id/addresses',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const party=await ownedParty(req.auth.companyId,req.params.id);
    if(!party)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const parsed=addressSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Dirección inválida'});

    const address=await prisma.$transaction(async tx=>{
      if(parsed.data.primary){
        await tx.businessPartyAddress.updateMany({
          where:{companyId:req.auth.companyId,partyId:party.id},
          data:{primary:false}
        });
      }

      return tx.businessPartyAddress.create({
        data:{
          companyId:req.auth.companyId,
          partyId:party.id,
          ...parsed.data
        }
      });
    });

    res.status(201).json({ok:true,address});
  }catch(error){next(error)}
});

router.put('/:id/addresses/:addressId',requirePermission('business_parties.manage'),async(req,res,next)=>{
  try{
    const party=await ownedParty(req.auth.companyId,req.params.id);
    if(!party)return res.status(404).json({ok:false,message:'Tercero no encontrado'});

    const existing=await prisma.businessPartyAddress.findFirst({
      where:{
        id:req.params.addressId,
        companyId:req.auth.companyId,
        partyId:party.id
      }
    });
    if(!existing)return res.status(404).json({ok:false,message:'Dirección no encontrada'});

    const parsed=addressSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message||'Dirección inválida'});

    const address=await prisma.$transaction(async tx=>{
      if(parsed.data.primary){
        await tx.businessPartyAddress.updateMany({
          where:{
            companyId:req.auth.companyId,
            partyId:party.id,
            id:{not:existing.id}
          },
          data:{primary:false}
        });
      }

      return tx.businessPartyAddress.update({
        where:{id:existing.id},
        data:parsed.data
      });
    });

    res.json({ok:true,address});
  }catch(error){next(error)}
});

export default router;
