import {useEffect, useState} from 'react';
import {Outlet} from 'react-router-dom';
import CommandPalette from '../framework/CommandPalette';
import AIAssistant from '../framework/AIAssistant';
import BuzzBeeRightRail from '../framework/BuzzBeeRightRail';
import PowerBanner from '../framework/PowerBanner';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ModuleTabBar from './ModuleTabBar';
import styles from './AppShell.module.css';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    return window.localStorage.getItem('erp-sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    window.localStorage.setItem('erp-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-responsive-shell="true">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <button
          className={styles.backdrop}
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className={styles.workspace}>
        <Topbar
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenAI={() => setAiOpen(true)}
        />
        <ModuleTabBar />
        <div className={styles.businessLayout}>
          <main className={styles.content}>
            <Outlet />
          </main>
          <div className={styles.rightColumn}>
            <BuzzBeeRightRail />
          </div>
        </div>
        <div className={styles.powerBannerSlot}>
          <PowerBanner />
        </div>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <button className={styles.mobileAI} onClick={() => {setAiPrompt(''); setAiOpen(true);}} aria-label="Abrir BuzzBee AI">🐝</button>
      <AIAssistant open={aiOpen} initialPrompt={aiPrompt} onClose={() => setAiOpen(false)} />
    </div>
  );
}
