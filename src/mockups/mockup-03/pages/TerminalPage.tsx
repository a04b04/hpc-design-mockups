import { useEffect, useRef, useState } from 'react';
import { Panel, Btn, St, Icon, emitToast } from '../components/ui';
import { Terminal, type TermTab } from '../components/Terminal';
import { NODES, permitsSSH, fmt, type T3Role } from '../data';

export function TerminalPage({
  role, onSSH, tabs, activeTab, onFocusTab, onCloseTab, onNewTab, onInitialLogin,
}: {
  role: T3Role; onSSH: (node: string) => void;
  tabs: TermTab[]; activeTab: number | null;
  onFocusTab: (id: number) => void; onCloseTab: (id: number) => void;
  onNewTab: () => void; onInitialLogin?: (node: string) => void;
}) {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const onboarded = useRef(false);

  /* first visit with a pending session → log in automatically */
  useEffect(() => {
    if (!onboarded.current && tabs.length === 0 && onInitialLogin) {
      onboarded.current = true;
      onInitialLogin('titan-lgx-01');
    }
  }, [tabs.length, onInitialLogin]);

  const groups = [
    { label: 'LOGIN NODES', kind: 'login' as const },
    { label: 'GPU NODES', kind: 'gpu' as const },
  ];
  const pools = groups.map((g) => ({
    ...g,
    nodes: NODES.filter((n) => n.kind === g.kind && (!ql || n.name.includes(ql))).slice(0, 12),
  }));
  const recent = NODES.filter((n) => n.state === 'ALLOCATED' && (!ql || n.name.includes(ql))).slice(0, 10);

  function open(node: string, perm: boolean) {
    if (!perm) {
      emitToast('SSH DENIED — node outside your permitted set', 'warn');
      return;
    }
    onSSH(node);
  }

  return (
    <div className="t3-col">
      <div className="t3-grid-matrix">
        <div className="t3-col">
          <Panel
            title="REMOTE SHELL TARGETS"
            icon="terminal"
            tone="mag"
            right={
              <input className="t3-inp" style={{ width: 200 }} placeholder="filter hostnames" value={q} onChange={(e) => setQ(e.target.value)} />
            }
            nopad
          >
            <div className="t3-body" style={{ gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn small tone="mag" icon="terminal" onClick={() => open('titan-lgx-01', permitsSSH('titan-lgx-01', role))}>
                  LOGIN titan-lgx-01
                </Btn>
                <Btn small tone="mag" icon="terminal" onClick={() => open('titan-lgx-02', permitsSSH('titan-lgx-02', role))}>
                  LOGIN titan-lgx-02
                </Btn>
                {role === 'admin' && (
                  <Btn small tone="mag" icon="terminal" onClick={() => emitToast('service shell opened — simulator', 'ok')}>
                    SERVICE SVJ-01
                  </Btn>
                )}
              </div>

              {pools.map((pool) => (
                <div key={pool.kind}>
                  <div className="t3-sec-t" style={{ margin: '2px 0 6px' }}>
                    <Icon n="cluster" s={11} /> {pool.label}
                    <span style={{ color: 'var(--t3-ink3)', marginLeft: 6 }}>{fmt.int(pool.nodes.length)} SHOWN</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
                    {pool.nodes.map((n) => {
                      const perm = permitsSSH(n.name, role);
                      return (
                        <div className="t3-cfgrow" key={n.id}>
                          <span className="k mono" style={{ letterSpacing: 0.5 }}>{n.name}</span>
                          <span className="e"><St s={n.state} /> · {n.cpuPct}% CPU · {n.tempC.toFixed(1)}°C</span>
                          <Btn small tone="mag" icon="terminal" onClick={() => open(n.name, perm)} title={perm ? 'SSH into node' : 'Not permitted — denied for your role'}>
                            SSH
                          </Btn>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="t3-stack" style={{ gap: 8 }}>
          <Panel title="SESSION POLICY" icon="shield" tone="grn">
            <div className="t3-utilrow"><span>ROLE</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{role.toUpperCase()}</span></div></div>
            <div className="t3-utilrow"><span>MAX TABS</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{role === 'admin' ? '8' : '3'}</span></div></div>
            <div className="t3-utilrow"><span>SHELL</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">/bin/bash</span></div></div>
            <div className="t3-utilrow"><span>MOTD</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">TITAN-02 · AUP V3.1</span></div></div>
            <div style={{ marginTop: 8, fontSize: 9, color: 'var(--t3-ink3)', letterSpacing: 1 }}>
              Connections are simulated in-browser. No real SSH session is established.
            </div>
          </Panel>

          <Panel title="BUSY COMPUTE TARGETS" icon="cpu" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recent.map((n) => (
                <div className="t3-utilrow" key={n.id}>
                  <span className="mono" style={{ letterSpacing: 0.5 }}>{n.name}</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <Btn small tone="mag" icon="terminal" onClick={() => open(n.name, permitsSSH(n.name, role))}>
                      OPEN
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>

      <Panel
        title="REMOTE CONSOLE — AETHER SECURE SHELL"
        icon="terminal"
        tone="grn"
        right={<span className="t3-t-dim" style={{ fontSize: 9, letterSpacing: 1 }}>SIMULATED · NO REAL SSH TRAFFIC</span>}
        fill
      >
        <Terminal
          docked
          tabs={tabs}
          activeTab={activeTab}
          onFocusTab={onFocusTab}
          onCloseTab={onCloseTab}
          onNewTab={onNewTab}
          role={role}
        />
      </Panel>
    </div>
  );
}
