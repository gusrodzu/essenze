import {useState} from 'react';
import {ArrowRight, Eye, EyeOff, Hexagon, LockKeyhole, Mail} from 'lucide-react';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const {authenticated, login} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({email, password});
      navigate(location.state?.from?.pathname ?? '/', {replace: true});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brand}><span><Hexagon size={24}/></span><strong>BuzzBee Business OS</strong></div>
        <div className={styles.message}>
          <span>Tu negocio, conectado</span>
          <h1>Toda tu operación en un solo sistema.</h1>
          <p>Compras, inventario, finanzas, RR. HH., reportes e inteligencia conectados en una sola experiencia.</p>
        </div>
        <small>Versión 13.0.1 RC1.1 · Demo comercial</small>
      </section>

      <section className={styles.formPanel}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <header><span>Bienvenido de nuevo</span><h2>Inicia sesión</h2><p>Ingresa tus credenciales para acceder al ERP.</p></header>
          <label>Correo electrónico<div><Mail size={18}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></div></label>
          <label>Contraseña<div><LockKeyhole size={18}/><input type={showPassword?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8}/><button type="button" onClick={()=>setShowPassword((v)=>!v)} aria-label="Mostrar contraseña">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {error ? <div className={styles.error}>{error}</div> : null}
          <button className={styles.submit} disabled={submitting}>{submitting?'Validando…':'Entrar al ERP'}<ArrowRight size={18}/></button>
          <div className={styles.demoActions}>
            <button
              type="button"
              onClick={() => {
                setEmail('demo@buzzbee.mx');
                setPassword('BuzzBee2026!');
                setError('');
              }}
            >
              Usar Demo Company
            </button>
            <p className={styles.demo}>Demo interna: <strong>demo@buzzbee.mx</strong> / <strong>BuzzBee2026!</strong></p>
          </div>
        </form>
      </section>
    </main>
  );
}
