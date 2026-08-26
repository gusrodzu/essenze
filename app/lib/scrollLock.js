let activeLocks = 0;
let savedState = null;

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function captureState() {
  const {body, documentElement} = document;

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    body: {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    },
    html: {
      overflow: documentElement.style.overflow,
      overscrollBehavior: documentElement.style.overscrollBehavior,
    },
  };
}

function applyLock() {
  const {body, documentElement} = document;
  const scrollbarWidth = Math.max(
    0,
    window.innerWidth - documentElement.clientWidth,
  );

  savedState = captureState();

  documentElement.dataset.scrollLocked = 'true';
  body.dataset.scrollLocked = 'true';

  documentElement.style.overflow = 'hidden';
  documentElement.style.overscrollBehavior = 'none';

  // `position: fixed` is more reliable than overflow:hidden on iOS Safari.
  // The saved scroll offset is restored when the final lock is released.
  body.style.position = 'fixed';
  body.style.top = `-${savedState.scrollY}px`;
  body.style.left = `-${savedState.scrollX}px`;
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function restoreLockState() {
  if (!canUseDOM() || !savedState) return;

  const {body, documentElement} = document;
  const state = savedState;

  body.style.position = state.body.position;
  body.style.top = state.body.top;
  body.style.left = state.body.left;
  body.style.right = state.body.right;
  body.style.width = state.body.width;
  body.style.overflow = state.body.overflow;
  body.style.paddingRight = state.body.paddingRight;

  documentElement.style.overflow = state.html.overflow;
  documentElement.style.overscrollBehavior = state.html.overscrollBehavior;

  delete body.dataset.scrollLocked;
  delete documentElement.dataset.scrollLocked;

  savedState = null;

  window.scrollTo({
    left: state.scrollX,
    top: state.scrollY,
    behavior: 'auto',
  });
}

/**
 * Applies a reference-counted page scroll lock.
 * Multiple overlays can safely coexist without leaving the page frozen.
 * @returns {() => void} release function
 */
export function acquireScrollLock() {
  if (!canUseDOM()) return () => {};

  if (activeLocks === 0) applyLock();
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks === 0) restoreLockState();
  };
}

/**
 * Safety recovery for route changes, HMR and the browser back-forward cache.
 * Only call this when no visible overlay owns the scroll lock.
 */
export function forceReleaseScrollLocks() {
  if (!canUseDOM()) return;
  activeLocks = 0;

  if (savedState) {
    restoreLockState();
    return;
  }

  const {body, documentElement} = document;
  delete body.dataset.scrollLocked;
  delete documentElement.dataset.scrollLocked;

  // Remove only stale values produced by the lock system.
  if (body.style.position === 'fixed' && /^-?\d+(?:\.\d+)?px$/.test(body.style.top)) {
    const scrollY = Math.abs(Number.parseFloat(body.style.top)) || 0;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    body.style.paddingRight = '';
    documentElement.style.overflow = '';
    documentElement.style.overscrollBehavior = '';
    window.scrollTo({left: 0, top: scrollY, behavior: 'auto'});
  } else if (body.style.overflow === 'hidden') {
    body.style.overflow = '';
    documentElement.style.overflow = '';
    documentElement.style.overscrollBehavior = '';
  }
}
