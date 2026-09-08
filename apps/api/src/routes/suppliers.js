import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';
import {syncBusinessParties} from '../services/businessParties.js';

const router = Router();
router.use(requireAuth);

const supplierSchema = z.object({
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  legalName: z.string().trim().min(2, 'La razón social es obligatoria'),
  commercialName: z.string().trim().optional().nullable(),
  taxId: z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Correo inválido').optional().or(z.literal('')).nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  paymentTerms: z.coerce.number().int().min(0).max(365).default(0),
  active: z.boolean().default(true),
});

router.get('/', requirePermission('suppliers.read'), async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {companyId: req.auth.companyId},
      orderBy: [{active: 'desc'}, {legalName: 'asc'}],
    });
    res.json({ok: true, suppliers});
  } catch (error) { next(error); }
});

router.post('/', requirePermission('suppliers.manage'), async (req, res, next) => {
  try {
    const parsed = supplierSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const supplier = await prisma.supplier.create({data:{...parsed.data,companyId:req.auth.companyId}});
    await prisma.auditLog.create({data:{userId:req.auth.sub,action:'CREATE',entity:'Supplier',entityId:supplier.id,description:`Proveedor ${supplier.legalName} creado`,ipAddress:req.ip}});
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'supplier.created',entityType:'Supplier',entityId:supplier.id,payload:{supplier}});await syncBusinessParties(req.auth.companyId);res.status(201).json({ok:true,supplier});
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ok:false,message:'Ya existe un proveedor con ese código'});
    next(error);
  }
});

router.put('/:id', requirePermission('suppliers.manage'), async (req,res,next)=>{
  try {
    const parsed=supplierSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message ?? 'Datos inválidos'});
    const existing=await prisma.supplier.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Proveedor no encontrado'});
    const supplier=await prisma.supplier.update({where:{id:existing.id},data:parsed.data});
    emitIntegrationEventAsync({companyId:req.auth.companyId,event:'supplier.updated',entityType:'Supplier',entityId:supplier.id,payload:{supplier}});
    await syncBusinessParties(req.auth.companyId);
    res.json({ok:true,supplier});
  } catch(error){ if(error.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe un proveedor con ese código'}); next(error); }
});

router.patch('/:id/status', requirePermission('suppliers.manage'), async(req,res,next)=>{
  try {
    const parsed=z.object({active:z.boolean()}).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:'Estado inválido'});
    const existing=await prisma.supplier.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Proveedor no encontrado'});
    const supplier=await prisma.supplier.update({where:{id:existing.id},data:parsed.data});
    await syncBusinessParties(req.auth.companyId);
    res.json({ok:true,supplier});
  } catch(error){next(error);}
});

router.delete('/:id', requirePermission('suppliers.manage'), async(req,res,next)=>{
  try{
    const existing=await prisma.supplier.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!existing) return res.status(404).json({ok:false,message:'Proveedor no encontrado'});
    await prisma.supplier.delete({where:{id:existing.id}});
    res.json({ok:true});
  }catch(error){next(error);}
});

export default router;
