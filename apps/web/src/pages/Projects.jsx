import {useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  Link2,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input} from '../design-system/components';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import KpiInfo from '../components/KpiInfo';
import {ModuleTabs} from '../components/module-system';
import styles from './Projects.module.css';

const statusLabels = {
  PLANNING: 'Planeación',
  ACTIVE: 'Activo',
  ON_HOLD: 'En pausa',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};
const statusTone = {
  PLANNING: 'info',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};
const taskStatusLabels = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  BLOCKED: 'Bloqueada',
  DONE: 'Terminada',
  CANCELLED: 'Cancelada',
};
const taskColumns = ['TODO','IN_PROGRESS','BLOCKED','DONE'];
const priorityLabels = {LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica'};
const priorityTone = {LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger'};

const money = (value) =>
  new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', maximumFractionDigits: 0})
    .format(Number(value || 0));
const decimal = (value, digits = 1) =>
  new Intl.NumberFormat('es-MX', {maximumFractionDigits: digits}).format(Number(value || 0));
const shortDate = (value) =>
  value ? new Intl.DateTimeFormat('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)) : 'Sin fecha';
const dateTime = (value) =>
  value ? new Intl.DateTimeFormat('es-MX', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)) : '—';
const initials = (first = '', last = '') => `${first[0] || ''}${last[0] || ''}`.toUpperCase();
const asInputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

function blankProject() {
  return {
    code: '',
    name: '',
    description: '',
    customerId: '',
    managerId: '',
    parentProjectId: '',
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: '',
    dueDate: '',
    budget: '',
    plannedHours: '',
    tags: '',
  };
}
function blankTask(projectId = '') {
  return {
    projectId,
    title: '',
    description: '',
    assigneeId: '',
    status: 'TODO',
    priority: 'MEDIUM',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    sortOrder: 0,
  };
}
function blankTime(projectId = '') {
  return {
    projectId,
    taskId: '',
    employeeId: '',
    date: new Date().toISOString().slice(0, 10),
    hours: '',
    hourlyCost: '',
    notes: '',
  };
}

export default function Projects() {
  const [data, setData] = useState({
    projects: [],
    employees: [],
    customers: [],
    salesOrders: [],
    purchaseOrders: [],
    summary: {},
  });
  const [tab, setTab] = useState('portfolio');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [projectModal, setProjectModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [timeModal, setTimeModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(preferredId) {
    setLoading(true);
    try {
      const response = await apiRequest('/projects/dashboard');
      setData(response);
      const id = preferredId ?? selectedId;
      if (id && response.projects.some((project) => project.id === id)) {
        setSelectedId(id);
      } else if (!selectedId && response.projects.length) {
        setSelectedId(response.projects[0].id);
      }
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selected = data.projects.find((project) => project.id === selectedId) || null;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.projects;
    return data.projects.filter((project) =>
      `${project.code} ${project.name} ${project.customer?.commercialName || ''} ${project.customer?.legalName || ''} ${project.tags || ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [data.projects, query]);

  async function saveProject(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const editing = Boolean(projectModal.id);
      const response = await apiRequest(
        editing ? `/projects/${projectModal.id}` : '/projects',
        {
          method: editing ? 'PUT' : 'POST',
          body: {
            ...projectModal,
            customerId: projectModal.customerId || null,
            managerId: projectModal.managerId || null,
            parentProjectId: projectModal.parentProjectId || null,
            description: projectModal.description || null,
            startDate: projectModal.startDate || null,
            dueDate: projectModal.dueDate || null,
            budget: Number(projectModal.budget || 0),
            plannedHours: Number(projectModal.plannedHours || 0),
            tags: projectModal.tags || null,
          },
        },
      );
      setProjectModal(null);
      setSelectedId(response.project.id);
      setMessage(['success', editing ? 'Proyecto actualizado' : 'Proyecto creado correctamente']);
      await load(response.project.id);
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function saveTask(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const editing = Boolean(taskModal.id);
      const projectId = taskModal.projectId;
      await apiRequest(
        editing ? `/projects/${projectId}/tasks/${taskModal.id}` : `/projects/${projectId}/tasks`,
        {
          method: editing ? 'PUT' : 'POST',
          body: {
            title: taskModal.title,
            description: taskModal.description || null,
            assigneeId: taskModal.assigneeId || null,
            parentTaskId: taskModal.parentTaskId || null,
            status: taskModal.status,
            priority: taskModal.priority,
            startDate: taskModal.startDate || null,
            dueDate: taskModal.dueDate || null,
            estimatedHours: Number(taskModal.estimatedHours || 0),
            sortOrder: Number(taskModal.sortOrder || 0),
          },
        },
      );
      setTaskModal(null);
      setMessage(['success', editing ? 'Tarea actualizada' : 'Tarea creada']);
      await load(projectId);
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  async function moveTask(task, status) {
    try {
      await apiRequest(`/projects/${selected.id}/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: {status},
      });
      await load(selected.id);
    } catch (error) {
      setMessage(['error', error.message]);
    }
  }

  async function saveTime(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/projects/${timeModal.projectId}/time-entries`, {
        method: 'POST',
        body: {
          taskId: timeModal.taskId || null,
          employeeId: timeModal.employeeId,
          date: timeModal.date,
          hours: Number(timeModal.hours),
          hourlyCost: Number(timeModal.hourlyCost || 0),
          notes: timeModal.notes || null,
        },
      });
      const projectId = timeModal.projectId;
      setTimeModal(null);
      setMessage(['success', 'Horas registradas']);
      await load(projectId);
    } catch (error) {
      setMessage(['error', error.message]);
    } finally {
      setSaving(false);
    }
  }

  function editProject(project) {
    setProjectModal({
      ...project,
      budget: String(project.budget ?? ''),
      plannedHours: String(project.plannedHours ?? ''),
      customerId: project.customerId || '',
      managerId: project.managerId || '',
      parentProjectId: project.parentProjectId || '',
      startDate: asInputDate(project.startDate),
      dueDate: asInputDate(project.dueDate),
      description: project.description || '',
      tags: project.tags || '',
    });
  }

  function editTask(task) {
    setTaskModal({
      ...task,
      projectId: selected.id,
      assigneeId: task.assigneeId || '',
      parentTaskId: task.parentTaskId || '',
      startDate: asInputDate(task.startDate),
      dueDate: asInputDate(task.dueDate),
      estimatedHours: String(task.estimatedHours ?? ''),
      description: task.description || '',
    });
  }

  if (loading && !data.projects.length) {
    return <Card className={styles.loading}>Cargando proyectos…</Card>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Proyectos · Entrega y rentabilidad</span>
          <h1>Proyectos</h1>
          <p>
            Convierte operaciones comerciales en ejecución controlada: tareas, responsables,
            horas, compras, ventas, documentos y rentabilidad en un solo flujo.
          </p>
        </div>
        <div className={styles.headerActions}>
          {selected ? (
            <Button
              variant="secondary"
              icon={Clock3}
              onClick={() => setTimeModal(blankTime(selected.id))}
            >
              Registrar horas
            </Button>
          ) : null}
          <Button icon={Plus} onClick={() => setProjectModal(blankProject())}>
            Nuevo proyecto
          </Button>
        </div>
      </header>

      {message ? (
        <div className={`${styles.message} ${styles[message[0]]}`}>
          <span>{message[1]}</span>
          <button type="button" onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      ) : null}

      <KpiGrid>
        <KpiCard>
          <FolderKanban />
          <span>Proyectos activos</span>
          <KpiInfo title="Proyectos activos">Incluye proyectos en planeación, activos y temporalmente en pausa.</KpiInfo>
          <strong>{data.summary.active || 0}</strong>
          <small>{data.summary.total || 0} proyectos en portafolio</small>
        </KpiCard>
        <KpiCard>
          <CircleDollarSign />
          <span>Presupuesto</span>
          <KpiInfo title="Presupuesto total">Suma del presupuesto asignado a todos los proyectos.</KpiInfo>
          <strong>{money(data.summary.budget)}</strong>
          <small>{money(data.summary.actualCost)} costo real registrado</small>
        </KpiCard>
        <KpiCard>
          <ShoppingBag />
          <span>Ingresos vinculados</span>
          <KpiInfo title="Ingresos vinculados">Valor de pedidos de venta relacionados con proyectos.</KpiInfo>
          <strong>{money(data.summary.revenue)}</strong>
          <small>Pedidos comerciales vinculados</small>
        </KpiCard>
        <KpiCard>
          <TrendingUp />
          <span>Margen proyectado</span>
          <KpiInfo title="Margen">Ingresos vinculados menos compras y costo de horas registradas.</KpiInfo>
          <strong>{money(data.summary.margin)}</strong>
          <small>Antes de otros gastos indirectos</small>
        </KpiCard>
        <KpiCard>
          <AlertTriangle />
          <span>Tareas vencidas</span>
          <KpiInfo title="Tareas vencidas">Tareas no terminadas cuya fecha límite ya pasó.</KpiInfo>
          <strong>{data.summary.overdueTasks || 0}</strong>
          <small>{decimal(data.summary.hours)} h registradas</small>
        </KpiCard>
      </KpiGrid>

      <ModuleTabs
        active={tab}
        onChange={setTab}
        items={[
          {id:'portfolio',label:'Portafolio',icon:BriefcaseBusiness},
          {id:'board',label:'Tareas',icon:ListChecks},
          {id:'costs',label:'Tiempos y costos',icon:CircleDollarSign},
          {id:'workspace',label:'Colaboración',icon:Paperclip}
        ]}
      />

      <div className={styles.workspace}>
        <aside className={styles.projectRail}>
          <div className={styles.railTop}>
            <label className={styles.search}>
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar proyecto…" />
            </label>
          </div>
          <div className={styles.projectList}>
            {filtered.map((project) => (
              <button
                key={project.id}
                type="button"
                className={selectedId === project.id ? styles.selectedProject : ''}
                onClick={() => setSelectedId(project.id)}
              >
                <div className={styles.projectListTop}>
                  <span>{project.code}</span>
                  <Badge tone={statusTone[project.status]}>{statusLabels[project.status]}</Badge>
                </div>
                <strong>{project.name}</strong>
                <small>{project.customer?.commercialName || project.customer?.legalName || 'Proyecto interno'}</small>
                <div className={styles.miniProgress}><i style={{width: `${project.metrics.taskProgress}%`}} /></div>
                <footer>
                  <span>{project.metrics.taskProgress}%</span>
                  <span>{shortDate(project.dueDate)}</span>
                </footer>
              </button>
            ))}
            {!filtered.length ? <Empty text="No hay proyectos que coincidan." /> : null}
          </div>
        </aside>

        <main className={styles.main}>
          {!selected ? (
            <Card className={styles.noSelection}>
              <FolderKanban size={38} />
              <h2>Crea tu primer proyecto</h2>
              <p>Conecta clientes, equipo, tareas, compras, ventas y costos.</p>
              <Button icon={Plus} onClick={() => setProjectModal(blankProject())}>Nuevo proyecto</Button>
            </Card>
          ) : (
            <>
              <ProjectHeader
                project={selected}
                onEdit={() => editProject(selected)}
                onTask={() => setTaskModal(blankTask(selected.id))}
              />

              {tab === 'portfolio' ? (
                <Portfolio project={selected} onEdit={() => editProject(selected)} />
              ) : null}
              {tab === 'board' ? (
                <TaskBoard
                  project={selected}
                  employees={data.employees}
                  onCreate={() => setTaskModal(blankTask(selected.id))}
                  onEdit={editTask}
                  onMove={moveTask}
                />
              ) : null}
              {tab === 'costs' ? (
                <Costs
                  project={selected}
                  salesOrders={data.salesOrders}
                  purchaseOrders={data.purchaseOrders}
                  onTime={() => setTimeModal(blankTime(selected.id))}
                  onReload={() => load(selected.id)}
                  onMessage={setMessage}
                />
              ) : null}
              {tab === 'workspace' ? (
                <Collaboration
                  project={selected}
                  employees={data.employees}
                  onReload={() => load(selected.id)}
                  onMessage={setMessage}
                />
              ) : null}
            </>
          )}
        </main>
      </div>

      {projectModal ? (
        <ProjectModal
          value={projectModal}
          setValue={setProjectModal}
          projects={data.projects}
          customers={data.customers}
          employees={data.employees}
          onClose={() => setProjectModal(null)}
          onSubmit={saveProject}
          saving={saving}
        />
      ) : null}

      {taskModal ? (
        <TaskModal
          value={taskModal}
          setValue={setTaskModal}
          project={data.projects.find((p) => p.id === taskModal.projectId)}
          employees={data.employees}
          onClose={() => setTaskModal(null)}
          onSubmit={saveTask}
          saving={saving}
        />
      ) : null}

      {timeModal ? (
        <TimeModal
          value={timeModal}
          setValue={setTimeModal}
          project={data.projects.find((p) => p.id === timeModal.projectId)}
          employees={data.employees}
          onClose={() => setTimeModal(null)}
          onSubmit={saveTime}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function ProjectHeader({project, onEdit, onTask}) {
  return (
    <Card className={styles.projectHeader}>
      <div className={styles.projectIdentity}>
        <div className={styles.projectMark}>{project.code.slice(-3)}</div>
        <div>
          <div className={styles.projectMetaLine}>
            <span>{project.code}</span>
            <Badge tone={statusTone[project.status]}>{statusLabels[project.status]}</Badge>
            <Badge tone={priorityTone[project.priority]}>{priorityLabels[project.priority]}</Badge>
          </div>
          <h2>{project.name}</h2>
          <p>{project.description || 'Sin descripción.'}</p>
        </div>
      </div>
      <div className={styles.projectHeaderActions}>
        <Button variant="ghost" onClick={onEdit}>Editar</Button>
        <Button icon={Plus} onClick={onTask}>Nueva tarea</Button>
      </div>
    </Card>
  );
}

function Portfolio({project, onEdit}) {
  const m = project.metrics;
  const budgetBar = Math.min(100, m.budgetUsed || 0);
  return (
    <div className={styles.portfolioGrid}>
      <Card className={styles.progressCard}>
        <SectionHeader eyebrow="Entrega" title="Avance del proyecto" />
        <div className={styles.bigProgress}>
          <div className={styles.progressDial} style={{'--value': `${m.taskProgress * 3.6}deg`}}>
            <span><strong>{m.taskProgress}%</strong><small>completado</small></span>
          </div>
          <div className={styles.progressStats}>
            <Metric label="Tareas terminadas" value={`${m.tasksDone} / ${m.tasksTotal}`} />
            <Metric label="Horas utilizadas" value={`${decimal(m.laborHours)} / ${decimal(m.plannedHours)} h`} />
            <Metric label="Tareas vencidas" value={m.overdueTasks} danger={m.overdueTasks > 0} />
          </div>
        </div>
      </Card>

      <Card className={styles.financeCard}>
        <SectionHeader eyebrow="Rentabilidad" title="Presupuesto vs. ejecución" />
        <div className={styles.financeBody}>
          <div className={styles.financeNumbers}>
            <Metric label="Presupuesto" value={money(project.budget)} />
            <Metric label="Costo real" value={money(m.actualCost)} />
            <Metric label="Ingresos vinculados" value={money(m.revenue)} />
            <Metric label="Margen" value={money(m.margin)} positive={m.margin >= 0} />
          </div>
          <div className={styles.budgetTrack}><i style={{width: `${budgetBar}%`}} /></div>
          <footer>
            <span>{m.budgetUsed}% del presupuesto utilizado</span>
            <strong>{money(Math.max(0, Number(project.budget) - m.actualCost))} disponible</strong>
          </footer>
        </div>
      </Card>

      <Card className={styles.infoCard}>
        <SectionHeader eyebrow="Contexto" title="Ficha del proyecto" action="Editar" onAction={onEdit} />
        <div className={styles.infoRows}>
          <InfoRow icon={Building2} label="Cliente" value={project.customer?.commercialName || project.customer?.legalName || 'Proyecto interno'} />
          <InfoRow icon={Users} label="Responsable" value={project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : 'Sin asignar'} />
          <InfoRow icon={CalendarDays} label="Inicio" value={shortDate(project.startDate)} />
          <InfoRow icon={CalendarDays} label="Fecha objetivo" value={shortDate(project.dueDate)} />
          <InfoRow icon={FolderKanban} label="Proyecto padre" value={project.parentProject?.name || 'Proyecto principal'} />
        </div>
      </Card>

      <Card className={styles.teamCard}>
        <SectionHeader eyebrow="Equipo" title={`${project.members.length} participantes`} />
        <div className={styles.teamList}>
          {project.members.map((member) => (
            <article key={member.id}>
              <span className={styles.avatar}>{initials(member.employee.firstName, member.employee.lastName)}</span>
              <div>
                <strong>{member.employee.firstName} {member.employee.lastName}</strong>
                <small>{member.role || member.employee.position?.name || 'Miembro del proyecto'}</small>
              </div>
              <i>{member.allocationPercent}%</i>
            </article>
          ))}
          {!project.members.length ? <Empty text="Aún no hay equipo asignado." /> : null}
        </div>
      </Card>

      {project.subprojects.length ? (
        <Card className={styles.subprojectsCard}>
          <SectionHeader eyebrow="Jerarquía" title="Subproyectos" />
          <div className={styles.subprojectList}>
            {project.subprojects.map((child) => (
              <div key={child.id}>
                <span><FolderKanban size={16} /></span>
                <div><strong>{child.name}</strong><small>{child.code}</small></div>
                <Badge tone={statusTone[child.status]}>{statusLabels[child.status]}</Badge>
                <strong>{child.progress}%</strong>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function TaskBoard({project, onCreate, onEdit, onMove}) {
  return (
    <Card className={styles.boardCard}>
      <div className={styles.toolbar}>
        <div><span className={styles.eyebrow}>Ejecución</span><h3>Tablero de tareas</h3></div>
        <Button icon={Plus} onClick={onCreate}>Nueva tarea</Button>
      </div>
      <div className={styles.kanban}>
        {taskColumns.map((status) => {
          const tasks = project.tasks.filter((task) => task.status === status);
          return (
            <section className={styles.column} key={status}>
              <header>
                <span>{taskStatusLabels[status]}</span>
                <i>{tasks.length}</i>
              </header>
              <div className={styles.taskList}>
                {tasks.map((task) => {
                  const overdue = task.dueDate && status !== 'DONE' && new Date(task.dueDate) < new Date();
                  return (
                    <article key={task.id}>
                      <div className={styles.taskTop}>
                        <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                        {overdue ? <span className={styles.overdue}><AlertTriangle size={13} /> Vencida</span> : null}
                      </div>
                      <button type="button" className={styles.taskTitle} onClick={() => onEdit(task)}>
                        <strong>{task.title}</strong>
                        <small>{task.description || 'Sin descripción'}</small>
                      </button>
                      <div className={styles.taskAssignee}>
                        <span className={styles.avatarSmall}>
                          {task.assignee ? initials(task.assignee.firstName, task.assignee.lastName) : '—'}
                        </span>
                        <div>
                          <strong>{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Sin responsable'}</strong>
                          <small>{decimal(task.estimatedHours)} h estimadas</small>
                        </div>
                      </div>
                      <div className={styles.taskDue}><CalendarDays size={14} /> {shortDate(task.dueDate)}</div>
                      <select value={task.status} onChange={(e) => onMove(task, e.target.value)}>
                        {taskColumns.map((option) => <option key={option} value={option}>{taskStatusLabels[option]}</option>)}
                        <option value="CANCELLED">Cancelada</option>
                      </select>
                    </article>
                  );
                })}
                {!tasks.length ? <Empty text="Sin tareas" /> : null}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function Costs({project, salesOrders, purchaseOrders, onTime, onReload, onMessage}) {
  const [linkType, setLinkType] = useState('SALES_ORDER');
  const [referenceId, setReferenceId] = useState('');
  const [linking, setLinking] = useState(false);
  const m = project.metrics;

  async function linkReference(event) {
    event.preventDefault();
    if (!referenceId) return;
    setLinking(true);
    try {
      await apiRequest(`/projects/${project.id}/links`, {
        method: 'POST',
        body: {type: linkType, referenceId},
      });
      setReferenceId('');
      onMessage(['success', 'Documento vinculado al proyecto']);
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    } finally {
      setLinking(false);
    }
  }

  async function unlink(type, linkId) {
    try {
      await apiRequest(`/projects/${project.id}/links/${type}/${linkId}`, {method: 'DELETE'});
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    }
  }

  const options = linkType === 'SALES_ORDER' ? salesOrders : purchaseOrders;

  return (
    <div className={styles.costGrid}>
      <Card className={styles.costBreakdown}>
        <SectionHeader eyebrow="Costeo" title="Estructura del costo real" />
        <div className={styles.costBars}>
          <CostBar label="Compras vinculadas" value={m.purchaseCost} total={m.actualCost} icon={ShoppingCart} />
          <CostBar label="Mano de obra" value={m.laborCost} total={m.actualCost} icon={Clock3} />
        </div>
        <div className={styles.costTotals}>
          <Metric label="Costo real" value={money(m.actualCost)} />
          <Metric label="Presupuesto" value={money(project.budget)} />
          <Metric label="Ingresos" value={money(m.revenue)} />
          <Metric label="Margen" value={money(m.margin)} positive={m.margin >= 0} />
        </div>
      </Card>

      <Card className={styles.hoursCard}>
        <SectionHeader eyebrow="Timesheet" title="Horas registradas" action="Registrar horas" onAction={onTime} />
        <div className={styles.timeList}>
          {project.timeEntries.slice(0, 12).map((entry) => (
            <article key={entry.id}>
              <span className={styles.avatar}>{initials(entry.employee.firstName, entry.employee.lastName)}</span>
              <div>
                <strong>{entry.employee.firstName} {entry.employee.lastName}</strong>
                <small>{entry.task?.title || 'Tiempo general'} · {shortDate(entry.date)}</small>
              </div>
              <div className={styles.timeAmount}>
                <strong>{decimal(entry.hours)} h</strong>
                <small>{money(Number(entry.hours) * Number(entry.hourlyCost))}</small>
              </div>
            </article>
          ))}
          {!project.timeEntries.length ? <Empty text="No hay horas registradas." /> : null}
        </div>
      </Card>

      <Card className={styles.linksCard}>
        <SectionHeader eyebrow="Integraciones ERP" title="Ventas y compras vinculadas" />
        <form className={styles.linkForm} onSubmit={linkReference}>
          <select value={linkType} onChange={(e) => {setLinkType(e.target.value); setReferenceId('');}}>
            <option value="SALES_ORDER">Pedido de venta</option>
            <option value="PURCHASE_ORDER">Orden de compra</option>
          </select>
          <select value={referenceId} onChange={(e) => setReferenceId(e.target.value)} required>
            <option value="">Seleccionar documento…</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.folio} · {linkType === 'SALES_ORDER'
                  ? (item.customer?.commercialName || item.customer?.legalName)
                  : item.supplier?.commercialName || item.supplier?.legalName} · {money(item.total)}
              </option>
            ))}
          </select>
          <Button type="submit" icon={Link2} loading={linking}>Vincular</Button>
        </form>

        <div className={styles.linkList}>
          {project.salesOrders.map((link) => (
            <article key={link.id}>
              <span className={styles.linkIcon}><ShoppingBag size={16} /></span>
              <div>
                <strong>{link.salesOrder.folio}</strong>
                <small>Venta · {link.salesOrder.customer?.commercialName || link.salesOrder.customer?.legalName}</small>
              </div>
              <strong>{money(link.salesOrder.total)}</strong>
              <button type="button" onClick={() => unlink('sales', link.id)}><Trash2 size={15} /></button>
            </article>
          ))}
          {project.purchaseOrders.map((link) => (
            <article key={link.id}>
              <span className={styles.linkIcon}><ShoppingCart size={16} /></span>
              <div>
                <strong>{link.purchaseOrder.folio}</strong>
                <small>Compra · {link.purchaseOrder.supplier?.commercialName || link.purchaseOrder.supplier?.legalName}</small>
              </div>
              <strong>{money(link.purchaseOrder.total)}</strong>
              <button type="button" onClick={() => unlink('purchase', link.id)}><Trash2 size={15} /></button>
            </article>
          ))}
          {!project.salesOrders.length && !project.purchaseOrders.length ? <Empty text="Aún no hay documentos comerciales vinculados." /> : null}
        </div>
      </Card>
    </div>
  );
}

function Collaboration({project, employees, onReload, onMessage}) {
  const [comment, setComment] = useState('');
  const [member, setMember] = useState({employeeId: '', role: '', allocationPercent: 100});
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function addComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await apiRequest(`/projects/${project.id}/comments`, {
        method: 'POST',
        body: {body: comment.trim()},
      });
      setComment('');
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!member.employeeId) return;
    try {
      await apiRequest(`/projects/${project.id}/members`, {
        method: 'POST',
        body: {...member, allocationPercent: Number(member.allocationPercent)},
      });
      setMember({employeeId: '', role: '', allocationPercent: 100});
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    }
  }

  async function removeMember(memberId) {
    try {
      await apiRequest(`/projects/${project.id}/members/${memberId}`, {method: 'DELETE'});
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    }
  }

  async function uploadFile(event) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name);
      await apiRequest(`/projects/${project.id}/documents/upload`, {method: 'POST', body: form});
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onMessage(['success', 'Archivo agregado al proyecto']);
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId) {
    try {
      await apiRequest(`/projects/${project.id}/documents/${documentId}`, {method: 'DELETE'});
      await onReload();
    } catch (error) {
      onMessage(['error', error.message]);
    }
  }

  return (
    <div className={styles.collaborationGrid}>
      <Card className={styles.teamManage}>
        <SectionHeader eyebrow="Recursos" title="Equipo del proyecto" />
        <form className={styles.memberForm} onSubmit={addMember}>
          <select value={member.employeeId} onChange={(e) => setMember((v) => ({...v, employeeId: e.target.value}))} required>
            <option value="">Seleccionar empleado…</option>
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>{employee.firstName} {employee.lastName} · {employee.position?.name || 'Sin puesto'}</option>
            ))}
          </select>
          <Input label="Rol en proyecto" value={member.role} onChange={(e) => setMember((v) => ({...v, role: e.target.value}))} placeholder="Ej. Analista, Líder técnico" />
          <Input label="Asignación %" type="number" min="1" max="100" value={member.allocationPercent} onChange={(e) => setMember((v) => ({...v, allocationPercent: e.target.value}))} />
          <Button type="submit" icon={Plus}>Asignar</Button>
        </form>
        <div className={styles.memberList}>
          {project.members.map((item) => (
            <article key={item.id}>
              <span className={styles.avatar}>{initials(item.employee.firstName, item.employee.lastName)}</span>
              <div><strong>{item.employee.firstName} {item.employee.lastName}</strong><small>{item.role || item.employee.position?.name || 'Miembro'} · {item.allocationPercent}%</small></div>
              <button type="button" onClick={() => removeMember(item.id)}><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      </Card>

      <Card className={styles.commentsCard}>
        <SectionHeader eyebrow="Bitácora" title="Comentarios" />
        <form className={styles.commentForm} onSubmit={addComment}>
          <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe una actualización, decisión o nota del proyecto…" />
          <Button type="submit" icon={MessageSquare}>Comentar</Button>
        </form>
        <div className={styles.comments}>
          {project.comments.map((item) => (
            <article key={item.id}>
              <span className={styles.avatar}>{initials(item.createdBy.firstName, item.createdBy.lastName)}</span>
              <div>
                <header><strong>{item.createdBy.firstName} {item.createdBy.lastName}</strong><time>{dateTime(item.createdAt)}</time></header>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
          {!project.comments.length ? <Empty text="Sin comentarios todavía." /> : null}
        </div>
      </Card>

      <Card className={styles.documentsCard}>
        <SectionHeader eyebrow="Documentación" title="Archivos del proyecto" />
        <form className={styles.uploadForm} onSubmit={uploadFile}>
          <label className={styles.dropzone}>
            <Upload size={22} />
            <strong>{file ? file.name : 'Seleccionar archivo'}</strong>
            <small>PDF, imágenes, Word, Excel o TXT · máximo 15 MB</small>
            <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <Button type="submit" loading={uploading} disabled={!file}>Subir archivo</Button>
        </form>
        <div className={styles.documentList}>
          {project.documents.map((document) => (
            <article key={document.id}>
              <span><FileText size={18} /></span>
              <div>
                <a href={document.fileUrl} target="_blank" rel="noreferrer">{document.name}</a>
                <small>{document.uploadedBy.firstName} {document.uploadedBy.lastName} · {shortDate(document.createdAt)}</small>
              </div>
              <button type="button" onClick={() => deleteDocument(document.id)}><Trash2 size={15} /></button>
            </article>
          ))}
          {!project.documents.length ? <Empty text="No hay archivos adjuntos." /> : null}
        </div>
      </Card>
    </div>
  );
}

function ProjectModal({value, setValue, projects, customers, employees, onClose, onSubmit, saving}) {
  const possibleParents = projects.filter((project) => project.id !== value.id);
  return (
    <Modal onClose={onClose} title={value.id ? 'Editar proyecto' : 'Nuevo proyecto'} eyebrow="Project Management">
      <form onSubmit={onSubmit}>
        <div className={styles.modalBody}>
          <div className={styles.grid2}>
            <Input label="Código" required value={value.code} onChange={(e) => setValue((v) => ({...v, code: e.target.value.toUpperCase()}))} placeholder="PRY-0001" />
            <Input label="Nombre" required value={value.name} onChange={(e) => setValue((v) => ({...v, name: e.target.value}))} />
          </div>
          <label>Descripción<textarea rows="3" value={value.description} onChange={(e) => setValue((v) => ({...v, description: e.target.value}))} /></label>
          <div className={styles.grid2}>
            <label>Cliente<select value={value.customerId} onChange={(e) => setValue((v) => ({...v, customerId: e.target.value}))}><option value="">Proyecto interno</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.commercialName || customer.legalName}</option>)}</select></label>
            <label>Responsable<select value={value.managerId} onChange={(e) => setValue((v) => ({...v, managerId: e.target.value}))}><option value="">Sin asignar</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          </div>
          <div className={styles.grid3}>
            <label>Estado<select value={value.status} onChange={(e) => setValue((v) => ({...v, status: e.target.value}))}>{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Prioridad<select value={value.priority} onChange={(e) => setValue((v) => ({...v, priority: e.target.value}))}>{Object.entries(priorityLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Proyecto padre<select value={value.parentProjectId} onChange={(e) => setValue((v) => ({...v, parentProjectId: e.target.value}))}><option value="">Proyecto principal</option>{possibleParents.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label>
          </div>
          <div className={styles.grid2}>
            <Input label="Fecha de inicio" type="date" value={value.startDate} onChange={(e) => setValue((v) => ({...v, startDate: e.target.value}))} />
            <Input label="Fecha objetivo" type="date" value={value.dueDate} onChange={(e) => setValue((v) => ({...v, dueDate: e.target.value}))} />
          </div>
          <div className={styles.grid2}>
            <Input label="Presupuesto" type="number" min="0" step="0.01" value={value.budget} onChange={(e) => setValue((v) => ({...v, budget: e.target.value}))} />
            <Input label="Horas planeadas" type="number" min="0" step="0.5" value={value.plannedHours} onChange={(e) => setValue((v) => ({...v, plannedHours: e.target.value}))} />
          </div>
          <Input label="Etiquetas" value={value.tags} onChange={(e) => setValue((v) => ({...v, tags: e.target.value}))} placeholder="implementación, cliente, prioridad…" />
        </div>
        <ModalFooter onClose={onClose} saving={saving} label={value.id ? 'Guardar cambios' : 'Crear proyecto'} />
      </form>
    </Modal>
  );
}

function TaskModal({value, setValue, project, employees, onClose, onSubmit, saving}) {
  return (
    <Modal onClose={onClose} title={value.id ? 'Editar tarea' : 'Nueva tarea'} eyebrow={project?.code || 'Proyecto'}>
      <form onSubmit={onSubmit}>
        <div className={styles.modalBody}>
          <Input label="Título" required value={value.title} onChange={(e) => setValue((v) => ({...v, title: e.target.value}))} />
          <label>Descripción<textarea rows="3" value={value.description} onChange={(e) => setValue((v) => ({...v, description: e.target.value}))} /></label>
          <div className={styles.grid3}>
            <label>Estado<select value={value.status} onChange={(e) => setValue((v) => ({...v, status: e.target.value}))}>{Object.entries(taskStatusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Prioridad<select value={value.priority} onChange={(e) => setValue((v) => ({...v, priority: e.target.value}))}>{Object.entries(priorityLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Responsable<select value={value.assigneeId} onChange={(e) => setValue((v) => ({...v, assigneeId: e.target.value}))}><option value="">Sin asignar</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          </div>
          <div className={styles.grid3}>
            <Input label="Inicio" type="date" value={value.startDate} onChange={(e) => setValue((v) => ({...v, startDate: e.target.value}))} />
            <Input label="Vencimiento" type="date" value={value.dueDate} onChange={(e) => setValue((v) => ({...v, dueDate: e.target.value}))} />
            <Input label="Horas estimadas" type="number" min="0" step="0.5" value={value.estimatedHours} onChange={(e) => setValue((v) => ({...v, estimatedHours: e.target.value}))} />
          </div>
        </div>
        <ModalFooter onClose={onClose} saving={saving} label={value.id ? 'Guardar tarea' : 'Crear tarea'} />
      </form>
    </Modal>
  );
}

function TimeModal({value, setValue, project, employees, onClose, onSubmit, saving}) {
  return (
    <Modal onClose={onClose} title="Registrar horas" eyebrow={project?.code || 'Timesheet'}>
      <form onSubmit={onSubmit}>
        <div className={styles.modalBody}>
          <div className={styles.grid2}>
            <label>Empleado<select required value={value.employeeId} onChange={(e) => setValue((v) => ({...v, employeeId: e.target.value}))}><option value="">Seleccionar…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
            <label>Tarea<select value={value.taskId} onChange={(e) => setValue((v) => ({...v, taskId: e.target.value}))}><option value="">Tiempo general</option>{project?.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          </div>
          <div className={styles.grid3}>
            <Input label="Fecha" type="date" required value={value.date} onChange={(e) => setValue((v) => ({...v, date: e.target.value}))} />
            <Input label="Horas" type="number" min="0.25" max="24" step="0.25" required value={value.hours} onChange={(e) => setValue((v) => ({...v, hours: e.target.value}))} />
            <Input label="Costo por hora" type="number" min="0" step="0.01" value={value.hourlyCost} onChange={(e) => setValue((v) => ({...v, hourlyCost: e.target.value}))} />
          </div>
          <label>Notas<textarea rows="3" value={value.notes} onChange={(e) => setValue((v) => ({...v, notes: e.target.value}))} /></label>
        </div>
        <ModalFooter onClose={onClose} saving={saving} label="Registrar tiempo" />
      </form>
    </Modal>
  );
}

function Modal({children, title, eyebrow, onClose}) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div><span>{eyebrow}</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose}><X size={19} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({onClose, saving, label}) {
  return (
    <footer className={styles.modalFooter}>
      <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button type="submit" loading={saving}>{label}</Button>
    </footer>
  );
}

function SectionHeader({eyebrow, title, action, onAction}) {
  return (
    <header className={styles.sectionHeader}>
      <div><span>{eyebrow}</span><h3>{title}</h3></div>
      {action ? <button type="button" onClick={onAction}>{action} <ArrowRight size={14} /></button> : null}
    </header>
  );
}

function Metric({label, value, danger, positive}) {
  return (
    <div className={styles.metric}>
      <small>{label}</small>
      <strong className={danger ? styles.dangerText : positive ? styles.positiveText : ''}>{value}</strong>
    </div>
  );
}

function InfoRow({icon: Icon, label, value}) {
  return (
    <div className={styles.infoRow}>
      <span><Icon size={16} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function CostBar({label, value, total, icon: Icon}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.costBar}>
      <div><span><Icon size={15} /> {label}</span><strong>{money(value)}</strong></div>
      <div className={styles.costTrack}><i style={{width: `${pct}%`}} /></div>
      <small>{pct}% del costo real</small>
    </div>
  );
}

function Empty({text}) {
  return <div className={styles.empty}>{text}</div>;
}
