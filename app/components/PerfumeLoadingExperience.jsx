import {useEffect, useState} from 'react';
import styles from './PerfumeLoadingExperience.module.css';
import {acquireScrollLock} from '~/lib/scrollLock';

const DEFAULT_MESSAGES = [
  'Analizando tu selección',
  'Explorando acordes y familias olfativas',
  'Preparando una experiencia Essenze',
];

export default function PerfumeLoadingExperience({
  eyebrow = 'Atelier Essenze',
  title = 'Preparando tu selección',
  messages = DEFAULT_MESSAGES,
  compact = false,
}) {
  const safeMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (safeMessages.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % safeMessages.length);
    }, 620);

    return () => window.clearInterval(interval);
  }, [safeMessages.length]);

  useEffect(() => acquireScrollLock(), []);

  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={title}
      data-scroll-lock-owner="true"
    >
      <div
        className={`${styles.experience} ${compact ? styles.compact : ''}`}
      >
        <div className={styles.ambient} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.bottleScene} aria-hidden="true">
            <span className={styles.bottleShadow} />
            <div className={styles.bottle}>
              <span className={styles.cap} />
              <span className={styles.neck} />
              <span className={styles.glass}>
                <span className={styles.liquid}>
                  <span className={styles.liquidSurface} />
                  <span className={`${styles.bubble} ${styles.bubbleOne}`} />
                  <span className={`${styles.bubble} ${styles.bubbleTwo}`} />
                  <span className={`${styles.bubble} ${styles.bubbleThree}`} />
                </span>
                <span className={styles.shine} />
                <span className={styles.label}>E</span>
              </span>
            </div>
          </div>

          <div className={styles.copy}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h3>{title}</h3>
            <p key={messageIndex} className={styles.message}>
              {safeMessages[messageIndex]}
            </p>
            <div className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressFill} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
