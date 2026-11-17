import { useState } from 'react';
import { Panel, Btn, Icon, Th, emitToast } from '../components/ui';
import { ADMIN_USERS, SYS_HEALTH, type T3User } from '../data';

const CFG: Array<{ s: string; k: string; v: string; e: string; on: boolean; admin: boolean }> = [
  { s: 'SCHEDULER', k: 'BACKFILL', v: 'ON · WINDOW 12M', e: 'Backfill scheduler engages idle partitions', on: true, admin: true },
  { s: 'SCHEDULER', k: 'PREEMPTION', v: 'QOS-BASED', e: 'Premium jobs preempt normal QoS', on: true, admin: true },
  { s: 'SCHEDULER', k: 'RESERVATION R01–R04', v: 'ACTIVE · 72H', e: 'Facility maintenance reservation', on: true, admin: true },
  { s: 'THERMAL', k: 'AUTO-DRAIN &gt;48°C', v: 'ARMED · 48°C', e: 'Drain nodes breaching inlet threshold', on: true, admin: true },
  { s: 'THERMAL', k: 'FAN BOOST EVENT', v: 'AUTO · +22%', e: 'Pre-emptive fan ramp on thermal trend', on: true, admin: false },
  { s: 'NETWORK', k: 'IB CREDIT LOOPBACK', v: 'OFF', e: 'Guard against credit starvation', on: false, admin: true },
  { s: 'STORAGE', k: 'OST BALANCER', v: 'NIGHTLY 02:00', e: 'Rebalance Lustre OST fills', on: true, admin: false },
  { s: 'SECURITY', k: 'MFA FOR ADMIN SSH', v: 'REQUIRED · FIDO2', e: 'Hardware key required for admin shell', on: true, admin: false },
];

export function AdminPage() {
  const [cfg, setCfg] = useState(CFG);
  const [sort, setSort] = useState<'user' | 'uid' | 'jobs'>('uid');
  const [dir, setDir] = useState<1 | -1>(1);
  const dirAs = dir === 1 ? 'asc' : 'desc';

  const users = [...ADMIN_USERS].sort((a, b) => {
    const av = a[sort] as string | number;
    const bv = b[sort] as string | number;
    return (av === bv ? 0 : av > bv ? 1 : -1) * dir;
  });

  function toggle(i: number) {
    setCfg((c) => c.map((r, k) => (k === i ? { ...r, on: !r.on } : r)));
    emitToast(`cluster config "${cfg[i].k}" — simulated write`, 'ok');
  }

  const ukey = (raw: string) => {
    const k: 'user' | 'uid' | 'jobs' =
      raw === 'uid' ? 'uid' : raw === 'jobs' ? 'jobs' : 'user';
    setSort(k);
    if (sort === k) setDir((prev) => (prev === 1 ? -1 : 1));
    else setDir(1);
  };

  return (
    <div className="t3-col">
      <div className="t3-grid-matrix">
        <div className="t3-col">
          <Panel
            title="USER ACCOUNTS · TITAN-02"
            icon="users"
            tone="grn"
            right={
              <div className="t3-filterrow" style={{ gap: 5 }}>
                <Btn small tone="mag" icon="plus" onClick={() => emitToast('account form opened — simulated', 'ok')}>
                  NEW ACCOUNT
                </Btn>
                <Btn small onClick={() => emitToast('LDAP resync queued — simulated', 'ok')}>SYNC LDAP</Btn>
              </div>
            }
            nopad
          >
            <div style={{ maxHeight: 330, overflow: 'auto' }}>
              <table className="t3-table">
                <thead>
                  <tr>
                    <Th k="user" sortKey={sort} dir={dirAs} onSort={ukey}>USER</Th>
                    <Th k="uid" sortKey={sort} dir={dirAs} onSort={ukey} num>UID</Th>
                    <Th k="group" w="80">GROUP</Th>
                    <Th k="account" w="80">ACCOUNT</Th>
                    <Th k="role" w="80">ROLE</Th>
                    <Th k="jobs" sortKey={sort} dir={dirAs} onSort={ukey} num>JOBS</Th>
                    <Th k="last" w="90">LAST SEEN</Th>
                    <Th k="act" w="150">ACTIONS</Th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: T3User) => (
                    <tr key={u.uid}>
                      <td className="t3-id">{u.user}</td>
                      <td className="num t3-hn">{u.uid}</td>
                      <td>{u.group}</td>
                      <td>{u.account}</td>
                      <td><span className={`t3-sev ${u.role === 'user' ? 'INFO' : 'WARN'}`}>{u.role.toUpperCase()}</span></td>
                      <td className="num">{u.jobs}</td>
                      <td style={{ color: 'var(--t3-ink3)' }}>{u.lastSeen}</td>
                      <td>
                        <span style={{ display: 'flex', gap: 4 }}>
                          <Btn small onClick={() => emitToast(`quota editor — ${u.user} (simulated)`, 'ok')}>QUOTA</Btn>
                          <Btn small tone="danger" onClick={() => emitToast(`suspend ${u.user} — simulated`, 'warn')}>SUSPEND</Btn>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="t3-tbody" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--t3-ink3)', textAlign: 'center' }}>
              {users.length} ACCOUNTS · LDAP AUTH · LAST SYNC 13:42
            </div>
          </Panel>

          <Panel title="CLUSTER CONFIGURATION" icon="sliders" tone="mag">
            <div className="t3-admgrid">
              {cfg.map((r, i) => (
                <div className="t3-tglrow" key={r.k + i}>
                  <span className="k">{r.k}</span>
                  <span className="e">{r.e}</span>
                  <span className="v">{r.v}</span>
                  <button className={`sw${r.on ? ' on' : ''}`} onClick={() => toggle(i)} aria-label={`toggle ${r.k}`} type="button" />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="t3-stack" style={{ gap: 8 }}>
          <Panel title="SERVICE STATUS" icon="shield" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SYS_HEALTH.map((h) => (
                <div className="t3-utilrow" key={h.k}>
                  <span className="iconw"><Icon n={h.ok ? 'ok' : 'bell'} s={11} /></span>
                  <span style={{ letterSpacing: 0.5 }}>{h.k}</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <span className={`v${h.ok ? ' t3-dot-ok' : ''}`}>{h.ok ? '● ' : ''}{h.v}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="ADMIN ACTIONS" icon="admin" tone="mag">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Btn small tone="danger" icon="stop" onClick={() => emitToast('drain partition YWCN022 — simulated', 'warn')}>DRAIN PART</Btn>
              <Btn small onClick={() => emitToast('resume-all enqueued — simulated', 'ok')}>RESUME ALL</Btn>
              <Btn small tone="mag" icon="play" onClick={() => emitToast('maintenance window simulated (30m)', 'ok')}>MAINT WINDOW</Btn>
              <Btn small onClick={() => emitToast('slurmctld restart — simulated', 'warn')}>RESTART SLURMCTLD</Btn>
              <Btn small onClick={() => emitToast('accounting export queued — simulated', 'ok')}> EXPORT ACCT</Btn>
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: 'var(--t3-ink3)', letterSpacing: 1 }}>
              ALL ACTIONS ARE SIMULATED — NO CLUSTER IS MODIFIED.
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
