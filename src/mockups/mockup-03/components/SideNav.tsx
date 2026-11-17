import { Icon } from './ui';

export const NAV_ITEMS: Array<{ id: string; icon: string; label: string; adminOnly?: boolean }> = [
  { id: 'overview', icon: 'layout', label: 'Cluster Overview' },
  { id: 'matrix', icon: 'grid', label: 'Node Matrix' },
  { id: 'scheduler', icon: 'scheduler', label: 'Slurm Scheduler' },
  { id: 'jobs', icon: 'list', label: 'Jobs' },
  { id: 'monitoring', icon: 'chart', label: 'Resource Monitoring' },
  { id: 'environ', icon: 'env', label: 'Environmental Monitoring' },
  { id: 'alerts', icon: 'bell', label: 'Alerts' },
  { id: 'admin', icon: 'admin', label: 'Administration', adminOnly: true },
  { id: 'terminal', icon: 'terminal', label: 'Terminal' },
];

export function SideNav({ page, role }: { page: string; role: string }) {
  return (
    <nav className="t3-sidenav">
      {NAV_ITEMS.map((it) => {
        if (it.adminOnly && role !== 'admin') return (
          <span key={it.id} className="t3-navbtn locked" data-tip="ADMINISTRATOR ONLY"><Icon n="lock" s={15} /></span>
        );
        const on = page === it.id;
        return (
          <a
            key={it.id}
            href={`#/mockup-03/${it.id}`}
            className={`t3-navbtn${on ? ` on${it.id === 'terminal' || it.id === 'admin' ? ' mag' : ''}` : ''}`}
            data-tip={it.label.toUpperCase()}
          >
            <Icon n={it.icon} s={16} />
          </a>
        );
      })}
      <span className="t3-navsep" />
      <a href="#/" className="t3-navbtn" data-tip="MOCKUP SELECTOR" title="">
        <Icon n="logout" s={16} />
      </a>
    </nav>
  );
}
