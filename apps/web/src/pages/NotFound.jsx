import {ArrowLeft,Home,SearchX} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Card} from '../design-system/components';
import styles from './NotFound.module.css';

export default function NotFound(){
  return <div className={styles.page}>
    <Card className={styles.card}>
      <SearchX size={42}/>
      <span>Ruta no disponible</span>
      <h1>Esta sección no existe o todavía no está habilitada.</h1>
      <p>Regresa al inicio o utiliza la navegación lateral para continuar con tu operación.</p>
      <div>
        <Link to="/"><Home size={17}/> Ir al inicio</Link>
        <button type="button" onClick={()=>history.back()}><ArrowLeft size={17}/> Regresar</button>
      </div>
    </Card>
  </div>;
}
