import {NavLink, useLocation} from 'react-router-dom';
import {navigationGroups} from '../data/navigation';
import styles from './ModuleTabBar.module.css';

const modules = navigationGroups.flatMap((group) => group.children);

function moduleMatches(pathname, item) {
  if (Array.isArray(item.children) && item.children.length) {
    return item.children.some((child) =>
      pathname === child.to || pathname.startsWith(`${child.to}/`),
    );
  }
  if (!item.to) return false;
  if (item.to === '/') return pathname === '/';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function ModuleTabBar() {
  const location = useLocation();
  const module = modules.find((item) => moduleMatches(location.pathname, item));

  if (!module) return null;

  const primaryTabs = Array.isArray(module.children) ? module.children : [];
  const ModuleIcon = module.icon;

  return (
    <div
      className={styles.shell}
      data-module={module.label}
      data-has-primary-tabs={primaryTabs.length ? 'true' : 'false'}
    >
      <div className={styles.inner}>
        <div className={styles.identity}>
          <span className={styles.icon}><ModuleIcon size={17}/></span>
          <div>
            <small>Módulo</small>
            <strong>{module.label}</strong>
          </div>
        </div>

        <div className={styles.navStack}>
          {primaryTabs.length ? (
            <nav className={styles.tabs} aria-label={`Secciones de ${module.label}`}>
              {module.children.map((tab, index) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={index === 0}
                  className={({isActive}) => `${styles.tab} ${isActive ? styles.active : ''}`}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div id="module-local-tabs" className={styles.localTabsSlot} aria-live="polite" />
        </div>
      </div>
    </div>
  );
}
