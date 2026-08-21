import {useEffect} from 'react';
import {useLocation} from 'react-router';

const REVEAL_SELECTORS = [
  'main > section',
  'main > article',
  'main > div > section',
  'main > div > article',
  'main section > header',
  'main section > [class*="header" i]',
  'main section > [class*="grid" i]',
  'main section > [class*="track" i]',
  'main section > [class*="content" i]',
  'main [data-motion-reveal]',
].join(',');

function isRenderable(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[data-motion-static]')) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Capa global de movimiento sin dependencias externas.
 * Añade revelado progresivo, entrada de ruta y luz reactiva a superficies
 * explícitamente marcadas. También detecta módulos diferidos de Hydrogen.
 */
export default function MotionEnhancer() {
  const location = useLocation();

  useEffect(() => {
    const root = document.querySelector('#main-content');
    if (!root) return undefined;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    root.classList.remove('essenze-route-enter');
    // Reinicia la entrada visual en cada navegación de React Router.
    void root.offsetWidth;
    root.classList.add('essenze-route-enter');

    const trackedNodes = new Set();
    const surfaceCleanups = new Map();
    let revealOrder = 0;

    const observer = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            });
          },
          {
            threshold: 0.12,
            rootMargin: '0px 0px -8% 0px',
          },
        );

    const registerReveal = (node) => {
      if (!isRenderable(node) || trackedNodes.has(node)) return;
      trackedNodes.add(node);
      node.classList.add('essenze-reveal');
      node.style.setProperty('--motion-order', String(revealOrder % 7));
      revealOrder += 1;

      if (reduceMotion) {
        node.classList.add('is-revealed');
        return;
      }

      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88) {
        requestAnimationFrame(() => node.classList.add('is-revealed'));
      } else {
        observer.observe(node);
      }
    };

    const registerSurface = (surface) => {
      if (
        reduceMotion ||
        !(surface instanceof HTMLElement) ||
        surfaceCleanups.has(surface)
      ) {
        return;
      }

      const onPointerMove = (event) => {
        const rect = surface.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        surface.style.setProperty('--motion-x', `${x}%`);
        surface.style.setProperty('--motion-y', `${y}%`);
      };

      const onPointerLeave = () => {
        surface.style.removeProperty('--motion-x');
        surface.style.removeProperty('--motion-y');
      };

      surface.addEventListener('pointermove', onPointerMove, {passive: true});
      surface.addEventListener('pointerleave', onPointerLeave, {passive: true});
      surfaceCleanups.set(surface, () => {
        surface.removeEventListener('pointermove', onPointerMove);
        surface.removeEventListener('pointerleave', onPointerLeave);
      });
    };

    const scan = (scope) => {
      if (!(scope instanceof Element)) return;

      if (scope.matches(REVEAL_SELECTORS)) registerReveal(scope);
      scope.querySelectorAll(REVEAL_SELECTORS).forEach(registerReveal);

      if (scope.matches('[data-motion-surface]')) registerSurface(scope);
      scope.querySelectorAll('[data-motion-surface]').forEach(registerSurface);
    };

    scan(root);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => scan(node));
      });
    });

    mutationObserver.observe(root, {childList: true, subtree: true});

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      surfaceCleanups.forEach((cleanup) => cleanup());
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
