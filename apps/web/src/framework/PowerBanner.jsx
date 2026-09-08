import {ArrowRight, Lightbulb} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import styles from './PowerBanner.module.css';

export default function PowerBanner(){
  const navigate=useNavigate();

  return (
    <aside className={styles.banner} aria-label="Explora todo el poder de BuzzBee">
      <div className={styles.copy}>
        <strong>Explora todo el poder de BuzzBee</strong>
        <p>Descubre herramientas y consejos para llevar tu empresa al siguiente nivel.</p>
      </div>

      <button className={styles.cta} type="button" onClick={()=>navigate('/ayuda')}>
        <Lightbulb size={14}/>
        <span>Ver consejos</span>
        <ArrowRight size={14}/>
      </button>

      <div className={styles.mascot} aria-hidden="true">
        <span className={styles.flight}>··· ✦ ··</span>
        <span className={styles.bee}>🐝</span>
      </div>
    </aside>
  );
}
