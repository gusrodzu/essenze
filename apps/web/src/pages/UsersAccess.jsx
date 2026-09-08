import {Edit3, Plus, ShieldCheck, UserCheck, UserPlus, Users as UsersIcon, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../api';
import {Badge, Button, Card, Input, Switch} from '../design-system/components';
import styles from './UsersAccess.module.css';

const emptyUser = {firstName: '', lastName: '', email: '', password: '', active: true, roleIds: []};
const emptyRole = {name: '', description: '', permissionIds: []};

export default function UsersAccess() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [userForm, setUserForm] = useState(null);
  const [roleForm, setRoleForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeUsers = useMemo(() => users.filter((user) => user.active).length, [users]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.all([
        apiRequest('/admin/users'),
        apiRequest('/admin/roles'),
      ]);
      setUsers(usersResult.users);
      setRoles(rolesResult.roles);
      setPermissions(rolesResult.permissions);
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function toggleValue(list, value) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const editing = Boolean(userForm.id);
      await apiRequest(editing ? `/admin/users/${userForm.id}` : '/admin/users', {
        method: editing ? 'PUT' : 'POST',
        body: userForm,
      });
      setUserForm(null);
      await loadData();
      setMessage({type: 'success', text: editing ? 'Usuario actualizado.' : 'Usuario creado.'});
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    try {
      await apiRequest(`/admin/users/${user.id}/status`, {method: 'PATCH', body: {active: !user.active}});
      setUsers((current) => current.map((item) => item.id === user.id ? {...item, active: !item.active} : item));
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    }
  }

  async function saveRole(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const editing = Boolean(roleForm.id);
      await apiRequest(editing ? `/admin/roles/${roleForm.id}` : '/admin/roles', {
        method: editing ? 'PUT' : 'POST',
        body: roleForm,
      });
      setRoleForm(null);
      await loadData();
      setMessage({type: 'success', text: editing ? 'Rol actualizado.' : 'Rol creado.'});
    } catch (error) {
      setMessage({type: 'error', text: error.message});
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}>Cargando usuarios y permisos…</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Administración de acceso</span>
          <h1>Usuarios, roles y permisos</h1>
          <p>Controla quién puede entrar al ERP y qué acciones puede realizar.</p>
        </div>
        <Button icon={tab === 'users' ? UserPlus : Plus} onClick={() => tab === 'users' ? setUserForm({...emptyUser}) : setRoleForm({...emptyRole})}>
          {tab === 'users' ? 'Nuevo usuario' : 'Nuevo rol'}
        </Button>
      </header>

      {message ? <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div> : null}

      <div className={styles.summaryGrid}>
        <Card className={styles.metric}><UsersIcon size={20}/><span>Usuarios</span><strong>{users.length}</strong></Card>
        <Card className={styles.metric}><UserCheck size={20}/><span>Activos</span><strong>{activeUsers}</strong></Card>
        <Card className={styles.metric}><ShieldCheck size={20}/><span>Roles</span><strong>{roles.length}</strong></Card>
      </div>

      <div className={styles.tabs}>
        <button className={tab === 'users' ? styles.activeTab : ''} onClick={() => setTab('users')}>Usuarios</button>
        <button className={tab === 'roles' ? styles.activeTab : ''} onClick={() => setTab('roles')}>Roles y permisos</button>
      </div>

      {tab === 'users' ? (
        <Card className={styles.panel}>
          <div className={styles.tableHeader}><div><h2>Directorio de usuarios</h2><p>Personas con acceso a la organización.</p></div></div>
          <div className={styles.list}>
            {users.map((user) => (
              <article className={styles.row} key={user.id}>
                <div className={styles.avatar}>{user.firstName[0]}{user.lastName[0]}</div>
                <div className={styles.mainInfo}><strong>{user.fullName}</strong><span>{user.email}</span></div>
                <div className={styles.roleBadges}>{user.roles.map((role) => <Badge key={role.id} tone="info">{role.name}</Badge>)}</div>
                <Badge tone={user.active ? 'success' : 'neutral'}>{user.active ? 'Activo' : 'Inactivo'}</Badge>
                <Switch checked={user.active} onChange={() => toggleStatus(user)} />
                <button className={styles.iconButton} onClick={() => setUserForm({...user, password: '', roleIds: user.roles.map((role) => role.id)})} aria-label="Editar usuario"><Edit3 size={17}/></button>
              </article>
            ))}
          </div>
        </Card>
      ) : (
        <div className={styles.roleGrid}>
          {roles.map((role) => (
            <Card className={styles.roleCard} key={role.id}>
              <div className={styles.roleHeading}><div><Badge tone="info">{role._count.users} usuarios</Badge><h2>{role.name}</h2><p>{role.description || 'Sin descripción'}</p></div><button className={styles.iconButton} onClick={() => setRoleForm({id: role.id, name: role.name, description: role.description ?? '', permissionIds: role.permissions.map((permission) => permission.id)})}><Edit3 size={17}/></button></div>
              <div className={styles.permissionList}>{role.permissions.map((permission) => <span key={permission.id}>{permission.name}</span>)}</div>
            </Card>
          ))}
        </div>
      )}

      {userForm ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveUser}>
            <div className={styles.modalHeader}><div><span className={styles.eyebrow}>Acceso al ERP</span><h2>{userForm.id ? 'Editar usuario' : 'Nuevo usuario'}</h2></div><button type="button" onClick={() => setUserForm(null)}><X size={20}/></button></div>
            <div className={styles.formGrid}>
              <Input label="Nombre" value={userForm.firstName} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} required />
              <Input label="Apellido" value={userForm.lastName} onChange={(e) => setUserForm({...userForm, lastName: e.target.value})} required />
              <Input label="Correo" type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} required />
              <Input label={userForm.id ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} required={!userForm.id} />
            </div>
            <div className={styles.selector}><strong>Roles asignados</strong><div className={styles.checkGrid}>{roles.map((role) => <label key={role.id}><input type="checkbox" checked={userForm.roleIds.includes(role.id)} onChange={() => setUserForm({...userForm, roleIds: toggleValue(userForm.roleIds, role.id)})}/><span>{role.name}</span></label>)}</div></div>
            <div className={styles.statusField}><span><strong>Usuario activo</strong><small>Podrá iniciar sesión mientras esté activo.</small></span><Switch checked={userForm.active} onChange={(active) => setUserForm({...userForm, active})}/></div>
            <div className={styles.actions}><Button type="button" variant="ghost" onClick={() => setUserForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar usuario</Button></div>
          </form>
        </div>
      ) : null}

      {roleForm ? (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={saveRole}>
            <div className={styles.modalHeader}><div><span className={styles.eyebrow}>Control de permisos</span><h2>{roleForm.id ? 'Editar rol' : 'Nuevo rol'}</h2></div><button type="button" onClick={() => setRoleForm(null)}><X size={20}/></button></div>
            <div className={styles.formGrid}>
              <Input label="Nombre del rol" value={roleForm.name} onChange={(e) => setRoleForm({...roleForm, name: e.target.value})} required />
              <Input label="Descripción" value={roleForm.description} onChange={(e) => setRoleForm({...roleForm, description: e.target.value})} />
            </div>
            <div className={styles.selector}><strong>Permisos</strong><div className={styles.checkGrid}>{permissions.map((permission) => <label key={permission.id}><input type="checkbox" checked={roleForm.permissionIds.includes(permission.id)} onChange={() => setRoleForm({...roleForm, permissionIds: toggleValue(roleForm.permissionIds, permission.id)})}/><span><b>{permission.name}</b><small>{permission.key}</small></span></label>)}</div></div>
            <div className={styles.actions}><Button type="button" variant="ghost" onClick={() => setRoleForm(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar rol</Button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
