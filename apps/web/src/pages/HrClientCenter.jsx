import {useEffect,useMemo,useState} from 'react';
import {
  CalendarCheck2,ClipboardList,Clock3,Plus,RefreshCw,
  UserCheck2,UsersRound,X
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card} from '../design-system/components';
import KpiGrid from '../components/KpiGrid';
import KpiCard from '../components/KpiCard';
import KpiInfo from '../components/KpiInfo';
import styles from './HrClientCenter.module.css';
import {ModuleHeader,ModuleTabs} from '../components/module-system';

const emptyAttendance={
  employeeId:'',
  date:new Date().toISOString().slice(0,10),
  checkIn:'',
  checkOut:'',
  status:'PRESENT',
  notes:''
};

const emptyLeave={
  employeeId:'',
  type:'VACATION',
  startDate:new Date().toISOString().slice(0,10),
  endDate:new Date().toISOString().slice(0,10),
  reason:''
};

const leaveLabel={
  VACATION:'Vacaciones',
  PERSONAL:'Permiso personal',
  MEDICAL:'Médico',
  UNPAID:'Sin goce',
  OTHER:'Otro'
};

const tone=status=>{
  if(['APPROVED','PRESENT','RECORDED'].includes(status))return 'success';
  if(['REJECTED','ABSENT'].includes(status))return 'danger';
  if(['PENDING','LATE','LEAVE'].includes(status))return 'warning';
  return 'neutral';
};

export default function HrClientCenter(){
  const [data,setData]=useState({summary:{},employees:[],leaves:[],recent:[]});
  const [payroll,setPayroll]=useState({rows:[]});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);
  const [attendanceOpen,setAttendanceOpen]=useState(false);
  const [attendance,setAttendance]=useState(emptyAttendance);
  const [leaveOpen,setLeaveOpen]=useState(false);
  const [leave,setLeave]=useState(emptyLeave);

  const load=async()=>{
    setLoading(true);
    try{
      const [dashboard,payrollPreview]=await Promise.all([
        apiRequest('/hr-client/dashboard'),
        apiRequest('/hr-client/payroll-preview')
      ]);
      setData(dashboard);
      setPayroll(payrollPreview);
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const saveAttendance=async event=>{
    event.preventDefault();
    setBusy(true);
    try{
      const day=attendance.date;
      await apiRequest('/hr-client/attendance',{
        method:'POST',
        body:{
          ...attendance,
          checkIn:attendance.checkIn?`${day}T${attendance.checkIn}:00`:null,
          checkOut:attendance.checkOut?`${day}T${attendance.checkOut}:00`:null
        }
      });
      setAttendanceOpen(false);
      setAttendance(emptyAttendance);
      setMsg(['success','Asistencia registrada.']);
      await load();
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const saveLeave=async event=>{
    event.preventDefault();
    setBusy(true);
    try{
      await apiRequest('/hr-client/leave-requests',{method:'POST',body:leave});
      setLeaveOpen(false);
      setLeave(emptyLeave);
      setMsg(['success','Solicitud de permiso registrada.']);
      await load();
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const resolveLeave=async(id,status)=>{
    setBusy(true);
    try{
      await apiRequest(`/hr-client/leave-requests/${id}/resolve`,{
        method:'POST',body:{status}
      });
      setMsg(['success',status==='APPROVED'?'Permiso aprobado.':'Permiso rechazado.']);
      await load();
    }catch(error){
      setMsg(['error',error.message]);
    }finally{
      setBusy(false);
    }
  };

  const payrollStats=useMemo(()=>{
    const rows=payroll.rows||[];
    return {
      employees:rows.length,
      gross:rows.reduce((sum,row)=>sum+Number(row.estimatedGross||0),0),
      absences:rows.reduce((sum,row)=>sum+Number(row.absences||0),0),
      late:rows.reduce((sum,row)=>sum+Number(row.lateDays||0),0)
    };
  },[payroll.rows]);

  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Personas · Recursos Humanos"
      title="RR. HH. operativo"
      description="Empleados, asistencia, incidencias, permisos y prenómina en una sola vista."
      actions={<>
        <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Actualizar</Button>
        <Button variant="secondary" onClick={()=>setAttendanceOpen(true)}><CalendarCheck2 size={16}/> Asistencia</Button>
        <Button onClick={()=>setLeaveOpen(true)}><Plus size={16}/> Nuevo permiso</Button>
      </>}
    />
    <ModuleTabs
      active="overview"
      items={[
        {id:'overview',label:'Resumen',to:'/recursos-humanos/operacion'},
        {id:'employees',label:'Empleados',to:'/recursos-humanos'},
        {id:'files',label:'Expedientes',to:'/recursos-humanos/expedientes'},
        {id:'payroll',label:'Prenómina',to:'/recursos-humanos/prenomina'}
      ]}
    />

    {msg?<div className={`${styles.message} ${styles[msg[0]]}`}>{msg[1]}</div>:null}

    <KpiGrid>
      <KpiCard>
        <UsersRound/>
        <span>Empleados activos</span>
        <KpiInfo title="Empleados activos">Colaboradores activos dentro de la empresa.</KpiInfo>
        <strong>{data.summary?.activeEmployees||0}</strong>
        <small>{data.summary?.employees||0} empleados registrados</small>
      </KpiCard>
      <KpiCard>
        <UserCheck2/>
        <span>Asistencia de hoy</span>
        <KpiInfo title="Asistencia de hoy">Porcentaje de empleados activos con asistencia presente registrada hoy.</KpiInfo>
        <strong>{data.summary?.attendanceRate||0}%</strong>
        <small>{data.summary?.presentToday||0} presentes</small>
      </KpiCard>
      <KpiCard>
        <Clock3/>
        <span>Permisos pendientes</span>
        <KpiInfo title="Permisos pendientes">Solicitudes de vacaciones, permisos o ausencias que requieren resolución.</KpiInfo>
        <strong>{data.summary?.pendingLeaves||0}</strong>
        <small>Requieren atención</small>
      </KpiCard>
      <KpiCard>
        <ClipboardList/>
        <span>Incidencias del mes</span>
        <KpiInfo title="Incidencias del mes">Incidencias de RH registradas durante el mes actual.</KpiInfo>
        <strong>{data.summary?.incidents30d||0}</strong>
        <small>Impactan revisión de prenómina</small>
      </KpiCard>
    </KpiGrid>

    <div className={styles.grid}>
      <Card className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Empleados</h2><p>Base operativa para asistencia, permisos e incidencias.</p></div></div>
        <div className={styles.employeeList}>
          {data.employees?.length?data.employees.map(employee=><div className={styles.employee} key={employee.id}>
            <div className={styles.avatar}>{employee.firstName?.[0]}{employee.lastName?.[0]}</div>
            <div>
              <strong>{employee.firstName} {employee.lastName}</strong>
              <p>{employee.employeeNumber} · {employee.position?.name||'Sin puesto'}</p>
              <small>{employee.department?.name||'Sin departamento'}</small>
            </div>
            <Badge tone={employee.status==='ACTIVE'?'success':'neutral'}>{employee.status==='ACTIVE'?'Activo':employee.status}</Badge>
          </div>):<div className={styles.empty}>No hay empleados registrados.</div>}
        </div>
      </Card>

      <Card className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Permisos pendientes</h2><p>Resolución administrativa rápida.</p></div></div>
        <div className={styles.leaveList}>
          {data.leaves?.filter(x=>x.status==='PENDING').length
            ?data.leaves.filter(x=>x.status==='PENDING').map(item=><div className={styles.leaveRow} key={item.id}>
              <div>
                <strong>{item.employee.firstName} {item.employee.lastName}</strong>
                <p>{leaveLabel[item.type]||item.type} · {item.days} día(s)</p>
                <small>{new Date(item.startDate).toLocaleDateString('es-MX')} → {new Date(item.endDate).toLocaleDateString('es-MX')}</small>
              </div>
              <div className={styles.leaveActions}>
                <Button variant="secondary" disabled={busy} onClick={()=>resolveLeave(item.id,'REJECTED')}>Rechazar</Button>
                <Button disabled={busy} onClick={()=>resolveLeave(item.id,'APPROVED')}>Aprobar</Button>
              </div>
            </div>)
            :<div className={styles.empty}>No hay permisos pendientes.</div>}
        </div>
      </Card>
    </div>

    <Card className={styles.payroll}>
      <div className={styles.payrollHead}>
        <div>
          <span>Prenómina</span>
          <h2>Vista previa del mes</h2>
          <p>Consolida salario base, asistencias, retardos, ausencias, permisos aprobados e incidencias.</p>
        </div>
        <div className={styles.payrollSummary}>
          <div><span>Empleados</span><strong>{payrollStats.employees}</strong></div>
          <div><span>Ausencias</span><strong>{payrollStats.absences}</strong></div>
          <div><span>Retardos</span><strong>{payrollStats.late}</strong></div>
          <div><span>Nómina base</span><strong>{new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(payrollStats.gross)}</strong></div>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>Empleado</th><th>Departamento</th><th>Presentes</th><th>Ausencias</th><th>Retardos</th><th>Permisos</th><th>Incidencias</th><th>Salario base</th></tr></thead>
          <tbody>{(payroll.rows||[]).map(row=><tr key={row.employeeId}>
            <td><strong>{row.employee}</strong><small>{row.code}</small></td>
            <td>{row.department}</td><td>{row.presentDays}</td><td>{row.absences}</td><td>{row.lateDays}</td><td>{row.approvedLeaveDays}</td><td>{row.incidents}</td>
            <td>{new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(row.baseSalary)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>

    <Card className={styles.activity}>
      <div className={styles.panelHead}><div><h2>Actividad reciente de RR. HH.</h2><p>Asistencia, incidencias y permisos.</p></div></div>
      <div className={styles.activityList}>
        {data.recent?.length?data.recent.map((item,index)=><div className={styles.activityRow} key={`${item.type}-${item.code}-${index}`}>
          <div className={styles.eventIcon}>{item.type==='ATTENDANCE'?<CalendarCheck2 size={16}/>:item.type==='LEAVE'?<Clock3 size={16}/>:<ClipboardList size={16}/>}</div>
          <div><strong>{item.employee}</strong><p>{item.detail}</p><small>{new Date(item.at).toLocaleString('es-MX')}</small></div>
          <Badge tone={tone(item.status)}>{item.status}</Badge>
        </div>):<div className={styles.empty}>Sin actividad reciente.</div>}
      </div>
    </Card>

    {attendanceOpen?<div className={styles.backdrop}><form className={styles.modal} onSubmit={saveAttendance}>
      <header><div><strong>Registrar asistencia</strong><span>Entrada, salida o estado del día.</span></div><button type="button" onClick={()=>setAttendanceOpen(false)}><X size={18}/></button></header>
      <div className={styles.formGrid}>
        <label className={styles.span2}>Empleado<select required value={attendance.employeeId} onChange={e=>setAttendance({...attendance,employeeId:e.target.value})}>
          <option value="">Selecciona...</option>{data.employees?.filter(x=>x.status==='ACTIVE').map(x=><option key={x.id} value={x.id}>{x.firstName} {x.lastName} · {x.code}</option>)}
        </select></label>
        <label>Fecha<input type="date" value={attendance.date} onChange={e=>setAttendance({...attendance,date:e.target.value})}/></label>
        <label>Estado<select value={attendance.status} onChange={e=>setAttendance({...attendance,status:e.target.value})}>
          <option value="PRESENT">Presente</option><option value="LATE">Retardo</option><option value="ABSENT">Ausencia</option><option value="REMOTE">Remoto</option><option value="DAY_OFF">Día libre</option>
        </select></label>
        <label>Entrada<input type="time" value={attendance.checkIn} onChange={e=>setAttendance({...attendance,checkIn:e.target.value})}/></label>
        <label>Salida<input type="time" value={attendance.checkOut} onChange={e=>setAttendance({...attendance,checkOut:e.target.value})}/></label>
        <label className={styles.span2}>Notas<textarea rows="3" value={attendance.notes} onChange={e=>setAttendance({...attendance,notes:e.target.value})}/></label>
      </div>
      <footer><Button type="button" variant="secondary" onClick={()=>setAttendanceOpen(false)}>Cancelar</Button><Button disabled={busy} type="submit">Guardar</Button></footer>
    </form></div>:null}

    {leaveOpen?<div className={styles.backdrop}><form className={styles.modal} onSubmit={saveLeave}>
      <header><div><strong>Nuevo permiso</strong><span>Vacaciones, médico, personal o sin goce.</span></div><button type="button" onClick={()=>setLeaveOpen(false)}><X size={18}/></button></header>
      <div className={styles.formGrid}>
        <label className={styles.span2}>Empleado<select required value={leave.employeeId} onChange={e=>setLeave({...leave,employeeId:e.target.value})}>
          <option value="">Selecciona...</option>{data.employees?.filter(x=>x.status==='ACTIVE').map(x=><option key={x.id} value={x.id}>{x.firstName} {x.lastName} · {x.code}</option>)}
        </select></label>
        <label>Tipo<select value={leave.type} onChange={e=>setLeave({...leave,type:e.target.value})}>{Object.entries(leaveLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Inicio<input type="date" value={leave.startDate} onChange={e=>setLeave({...leave,startDate:e.target.value})}/></label>
        <label>Fin<input type="date" value={leave.endDate} onChange={e=>setLeave({...leave,endDate:e.target.value})}/></label>
        <label className={styles.span2}>Motivo<textarea rows="3" value={leave.reason} onChange={e=>setLeave({...leave,reason:e.target.value})}/></label>
      </div>
      <footer><Button type="button" variant="secondary" onClick={()=>setLeaveOpen(false)}>Cancelar</Button><Button disabled={busy} type="submit">Registrar</Button></footer>
    </form></div>:null}
  </div>;
}
