import { useEffect, useRef, useState } from 'react';
import { Icon, emitToast } from './ui';
import { CLUSTER, CLUSTERS, DEMO_USERS, type T3Role } from '../data';

const NOTIFS = CLUSTER
  ? [
      { msg: 'Node titan-com-0417 is draining — NVMe SMART warning.', t: '2 min' },
      { msg: 'Fair-share threshold reached on partition QXRA114.', t: '14 min' },
      { msg: 'Cooling loop 3 coolant flow restored to nominal.', t: '38 min' },
      { msg: '4,096-core YWCN022 burst reservation started.', t: '54 min' },
    ]
  : [];

export function TopBar({ page, cluster, onCluster, role, onRole }: {
  page: string; cluster: string; onCluster: (c: string) => void; role: T3Role; onRole: (r: T3Role) => void;
}) {
  const [cOpen, setcOpen] = useState(false);
  const [nOpen, setnOpen] = useState(false);
  const [read, setRead] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) {
        setcOpen(false);
        setnOpen(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const cur = CLUSTERS.find((c) => c.name === cluster) ?? CLUSTERS[0];
  const crumbs: Array<[string, string]> = [['AETHER', '']];
  if (page !== 'overview') crumbs.push([page.toUpperCase(), `#/mockup-03/${page}`]);
  crumbs.unshift(['TITAN-02', '']);
  const u = role === 'admin' ? DEMO_USERS.admin : DEMO_USERS.user;

  return (
    <div className="t3-top" ref={box}>
      <div className="t3-logo">
        <span className="t3-logo-mark">
          <Icon n="waves" s={15} />
        </span>
        <b>AETHER</b>
        <span className="t3-logo-sub">HPC</span>
      </div>
      <span className="t3-logo-sep" />

      <div className="t3-cluster">
        <button className="t3-cluster-btn" onClick={() => { setcOpen(!cOpen); setnOpen(false); }}>
          <span className={`t3-cluster-dot ${cur.tone}`} />
          {cluster}
          <Icon n="chevdown" s={10} st={{ color: 'var(--t3-ink3)' }} />
        </button>
        {cOpen && (
          <div className="t3-cluster-menu">
            {CLUSTERS.map((c) => (
              <button
                key={c.name}
                className={`t3-cluster-it${c.name === cluster ? ' on' : ''}`}
                onClick={() => { onCluster(c.name); setcOpen(false); emitToast(`Context switched → ${c.name}`); }}
              >
                <span className={`t3-cluster-dot ${c.tone}`} />
                {c.name}
                <span className={`t3-cluster-tag ${c.tone}`}>{c.tag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="t3-pill ok blink">● CLUSTER ONLINE</span>
      <span className="t3-pill dim">{CLUSTER.activeJobs} JOBS RUNNING</span>

      <div className="t3-crumbs">
        {crumbs.map(([t, href], i) => (
          <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {i > 0 && <span className="t3-crumb-sep">›</span>}
            {href ? (
              <a className="t3-crumb" href={href} style={{ color: 'var(--t3-ink3)' }}>{t}</a>
            ) : (
              <span className={`t3-crumb${i === crumbs.length - 1 ? ' cur' : ''}`}>{t}</span>
            )}
          </span>
        ))}
      </div>

      <div className="t3-spacer" />

      <div className="t3-role" title="Demonstration role">
        <button className={role === 'admin' ? 'on' : ''} onClick={() => onRole('admin')}>ADMIN</button>
        <button className={role === 'user' ? 'on' : ''} onClick={() => onRole('user')}>USER</button>
      </div>
      <div className="t3-user">
        <b>{u.name}</b>
        <span className={`adm${role === 'admin' ? '' : ' usr'}`}>@{u.login}</span>
      </div>

      <div style={{ position: 'relative' }}>
        <button className={`t3-ibtn${read ? '' : ' reddot'}`} onClick={() => { setnOpen(!nOpen); setcOpen(false); }}>
          <Icon n="bell" s={15} />
        </button>
        {nOpen && (
          <div className="t3-notif">
            <div className="t3-notif-h">
              <span>NOTIFICATIONS</span>
              <button onClick={() => setRead(true)} style={{ background: 'none', border: 0, color: 'var(--t3-vio2)', cursor: 'pointer' }}>MARK ALL READ</button>
            </div>
            {NOTIFS.map((n, i) => (
              <div key={i} className={`t3-notif-it${read ? '' : ' unread'}`}>
                {n.msg}
                <div className="t">{n.t.toUpperCase()} AGO</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="t3-ibtn" title="Settings"><Icon n="settings" s={15} /></button>
    </div>
  );
}
