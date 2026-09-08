import styles from './Badge.module.css';
import {statusLabel} from '../i18n/uiLanguage.js';

export function Badge({children, tone = 'neutral', dot = false, translate = true}) {
  const display = translate && typeof children === 'string' ? statusLabel(children) : children;
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {display}
    </span>
  );
}
