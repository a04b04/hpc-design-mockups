import { useMemo, useState } from 'react';
import { Panel, Btn, St, Th, emitToast } from '../components/ui';
import { JOBS, fmt, type T3Job, type T3Role } from '../data';

const CANCELLED = new Set<number>();

function wt(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}:00`;
}

function queue(j: T3Job): 'RUNNING' | 'PENDING' | 'SUSPENDED' | 'CANCELLED' {
  return CANCELLED.has(j.id) ? 'CANCELLED' : j.state;
}

type SortKey = 'id' | 'user' | 'partition' | 'nodes' | 'cores' | 'walltime' | 'state';

export function JobsPage({ role }: { role: T3Role }) {
  const [q, setQ] = useState('');
  const [stf, setStf] = useState('ALL');
  const [sort, setSort] = useState<SortKey>('id');
  const [dir, setDir] = useState<1 | -1>(1);
  const [sel, setSel] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  void tick;

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return JOBS.filter(
      (j) => (stf === 'ALL' || queue(j) === stf) && (!ql || String(j.id).includes(ql) || j.user.includes(ql)),
    ).sort((a, b) => {
      const av = a[sort] as string | number;
      const bv = b[sort] as string | number;
      return (av === bv ? 0 : av > bv ? 1 : -1) * dir;
    });
  }, [q, stf, sort, dir]);
  const dirAs = dir === 1 ? 'asc' : 'desc';
  const skey = (k: string) => {
    setSort(k as SortKey);
    setDir((prev) => (sort === k ? (prev === 1 ? -1 : 1) : 1));
  };

  const own = rows.filter((j) => j.user === 'k.dane');
  const view = role === 'admin' ? rows : own;
  const selJob = sel != null ? JOBS.find((j) => j.id === sel) : undefined;

  return (
    <div className="t3-col">
      <div className="t3-grid-matrix">
        <div className="t3-col">
          <Panel
            title={role === 'admin' ? 'ALL CLUSTER JOBS' : 'PERSONAL QUEUE — k.dane'}
            icon="list"
            tone="grn"
            right={
              <div className="t3-filterrow" style={{ gap: 5 }}>
                <input className="t3-inp" placeholder="Filter jobid / user" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="t3-inp" value={stf} onChange={(e) => setStf(e.target.value)} style={{ width: 132 }}>
                  {['ALL', 'RUNNING', 'PENDING', 'SUSPENDED', 'CANCELLED'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <Btn small tone="mag" icon="send" onClick={() => emitToast('sbatch accepted — mock job 895002 enqueued (simulated)', 'ok')}>
                  SUBMIT
                </Btn>
              </div>
            }
            nopad
            className="t3-jobsbox"
          >
            {role === 'user' ? (
              view.length === 0 ? (
                <div className="t3-body" style={{ gap: 10 }}>
                  <div className="t3-lockedpanel">
                    <div className="t1">NO ACTIVE PERSONAL JOBS</div>
                    <div className="t2">
                      k.dane has no jobs in the cluster queue. Submitted jobs will appear here with live state, walltime
                      consumption and node allocation. Cluster-wide visibility is restricted to administrators.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn small tone="mag" icon="send" onClick={() => emitToast('sbatch accepted — mock job 895003 enqueued (simulated)', 'ok')}>
                      SBATCH DEMO JOB
                    </Btn>
                  </div>
                </div>
              ) : (
                view.map((j) => <div key={j.id}>{j.id} — {queue(j)}</div>)
              )
            ) : (
              <>
                <div style={{ maxHeight: 460, overflow: 'auto' }}>
                  <table className="t3-table">
                    <thead>
                      <tr>
                        <Th k="id" sortKey={sort} dir={dirAs} num onSort={skey}>JOB ID</Th>
                        <Th k="user" sortKey={sort} dir={dirAs} onSort={skey}>USER</Th>
                        <Th k="partition" sortKey={sort} dir={dirAs} onSort={skey}>PARTITION</Th>
                        <Th k="nodes" sortKey={sort} dir={dirAs} onSort={skey} num>NODES</Th>
                        <Th k="cores" sortKey={sort} dir={dirAs} onSort={skey} num>CPU</Th>
                        <Th k="walltime" sortKey={sort} dir={dirAs} onSort={skey}>WALLTIME</Th>
                        <Th k="state" sortKey={sort} dir={dirAs} onSort={skey}>STATE</Th>
                        <Th k="progress" w="120">PROGRESS</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.map((j) => {
                        const q2 = queue(j);
                        const progress = q2 === 'RUNNING' ? (j.walltimeUsed * 100) / Math.max(1, j.walltime) : 0;
                        return (
                          <tr key={j.id} className={`clk${sel === j.id ? ' sel' : ''}`} onClick={() => setSel(j.id)}>
                            <td className="t3-id">{j.id}</td>
                            <td>{j.user}</td>
                            <td>{j.partition}</td>
                            <td className="num">{j.nodes}</td>
                            <td className="num t3-hn">{j.cores}</td>
                            <td className="t3-hn">
                              {q2 === 'RUNNING' ? wt(j.walltimeUsed) : '—'} / {wt(j.walltime)}
                            </td>
                            <td><St s={q2} /></td>
                            <td>
                              <div className="t3-bar"><i style={{ width: `${Math.min(100, progress)}%` }} /></div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {view.length === 0 && <div className="t3-empty">NO JOBS MATCH THE CURRENT FILTER</div>}
                </div>
                <div className="t3-tfoot">
                  SHOWING {view.length} JOBS · ADMIN VIEW ACROSS ALL PARTITIONS
                </div>
              </>
            )}
          </Panel>
        </div>

        <aside className="t3-stack" style={{ gap: 8 }}>
          <Panel title="JOB SUMMARY" icon="cpu" tone="grn">
            <div className="t3-utilrow"><span>TOTAL (VIEW)</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{view.length}</span></div></div>
            <div className="t3-utilrow"><span>RUNNING</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v t3-dot-ok">● {view.filter((j) => queue(j) === 'RUNNING').length}</span></div></div>
            <div className="t3-utilrow"><span>PENDING</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">● {view.filter((j) => queue(j) === 'PENDING').length}</span></div></div>
            <div className="t3-utilrow"><span>QOS MIX</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">normal / premium / largejob</span></div></div>
            {role === 'user' && (
              <div style={{ marginTop: 8, fontSize: 9, color: 'var(--t3-ink3)', letterSpacing: 1 }}>
                PERSONAL JOB ACTIONS ONLY — sbatch / scancel on your own submissions.
              </div>
            )}
          </Panel>
          <Panel title="QUEUE HEALTH" icon="ok" tone="grn">
            <div className="t3-utilrow"><span>AVG WAIT</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">41m</span></div></div>
            <div className="t3-utilrow"><span>BACKFILL WINDOW</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">12m</span></div></div>
            <div className="t3-utilrow"><span>THROUGHPUT</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{fmt.int(874)} jobs/h</span></div></div>
          </Panel>
        </aside>

        {selJob && role === 'admin' && (
          <div className="t3-dl">
            <div className="t3-dl-top">
              <span style={{ fontSize: 11, letterSpacing: 1.2, color: 'var(--t3-ink)', fontWeight: 600 }}>JOB {selJob.id}</span>
              <Btn small tone="gh" icon="x" onClick={() => setSel(null)} />
            </div>
            <div className="t3-dl-sub">{selJob.user} · {selJob.partition} · {selJob.qos}</div>
            <div className="t3-dl-sec">DETAILS</div>
            <div className="t3-dl-grid">
              {([
                ['NAME', selJob.name],
                ['ACCOUNT', selJob.account],
                ['WALLTIME', wt(selJob.walltime)],
                ['NODELIST', selJob.nodelist],
              ] as const).map(([k, v]) => (
                <div className="t3-dl-r" key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
              <Btn
                small
                tone={queue(selJob) === 'CANCELLED' ? 'gh' : 'danger'}
                icon="stop"
                title={queue(selJob) === 'CANCELLED' ? 'Job already cancelled' : 'Signal scancel'}
                onClick={() => {
                  if (queue(selJob) === 'CANCELLED') return;
                  CANCELLED.add(selJob.id);
                  setTick((t) => t + 1);
                  emitToast(`scancel signalled job ${selJob.id} — simulated`, 'ok');
                  setSel(null);
                }}
              >
                SCANCEL
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
