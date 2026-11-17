import { Panel, Icon, Spark, Bar, emitToast } from '../components/ui';
import {
  CLUSTER, SPARKS, STATE_COUNTS, PARTITIONS, SCHED, POWER_HIST,
  fmt, type T3Role,
} from '../data';
import { NAV_ITEMS } from '../components/SideNav';

export function OverviewPage({ role, onNav }: { role: T3Role; onNav: (p: string) => void }) {
  const sc = STATE_COUNTS;
  const tiles = [
    ['ACTIVE', fmt.int(SCHED.active), 'ok'],
    ['PENDING', fmt.int(SCHED.pending), 'vio'],
    ['BLOCKED', fmt.int(SCHED.blocked), 'amb'],
    ['PUE', CLUSTER.pue.toFixed(2), 'mag'],
  ] as const;

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {[
          { k: 'CLUSTER', v: CLUSTER.name, s: CLUSTER.tag, tone: 'ok' as const },
          { k: 'TOTAL NODES', v: fmt.int(CLUSTER.totalNodes), s: '5 PARTITIONS + LOGIN', tone: undefined },
          { k: 'CPU LOAD', v: fmt.pct(CLUSTER.cpuLoad), s: `${fmt.int(Math.round((CLUSTER.cpuLoad / 100) * 8192 * 64))} CORES BUSY`, tone: 'ok' as const },
          { k: 'ACTIVE JOBS', v: fmt.int(CLUSTER.activeJobs), s: `FAIRSHARE ${SCHED.fairshare.toFixed(2)}`, tone: 'mag' as const },
          { k: 'AVG TEMP · POWER', v: `${fmt.temp(CLUSTER.avgTemp)} · ${CLUSTER.powerMW} MW`, s: `PUE ${CLUSTER.pue}`, tone: 'vio' as const },
        ].map((s) => (
          <div className="t3-stat" key={s.k}>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className={`t3-stat-v${s.tone ? ` ${s.tone}` : ''}`}>{s.v}</span>
                <span className="t3-stat-s">{s.s}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-ovgrid2">
        <Panel title="CLUSTER UTILISATION · 24H" icon="chart" tone="grn" nopad>
          <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              [
                ['CPU CORE LOAD', SPARKS.cpu, '#3af087', CLUSTER.cpuLoad],
                ['MEMORY', SPARKS.mem, '#22d3ee', CLUSTER.memPct],
                ['GPU OCCUPANCY', SPARKS.gpu, '#8b5cf6', 83.2],
              ] as const
            ).map(([k, d, c, v]) => (
              <div key={k}>
                <div className="t3-sparkrow">
                  <span className="k">{k}</span>
                  <div>
                    <Spark data={d as unknown as number[]} color={c} h={44} />
                    <div className="t3-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
                  </div>
                  <span className="v" style={{ color: c }}>{v}%</span>
                </div>
              </div>
            ))}
            <div>
              {PARTITIONS.slice(0, 5).map((p) => (
                <div className="t3-utilrow" key={p.code}>
                  <span style={{ letterSpacing: 1 }}>{p.code}</span>
                  <Bar pct={58 + ((p.count * 13) % 38)} tone={p.kind === 'gpu' ? 'vio' : p.kind === 'himem' ? 'teal' : 'grn'} />
                  <span className="v">{fmt.int(p.count)} N · {p.cores}C</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="t3-stack">
          <Panel title="SLURM NODE STATES" icon="cpu" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(Object.keys(sc) as Array<keyof typeof sc>).map((k) => (
                <div className="t3-utilrow" key={k} style={{ gridTemplateColumns: '84px minmax(0,1fr) 58px' }}>
                  <span className={k === 'DOWN' ? 't3-st DOWN' : ''} style={{ letterSpacing: 1 }}>{k}</span>
                  <Bar pct={(sc[k] / 8192) * 100} tone={k === 'IDLE' ? 'grn' : k === 'ALLOCATED' ? 'teal' : k === 'MIXED' ? 'vio' : k === 'DRAINING' ? 'amb' : 'red'} />
                  <span className="v">{fmt.int(sc[k])}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="SCHEDULER STATUS" icon="scheduler" tone="grn">
            <div className="t3-tiles">
              {tiles.map(([k, v, tone]) => (
                <div className="t3-tile" key={k}>
                  <span className="k">{k}</span>
                  <span className={`v ${tone}`}>{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="POWER DRAW · 24H" icon="power" tone="grn" nopad>
            <div style={{ padding: 8 }}>
              <Spark data={POWER_HIST.grid as unknown as number[]} color="#3af087" h={46} />
              <div className="t3-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
              <div style={{ fontSize: 8.5, color: 'var(--t3-ink3)', marginTop: 4, letterSpacing: 1 }}>
                GRID {CLUSTER.powerMW} MW · COOLING 0.34 MW · PUE {CLUSTER.pue}
              </div>
            </div>
          </Panel>
        </div>

        <div className="t3-stack">
          <Panel title="SYSTEM ACTIVITY" icon="waves" tone="grn" nopad>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                ['14:09', 'CRIT', 'thermal/R04', 'Rack 04 inlet temperature critical — 47.8°C'],
                ['14:02', 'ALERT', 'slurmctld', 'titan-gpu-0213 drained after failed health check'],
                ['13:58', 'WARN', 'cooling/CDU-2', 'Room 6 exhaust temperature above limit'],
                ['13:41', 'WARN', 'fs/lustre', 'OST0006 usage crossed 88% watermark'],
                ['13:30', 'INFO', 'cooler', 'Fan-04 ramped to 98% — thermal response'],
                ['12:59', 'WARN', 'power/PDU-B', 'Phase B at 91% of breaker rating'],
              ].map(([at, sev, src, msg]) => (
                <div className="t3-alrow" key={at} style={{ gridTemplateColumns: '40px 44px 92px minmax(0,1fr)' }}>
                  <span className="at">{at}</span>
                  <span><span className={`t3-sev ${sev}`}>{sev}</span></span>
                  <span className="src">{src}</span>
                  <span className="msg" title={msg}>{msg}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={role === 'admin' ? 'ADMINISTRATOR SHORTCUTS' : 'USER SHORTCUTS'} icon="ok" tone="grn">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {NAV_ITEMS.filter((n) => !n.adminOnly || role === 'admin').map((n) => (
                <button
                  key={n.id}
                  className={`t3-btn${n.adminOnly ? ' mag' : ''}`}
                  onClick={() => onNav(n.id)}
                >
                  <Icon n={n.icon} s={12} />
                  {n.label.toUpperCase()}
                </button>
              ))}
            </div>
            {role === 'user' && (
              <div style={{ marginTop: 8, fontSize: 9, color: 'var(--t3-ink3)', letterSpacing: 1 }}>
                RUNNING AS K. DANE — personal jobs, permitted nodes (login + standard compute) and terminal access only.
              </div>
            )}
          </Panel>

          <Panel title="QUICK ACTIONS" icon="sliders" tone="mag">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="t3-btn mag" onClick={() => onNav('terminal')}><Icon n="ssh" s={12} /> OPEN TERMINAL</button>
              <button className="t3-btn" onClick={() => onNav('scheduler')}><Icon n="scheduler" s={12} /> SCHEDULER QUEUE</button>
              {role === 'admin' && (
                <button
                  className="t3-btn grn"
                  onClick={() => emitToast('maintenance window simulated — no cluster changed', 'ok')}
                >
                  <Icon n="play" s={12} /> DRAIN PLAN SIM
                </button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
