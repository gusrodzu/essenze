import {useEffect, useMemo, useState} from 'react';
import {AlertTriangle, CheckCircle2, FileClock, FileText, FolderOpen, Pencil, Plus, Search, Trash2, UploadCloud, X} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import styles from './EmployeeDocuments.module.css';

import KpiInfo from '../components/KpiInfo';
import KpiCard from '../components/KpiCard';
const typeLabels={IDENTIFICATION:'Identificación oficial',TAX_DOCUMENT:'Constancia fiscal',SOCIAL_SECURITY:'Seguridad social',ADDRESS_PROOF:'Comprobante de domicilio',CONTRACT:'Contrato laboral',CURP:'CURP',BIRTH_CERTIFICATE:'Acta de nacimiento',EDUCATION:'Comprobante académico',MEDICAL:'Documento médico',CONFIDENTIALITY:'Confidencialidad',OTHER:'Otro'};
const statusLabels={PENDING:'Pendiente',VALID:'Vigente',EXPIRING:'Por vencer',EXPIRED:'Vencido',REJECTED:'Rechazado'};
const statusTones={PENDING:'warning',VALID:'success',EXPIRING:'warning',EXPIRED:'danger',REJECTED:'danger'};
const blank=()=>({employeeId:'',type:'IDENTIFICATION',name:'',fileUrl:'',fileName:'',issuedAt:'',expiresAt:'',status:'PENDING',notes:'',selectedFile:null});
const date=value=>value?new Date(value).toLocaleDateString('es-MX'):'—';

export default function EmployeeDocuments(){
  const [data,setData]=useState({employees:[],documents:[],stats:{total:0,valid:0,pending:0,alerts:0,employeesComplete:0}});
  const [query,setQuery]=useState('');
  const [employeeFilter,setEmployeeFilter]=useState('');
  const [statusFilter,setStatusFilter]=useState('');
  const [modal,setModal]=useState(null);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState(null);
  async function load(){setData(await apiRequest('/employee-documents'))}
  useEffect(()=>{load().catch(e=>setMessage(['error',e.message]))},[]);
  const documents=useMemo(()=>data.documents.filter(item=>{
    const text=`${item.name} ${item.fileName||''} ${item.employee.firstName} ${item.employee.lastName} ${item.employee.employeeNumber} ${typeLabels[item.type]}`.toLowerCase();
    return text.includes(query.toLowerCase())&&(!employeeFilter||item.employeeId===employeeFilter)&&(!statusFilter||item.status===statusFilter);
  }),[data.documents,query,employeeFilter,statusFilter]);

  async function uploadSelectedFile(file){
    const formData=new FormData();
    formData.append('file',file);
    setUploading(true);
    try{
      const response=await apiRequest('/employee-documents/upload',{method:'POST',body:formData});
      return response.file;
    }finally{setUploading(false)}
  }

  async function save(event){
    event.preventDefault();
    setSaving(true);
    try{
      let fileUrl=modal.fileUrl||null;
      let fileName=modal.fileName||null;
      if(modal.selectedFile){
        const uploaded=await uploadSelectedFile(modal.selectedFile);
        fileUrl=uploaded.url;
        fileName=uploaded.name;
      }
      const body={...modal,issuedAt:modal.issuedAt||null,expiresAt:modal.expiresAt||null,fileUrl,fileName};
      delete body.selectedFile;
      delete body.employee;
      delete body.createdAt;
      delete body.updatedAt;
      delete body.companyId;
      await apiRequest(modal.id?`/employee-documents/${modal.id}`:'/employee-documents',{method:modal.id?'PUT':'POST',body});
      setModal(null);
      setMessage(['success','Documento y archivo guardados correctamente']);
      await load();
    }catch(e){setMessage(['error',e.message])}finally{setSaving(false)}
  }
  async function remove(item){if(!window.confirm(`¿Eliminar ${item.name}?`))return;try{await apiRequest(`/employee-documents/${item.id}`,{method:'DELETE'});setMessage(['success','Documento eliminado']);await load()}catch(e){setMessage(['error',e.message])}}

  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Capital humano</span><h1>Expedientes laborales</h1><p>Centraliza documentos, archivos, vigencias y alertas del expediente de cada empleado.</p></div><Button icon={Plus} onClick={()=>setModal(blank())}>Agregar documento</Button></header>
    {message?<div className={`${styles.message} ${styles[message[0]]}`}>{message[1]}</div>:null}
    <section className={styles.metrics}><KpiCard><FolderOpen size={20}/><span>Documentos</span><KpiInfo title="Expedientes documentales">Cantidad total de documentos laborales registrados.</KpiInfo><strong>{data.stats.total}</strong></KpiCard><KpiCard><CheckCircle2 size={20}/><span>Vigentes</span><KpiInfo title="Documentos vigentes">Documentos completos y dentro de su periodo de validez.</KpiInfo><strong>{data.stats.valid}</strong></KpiCard><KpiCard><FileClock size={20}/><span>Pendientes</span><KpiInfo title="Documentos pendientes">Documentos faltantes, incompletos o pendientes de validación.</KpiInfo><strong>{data.stats.pending}</strong></KpiCard><KpiCard><AlertTriangle size={20}/><span>Alertas</span><KpiInfo title="Vencimientos y faltantes">Documentos vencidos o próximos a vencer que requieren atención.</KpiInfo><strong>{data.stats.alerts}</strong></KpiCard></section>
    <Card className={styles.tableCard}><div className={styles.toolbar}><div><h2>Documentos del personal</h2><p>{documents.length} registros visibles · {data.stats.employeesComplete} expedientes con cobertura básica</p></div><div className={styles.filters}><label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar documento o empleado"/></label><select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}><option value="">Todos los empleados</option>{data.employees.map(e=><option key={e.id} value={e.id}>{e.employeeNumber} · {e.firstName} {e.lastName}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></div>
    <div className={styles.tableWrap}><table><thead><tr><th>Empleado</th><th>Documento</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Archivo</th><th></th></tr></thead><tbody>{documents.length?documents.map(item=><tr key={item.id}><td><strong>{item.employee.firstName} {item.employee.lastName}</strong><small>{item.employee.employeeNumber} · {item.employee.department?.name||'Sin departamento'}</small></td><td><strong>{item.name}</strong><small>{typeLabels[item.type]}</small></td><td>{date(item.issuedAt)}</td><td>{date(item.expiresAt)}</td><td><Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge></td><td>{item.fileUrl?<a href={item.fileUrl} target="_blank" rel="noreferrer"><FileText size={16}/> {item.fileName||'Abrir archivo'}</a>:<span className={styles.muted}>Sin archivo</span>}</td><td className={styles.actions}><button onClick={()=>setModal({...item,issuedAt:item.issuedAt?.slice(0,10)||'',expiresAt:item.expiresAt?.slice(0,10)||'',employeeId:item.employeeId,selectedFile:null})}><Pencil size={16}/> Editar</button><button className={styles.delete} onClick={()=>remove(item)}><Trash2 size={16}/></button></td></tr>):<tr><td colSpan="7"><div className={styles.empty}><FolderOpen/><strong>No hay documentos</strong><p>Agrega el primer documento al expediente laboral.</p></div></td></tr>}</tbody></table></div></Card>
    {modal?<div className={styles.overlay}><form className={styles.modal} onSubmit={save}><div className={styles.modalHeader}><div><span>{modal.id?'Editar':'Nuevo documento'}</span><h2>{modal.name||'Expediente laboral'}</h2></div><button type="button" onClick={()=>setModal(null)}><X/></button></div><div className={styles.modalBody}><label>Empleado<select required value={modal.employeeId} onChange={e=>setModal(v=>({...v,employeeId:e.target.value}))}><option value="">Selecciona un empleado</option>{data.employees.map(e=><option key={e.id} value={e.id}>{e.employeeNumber} · {e.firstName} {e.lastName}</option>)}</select></label><div className={styles.grid2}><label>Tipo<select value={modal.type} onChange={e=>setModal(v=>({...v,type:e.target.value}))}>{Object.entries(typeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Estado<select value={modal.status} onChange={e=>setModal(v=>({...v,status:e.target.value}))}>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><Input label="Nombre del documento" required value={modal.name} onChange={e=>setModal(v=>({...v,name:e.target.value}))}/><div className={styles.grid2}><Input label="Fecha de emisión" type="date" value={modal.issuedAt||''} onChange={e=>setModal(v=>({...v,issuedAt:e.target.value}))}/><Input label="Fecha de vencimiento" type="date" value={modal.expiresAt||''} onChange={e=>setModal(v=>({...v,expiresAt:e.target.value}))}/></div>
      <div className={styles.uploadSection}><span className={styles.uploadLabel}>Subir archivo</span><label className={styles.dropzone}><UploadCloud size={28}/><strong>{modal.selectedFile?.name||modal.fileName||'Selecciona un archivo'}</strong><small>PDF, JPG, PNG, WEBP, DOC o DOCX · máximo 10 MB</small><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e=>setModal(v=>({...v,selectedFile:e.target.files?.[0]||null,fileName:e.target.files?.[0]?.name||v.fileName}))}/></label>{modal.fileUrl&&!modal.selectedFile?<a className={styles.currentFile} href={modal.fileUrl} target="_blank" rel="noreferrer"><FileText size={16}/> Ver archivo actual</a>:null}</div>
      <div className={styles.grid2}><Input label="Nombre del archivo" value={modal.fileName||''} onChange={e=>setModal(v=>({...v,fileName:e.target.value}))}/><Input label="URL externa (opcional)" type="url" value={modal.fileUrl||''} onChange={e=>setModal(v=>({...v,fileUrl:e.target.value}))}/></div><label>Notas<textarea rows="4" value={modal.notes||''} onChange={e=>setModal(v=>({...v,notes:e.target.value}))}/></label></div><div className={styles.modalFooter}><Button type="button" variant="ghost" onClick={()=>setModal(null)}>Cancelar</Button><Button type="submit" loading={saving||uploading}>{uploading?'Subiendo archivo…':'Guardar documento'}</Button></div></form></div>:null}
  </div>
}
