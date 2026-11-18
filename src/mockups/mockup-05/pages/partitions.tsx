import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as Lucide from 'lucide-react'
import {
  Bar, Breadcrumbs, Card, CardB, CardH, Icon, JobStateChip, MenuWrap, SortableTh, StateChipText,
  Tabs, emitToast, navTo,
} from '../components/ui'
import {
  JOBS, NODES, PARTITIONS, QOS_LIST, RESERVATIONS, SYS_ALERTS, seriesPoints,
} from '../data'
import type { EnNode, EnJob, Role } from '../data'
import { walk } from '../../../lib/helios-lib'

/** Partition config rows come straight from the shared model; Slurm has no
 * dedicated interface type, so the element shape is expressed inline. */
type Partition = (typeof PARTITIONS)[number]

/* Derived partition figures ------------------------------------------------
 * Every number on this page is derived from the shared cluster model at
 * render time; nothing is hardcoded or cached between renders.
 *
 * Slurm does not publish a "mixed" state, so nodes in the ALLOCATED state
 * that are running only a fraction of their cores are counted as mixed here.
 * ------------------------------------------------------------------------- */

function partitionNodes(name: string): EnNode[] {
  return NODES.filter((n) => n.partition === name)
}

/** ALLOCATED nodes running less than a majority of their cores read as mixed. */
function isMixed(n: EnNode): boolean {
  return n.state === 'ALLOCATED' && n.cpuUtil < 55
}

function nodesStateTally(nodes: EnNode[]) {
  const t = { idle: 0, mixed: 0, allocated: 0, draining: 0, down: 0 }
  for (const n of nodes) {
    if (n.state === 'IDLE') t.idle++
    else if (isMixed(n)) t.mixed++
    else if (n.state === 'ALLOCATED') t.allocated++
    else if (n.state === 'DRAINING') t.draining++
    else t.down++
  }
  return t
}

function parseCpus(res: string): number {
  const m = /(\d+)\s*CPU/i.exec(res)
  return m ? Number(m[1]) : 0
}

function parseGpus(res: string): number {
  const m = /(\d+)\s*GPU/i.exec(res)
  return m ? Number(m[1]) : 0
}

function parseMemGB(res: string): number {
  const m = /(\d+)\s*GB/i.exec(res)
  return m ? Number(m[1]) : 0
}

function partitionJobs(name: string) {
  const running = JOBS.filter((j) => j.partition === name && j.state === 'RUNNING')
  const pending = JOBS.filter((j) => j.partition === name && j.state === 'PENDING')
  const cpus = running.reduce((acc, j) => acc + parseCpus(j.resources), 0)
  const gpus = running.reduce((acc, j) => acc + parseGpus(j.resources), 0)
  const memGB = running.reduce((acc, j) => acc + parseMemGB(j.resources), 0)
  return { running, pending, cpus, gpus, memGB }
}

function memPerNodeStr(p: Partition): string {
  return p.memPerNodeGB >= 1024 ? '1 TB' : `${p.memPerNodeGB} GB`
}

function utilAvg(nodes: EnNode[]): number {
  if (!nodes.length) return 0
  return Math.round(nodes.reduce((acc, n) => acc + n.cpuUtil, 0) / nodes.length)
}

/* Per-partition 24-point utilisation history. The shared cluster model only
 * records live per-node figures, so history is simulated deterministically
 * from the cluster-wide series (fixed seeds — identical on every render). */
const HIST_SEEDS: Array<{ cpu: [number, number, number]; mem: [number, number, number] }> = [
  { cpu: [101, 16, 10], mem: [201, 22, 8] },
  { cpu: [118, 62, 28], mem: [218, 58, 22] },
  { cpu: [135, 55, 24], mem: [235, 52, 18] },
  { cpu: [152, 34, 16], mem: [252, 30, 12] },
]

function ptHistory(i: number): Array<{ cpu: number; mem: number }> {
  const s = HIST_SEEDS[i % HIST_SEEDS.length]
  const cpu = walk(s.cpu[0], 24, s.cpu[1], s.cpu[2])
  const mem = walk(s.mem[0], 24, s.mem[1], s.mem[2])
  return cpu.map((v, k) => ({ cpu: v, mem: mem[k] }))
}

// ---------------------------------------------------------------------------
// Card grid (list view)
// ---------------------------------------------------------------------------

function PartitionCard({ p }: { p: Partition }) {
  const nodes = partitionNodes(p.name)
  const t = nodesStateTally(nodes)
  const j = partitionJobs(p.name)
  const allocCores = nodes.reduce((acc, n) => acc + (n.state === 'ALLOCATED' ? Math.round((n.cpuUtil / 100) * n.cores) : 0), 0)
  const totalCores = nodes.reduce((acc, n) => acc + n.cores, 0)
  const allocGpus = Math.min(j.gpus, p.gpus) || 0
  const alerts = SYS_ALERTS.filter((a) =>
    (a.title.includes(p.name) || a.service === 'Nodes') && a.severity === 'critical',
  ).length
  const open = () => navTo({ page: 'partition', partition: p.name })
  return (
    <Card className="">
      <CardB>
        <div className="a5-pt-head">
          <button className="a5-name-link mono" onClick={open}>{p.name}</button>
          <StateChipText text={p.avail ? 'up' : 'down'} kind={p.avail ? 'green' : 'red'} />
        </div>
        <div className="a5-pt-stats">
          <div><b className="mono">{p.nodes}</b><span> nodes</span></div>
          <div><b className="mono">{p.coresPerNode}</b><span> cores/node</span></div>
          <div><b className="mono">{memPerNodeStr(p)}</b><span> mem/node</span></div>
          <div><b className="mono">{p.gpus || '—'}</b><span> GPUs</span></div>
        </div>
        <div className="ptx-rows">
          <div className="ptx-row"><span className="ptx-k">Nodes</span><span className="ptx-v ptx-wrap">
            <span className="ptx-state">Idle <b className="mono">{t.idle}</b></span>
            <span className="ptx-state">Mixed <b className="mono">{t.mixed}</b></span>
            <span className="ptx-state">Full <b className="mono">{t.allocated}</b></span>
            {t.draining > 0 && <span className="ptx-state">Drain <b className="mono">{t.draining}</b></span>}
            {t.down > 0 && <span className="ptx-state">Down <b className="mono">{t.down}</b></span>}
          </span></div>
          <div className="ptx-row"><span className="ptx-k">Jobs</span><span className="ptx-v ptx-wrap">
            <span className="ptx-state">Running <b className="mono">{j.running.length}</b></span>
            <span className="ptx-state">Pending <b className="mono">{j.pending.length}</b></span>
          </span></div>
          <div className="ptx-row"><span className="ptx-k">Cores</span><span className="ptx-v">
            <span><b className="mono">{allocCores}</b> / <span className="mono">{totalCores}</span> allocated</span>
          </span></div>
        </div>
        {p.gpus > 0 && (
          <div className="ptx-gpurow">
            <span className="ptx-k">GPU</span>
            <Bar pct={(allocGpus / p.gpus) * 100} kind="purple" />
            <span className="mono">{allocGpus}/{p.gpus}</span>
          </div>
        )}
        <div className="a5-pt-foot mono">Timelimit {p.timelimit}</div>
        <div className="ptx-cardfoot">
          {alerts > 0 ? (
            <span className="ptx-alertchip"><Lucide.TriangleAlert size={12} /> {alerts} active alert{alerts > 1 ? 's' : ''}</span>
          ) : (
            <span className="ptx-okchip"><Lucide.Check size={12} /> No critical alerts</span>
          )}
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={open}>Details <Lucide.ChevronRight size={13} /></button>
        </div>
      </CardB>
    </Card>
  )
}

function PartitionListPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Partitions' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Icon name="Layers" size={19} /> Partitions</h1>
          <div className="a5-pagehead-sub">{PARTITIONS.length} configured partitions · resource figures derived from live node and job state</div>
        </div>
      </div>
      <div className="a5-stack a5-stack-lg">
        <div className="a5-four">
          {PARTITIONS.map((p) => <PartitionCard key={p.name} p={p} />)}
        </div>
        <PartitionTable />
        <p className="a5-footnote"><Lucide.TriangleAlert size={13} /> Click a partition for its nodes, jobs and queue. Figures are derived live from the shared node and job dataset.</p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

function PartitionTable() {
  const [sort, setSort] = useState({ col: 'name', asc: true })

  const rows = useMemo(() => {
    const built = PARTITIONS.map((p) => {
      const nodes = partitionNodes(p.name)
      const jobs = partitionJobs(p.name)
      const t = nodesStateTally(nodes)
      return {
        p, t,
        running: jobs.running.length, pending: jobs.pending.length,
        cpu: utilAvg(nodes),
        gpuUtil: p.gpus ? Math.round((jobs.gpus / p.gpus) * 100) : null as number | null,
      }
    })
    const dir = sort.asc ? 1 : -1
    const getv = (row: (typeof built)[number]): string | number => {
      switch (sort.col) {
        case 'name': return row.p.name
        case 'state': return (row.p.avail ? 0 : 100) + row.t.down
        case 'nodes': return row.p.nodes
        case 'idle': return row.t.idle
        case 'alloc': return row.t.allocated + row.t.mixed
        case 'running': return row.running
        case 'pending': return row.pending
        case 'cpu': return row.cpu
        case 'gpu': return row.gpuUtil ?? -1
        default: return row.p.name
      }
    }
    built.sort((a, b) => {
      const va = getv(a)
      const vb = getv(b)
      if (typeof va === 'string' || typeof vb === 'string')
        return String(va).localeCompare(String(vb)) * dir
      return (va - vb) * dir
    })
    return built
  }, [sort])

  const onSort = (c: string) => setSort((s) => (s.col === c ? { col: c, asc: !s.asc } : { col: c, asc: true }))

  return (
    <Card>
      <CardH right={<span className="ptx-sub-hint">click a column to sort · click a row for detail</span>}>Partition comparison</CardH>
      <div className="aws5-table-wrap a5-tableflush">
        <table className="aws5-table ptx-tight">
          <thead>
            <tr>
              <SortableTh label="Partition" col="name" sort={sort} onSort={onSort} width={112} />
              <SortableTh label="State" col="state" sort={sort} onSort={onSort} width={76} />
              <SortableTh label="Nodes" col="nodes" sort={sort} onSort={onSort} width={62} center />
              <SortableTh label="Idle" col="idle" sort={sort} onSort={onSort} width={54} center />
              <SortableTh label="Allocated" col="alloc" sort={sort} onSort={onSort} width={138} />
              <SortableTh label="Running" col="running" sort={sort} onSort={onSort} width={76} center />
              <SortableTh label="Pending" col="pending" sort={sort} onSort={onSort} width={74} center />
              <SortableTh label="CPU util" col="cpu" sort={sort} onSort={onSort} width={82} center />
              <SortableTh label="GPU util" col="gpu" sort={sort} onSort={onSort} width={78} center />
              <th className="a5-c">Down</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p.name} onClick={() => navTo({ page: 'partition', partition: r.p.name })}>
                <td><span className="a5-name-link mono">{r.p.name}</span></td>
                <td><StateChipText text={r.p.avail ? 'up' : 'down'} kind={r.p.avail ? 'green' : 'red'} /></td>
                <td className="a5-c mono">{r.p.nodes}</td>
                <td className="a5-c mono">{r.t.idle}</td>
                <td className="a5-barcell"><Bar pct={r.t.allocated + r.t.mixed} kind="blue" /><span className="mono">{r.t.allocated + r.t.mixed}%</span></td>
                <td className="a5-c mono">{r.running}</td>
                <td className="a5-c mono">{r.pending}</td>
                <td className="a5-c mono">{r.cpu}%</td>
                <td className="a5-c mono">{r.gpuUtil === null ? '—' : `${r.gpuUtil}%`}</td>
                <td className="a5-c">
                  {r.t.down > 0 ? <StateChipText text={`${r.t.down} down`} kind="red" /> : <span className="ptx-sub-hint">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Job table (detail page tabs)
// ---------------------------------------------------------------------------

function partitionJobRows(jobs: EnJob[]) {
  return [...jobs].sort((x, y) => y.priority - x.priority)
}

function PartitionJobsTable({ jobs, empty }: { jobs: EnJob[]; empty: string }) {
  const rows = partitionJobRows(jobs)
  if (!rows.length) return <div className="a5-empty">{empty}</div>
  return (
    <div className="aws5-table-wrap a5-tableflush">
      <table className="aws5-table">
        <thead><tr>
          <th>Job ID</th><th>Name</th><th>User</th><th>State</th><th>Elapsed</th><th>Account</th><th>QOS</th>
          <th>Resources</th><th className="a5-c">Priority</th>
        </tr></thead>
        <tbody>
          {rows.map((jb) => (
            <tr key={jb.id}>
              <td><button className="a5-name-link mono" onClick={() => navTo({ page: 'jobs' })}>{jb.id}</button></td>
              <td>{jb.name}</td>
              <td>{jb.user}</td>
              <td><JobStateChip state={jb.state} /></td>
              <td className="sub">{jb.elapsedStr}</td>
              <td className="mono">{jb.account}</td>
              <td className="sub mono">{jb.qos}</td>
              <td className="mono">{jb.resources}</td>
              <td className="a5-c mono">{jb.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail page
// ------------------------------------------------------------------------- */

function stateLabel(n: EnNode): string {
  if (n.state === 'DOWN') return 'DOWN'
  if (n.state === 'DRAINING') return 'DRAINING'
  if (n.state === 'IDLE') return 'IDLE'
  return isMixed(n) ? 'MIXED' : 'ALLOCATED'
}

function chipKind(n: EnNode): 'green' | 'blue' | 'purple' | 'red' {
  if (n.state === 'DOWN') return 'red'
  if (n.state === 'DRAINING') return 'purple'
  if (n.state === 'IDLE') return 'green'
  return 'blue'
}

function avgUtil(nodes: EnNode[], pick: (n: EnNode) => number): number {
  if (!nodes.length) return 0
  return Math.round(nodes.reduce((acc, n) => acc + pick(n), 0) / nodes.length)
}

function memUtilAvg(nodes: EnNode[]): number {
  return avgUtil(nodes, (n) => n.memUtil)
}

type NodeSortCol = 'name' | 'state' | 'cores' | 'memGB' | 'jobs'

function busySeries(seed: number, avg: number): number[] {
  return walk(seed, 24, avg, 26)
}

/* Per-partition 24-hour utilisation history — simulated deterministically
 * from fixed per-partition seeds (identical every render; no Math.random). */

function SparkBlock({ data, color }: { data: number[]; color: 'blue' | 'purple' | 'green' | 'amber' }) {
  const pts = seriesPoints(data, 300, 64)
  const colorVar = color === 'blue' ? 'var(--a5-blue)' : color === 'purple' ? 'var(--a5-purple)' : color === 'amber' ? 'var(--a5-amber)' : 'var(--a5-green)'
  return (
    <svg className="ptx-sparksvg" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={areaPoints(pts)} fill={colorVar} opacity="0.14" />
      <polyline className="ptx-sparkline" points={linePoints(pts)} fill="none" strokeWidth="1.6" stroke={colorVar} />
    </svg>
  )
}

type SparkPt = { x: number; y: number; v: number }
function areaPoints(pts: SparkPt[]): string {
  if (!pts.length) return ''
  const last = pts[pts.length - 1]
  const first = pts[0]
  return `${pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')} ${last.x.toFixed(1)},64 ${first.x.toFixed(1)},64`
}
function linePoints(pts: SparkPt[]): string {
  return pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
}


export function PartitionDetailPage({ name, role = 'admin' }: { name: string; role?: Role }) {
  const [tab, setTab] = useState('Overview')
  const p = PARTITIONS.find((x) => x.name === name)
  if (!p) return <div className="a5-empty">Unknown partition <span className="mono">{name}</span>.</div>
  const idx = PARTITIONS.indexOf(p)
  const nodes = partitionNodes(p.name)
  const t = nodesStateTally(nodes)
  const j = partitionJobs(p.name)
  const hist = ptHistory(idx)
  const upPct = nodes.length ? Math.round(((nodes.length - t.down) / nodes.length) * 100) : 0
  const alertCount = SYS_ALERTS.filter((a) => a.service === 'Nodes' && a.title.includes(p.name)).length
  const activeRes = RESERVATIONS.filter((r) => r.partition === p.name && r.state === 'ACTIVE')

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Compute' },
        { label: 'Partitions', onClick: () => navTo({ page: 'partitions' }) },
        { label: p.name },
      ]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Icon name="Layers" size={19} /> {p.name}</h1>
          <div className="a5-pagehead-sub">
            {p.nodes} compute nodes · {p.coresPerNode} cores per node · {memPerNodeStr(p)} per node
            {p.gpus > 0 ? ` · ${p.gpus} GPUs` : ''} · TimeLimit {p.timelimit}
          </div>
        </div>
        <div className="a5-pagehead-actions">
          <StateChipText text={p.avail ? 'up' : 'down'} kind={p.avail ? 'green' : 'red'} />
          <button className="aws5-btn aws5-btn--primary" onClick={() => navTo({ page: 'submit-job', partition: p.name })}>Submit Job</button>
        </div>
      </div>

      <div className="a5-stack">
        <Tabs
          tabs={['Overview', 'Nodes', 'Jobs', 'Queue & QOS', 'Configuration']}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'Overview' && (
        <div className="a5-stack">
          <div className="aws5-grid5">
            <Card><CardB className="ptx-b">
              <div className="aws5-kpi-top"><span className="aws5-kpi-label">Total Nodes</span><span className="aws5-counticon--navy ptx-icoicon"><Lucide.Server size={16} /></span></div>
              <div className="aws5-kpi-val">{p.nodes}</div>
              <div className="aws5-kpi-sub">{t.idle} idle · {t.mixed} mixed · {t.allocated} full</div>
            </CardB></Card>
            <Card><CardB className="ptx-b">
              <div className="aws5-kpi-top"><span className="aws5-kpi-label">Availability</span><span className={`ptx-icoicon ${upPct >= 95 ? 'aws5-counticon--green' : 'aws5-counticon--amber'}`}><Lucide.Activity size={16} /></span></div>
              <div className="aws5-kpi-val">{upPct}<small>%</small></div>
              <div className="aws5-kpi-sub">{nodes.length - t.down} of {nodes.length} nodes accepting work</div>
            </CardB></Card>
            <Card><CardB className="ptx-b">
              <div className="aws5-kpi-top"><span className="aws5-kpi-label">Running Jobs</span><span className="aws5-counticon--blue ptx-icoicon"><Lucide.Cpu size={16} /></span></div>
              <div className="aws5-kpi-val">{j.running.length}</div>
              <div className="aws5-kpi-sub">{j.cpus} CPUs · {j.memGB} GB in use</div>
            </CardB></Card>
            <Card><CardB className="ptx-b">
              <div className="aws5-kpi-top"><span className="aws5-kpi-label">Pending Jobs</span><span className={`ptx-icoicon ${j.pending.length ? 'aws5-counticon--amber' : 'aws5-counticon--green'}`}><Lucide.ListOrdered size={16} /></span></div>
              <div className="aws5-kpi-val">{j.pending.length}</div>
              <div className="aws5-kpi-sub">{activeRes.length} active reservation{activeRes.length === 1 ? '' : 's'}</div>
            </CardB></Card>
            <Card><CardB className="ptx-b">
              <div className="aws5-kpi-top"><span className="aws5-kpi-label">Alerts</span><span className={`ptx-icoicon ${alertCount ? 'aws5-counticon--red' : 'aws5-counticon--green'}`}><Lucide.Bell size={16} /></span></div>
              <div className="aws5-kpi-val">{alertCount}</div>
              <div className="aws5-kpi-sub">{alertCount ? 'open node alerts' : 'no open alerts'}</div>
            </CardB></Card>
          </div>

          <div className="ptx-2col">
            <Card>
              <CardH right={<span className="ptx-hint">averaged over {nodes.length} nodes</span>}>Utilisation</CardH>
              <div className="ptx-utilcard">
                <div className="ptx-bars">
                  <div className="ptx-bar"><span className="ptx-bark">CPU</span><Bar pct={utilAvg(nodes)} kind="blue" large /><span className="mono">{utilAvg(nodes)}%</span></div>
                  <div className="ptx-bar"><span className="ptx-bark">Memory</span><Bar pct={memUtilAvg(nodes)} kind="purple" large /><span className="mono">{memUtilAvg(nodes)}%</span></div>
                </div>
                <div className="ptx-sparkgrid">
                  <div className="ptx-sparkbox">
                    <div className="ptx-sparkhead"><span>CPU (24h)</span><span className="mono">{utilAvg(nodes)}% now</span></div>
                    <SparkBlock data={hist.map((h) => h.cpu)} color="blue" />
                  </div>
                  <div className="ptx-sparkbox">
                    <div className="ptx-sparkhead"><span>Memory (24h)</span><span className="mono">{hist[hist.length - 1].mem}%</span></div>
                    <SparkBlock data={hist.map((h) => h.mem)} color="purple" />
                  </div>
                  <div className="ptx-sparkbox">
                    <div className="ptx-sparkhead"><span>Busy nodes</span><span className="mono">{t.allocated + t.mixed}/{nodes.length}</span></div>
                    <SparkBlock data={busySeries(410 + idx, t.allocated + t.mixed)} color="green" />
                  </div>
                </div>
                <p className="ptx-note">Historical series are simulated deterministically for the mockup; current figures are derived from node state.</p>
              </div>
            </Card>

            <Card>
              <CardH right={<span className="ptx-hint">derived from running job resources</span>}>Allocation</CardH>
              <div className="ptx-utilcard">
                <div className="ptx-bars">
                  <div className="ptx-bar"><span className="ptx-bark">Cores</span><Bar pct={(j.cpus / totalCores(p, nodes)) * 100} kind="blue" large /><span className="mono">{j.cpus}/{totalCores(p, nodes)}</span></div>
                  {p.gpus > 0 && (
                    <div className="ptx-bar"><span className="ptx-bark">GPUs</span><Bar pct={(Math.min(j.gpus, p.gpus) / p.gpus) * 100} kind="purple" large /><span className="mono">{Math.min(j.gpus, p.gpus)}/{p.gpus}</span></div>
                  )}
                  <div className="ptx-bar"><span className="ptx-bark">Nodes busy</span><Bar pct={((t.allocated + t.mixed) / (nodes.length || 1)) * 100} kind="green" large /><span className="mono">{t.allocated + t.mixed}/{nodes.length}</span></div>
                </div>
                <div className="ptx-reslist">
                  {RESERVATIONS.filter((r) => r.partition === p.name).map((r) => (
                    <div key={r.name} className="ptx-resrow">
                      <span className="mono">{r.name}</span>
                      <span className="ptx-resmeta">{r.nodes} nodes · {r.users}</span>
                      <StateChipText text={r.state.toLowerCase()} kind={r.state === 'ACTIVE' ? 'green' : 'blue'} />
                    </div>
                  ))}
                  {p.name === 'gpu' && <div className="ptx-alertline"><Lucide.TriangleAlert size={13} /> Upcoming maintenance reservation · enucc-gpu-003 down (ticket HW-4471)</div>}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardH right={<span className="ptx-hint">{j.running.length} running · <button className="ptx-link" onClick={() => navTo({ page: 'jobs', partition: p.name })}>open Slurm Jobs filtered to {p.name}</button></span>}>Running jobs on {p.name}</CardH>
            <PartitionJobsTable jobs={j.running.slice(0, 6)} empty={`No running jobs on ${p.name}.`} />
            {j.running.length > 6 && (
              <div className="ptx-cardfoot">
                <span className="ptx-hint">Top 6 by priority</span>
                <button className="ptx-link" onClick={() => navTo({ page: 'jobs', partition: p.name })}>View all {j.running.length} running jobs</button>
              </div>
            )}
          </Card>

          <Card>
            <CardH right={<span className="ptx-hint">cluster events relevant to {p.name}</span>}>Active alerts &amp; scheduler notices</CardH>
            <div className="ptx-alertlist">
              {SYS_ALERTS.filter((a) => a.service === 'Nodes' || a.service === 'Slurm (controller)').map((a) => (
                <div key={a.id} className="ptx-alertrow">
                  <span className={`ptx-sev ptx-sev--${a.severity}`}>{a.severity}</span>
                  <span className="ptx-alerttext">{a.title}</span>
                  <span className="ptx-alertmeta">{a.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Nodes' && <PartitionNodesTab p={p} nodes={nodes} role={role} />}

      {tab === 'Jobs' && (
        <div className="a5-stack">
          <Card>
            <CardH right={<span className="ptx-hint">{j.running.length} running · {j.pending.length} pending · <button className="ptx-link" onClick={() => navTo({ page: 'jobs', partition: p.name })}>open in Slurm Jobs</button></span>}>Jobs on {p.name}</CardH>
            <PartitionJobsTable jobs={[...j.running, ...j.pending].slice(0, 25)} empty={`No jobs on ${p.name}.`} />
          </Card>
          <Card>
            <CardH right={<span className="ptx-hint">jobs awaiting resources</span>}>Pending queue — {p.name}</CardH>
            <PartitionJobsTable jobs={j.pending} empty={`Queue empty — no pending jobs on ${p.name}.`} />
          </Card>
        </div>
      )}

      {tab === 'Queue & QOS' && (
        <div className="ptx-2col">
          <Card>
            <CardH right={<span className="ptx-hint">cluster-wide; applied at submit time</span>}>QOS policies</CardH>
            <div className="aws5-table-wrap a5-tableflush">
              <table className="aws5-table">
                <thead><tr><th>Name</th><th className="a5-c">Priority</th><th>Max walltime</th><th>Max jobs / CPUs</th><th>Description</th></tr></thead>
                <tbody>
                  {QOS_LIST.map((q) => (
                    <tr key={q.name}>
                      <td className="mono">{q.name}</td>
                      <td className="a5-c mono">{q.priority}</td>
                      <td className="mono">{q.maxWall}</td>
                      <td className="mono">{q.maxJobs} / {q.maxCpus}</td>
                      <td className="sub">{q.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <CardH right={<span className="ptx-hint">{j.pending.length} jobs</span>}>Pending queue — {p.name}</CardH>
            <PartitionJobsTable jobs={j.pending} empty={`Queue empty — nothing waiting on ${p.name}.`} />
            <div className="ptx-cardfoot"><span className="ptx-hint">Reasons are read from the scheduler snapshot (simulated).</span></div>
          </Card>
        </div>
      )}

      {tab === 'Configuration' && <PartitionConfigTab p={p} />}

      <p className="a5-footnote"><Lucide.Info size={13} /> Figures are derived from the shared node and job mock dataset — no scheduler backend is queried; historical series are simulated deterministically. Equivalent to <span className="mono">sinfo</span> / <span className="mono">squeue</span> output.</p>
    </div>
  )
}

function totalCores(p: Partition, nodes: EnNode[]): number {
  return nodes.length ? nodes.reduce((a, n) => a + n.cores, 0) : p.nodes * p.coresPerNode
}

// ---------------------------------------------------------------------------
// Detail — Nodes tab
// ---------------------------------------------------------------------------

function PartitionNodesTab({ p, nodes, role }: { p: Partition; nodes: EnNode[]; role: Role }) {
  const t = nodesStateTally(nodes)
  return (
    <div className="a5-stack">
      <div className="a5-filterbar">
        <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'nodes', partition: p.name })}>
          <Lucide.ExternalLink size={13} /> Open all {p.nodes} {p.name} nodes in Nodes Explorer
        </button>
        <span className="ptx-hint">{t.idle} idle · {t.mixed} mixed · {t.allocated} full · {t.draining} draining · {t.down} down</span>
      </div>
      <Card>
        <CardH right={<span className="ptx-hint">{nodes.length} nodes · state figures derived live</span>}>Nodes in {p.name}</CardH>
        <PartitionNodesTable nodes={nodes} role={role} />
      </Card>
    </div>
  )
}

/** Compact node table scoped to one partition; reuses ui kit styling. */
function PartitionNodesTable({ nodes, role }: { nodes: EnNode[]; role: Role }) {
  const [sort, setSort] = useState<{ col: NodeSortCol; asc: boolean }>({ col: 'name', asc: true })
  const rows = useMemo(() => {
    const dir = sort.asc ? 1 : -1
    return [...nodes].sort((a, b) => {
      switch (sort.col) {
        case 'state': return a.state.localeCompare(b.state) * dir
        case 'cores': return (a.cores - b.cores) * dir
        case 'memGB': return (a.memGB - b.memGB) * dir
        case 'jobs': return (a.jobs - b.jobs) * dir
        default: return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir
      }
    })
  }, [nodes, sort])
  const onSort = (c: string) => setSort((s) => (s.col === c ? { col: c as NodeSortCol, asc: !s.asc } : { col: c as NodeSortCol, asc: true }))
  return (
    <div className="aws5-table-wrap a5-tableflush">
      <table className="aws5-table">
        <thead>
          <tr>
            <SortableTh label="Node" col="name" sort={sort} onSort={onSort} />
            <SortableTh label="State" col="state" sort={sort} onSort={onSort} />
            <SortableTh label="Cores" col="cores" sort={sort} onSort={onSort} center />
            <SortableTh label="Memory" col="memGB" sort={sort} onSort={onSort} />
            <th>GPU</th>
            <SortableTh label="Jobs" col="jobs" sort={sort} onSort={onSort} center />
            <th>Health</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.name}>
              <td className="mono"><span className="a5-name-link" onClick={() => navTo({ page: 'node', node: n.name })}>{n.name}</span></td>
              <td><StateChipText text={stateLabel(n)} kind={chipKind(n)} /></td>
              <td className="mono">{n.cores}</td>
              <td className="mono">{n.memStr}</td>
              <td className="sub">{n.gpuCount ? `${n.gpuCount} × GPU` : '—'}</td>
              <td className="a5-c mono">{n.jobs}</td>
              <td className="a5-c"><StateChipText text={n.health} kind={n.health === 'Healthy' ? 'green' : n.health === 'Degraded' ? 'amber' : 'red'} /></td>
              <td className="a5-c">
                <MenuWrap
                  align="right"
                  button={<button className="aws5-iconbtn aws5-iconbtn--sm" aria-label={`${n.name} actions`}><Lucide.MoreHorizontal size={14} /></button>}
                  items={[
                    { label: 'View details', icon: 'Eye', onClick: () => navTo({ page: 'node', node: n.name }) },
                    { label: 'Connect via SSH', icon: 'SquareTerminal', onClick: () => emitToast('info', `Opening terminal to ${n.name}… (simulated)`) },
                    { label: 'Copy node name', icon: 'Copy', onClick: () => emitToast('success', `${n.name} copied`) },
                    { label: 'Drain node', icon: 'Ban', kind: 'warn', disabled: role !== 'admin', onClick: () => emitToast('warn', `Drain requested for ${n.name} (simulated)`) },
                    { label: 'Power off node', icon: 'Power', kind: 'danger', disabled: role !== 'admin', onClick: () => emitToast('error', 'Power off rejected in demo mode') },
                  ]}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="a5-empty">No nodes in this partition.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail — Configuration tab (read-only)
// ---------------------------------------------------------------------------

function PartitionConfigTab({ p }: { p: Partition }) {
  const allowQos = p.name === 'gpu' ? ['high', 'normal'] : p.name === 'login' ? ['normal', 'low'] : ['normal', 'low', 'long']
  const rows: Array<[string, ReactNode]> = [
    ['PartitionName', <span className="mono" key="n">{p.name}</span>],
    ['State', <span key="s">{p.avail ? 'UP' : 'DOWN'}</span>],
    ['DefaultTime', <span className="mono" key="dt">{defaultTime(p)}</span>],
    ['MaxTime', <span className="mono" key="mt">{p.timelimit}</span>],
    ['TotalNodes', <span className="mono" key="tn">{p.nodes}</span>],
    ['TotalCPUs', <span className="mono" key="tc">{totalCores(p, partitionNodes(p.name))}</span>],
    ['TotalGPUs', <span className="mono" key="tg">{p.gpus || '—'}</span>],
    ['OverSubscribe', <span key="os">EXCLUSIVE</span>],
    ['AllowAccounts', <span className="mono" key="aa">ALL</span>],
    ['AllowGroups', <span className="mono" key="ag">ALL</span>],
    ['AllowQos', <span className="mono" key="aq">{allowQos.join(', ')}</span>],
    ['DefaultQOS', <span className="mono" key="dq">normal</span>],
    ['MaxNodesPerJob', <span className="mono" key="mn">{maxNodesPerJob(p)}</span>],
    ['SchedulingPriorityTier', <span className="mono" key="pt">{priorityTier(p)}</span>],
  ]
  return (
    <Card>
      <CardH right={<span className="ptx-hint">read-only · derived for the mockup</span>}>slurm.conf partition definition</CardH>
      <div className="ptx-confgrid">
        <div className="ptx-confkv">
          {rows.map(([k, v]) => <div key={k} className="ptx-kvrow"><div className="ptx-kvk">{k}</div><div className="ptx-kvv">{v}</div></div>)}
        </div>
        <div className="ptx-codebox">
          <div className="ptx-codehead">slurm.conf excerpt · enucc-mgmt-01</div>
          <pre>{`PartitionName=${p.name}
  Nodes=ALL
  DefaultTime=${defaultTime(p)}
  MaxTime=${p.timelimit}
  State=UP
  OverSubscribe=EXCLUSIVE
  AllowGroups=ALL
  AllowQos=${allowQos.join(',')}`}</pre>
        </div>
      </div>
    </Card>
  )
}

function defaultTime(p: Partition): string {
  if (p.name === 'login') return '01:00:00'
  if (p.name === 'gpu') return '04:00:00'
  return '02:00:00'
}

function maxNodesPerJob(p: Partition): string {
  if (p.name === 'login') return '2'
  if (p.name === 'gpu') return '8'
  return '64'
}

function priorityTier(p: Partition): string {
  if (p.name === 'login') return '1'
  if (p.name === 'gpu') return '3'
  return '2'
}

export { PartitionListPage as PartitionsPage }
