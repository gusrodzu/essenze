import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Info, X} from 'lucide-react';
import styles from './KpiInfo.module.css';

export default function KpiInfo({
  title = 'Información del indicador',
  children,
  calculation,
  source,
}) {
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({top: 0, left: 0, placement: 'bottom'});

  function close() {
    setOpen(false);
  }

  function updatePosition() {
    if (!buttonRef.current) return;

    const button = buttonRef.current.getBoundingClientRect();
    const viewportPadding = 14;
    const width = Math.min(340, window.innerWidth - viewportPadding * 2);
    const estimatedHeight = 230;
    const spaceBelow = window.innerHeight - button.bottom;
    const placement = spaceBelow >= estimatedHeight + 18 ? 'bottom' : 'top';

    let left = button.right - width;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding));

    const top =
      placement === 'bottom'
        ? button.bottom + 10
        : Math.max(viewportPadding, button.top - estimatedHeight - 10);

    setPosition({top, left, width, placement});
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        popoverRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    const handleViewportChange = () => updatePosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  const popover = open ? (
    <div
      ref={popoverRef}
      className={styles.popover}
      data-placement={position.placement}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
      role="dialog"
      aria-label={title}
    >
      <div className={styles.popoverHeader}>
        <div>
          <span>Información del KPI</span>
          <strong>{title}</strong>
        </div>
        <button type="button" onClick={close} aria-label="Cerrar información">
          <X size={17} />
        </button>
      </div>

      <div className={styles.popoverBody}>
        <section>
          <span>¿Qué significa?</span>
          <p>{children}</p>
        </section>

        {calculation ? (
          <section>
            <span>¿Cómo se calcula?</span>
            <p>{calculation}</p>
          </section>
        ) : null}

        {source ? (
          <section>
            <span>Origen</span>
            <p>{source}</p>
          </section>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-kpi-info-button="true"
        className={styles.button}
        aria-label={`Ver información: ${title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <Info size={14} aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(popover, document.body)
        : null}
    </>
  );
}
