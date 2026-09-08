import {Router} from 'express';
import {z} from 'zod';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {
  createLeaveRequest,hrDashboard,payrollPreview,
  registerAttendance,resolveLeaveRequest
} from '../services/hrClient.js';

const router=Router();
router.use(requireAuth);

router.get('/dashboard',requirePermission('employees.read'),async(req,res,next)=>{
  try{res.json(await hrDashboard(req.auth.companyId))}catch(error){next(error)}
});

router.get('/payroll-preview',requirePermission('employees.read'),async(req,res,next)=>{
  try{res.json(await payrollPreview(req.auth.companyId))}catch(error){next(error)}
});

router.post('/attendance',requirePermission('attendance.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      employeeId:z.string().cuid(),
      date:z.string().min(8),
      checkIn:z.string().optional().nullable(),
      checkOut:z.string().optional().nullable(),
      status:z.enum(['PRESENT','ABSENT','LATE','REMOTE','DAY_OFF']).default('PRESENT'),
      notes:z.string().max(500).optional().nullable()
    }).safeParse(req.body);

    if(!parsed.success)return res.status(400).json({ok:false,message:'Datos de asistencia inválidos.'});

    const attendance=await registerAttendance({
      companyId:req.auth.companyId,userId:req.auth.sub,...parsed.data
    });

    res.status(201).json({ok:true,attendance});
  }catch(error){
    if(error.status)return res.status(error.status).json({ok:false,message:error.message});
    next(error);
  }
});

router.post('/leave-requests',requirePermission('leave_requests.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      employeeId:z.string().cuid(),
      type:z.enum(['VACATION','PERSONAL','MEDICAL','UNPAID','OTHER']),
      startDate:z.string().min(8),
      endDate:z.string().min(8),
      reason:z.string().max(1000).optional().nullable()
    }).safeParse(req.body);

    if(!parsed.success)return res.status(400).json({ok:false,message:'Datos de permiso inválidos.'});

    const leave=await createLeaveRequest({
      companyId:req.auth.companyId,userId:req.auth.sub,...parsed.data
    });

    res.status(201).json({ok:true,leave});
  }catch(error){
    if(error.status)return res.status(error.status).json({ok:false,message:error.message});
    next(error);
  }
});

router.post('/leave-requests/:id/resolve',requirePermission('leave_requests.manage'),async(req,res,next)=>{
  try{
    const parsed=z.object({
      status:z.enum(['APPROVED','REJECTED']),
      notes:z.string().max(1000).optional().nullable()
    }).safeParse(req.body);

    if(!parsed.success)return res.status(400).json({ok:false,message:'Resolución inválida.'});

    const leave=await resolveLeaveRequest({
      companyId:req.auth.companyId,userId:req.auth.sub,id:req.params.id,...parsed.data
    });

    res.json({ok:true,leave});
  }catch(error){
    if(error.status)return res.status(error.status).json({ok:false,message:error.message});
    next(error);
  }
});

export default router;
