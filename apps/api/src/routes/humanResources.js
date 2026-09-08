import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const nullableText = z.string().trim().optional().nullable();
const departmentSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  description: nullableText,
  active: z.boolean().optional().default(true),
});
const positionSchema = z.object({
  departmentId: z.string().cuid().optional().nullable(),
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  description: nullableText,
  active: z.boolean().optional().default(true),
});
const employeeSchema = z.object({
  branchId: z.string().cuid().optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
  positionId: z.string().cuid().optional().nullable(),
  employeeNumber: z.string().trim().min(2).max(30),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')).nullable(),
  phone: nullableText,
  hireDate: z.coerce.date(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  salary: z.coerce.number().min(0).default(0),
  status: z.enum(['ACTIVE','INACTIVE','LEAVE','TERMINATED']).default('ACTIVE'),
  notes: nullableText,
});

async function audit(req, action, entity, entityId, description) {
  await prisma.auditLog.create({data:{userId:req.auth.sub,action,entity,entityId,description,ipAddress:req.ip}});
}

router.get('/', requirePermission('employees.read'), async (req,res,next)=>{
  try {
    const [employees,departments,positions,branches] = await Promise.all([
      prisma.employee.findMany({where:{companyId:req.auth.companyId},include:{department:true,position:true,branch:true},orderBy:[{status:'asc'},{lastName:'asc'}]}),
      prisma.department.findMany({where:{companyId:req.auth.companyId},orderBy:[{active:'desc'},{name:'asc'}]}),
      prisma.position.findMany({where:{companyId:req.auth.companyId},include:{department:true},orderBy:[{active:'desc'},{name:'asc'}]}),
      prisma.branch.findMany({where:{companyId:req.auth.companyId,active:true},orderBy:{name:'asc'}}),
    ]);
    res.json({ok:true,employees,departments,positions,branches});
  } catch(e){next(e)}
});

router.post('/employees', requirePermission('employees.manage'), async (req,res,next)=>{
  try {
    const parsed=employeeSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const data=parsed.data;
    const employee=await prisma.employee.create({data:{...data,companyId:req.auth.companyId,employeeNumber:data.employeeNumber.toUpperCase(),email:data.email||null}});
    await audit(req,'CREATE','Employee',employee.id,`Empleado ${employee.employeeNumber} creado`);
    res.status(201).json({ok:true,employee});
  } catch(e){if(e.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe ese número de empleado'});next(e)}
});

router.put('/employees/:id', requirePermission('employees.manage'), async (req,res,next)=>{
  try {
    const parsed=employeeSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:parsed.error.issues[0]?.message??'Datos inválidos'});
    const exists=await prisma.employee.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!exists) return res.status(404).json({ok:false,message:'Empleado no encontrado'});
    const data=parsed.data;
    const employee=await prisma.employee.update({where:{id:exists.id},data:{...data,employeeNumber:data.employeeNumber.toUpperCase(),email:data.email||null}});
    await audit(req,'UPDATE','Employee',employee.id,`Empleado ${employee.employeeNumber} actualizado`);
    res.json({ok:true,employee});
  } catch(e){if(e.code==='P2002') return res.status(409).json({ok:false,message:'Ya existe ese número de empleado'});next(e)}
});

router.patch('/employees/:id/status', requirePermission('employees.manage'), async (req,res,next)=>{
  try {
    const parsed=z.object({status:z.enum(['ACTIVE','INACTIVE','LEAVE','TERMINATED'])}).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,message:'Estado inválido'});
    const exists=await prisma.employee.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});
    if(!exists) return res.status(404).json({ok:false,message:'Empleado no encontrado'});
    const employee=await prisma.employee.update({where:{id:exists.id},data:{status:parsed.data.status}});
    await audit(req,'STATUS','Employee',employee.id,`Estado de ${employee.employeeNumber}: ${employee.status}`);
    res.json({ok:true,employee});
  } catch(e){next(e)}
});

router.post('/departments', requirePermission('employees.manage'), async (req,res,next)=>{
  try {const p=departmentSchema.safeParse(req.body);if(!p.success)return res.status(400).json({ok:false,message:p.error.issues[0]?.message??'Datos inválidos'});const department=await prisma.department.create({data:{...p.data,code:p.data.code.toUpperCase(),companyId:req.auth.companyId}});await audit(req,'CREATE','Department',department.id,`Departamento ${department.code} creado`);res.status(201).json({ok:true,department})} catch(e){if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese código de departamento'});next(e)}
});
router.put('/departments/:id', requirePermission('employees.manage'), async (req,res,next)=>{
  try {const p=departmentSchema.safeParse(req.body);if(!p.success)return res.status(400).json({ok:false,message:p.error.issues[0]?.message??'Datos inválidos'});const exists=await prisma.department.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});if(!exists)return res.status(404).json({ok:false,message:'Departamento no encontrado'});const department=await prisma.department.update({where:{id:exists.id},data:{...p.data,code:p.data.code.toUpperCase()}});res.json({ok:true,department})} catch(e){if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese código de departamento'});next(e)}
});
router.post('/positions', requirePermission('employees.manage'), async (req,res,next)=>{
  try {const p=positionSchema.safeParse(req.body);if(!p.success)return res.status(400).json({ok:false,message:p.error.issues[0]?.message??'Datos inválidos'});const position=await prisma.position.create({data:{...p.data,code:p.data.code.toUpperCase(),companyId:req.auth.companyId}});await audit(req,'CREATE','Position',position.id,`Puesto ${position.code} creado`);res.status(201).json({ok:true,position})} catch(e){if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese código de puesto'});next(e)}
});
router.put('/positions/:id', requirePermission('employees.manage'), async (req,res,next)=>{
  try {const p=positionSchema.safeParse(req.body);if(!p.success)return res.status(400).json({ok:false,message:p.error.issues[0]?.message??'Datos inválidos'});const exists=await prisma.position.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});if(!exists)return res.status(404).json({ok:false,message:'Puesto no encontrado'});const position=await prisma.position.update({where:{id:exists.id},data:{...p.data,code:p.data.code.toUpperCase()}});res.json({ok:true,position})} catch(e){if(e.code==='P2002')return res.status(409).json({ok:false,message:'Ya existe ese código de puesto'});next(e)}
});

export default router;
