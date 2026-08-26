import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
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
  duration = 4800,
  compact = false,
}) {
  const safeMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return acquireScrollLock();
  }, []);

  useEffect(() => {
    if (safeMessages.length < 2) return undefined;

    const messageDuration = Math.max(850, duration / safeMessages.length);
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % safeMessages.length);
    }, messageDuration);

    return () => window.clearInterval(interval);
  }, [duration, safeMessages.length]);

  if (!mounted || typeof document === 'undefined') return null;

  const loadingModal = (
    <div
      className={styles.overlay}
      style={{'--loading-duration': `${duration}ms`}}
      role="dialog"
      aria-modal="true"
      aria-labelledby="essenze-loading-title"
      aria-describedby="essenze-loading-message"
      aria-busy="true"
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
            <h3 id="essenze-loading-title">{title}</h3>
            <p
              id="essenze-loading-message"
              key={messageIndex}
              className={styles.message}
              aria-live="polite"
              aria-atomic="true"
            >
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

  return createPortal(loadingModal, document.body);
}
