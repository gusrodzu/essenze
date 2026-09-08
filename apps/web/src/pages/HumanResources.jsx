import {useEffect,useMemo,useState} from 'react';
import {BriefcaseBusiness,Building2,CalendarDays,Pencil,Plus,Search,UserRound,X} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge,Button,Card,Input} from '../design-system/components';
import styles from './HumanResources.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiGrid from '../components/KpiGrid';
import {ModuleHeader,ModuleTabs,ModuleToolbar,DataTableFrame,ModalFormSection,RecordModal} from '../components/module-system';
import KpiCard from '../components/KpiCard';
const statusLabels={ACTIVE:'Activo',INACTIVE:'Inactivo',LEAVE:'Permiso',TERMINATED:'Baja'};
const statusTones={ACTIVE:'success',INACTIVE:'neutral',LEAVE:'warning',TERMINATED:'danger'};
const blankEmployee=()=>({employeeNumber:'',firstName:'',lastName:'',email:'',phone:'',hireDate:new Date().toISOString().slice(0,10),dateOfBirth:'',salary:0,status:'ACTIVE',branchId:'',departmentId:'',positionId:'',notes:''});
const blankDepartment=()=>({code:'',name:'',description:'',active:true});
const blankPosition=()=>({code:'',name:'',departmentId:'',description:'',active:true});
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v||0));

export default function HumanResources(){
  const [data,setData]=useState({employees:[],departments:[],positions:[],branches:[]});
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState('employees');
  const [modal,setModal]=useState(null);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState(null);
  async function load(){const result=await apiRequest('/human-resources');setData(result)}
  useEffect(()=>{load().catch(e=>setMessage(['error',e.message]))},[]);
  const employees=useMemo(()=>data.employees.filter(e=>`${e.employeeNumber} ${e.firstName} ${e.lastName} ${e.department?.name||''} ${e.position?.name||''}`.toLowerCase().includes(query.toLowerCase())),[data.employees,query]);
  const positionsForForm=data.positions.filter(p=>!modal?.departmentId||p.departmentId===modal.departmentId);
  async function saveEmployee(event){event.preventDefault();setSaving(true);try{const body={...modal,branchId:modal.branchId||null,departmentId:modal.departmentId||null,positionId:modal.positionId||null,dateOfBirth:modal.dateOfBirth||null};await apiRequest(modal.id?`/human-resources/employees/${modal.id}`:'/human-resources/employees',{method:modal.id?'PUT':'POST',body});setModal(null);setMessage(['success','Empleado guardado correctamente']);await load()}catch(e){setMessage(['error',e.message])}finally{setSaving(false)}}
  async function saveCatalog(event,type){event.preventDefault();setSaving(true);try{const base=type==='department'?'departments':'positions';const body={...modal,departmentId:modal.departmentId||null};await apiRequest(modal.id?`/human-resources/${base}/${modal.id}`:`/human-resources/${base}`,{method:modal.id?'PUT':'POST',body});setModal(null);setMessage(['success',type==='department'?'Departamento guardado':'Puesto guardado']);await load()}catch(e){setMessage(['error',e.message])}finally{setSaving(false)}}
  return <div className={styles.page}>
    <ModuleHeader
      eyebrow="Personas · Capital humano"
      title="Recursos Humanos"
      description="Administra empleados, departamentos, puestos y estatus laborales."
      actions={<Button icon={Plus} onClick={()=>setModal(tab==='employees'?{kind:'employee',...blankEmployee()}:tab==='departments'?{kind:'department',...blankDepartment()}:{kind:'position',...blankPosition()})}>{tab==='employees'?'Nuevo empleado':tab==='departments'?'Nuevo departamento':'Nuevo puesto'}</Button>}
    />
    <ModuleTabs
      active={tab}
      onChange={setTab}
      items={[
        {id:'employees',label:'Empleados',count:data.employees.length},
        {id:'departments',label:'Departamentos',count:data.departments.length},
        {id:'positions',label:'Puestos',count:data.positions.length}
      ]}
    />
    {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}
    <KpiGrid><KpiCard><UserRound size={20}/><span>Total empleados</span><KpiInfo title="Plantilla total">Cantidad total de empleados registrados.</KpiInfo><strong>{data.employees.length}</strong></KpiCard><KpiCard><Building2 size={20}/><span>Departamentos</span><KpiInfo title="Estructura organizacional">Cantidad de departamentos activos registrados.</KpiInfo><strong>{data.departments.length}</strong></KpiCard><KpiCard><BriefcaseBusiness size={20}/><span>Nómina mensual</span><KpiInfo title="Costo salarial base">Suma del salario mensual de los empleados activos.</KpiInfo><strong>{money(data.employees.filter(e=>e.status==='ACTIVE').reduce((a,e)=>a+Number(e.salary||0),0))}</strong></KpiCard><KpiCard><CalendarDays size={20}/><span>Altas activas</span><KpiInfo title="Empleados activos">Empleados con relación laboral activa.</KpiInfo><strong>{data.employees.filter(e=>e.status==='ACTIVE').length}</strong></KpiCard></KpiGrid>
    <Card className={styles.tableCard}>
      <ModuleToolbar
        title={tab==='employees'?'Directorio de empleados':tab==='departments'?'Catálogo de departamentos':'Catálogo de puestos'}
        description={`${tab==='employees'?employees.length:tab==='departments'?data.departments.length:data.positions.length} registros`}
        query={tab==='employees'?query:undefined}
        onQueryChange={setQuery}
        placeholder="Buscar empleado, área o puesto"
      />
    <DataTableFrame>{tab==='employees'?<table><thead><tr><th>Empleado</th><th>Departamento / puesto</th><th>Sucursal</th><th>Ingreso</th><th>Sueldo</th><th>Estado</th><th></th></tr></thead><tbody>{employees.map(e=><tr key={e.id}><td><strong>{e.firstName} {e.lastName}</strong><small>{e.employeeNumber} · {e.email||'Sin correo'}</small></td><td>{e.department?.name||'Sin departamento'}<small>{e.position?.name||'Sin puesto'}</small></td><td>{e.branch?.name||'Sin asignar'}</td><td>{new Date(e.hireDate).toLocaleDateString('es-MX')}</td><td>{money(e.salary)}</td><td><Badge tone={statusTones[e.status]}>{statusLabels[e.status]}</Badge></td><td className={styles.actions}><button onClick={()=>setModal({kind:'employee',...e,hireDate:e.hireDate.slice(0,10),dateOfBirth:e.dateOfBirth?.slice(0,10)||'',salary:String(e.salary),branchId:e.branchId||'',departmentId:e.departmentId||'',positionId:e.positionId||''})}><Pencil size={16}/> Editar</button></td></tr>)}</tbody></table>:tab==='departments'?<table><thead><tr><th>Código</th><th>Departamento</th><th>Descripción</th><th>Estado</th><th></th></tr></thead><tbody>{data.departments.map(d=><tr key={d.id}><td>{d.code}</td><td><strong>{d.name}</strong></td><td>{d.description||'—'}</td><td><Badge tone={d.active?'success':'neutral'}>{d.active?'Activo':'Inactivo'}</Badge></td><td className={styles.actions}><button onClick={()=>setModal({kind:'department',...d})}><Pencil size={16}/> Editar</button></td></tr>)}</tbody></table>:<table><thead><tr><th>Código</th><th>Puesto</th><th>Departamento</th><th>Estado</th><th></th></tr></thead><tbody>{data.positions.map(p=><tr key={p.id}><td>{p.code}</td><td><strong>{p.name}</strong><small>{p.description||''}</small></td><td>{p.department?.name||'General'}</td><td><Badge tone={p.active?'success':'neutral'}>{p.active?'Activo':'Inactivo'}</Badge></td><td className={styles.actions}><button onClick={()=>setModal({kind:'position',...p,departmentId:p.departmentId||''})}><Pencil size={16}/> Editar</button></td></tr>)}</tbody></table>}</DataTableFrame></Card>
    <RecordModal
      open={Boolean(modal)}
      onClose={()=>setModal(null)}
      title={modal?modal.kind==='employee'?(modal.id?`${modal.firstName} ${modal.lastName}`.trim()||'Empleado':'Nuevo empleado'):modal.kind==='department'?(modal.name||'Departamento'):(modal.name||'Puesto'):'Registro'}
      subtitle={modal?modal.kind==='employee'?(modal.employeeNumber||'Captura de empleado'):modal.kind==='department'?'Estructura organizacional':'Catálogo de puestos':''}
      eyebrow={modal?.id?'Editar':'Nuevo'}
      icon={modal?.kind==='employee'?UserRound:modal?.kind==='department'?Building2:BriefcaseBusiness}
      size="lg"
      meta={modal?.kind==='employee'?[modal.departmentId?data.departments.find(d=>d.id===modal.departmentId)?.name:null,modal.positionId?data.positions.find(p=>p.id===modal.positionId)?.name:null,modal.branchId?data.branches.find(b=>b.id===modal.branchId)?.name:null]:[]}
      status={modal?.kind==='employee'&&modal?.status?<Badge tone={statusTones[modal.status]}>{statusLabels[modal.status]}</Badge>:null}
      footer={modal?<><Button type="button" variant="ghost" onClick={()=>setModal(null)}>Cancelar</Button><Button type="submit" form="hr-record-form" loading={saving}>Guardar</Button></>:null}
    >
      {modal?<form id="hr-record-form" className={styles.standardForm} onSubmit={e=>modal.kind==='employee'?saveEmployee(e):saveCatalog(e,modal.kind)}>
        {modal.kind==='employee'?<>
          <ModalFormSection title="Identificación" description="Datos principales del colaborador.">
            <div className={styles.grid2}><Input label="Número de empleado" required value={modal.employeeNumber} onChange={e=>setModal(v=>({...v,employeeNumber:e.target.value}))}/><label><span>Estado</span><select value={modal.status} onChange={e=>setModal(v=>({...v,status:e.target.value}))}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="LEAVE">Permiso</option><option value="TERMINATED">Baja</option></select></label></div>
            <div className={styles.grid2}><Input label="Nombre" required value={modal.firstName} onChange={e=>setModal(v=>({...v,firstName:e.target.value}))}/><Input label="Apellidos" required value={modal.lastName} onChange={e=>setModal(v=>({...v,lastName:e.target.value}))}/></div>
          </ModalFormSection>
          <ModalFormSection title="Contacto">
            <div className={styles.grid2}><Input label="Correo" type="email" value={modal.email||''} onChange={e=>setModal(v=>({...v,email:e.target.value}))}/><Input label="Teléfono" value={modal.phone||''} onChange={e=>setModal(v=>({...v,phone:e.target.value}))}/></div>
          </ModalFormSection>
          <ModalFormSection title="Asignación organizacional">
            <div className={styles.grid2}><label><span>Departamento</span><select value={modal.departmentId} onChange={e=>setModal(v=>({...v,departmentId:e.target.value,positionId:''}))}><option value="">Sin asignar</option>{data.departments.filter(d=>d.active).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label><span>Puesto</span><select value={modal.positionId} onChange={e=>setModal(v=>({...v,positionId:e.target.value}))}><option value="">Sin asignar</option>{positionsForForm.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
            <div className={styles.grid2}><label><span>Sucursal</span><select value={modal.branchId} onChange={e=>setModal(v=>({...v,branchId:e.target.value}))}><option value="">Sin asignar</option>{data.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><Input label="Fecha de ingreso" type="date" required value={modal.hireDate} onChange={e=>setModal(v=>({...v,hireDate:e.target.value}))}/></div>
          </ModalFormSection>
          <ModalFormSection title="Información laboral y personal">
            <div className={styles.grid2}><Input label="Fecha de nacimiento" type="date" value={modal.dateOfBirth||''} onChange={e=>setModal(v=>({...v,dateOfBirth:e.target.value}))}/><Input label="Sueldo mensual" type="number" min="0" step="0.01" value={modal.salary} onChange={e=>setModal(v=>({...v,salary:e.target.value}))}/></div>
            <Input label="Notas" value={modal.notes||''} onChange={e=>setModal(v=>({...v,notes:e.target.value}))}/>
          </ModalFormSection>
        </>:modal.kind==='department'?<ModalFormSection title="Datos del departamento">
          <div className={styles.grid2}><Input label="Código" required value={modal.code} onChange={e=>setModal(v=>({...v,code:e.target.value}))}/><Input label="Nombre" required value={modal.name} onChange={e=>setModal(v=>({...v,name:e.target.value}))}/></div>
          <Input label="Descripción" value={modal.description||''} onChange={e=>setModal(v=>({...v,description:e.target.value}))}/>
        </ModalFormSection>:<ModalFormSection title="Datos del puesto">
          <div className={styles.grid2}><Input label="Código" required value={modal.code} onChange={e=>setModal(v=>({...v,code:e.target.value}))}/><Input label="Nombre" required value={modal.name} onChange={e=>setModal(v=>({...v,name:e.target.value}))}/></div>
          <label><span>Departamento</span><select value={modal.departmentId||''} onChange={e=>setModal(v=>({...v,departmentId:e.target.value}))}><option value="">General</option>{data.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <Input label="Descripción" value={modal.description||''} onChange={e=>setModal(v=>({...v,description:e.target.value}))}/>
        </ModalFormSection>}
      </form>:null}
    </RecordModal>
  </div>
}
