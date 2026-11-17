import { useEffect, useMemo, useState } from 'react';
import { Panel, Btn, Th, St, emitToast } from '../components/ui';
import { JOBS, SCHED, GANTT, SCHED_LOGS, fmt, type T3Job, type T3Role, } from '../data';

type SortKey = 'id' | 'user' | 'partition' | 'nodes' | 'cores' | 'memMB' | 'walltime' | 'state';

const CANCELLED = new Set<number>();

function wt(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}:00`;
}

function cell(j: T3Job, key: SortKey): string | number {
  return j[key] as string | number;
}

function queue(j: T3Job): 'RUNNING' | 'PENDING' | 'SUSPENDED' | 'CANCELLED' {
  if (CANCELLED.has(j.id)) return 'CANCELLED';
  return j.state;
}

export function SchedulerPage({ role }: { role: T3Role }) {
  const [q, setQ] = useState('');
  const [stf, setStf] = useState('ALL');
  const [pf, setPf] = useState('ALL');
  const [sort, setSort] = useState<SortKey>('id');
  const [dir, setDir] = useState<1 | -1>(1);
  const [sel, setSel] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 9000);
    return () => window.clearInterval(t);
  }, []);
  void tick;
  const dirAs = dir === 1 ? 'asc' : 'desc';
  const skey = (k: string) => {
    setSort(k as SortKey);
    setDir((prev) => (sort === k ? (prev === 1 ? -1 : 1) : 1));
  };

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return JOBS.filter(
      (j) =>
        (stf === 'ALL' || j.state === stf) &&
        (pf === 'ALL' || j.partition === pf) &&
        (!ql || String(j.id).includes(ql) || j.user.includes(ql) || j.name.includes(ql) || j.partition.toLowerCase().includes(ql)),
    ).sort((a, b) => {
      const av = cell(a, sort);
      const bv = cell(b, sort);
      return (av === bv ? 0 : av > bv ? 1 : -1) * dir;
    });
  }, [q, stf, pf, sort, dir]);

  const parts = useMemo(() => ['ALL', ...new Set(JOBS.map((j) => j.partition))], []);
  const total = rows.length;
  const cancelable = rows.filter((j) => queue(j) !== 'CANCELLED' && (role === 'admin' || j.user === 'k.dane'));

  function cancelSel() {
    if (sel == null || !cancelable.some((j) => j.id === sel)) {
      emitToast('selection locked — admin or job owner only', 'warn');
      return;
    }
    CANCELLED.add(sel);
    setTick((t) => t + 1);
    emitToast(`scancel signalled job ${sel} — simulated`, 'ok');
    setSel(null);
  }

  function submitJob() {
    emitToast('sbatch accepted — mock job 895001 enqueued (simulated)', 'ok');
  }

  const selJob = sel != null ? JOBS.find((j) => j.id === sel) : undefined;

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {[
          { k: 'ACTIVE JOBS', v: fmt.int(SCHED.active), tone: 'grn' },
          { k: 'PENDING QUEUE', v: fmt.int(SCHED.pending), tone: 'vio' },
          { k: 'BLOCKED', v: fmt.int(SCHED.blocked), tone: 'amb' },
          { k: 'FAIRSHARE FACTOR', v: SCHED.fairshare.toFixed(2), tone: 'mag' },
        ].map((s) => (
          <div className="t3-stat" key={s.k}>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className={`t3-stat-v ${s.tone}`}>{s.v}</span>
                <span className="t3-stat-s">LIVE QUEUE STATE</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-grid-matrix">
        <div className="t3-col">
          <Panel
            title="SCHEDULER QUEUE"
            icon="scheduler"
            tone="grn"
            right={
              <div className="t3-filterrow" style={{ gap: 5 }}>
                <input className="t3-inp" placeholder="Filter ( jobid / user / jobname )" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="t3-inp" value={stf} onChange={(e) => setStf(e.target.value)} style={{ width: 128 }}>
                  {['ALL', 'RUNNING', 'PENDING', 'SUSPENDED', 'CANCELLED'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select className="t3-inp" value={pf} onChange={(e) => setPf(e.target.value)} style={{ width: 104 }}>
                  {parts.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <Btn small tone="mag" icon="send" onClick={submitJob}>SBATCH</Btn>
                <Btn
                  small
                  tone={sel == null ? 'gh' : 'danger'}
                  icon="stop"
                  title={sel == null ? 'Select a job first' : 'Signal scancel'}
                  onClick={() => (sel == null ? emitToast('select a job row first — nothing to cancel', 'warn') : cancelSel())}
                >
                  CANCEL
                </Btn>
              </div>
            }
            nopad
            className="t3-jobsbox"
          >
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <table className="t3-table">
                <thead>
                  <tr>
                    <Th k="id" sortKey={sort} dir={dirAs} num onSort={skey}>JOB ID</Th>
                    <Th k="user" sortKey={sort} dir={dirAs} onSort={skey}>USER</Th>
                    <Th k="partition" sortKey={sort} dir={dirAs} onSort={skey}>PARTITION</Th>
                    <Th k="nodes" sortKey={sort} dir={dirAs} onSort={skey} num>NODES</Th>
                    <Th k="cores" sortKey={sort} dir={dirAs} onSort={skey} num>CPU</Th>
                    <Th k="memMB" sortKey={sort} dir={dirAs} onSort={skey} num>MEM (MB)</Th>
                    <Th k="walltime" sortKey={sort} dir={dirAs} onSort={skey}>WALLTIME</Th>
                    <Th k="timelimit" sortKey={sort} dir={dirAs} w="76">TIME LFT</Th>
                    <Th k="used" w="76">TIME USED</Th>
                    <Th k="state" sortKey={sort} dir={dirAs} onSort={skey}>JOB STATE</Th>
                    <Th k="eststart" w="120">EST. START</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => {
                    const q = queue(j);
                    return (
                      <tr key={j.id} className={`clk${sel === j.id ? ' sel' : ''}`} onClick={() => setSel(j.id)}>
                        <td className="t3-id">{j.id}</td>
                        <td className={q !== 'CANCELLED' ? '' : undefined} style={q === 'CANCELLED' ? { color: 'var(--t3-ink3)', textDecoration: 'line-through' } : undefined}>
                          {j.user}
                        </td>
                        <td>{j.partition}</td>
                        <td className="num">{j.nodes}</td>
                        <td className="num t3-hn">{j.cores}</td>
                        <td className="num">{j.memMB}</td>
                        <td className="t3-hn">{wt(j.walltime)}</td>
                        <td>{wt(j.timelimit)}</td>
                        <td>{q === 'RUNNING' ? wt(j.walltimeUsed) : '00:00:00'}</td>
                        <td><St s={q} /></td>
                        <td style={{ color: 'var(--t3-ink3)' }}>{j.estStart ?? 'now'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && <div className="t3-empty">NO JOBS MATCH THE CURRENT FILTER</div>}
            </div>
            <div className="t3-tbody" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--t3-ink3)', textAlign: 'center' }}>
              SHOWING {total} JOBS · {cancelable.length} ACTIONABLE AS {role === 'admin' ? 'ADMIN' : 'USER'}
            </div>
          </Panel>
        </div>

        <aside className="t3-stack" style={{ gap: 8 }}>
          <Panel title="SCHEDULER TIMELINE" icon="chart" tone="grn">
            <div className="t3-gantt">
              {GANTT.map((segs, i) => (
                <div className="t3-grow" key={i}>
                  <span className="n">titan-node-{String(101 + i * 37).padStart(4, '0')}</span>
                  <div className="t3-glanel">
                    {segs.map((s, k) => (
                      <span
                        key={k}
                        className={`t3-gseg ${s.kind}`}
                        style={{ left: `${s.start}%`, width: `${s.len}%` }}
                        title={`${s.kind} window · ${s.start}h→${s.start + s.len}h`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="t3-gnow" style={{ left: '12%' }}><span>CURRENT TIME</span></div>
            </div>
            <div className="t3-gantt-leg">
              <span className="t3-gseg running" style={{ position: 'static' }} /> running
              <span className="t3-gseg pending" style={{ position: 'static' }} /> pending
              <span className="t3-gseg reserved" style={{ position: 'static' }} /> reserved
            </div>
          </Panel>

          <Panel title="SCHEDULER STATS" icon="cpu" tone="grn">
            <div className="t3-utilrow"><span>SLURMCTLD</span><span className="v t3-dot-ok">● OPERATIONAL</span></div>
            <div className="t3-utilrow"><span>THROUGHPUT</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">874 JOBS/HR</span></div></div>
            <div className="t3-utilrow"><span>AVG QUEUE WAIT</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">41m</span></div></div>
            <div className="t3-utilrow"><span>NODES BUSY</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{fmt.pct(89.2)}</span></div></div>
          </Panel>

          <Panel title="SCHEDULER DAEMON LOG" icon="list" tone="grn" nopad>
            <div className="t3-log">
              {SCHED_LOGS.map((l, i) => (
                <div className={`line ${l.tag}`} key={i}>
                  <span className="t">{l.t}</span>
                  <span className="msg">{l.msg}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        {selJob && (
          <div className="t3-dl">
            <div className="t3-dl-top">
              <span style={{ fontSize: 11, letterSpacing: 1.2, color: 'var(--t3-ink)', fontWeight: 600 }}>JOB {selJob.id}</span>
              <Btn small tone="gh" icon="x" onClick={() => setSel(null)} />
            </div>
            <div className="t3-dl-sub">{selJob.user} · {selJob.partition} · {selJob.qos}</div>
            <div className="t3-dl-sec">SPEC</div>
            <div className="t3-dl-grid">
              {([
                ['JOB NAME', selJob.name],
                ['ACCOUNT', selJob.account],
                ['SUBMIT TIME', selJob.submit],
                ['NODES / CPUS', `${selJob.nodes} / ${selJob.cores}`],
                ['MEMORY', `${selJob.memMB} MB`],
                ['WALLTIME', wt(selJob.walltime)],
                ['TIME LIMIT', wt(selJob.timelimit)],
                ['EST. START', selJob.estStart ?? 'now'],
              ] as const).map(([k, v]) => (
                <div className="t3-dl-r" key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div className="t3-dl-sec">STATE</div>
            <div><St s={queue(selJob)} /></div>
            <div className="t3-dl-sec">ALLOCATED NODES</div>
            <div style={{ color: 'var(--t3-ink3)', fontSize: 9, letterSpacing: 0.5, wordBreak: 'break-all' }}>{selJob.nodelist}</div>
            <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
              <Btn
                small
                tone="danger"
                icon="stop"
                onClick={() => queue(selJob) === 'CANCELLED' || (role !== 'admin' && selJob.user !== 'k.dane') ? undefined : cancelSel()}
              >
                SCANCEL
              </Btn>
              <Btn small tone="mag" icon="send" onClick={() => emitToast(`srun attached to job ${selJob.id} — simulated`, 'ok')}>
                SRUN ATTACH
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
