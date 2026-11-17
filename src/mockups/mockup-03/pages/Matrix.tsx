import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Panel, Btn, Spark, St, Bar, emitToast } from '../components/ui';
import {
  CLUSTER, NODES, SYS_HEALTH, SPARKS, STATE_COUNTS, JOBS, CORES_TOTAL, CORES_USED,
  fmt, permitsSSH, type T3Node, type T3Role, type SlurmState,
} from '../data';

const STATES: SlurmState[] = ['IDLE', 'ALLOCATED', 'MIXED', 'DRAINING', 'DOWN', 'UNAVAIL'];
const CELLC: Record<SlurmState, string> = {
  IDLE: '#3af087',
  ALLOCATED: '#22d3ee',
  MIXED: '#8b5cf6',
  DRAINING: '#ffb020',
  DOWN: '#ff5252',
  UNAVAIL: '#2c2a34',
};

/* deterministic per-node core load pattern (8 bars) */
function coreBars(n: T3Node): string {
  const s = [...n.name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += n.state === 'DOWN' || n.state === 'UNAVAIL' ? '0'
      : n.state === 'IDLE' ? (i === 0 ? '1' : '0')
      : String(Math.max(0, Math.min(3, ((s * (i + 3)) % 100) / 34 + (n.cpuPct > 70 ? 1.2 : 0))));
  }
  return out;
}

export function MatrixPage({ role, onSSH }: { role: T3Role; onSSH: (node: string) => void }) {
  const [q, setQ] = useState('');
  const [stF, setStF] = useState<'ALL' | SlurmState>('ALL');
  const [pf, setPf] = useState('ALL');
  const [sel, setSel] = useState<T3Node | null>(null);
  const [tip, setTip] = useState<{ node: T3Node; x: number; y: number } | null>(null);

  const partNames = useMemo(() => ['ALL', ...new Set(NODES.map((n) => n.partition))], []);  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return NODES.filter(
      (n) =>
        (stF === 'ALL' || n.state === stF) &&
        (pf === 'ALL' || n.partition === pf) &&
        (!needle || n.name.includes(needle)),
    );
  }, [q, stF, pf]);

  /* cap rendered cells for smooth interaction */
  const slice = shown.length > 2600 ? shown.slice(0, 2600) : shown;
  const hiddenCount = shown.length - slice.length;

  /* --- tooltip pos ref for matrix cells --- */
  const tipRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tip) return;
    const x = Math.min(tip.x + 12, window.innerWidth - 200);
    const y = Math.max(8, tip.y - 10);
    if (tipRef.current) {
      tipRef.current.style.left = `${x}px`;
      tipRef.current.style.top = `${y}px`;
      tipRef.current.style.display = 'block';
    }
  }, [tip]);

  const stats = [
    { k: 'TOTAL NODES', v: fmt.int(CLUSTER.totalNodes), tone: undefined },
    { k: 'CPU LOAD', v: fmt.pct(CLUSTER.cpuLoad), s: `${fmt.int(CORES_USED)}/${fmt.int(CORES_TOTAL)} CORES`, tone: 'ok' },
    { k: 'MEMORY', v: fmt.pct(CLUSTER.memPct), s: `${CLUSTER.memPB} PB USED`, tone: 'vio' as const },
    { k: 'ACTIVE JOBS', v: fmt.int(CLUSTER.activeJobs), tone: 'mag' as const },
    { k: 'SYSTEM STATE', v: 'HEALTHY', pill: 'ok' as const },
  ];

  return (
    <div className="t3-col" data-page="matrix">
      {/* top stats */}
      <div className="t3-stats">
        {stats.map((s) => (
          <div className="t3-stat" key={s.k}>
            <div className="t3-stat-k">{s.k}</div>
            <div className="t3-stat-v-row">
              {s.pill ? (
                <span className={`t3-pill ${s.pill} blink`}>● {s.v}</span>
              ) : (
                <span className={`t3-stat-v${s.tone ? ` ${s.tone}` : ''}`}>{s.v}</span>
              )}
              {s.s && <span className="t3-stat-s">{s.s}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="t3-grid-matrix">
        {/* left column */}
        <div className="t3-stack">
          <Panel
            title="ACTIVE NODE GRID & MATRIX"
            icon="grid" tone="grn" fill
            className="t3-panel--hero"
            right={
              <>
                <div className="t3-search">
                  <span className="t3-sico"><Icon n="search" s={11} /></span>
                  <input
                    className="t3-inp" style={{ width: 190 }} placeholder="SEARCH HOSTNAME…"
                    value={q} onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select className="t3-sel" value={stF} onChange={(e) => setStF(e.target.value as 'ALL' | SlurmState)}>
                  <option value="ALL">STATE: ALL</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="t3-sel" value={pf} onChange={(e) => setPf(e.target.value)}>
                  <option value="ALL">PARTITION: ALL</option>
                  {partNames.slice(1).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </>
            }
          >
            <div className="t3-mxfilters" style={{ paddingTop: 8 }}>
              <span className="t3-mono-vals" style={{ fontSize: 9, color: 'var(--t3-ink3)' }}>
                RENDERING {fmt.int(slice.length)} OF {fmt.int(shown.length)} MATCHED NODES
                {hiddenCount > 0 && <> · {fmt.int(hiddenCount)} NOT RENDERED</>}
              </span>
            </div>
            <div className="t3-mxwrap">
              {slice.map((n) => (
                <span
                  key={n.id}
                  className={`t3-mxcell st-${n.state}${sel && sel.id === n.id ? ' sel' : ''}`}
                  onMouseMove={(e) => setTip({ node: n, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => setSel(n)}
                />
              ))}
              {shown.length === 0 && <div className="t3-empty" style={{ gridColumn: '1 / -1' }}>NO NODES MATCH FILTER</div>}
            </div>
            <div className="t3-mxlegend">
              {STATES.map((s) => (
                <span className="t3-lgd" key={s}>
                  <i style={{ background: CELLC[s] }} />
                  {s}&nbsp;
                  <b style={{ color: 'var(--t3-ink3)' }}>{fmt.int(STATE_COUNTS[s])}</b>
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="ACTIVE JOB STATUS" icon="list" tone="mag" nopad className="t3-jobsbox">
            <div style={{ maxHeight: 240, overflow: 'auto' }}>
              <table className="t3-table">
                <thead>
                  <tr>
                    <th style={{ width: 4 }} />
                    <th>JOBID</th>
                    <th>USER</th>
                    <th>PARTITION</th>
                    <th className="num">CORES</th>
                    <th>STATE</th>
                    <th>RUNTIME</th>
                    <th style={{ width: 150 }}>UTILISATION</th>
                  </tr>
                </thead>
                <tbody>
                  {JOBS.filter((j) => j.state === 'RUNNING')
                    .slice(0, 8)
                    .map((j) => {
                      return (
                        <tr key={j.id} className="clk">
                          <td><span className="t3-dot-ok" /></td>
                          <td className="t3-id">{j.id}</td>
                          <td>{j.user}</td>
                          <td>{j.partition}</td>
                          <td className="num t3-hn">{fmt.int(j.cores)}</td>
                          <td><St s={j.state} /></td>
                          <td className="t3-hn">{j.walltimeUsed}m</td>
                          <td>
                            <Bar pct={j.progress} tone={j.progress > 66 ? 'teal' : j.progress > 33 ? 'grn' : 'vio'} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* right column */}
        <div className="t3-stack">
          <Panel title="CPU CORE MATRICES" icon="cpu" tone="grn">
            <div className="t3-cpus">
              {Array.from({ length: 8 }, (_, i) => {
                const rnd = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
                const load = 30 + Math.round(rnd * 65);
                return (
                  <div className="t3-cpucard" key={i}>
                    <span className="l">
                      <span>CPU {i + 1}</span>
                      <span className="t3-mono-vals">{load}%</span>
                    </span>
                    <span className="g">
                      {coreBarsPreset(i).split('').map((c, k) => (
                        <i key={k} className={`t3-cc${c}`} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="RESOURCES & OVERVIEW · MICRO SPARKLINES" icon="chart" tone="grn" nopad>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(
                [
                  ['CPU', SPARKS.cpu, '#3af087'],
                  ['MEMORY', SPARKS.mem, '#22d3ee'],
                  ['GPU', SPARKS.gpu, '#8b5cf6'],
                ] as const
              ).map(([k, d, c]) => (
                <div key={k}>
                  <div className="t3-sparkrow">
                    <span className="k">{k}</span>
                    <div>
                      <Spark data={d as unknown as number[]} color={c} h={40} />
                      <div className="t3-axis"><span>0h</span><span>6h</span><span>13h</span><span>18h</span><span>24h</span></div>
                    </div>
                    <span className="v" style={{ color: c }}>
                      {k === 'CPU' ? CLUSTER.cpuLoad : k === 'MEMORY' ? CLUSTER.memPct : 83.2}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="CLUSTER HEALTH STATUS" icon="shield" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {SYS_HEALTH.map((h) => (
                <div className="t3-hrow" key={h.k}>
                  <span style={{ color: 'var(--t3-green)' }}><Icon n="okc" s={12} /></span>
                  <span className="k">{h.k}</span>
                  <span className={`v ${h.ok ? 'ok' : 'err'}`}>
                    {h.v}
                    {h.ok && <span className="v-ok-badge">✔ ONLINE</span>}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="SLURM CONTROLLER & FILESYSTEM" icon="cluster" tone="grn">
            <div className="t3-minispec">
              {[
                ['SLURMCTLD', '14:12:03 UPTIME'],
                ['BACKFILL', 'LOOP 4ms'],
                ['LUSTRE MDT', '2 ACTIVE'],
                ['OST WATERMARK', '88% (ost06)'],
              ].map(([k, v]) => (
                <span className="r" key={k}><span>{k}</span><b>{v}</b></span>
              ))}
            </div>
          </Panel>
        </div>

        {/* node detail drawer */}
        {sel && <NodeDrawer node={sel} role={role} onSSH={onSSH} onClose={() => setSel(null)} />}
      </div>

      {tip && (
        <div className="t3-tip" ref={tipRef} style={{ display: 'none' }}>
          <div className="h">{tip.node.name}</div>
          <div className="r"><span>NODE STATE</span><span><St s={tip.node.state} /></span></div>
          <div className="r"><span>NODE THREADS</span><span className="t3-mono-vals">{tip.node.cores}</span></div>
          <div className="r"><span>CPU LOAD</span><span className="t3-mono-vals">{tip.node.cpuPct.toFixed(1)}%</span></div>
          <div className="r"><span>MEMORY</span><span className="t3-mono-vals">{tip.node.memUsedGB}/{tip.node.memGB} GB</span></div>
          <div className="r"><span>TEMP</span><span className="t3-mono-vals">{fmt.temp(tip.node.tempC)}</span></div>
        </div>
      )}
    </div>
  );
}

/* 40 deterministic mini bars for tiny CPU grids */
function coreBarsPreset(seed: number): string {
  let v = Math.abs(Math.sin(seed * 91.17) * 40011) % 1;
  let out = '';
  for (let i = 0; i < 40; i++) {
    v = (v * 9301 + 0.2113) % 1;
    out += v < 0.18 ? '0' : v < 0.5 ? '1' : v < 0.82 ? '2' : '3';
  }
  return out;
}

function NodeDrawer({ node, role, onSSH, onClose }: {
  node: T3Node; role: T3Role; onSSH: (n: string) => void; onClose: () => void;
}) {
  const mets: Array<[string, number, string, string]> = [
    ['CPU', node.cpuPct, 'grn', `${node.coresUsed}/${node.cores} CORES`],
    ['MEM', node.memPct, 'teal', `${node.memUsedGB}/${node.memGB} GB`],
  ];
  if (node.gpus > 0) mets.push(['GPU', node.gpuPct, 'vio', `${node.gpusUsed}/${node.gpus} × A100`]);
  mets.push(['TMP', (node.tempC / 50) * 100, node.tempC > 46 ? 'red' : node.tempC > 40 ? 'amb' : 'grn', `${fmt.temp(node.tempC)}`]);

  return (
    <aside className="t3-dl">
      <div className="t3-dl-top">
        <div>
          <div className="t3-dl-name">
            {node.name}
            <St s={node.state} />
          </div>
          <div className="t3-dl-sub">
            {node.partition} · {node.kind.toUpperCase()} · RACK {node.rack} · {node.health.toUpperCase()}
          </div>
        </div>
        <button className="t3-btn gh" onClick={onClose}><Icon n="x" s={12} /></button>
      </div>

      <div className="t3-dl-sec">HARDWARE SPECIFICATION</div>
      <div className="t3-dl-grid">
        {[
          ['CPU', node.cpuModel],
          ['MEMORY', node.memModel],
          ['GPU', node.gpuModel],
          ['INTERCONNECT', 'NDR400 INFINIBAND'],
          ['OS', `${node.os} · ${node.kernel}`],
        ].map(([k, v]) => (
          <div className="t3-dl-r" key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>

      <div className="t3-dl-sec">LIVE UTILISATION</div>
      <div className="t3-meters">
        {mets.map(([k, pct, tone, sub]) => (
          <div className="t3-meter" key={k}>
            <span>{k}</span>
            <Bar pct={pct} tone={tone} />
            <span className="v">{sub}</span>
          </div>
        ))}
      </div>

      <div className="t3-dl-sec">POWER & THERMALS</div>
      <div className="t3-dl-grid">
        {[
          ['POWER DRAW', `${fmt.int(node.powerW)} W`],
          ['INLET TEMP', fmt.temp(node.tempC - 4.2)],
          ['UPTIME', `${node.uptimeDays} DAYS`],
          ['JOBS ON NODE', node.jobs.length ? node.jobs.map((j) => `#${j}`).join(', ') : '—'],
        ].map(([k, v]) => (
          <div className="t3-dl-r" key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>

      <div className="t3-dl-sec">ALLOCATION MATRIX · {node.cores} LOGICAL CORES</div>
      <div className="t3-mxmini">
        {coreBars(node).split('').map((c, i) => <i key={i} className={`t3-mxcell t3-cc${c}`} />)}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--t3-line2)' }}>
        <Btn
          tone="grn" icon="ssh"
          title={permitsSSH(node.name, role) ? 'Open simulated ssh session' : 'Not permitted for your role'}
          onClick={() => {
            if (role === 'user') {
              emitToast('your permitted node list excludes this node', 'warn');
              if (permitsSSH(node.name, role)) onSSH(node.name);
            } else onSSH(node.name);
          }}
        >
          CONNECT VIA SSH
        </Btn>
        <Btn
          tone="gh" icon="grid"
          onClick={() => emitToast(`viewing ${node.name} in environment heatmap`, 'ok')}
        >
          THERMAL VIEW
        </Btn>
      </div>
      <div className="t3-dl-foot">SIMULATED SESSION · NO REAL SSH TRAFFIC</div>
    </aside>
  );
}
