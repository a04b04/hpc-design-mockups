import { useEffect, useRef, useState } from 'react';
import '../styles/styles.css';
import { TopBar } from './TopBar';
import { SideNav } from './SideNav';
import { type TermTab } from './Terminal';
import { emitToast, parseHash } from './ui';
import { NODE_MAP, permitsSSH, type T3Role } from '../data';
import { OverviewPage } from '../pages/Overview';
import { MatrixPage } from '../pages/Matrix';
import { SchedulerPage } from '../pages/Scheduler';
import { JobsPage } from '../pages/Jobs';
import { MonitoringPage } from '../pages/Monitoring';
import { EnvironmentalPage } from '../pages/Environmental';
import { AlertsPage } from '../pages/Alerts';
import { AdminPage } from '../pages/Admin';
import { TerminalPage } from '../pages/TerminalPage';

function sshHostFor(nodeName: string): string {
  const n = NODE_MAP.get(nodeName);
  if (n) return `${nodeName}.titan02.aether.hpc`;
  return nodeName;
}

export default function AetherApp() {
  const [hash, setHash] = useState(window.location.hash);
  const [role, setRole] = useState<T3Role>('admin');
  const [cluster, setCluster] = useState('TITAN-02');
  const [termTabs, setTermTabs] = useState<TermTab[]>([]);
  const [termActive, setTermActive] = useState<number | null>(null);
  const seq = useRef(1);

  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const page = /^#\/mockup-03/.test(hash) ? parseHash() : 'overview';

  const openSession = (nodeName: string) => {
    if (!permitsSSH(nodeName, role)) {
      emitToast('ssh denied — node not permitted for your role', 'err');
      return;
    }
    const host = sshHostFor(nodeName);
    const existing = termTabs.find((t) => t.host === host);
    if (existing) {
      setTermActive(existing.id);
      emitToast(`session focused → ${host}`, 'ok');
    } else {
      const id = seq.current++;
      setTermTabs((t) => [...t, { id, host, node: nodeName }]);
      setTermActive(id);
      emitToast(`ssh session opened → ${host}`, 'ok');
    }
    /* the terminal lives on the terminal page — take the user there */
    if (page !== 'terminal') goNav('terminal');
  };

  const newTab = () => {
    const pool = role === 'admin'
      ? ['titan-lgx-01', 'titan-lgx-02', 'titan-svx-01', 'titan-gpu-0011']
      : ['titan-lgx-01', 'titan-lgx-02'];
    const idx = seq.current % pool.length;
    const host = `${pool[idx]}.titan02.aether.hpc`;
    const id = seq.current++;
    setTermTabs((t) => [...t, { id, host, node: pool[idx] }]);
    setTermActive(id);
  };

  /* force user role away from admin-only pages */
  useEffect(() => {
    if (role === 'user' && page === 'admin') {
      emitToast('access restricted — administrator role required', 'warn');
      goNav('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, page]);

  return (
    <div className="t3">
      <TopBar page={page} cluster={cluster} onCluster={setCluster} role={role} onRole={setRole} />
      <div className="t3-shell">
        <SideNav page={page} role={role} />
        <main className="t3-main">
          {page === 'overview' && <OverviewPage role={role} onNav={goNav} />}
          {page === 'matrix' && <MatrixPage role={role} onSSH={openSession} />}
          {page === 'scheduler' && <SchedulerPage role={role} />}
          {page === 'jobs' && <JobsPage role={role} />}
          {page === 'monitoring' && <MonitoringPage />}
          {page === 'environ' && <EnvironmentalPage />}
          {page === 'alerts' && <AlertsPage />}
          {page === 'admin' && <AdminPage />}
          {page === 'terminal' && (
            <TerminalPage
              role={role}
              onSSH={openSession}
              tabs={termTabs}
              activeTab={termActive}
              onFocusTab={setTermActive}
              onCloseTab={(id) => {
                const next = termTabs.filter((x) => x.id !== id);
                setTermTabs(next);
                /* when the focused tab closes, keep the shell on the first remaining one */
                setTermActive((cur) => (cur === id ? next[0]?.id ?? null : cur));
              }}
              onNewTab={newTab}
              onInitialLogin={openSession}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function goNav(page: string) {
  window.location.hash = `#/mockup-03/${page}`;
}
