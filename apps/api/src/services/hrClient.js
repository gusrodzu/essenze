import {prisma} from '../lib/prisma.js';
import {emitIntegrationEventAsync} from './integrationEvents.js';

function dateOnly(value){
  const d=new Date(value);
  d.setHours(0,0,0,0);
  return d;
}

function inclusiveDays(start,end){
  const a=dateOnly(start);
  const b=dateOnly(end);
  return Math.max(1,Math.round((b-a)/86400000)+1);
}

export async function hrDashboard(companyId){
  const today=dateOnly(new Date());
  const monthStart=new Date(today.getFullYear(),today.getMonth(),1);
  const monthEnd=new Date(today.getFullYear(),today.getMonth()+1,1);

  const [employees,attendances,incidents,leaves]=await Promise.all([
    prisma.employee.findMany({
      where:{companyId},
      include:{department:true,position:true},
      orderBy:[{status:'asc'},{lastName:'asc'},{firstName:'asc'}],
      take:500
    }),
    prisma.attendanceRecord.findMany({
      where:{companyId,date:{gte:monthStart,lt:monthEnd}},
      include:{employee:{select:{firstName:true,lastName:true,employeeNumber:true}}},
      orderBy:{date:'desc'},
      take:1000
    }),
    prisma.hrIncident.findMany({
      where:{companyId,date:{gte:monthStart,lt:monthEnd}},
      include:{employee:{select:{firstName:true,lastName:true,employeeNumber:true}}},
      orderBy:{date:'desc'},
      take:500
    }),
    prisma.leaveRequest.findMany({
      where:{companyId},
      include:{employee:{select:{firstName:true,lastName:true,employeeNumber:true}}},
      orderBy:{createdAt:'desc'},
      take:500
    })
  ]);

  const activeEmployees=employees.filter(x=>x.status==='ACTIVE').length;
  const todayIso=today.toISOString().slice(0,10);
  const presentToday=attendances.filter(x=>
    new Date(x.date).toISOString().slice(0,10)===todayIso &&
    ['PRESENT','LATE','REMOTE'].includes(x.status)
  ).length;

  const pendingLeaves=leaves.filter(x=>x.status==='PENDING').length;
  const attendanceRate=activeEmployees
    ?Math.min(100,Math.round((presentToday/activeEmployees)*100))
    :100;

  const recent=[
    ...attendances.slice(0,20).map(x=>({
      type:'ATTENDANCE',
      at:x.date,
      employee:`${x.employee.firstName} ${x.employee.lastName}`,
      code:x.employee.employeeNumber,
      status:x.status,
      detail:x.checkIn
        ?`Entrada ${new Date(x.checkIn).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`
        :'Sin hora de entrada'
    })),
    ...incidents.slice(0,20).map(x=>({
      type:'INCIDENT',
      at:x.date,
      employee:`${x.employee.firstName} ${x.employee.lastName}`,
      code:x.employee.employeeNumber,
      status:'RECORDED',
      detail:x.type||x.description||'Incidencia'
    })),
    ...leaves.slice(0,20).map(x=>({
      type:'LEAVE',
      at:x.createdAt,
      employee:`${x.employee.firstName} ${x.employee.lastName}`,
      code:x.employee.employeeNumber,
      status:x.status,
      detail:`${x.type} · ${Number(x.days)} día(s)`
    }))
  ].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,25);

  return {
    ok:true,
    summary:{
      employees:employees.length,
      activeEmployees,
      attendanceRate,
      presentToday,
      pendingLeaves,
      incidents30d:incidents.length
    },
    employees,
    leaves,
    recent
  };
}

export async function registerAttendance({
  companyId,employeeId,date,checkIn,checkOut,status='PRESENT',notes=null,userId=null
}){
  const employee=await prisma.employee.findFirst({where:{id:employeeId,companyId}});
  if(!employee){
    const error=new Error('Empleado no encontrado.');
    error.status=404;
    throw error;
  }

  const day=dateOnly(date);
  const attendance=await prisma.attendanceRecord.upsert({
    where:{employeeId_date:{employeeId,date:day}},
    update:{
      checkIn:checkIn?new Date(checkIn):null,
      checkOut:checkOut?new Date(checkOut):null,
      status,
      notes
    },
    create:{
      companyId,
      employeeId,
      date:day,
      checkIn:checkIn?new Date(checkIn):null,
      checkOut:checkOut?new Date(checkOut):null,
      status,
      notes
    }
  });

  emitIntegrationEventAsync({
    companyId,
    event:'hr.attendance.recorded',
    entityType:'AttendanceRecord',
    entityId:attendance.id,
    payload:{employeeId,date:attendance.date,status:attendance.status,userId}
  });

  return attendance;
}

export async function createLeaveRequest({
  companyId,employeeId,type,startDate,endDate,reason,userId
}){
  const employee=await prisma.employee.findFirst({where:{id:employeeId,companyId}});
  if(!employee){
    const error=new Error('Empleado no encontrado.');
    error.status=404;
    throw error;
  }

  const leave=await prisma.leaveRequest.create({
    data:{
      companyId,
      employeeId,
      type,
      startDate:dateOnly(startDate),
      endDate:dateOnly(endDate),
      days:inclusiveDays(startDate,endDate),
      reason:reason||null,
      status:'PENDING'
    }
  });

  emitIntegrationEventAsync({
    companyId,
    event:'hr.leave.requested',
    entityType:'LeaveRequest',
    entityId:leave.id,
    payload:{employeeId,type,startDate,endDate,days:Number(leave.days),userId}
  });

  return leave;
}

export async function resolveLeaveRequest({companyId,id,status,notes,userId}){
  const existing=await prisma.leaveRequest.findFirst({where:{id,companyId}});
  if(!existing){
    const error=new Error('Solicitud de permiso no encontrada.');
    error.status=404;
    throw error;
  }
  if(existing.status!=='PENDING'){
    const error=new Error('La solicitud ya fue resuelta.');
    error.status=409;
    throw error;
  }

  const leave=await prisma.leaveRequest.update({
    where:{id},
    data:{
      status,
      resolution:notes||null,
      resolvedAt:new Date()
    }
  });

  emitIntegrationEventAsync({
    companyId,
    event:status==='APPROVED'?'hr.leave.approved':'hr.leave.rejected',
    entityType:'LeaveRequest',
    entityId:id,
    payload:{employeeId:existing.employeeId,status,userId}
  });

  return leave;
}

export async function payrollPreview(companyId){
  const monthStart=new Date();
  monthStart.setDate(1);
  monthStart.setHours(0,0,0,0);

  const [employees,attendances,incidents,leaves]=await Promise.all([
    prisma.employee.findMany({
      where:{companyId,status:'ACTIVE'},
      include:{department:true,position:true},
      orderBy:[{lastName:'asc'},{firstName:'asc'}]
    }),
    prisma.attendanceRecord.findMany({
      where:{companyId,date:{gte:monthStart}}
    }),
    prisma.hrIncident.findMany({
      where:{companyId,date:{gte:monthStart}}
    }),
    prisma.leaveRequest.findMany({
      where:{companyId,startDate:{gte:monthStart},status:'APPROVED'}
    })
  ]);

  return {
    ok:true,
    month:monthStart,
    rows:employees.map(employee=>{
      const attendance=attendances.filter(x=>x.employeeId===employee.id);
      const employeeIncidents=incidents.filter(x=>x.employeeId===employee.id);
      const employeeLeaves=leaves.filter(x=>x.employeeId===employee.id);

      return {
        employeeId:employee.id,
        code:employee.employeeNumber,
        employee:`${employee.firstName} ${employee.lastName}`,
        department:employee.department?.name||'Sin departamento',
        position:employee.position?.name||'Sin puesto',
        baseSalary:Number(employee.salary||0),
        presentDays:attendance.filter(x=>['PRESENT','REMOTE'].includes(x.status)).length,
        absences:attendance.filter(x=>x.status==='ABSENT').length,
        lateDays:attendance.filter(x=>x.status==='LATE').length,
        approvedLeaveDays:employeeLeaves.reduce((sum,x)=>sum+Number(x.days||0),0),
        incidents:employeeIncidents.length,
        estimatedGross:Number(employee.salary||0)
      };
    })
  };
}
