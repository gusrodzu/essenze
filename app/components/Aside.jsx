import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'summary',
].join(',');

export function Aside({children, heading, type}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();
  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!expanded) return undefined;

    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const preferredFocus =
        panelRef.current?.querySelector('[data-autofocus]');
      if (preferredFocus && typeof preferredFocus.focus === 'function') {
        preferredFocus.focus({preventScroll: true});
      } else {
        closeButtonRef.current?.focus({preventScroll: true});
      }
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true',
      );
      if (!focusable.length) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      const previous = restoreFocusRef.current;
      if (previous && typeof previous.focus === 'function') {
        requestAnimationFrame(() => previous.focus({preventScroll: true}));
      }
    };
  }, [close, expanded]);

  return (
    <div
      aria-modal={expanded || undefined}
      aria-hidden={!expanded}
      className={`overlay ${expanded ? 'expanded' : ''}`}
      data-aside-type={type}
      role="dialog"
      aria-labelledby={id}
    >
      <button
        type="button"
        className="close-outside"
        onClick={close}
        aria-label="Cerrar panel"
        tabIndex={expanded ? 0 : -1}
      />
      <aside ref={panelRef}>
        <header>
          <h3 id={id}>{heading}</h3>
          <button
            type="button"
            ref={closeButtonRef}
            className="close reset"
            onClick={close}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext(null);

Aside.Provider = function AsideProvider({children}) {
  const [type, setType] = useState('closed');
  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) throw new Error('useAside must be used within an AsideProvider');
  return aside;
}

/** @typedef {'search'|'cart'|'mobile'|'closed'} AsideType */
