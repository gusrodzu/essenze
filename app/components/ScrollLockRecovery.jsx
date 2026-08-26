import {useEffect} from 'react';
import {useLocation} from 'react-router';
import {forceReleaseScrollLocks} from '~/lib/scrollLock';

function hasActiveLockOwner() {
  return Boolean(
    document.querySelector('[data-scroll-lock-owner="true"]'),
  );
}

/**
 * Recovers the page after route changes, HMR or Safari bfcache restores.
 * It never unlocks while a visible drawer/loading overlay still owns the lock.
 */
export default function ScrollLockRecovery() {
  const location = useLocation();

  useEffect(() => {
    const recover = () => {
      window.requestAnimationFrame(() => {
        if (!hasActiveLockOwner()) forceReleaseScrollLocks();
      });
    };

    recover();
    window.addEventListener('pageshow', recover);
    document.addEventListener('visibilitychange', recover);

    return () => {
      window.removeEventListener('pageshow', recover);
      document.removeEventListener('visibilitychange', recover);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
