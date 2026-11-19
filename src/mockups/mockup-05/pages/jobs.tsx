import { useEffect, useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, JobStateChip, Kv, MenuWrap, Modal, Pagination,
  SortableTh, emitToast, navTo,
} from '../components/ui'
import { JOBS, PARTITIONS, SESSION_USER, isOwnJob, scopedJobs } from '../data'
import type { EnJob, JobState, Role, SessionIdentity } from '../data'
import { canPerformAction, isFeatureEnabled } from '../pages/feature-flags'

/* The Submit Job page pushes simulated submissions into this same array, so
 * freshly submitted jobs appear here without a separate dataset. */
const allJobs = (me: SessionIdentity): EnJob[] => (me ? scopedJobs(me.role) : scopedJobs('admin'))

type ColumnToggles = {
  cpus: boolean
  mem: boolean
  gpus: boolean
  submit: boolean
  started: boolean
  reason: boolean
}

const DEFAULT_COLS: ColumnToggles = { cpus: false, mem: false, gpus: false, submit: false, started: false, reason: false }
const RICH_COLS: ColumnToggles = { cpus: true, mem: true, gpus: true, submit: true, started: true, reason: true }

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

/* ---------------------------------------------------------------- derive --
 * EnJob carries a human-readable `resources` string. The derived fields below
 * are parsed deterministically so the table and detail views stay consistent
 * with the cluster dataset. Both the generated format ("16 CPU, 64 GB") and
 * the Submit Job format ("2 nodes · 32 cpus · 64G") are handled.
 * ------------------------------------------------------------------------- */

const numRe = (src: string, re: RegExp): number => {
  const m = src.match(re)
  return m ? Number(m[1]) : 0
}

const PENDING_REASONS = [
  { reason: 'Resources', detail: 'Partition is fully allocated — the job starts when a suitable node frees up.' },
  { reason: 'Priority', detail: 'Higher priority jobs are queued ahead of this job in the same partition.' },
  { reason: 'QOSMaxCpuPerUserLimit', detail: 'The account reached its QoS CPU limit; the job is eligible once below the cap.' },
  { reason: 'Dependency', detail: 'A dependency condition (afterok:489201) has not been satisfied yet.' },
] as const

function deriveJob(j: EnJob) {
  const r = j.resources
  const gpus = numRe(r, /(\d+)\s*GPU/i)
  const cpusM = r.match(/(\d+)\s*(?:CPU|cpus?)/i)
  const cpus = cpusM ? Number(cpusM[1]) : 1
  const memM = r.match(/([\d.]+)\s*(TB|GB|G)\b/i)
  const memGB = memM ? (/T/i.test(memM[2]) ? Number(memM[1]) * 1024 : Number(memM[1])) : 0
  const part = PARTITIONS.find((p) => p.name === j.partition)
  const timeLimit = part ? part.timelimit : '—'

  const isPending = j.state === 'PENDING'
  const pr = PENDING_REASONS[j.id % PENDING_REASONS.length]

  // Deterministic node assignment consistent with the Nodes page naming
  // (enucc-cpu-*, enucc-gpu-*, enucc-himem-* with two digit padding).
  const nodeList: string[] = []
  if (!isPending && j.state !== 'FAILED') {
    const prefix = j.partition === 'gpu' ? 'enucc-gpu-' : j.partition === 'himem' ? 'enucc-himem-' : 'enucc-cpu-'
    const pad = j.partition === 'himem' ? 2 : 3
    const pool = j.partition === 'gpu' ? 13 : j.partition === 'himem' ? 12 : 101
    const seed = ((j.id % 900) + 900) % 900
    for (let k = 0; k < j.nodes; k++) {
      const idx = 1 + ((seed + k * 13) % pool)
      nodeList.push(`${prefix}${String(idx).padStart(pad, '0')}`)
    }
  }

  const seed = ((j.id % 907) + 907) % 907
  const cpuUtil = j.state === 'RUNNING' ? 42 + (seed % 53) : 0
  const memUtil = j.state === 'RUNNING' ? 30 + ((seed * 3) % 64) : 0
  const gpuUtil = j.state === 'RUNNING' && gpus > 0 ? 35 + ((seed * 7) % 62) : 0
  const endedAt = j.state === 'COMPLETED' ? 'Today, 09:18:40' : j.state === 'FAILED' ? 'Nov 15, 22:41:12' : null

  return {
    cpus,
    memGB,
    gpus,
    timeLimit,
    pendingReason: isPending ? pr.reason : null,
    pendingDetail: isPending ? pr.detail : null,
    nodeList,
    cpuUtil,
    memUtil,
    gpuUtil,
    endedAt,
  }
}

type JRow = EnJob & ReturnType<typeof deriveJob>

const STATE_CARDS: Array<{ state: JobState; label: string; icon: string; tint: string }> = [
  { state: 'RUNNING', label: 'Running jobs', icon: 'CirclePlay', tint: 'blue' },
  { state: 'PENDING', label: 'Pending jobs', icon: 'Hourglass', tint: 'amber' },
  { state: 'COMPLETED', label: 'Completed (24h)', icon: 'CircleCheck', tint: 'green' },
  { state: 'FAILED', label: 'Failed jobs', icon: 'CircleX', tint: 'red' },
]

/* --------------------------------------------------------------- header -- */

function jobsSub(jobs: EnJob[]): string {
  const c = (s: JobState) => jobs.filter((x) => x.state === s).length
  return `${c('RUNNING')} running · ${c('PENDING')} pending · ${c('COMPLETED')} completed · ${c('FAILED')} failed (squeue, simulated controller)`
}

function JobsHeader({ me, view, setView, onExport }: { me: SessionIdentity; view: 'table' | 'cards'; setView: (v: 'table' | 'cards') => void; onExport: () => void }) {
  const cluster = me.role === 'admin'
  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: cluster ? 'Slurm Jobs' : 'My Jobs' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Lucide.ListChecks size={19} /> {cluster ? 'Slurm Jobs' : 'My Jobs'}</h1>
          <div className="a5-pagehead-sub">{jobsSub(allJobs(me))}{cluster ? '' : (me.account ? ` · charged to ${me.account}` : '')}</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Job queue refreshed')}>
            <Lucide.RefreshCw size={13} />Refresh
          </button>
          <div className="a5-seg" role="tablist" aria-label="Jobs view">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
            <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
          </div>
          <MenuWrap
            label="Actions"
            items={[
              { label: 'Export queue (CSV)', icon: 'Download', onClick: onExport },
              { sep: true, label: '' },
              { label: 'Open job history', icon: 'History', onClick: () => navTo({ page: 'job-history' }) },
            ]}
          />
        </div>
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- kpis -- */

function Kpis({ rows, active, onToggle }: { rows: EnJob[]; active: JobState | null; onToggle: (s: JobState | null) => void }) {
  const counts = useMemo(() => {
    const map: Record<JobState, number> = { RUNNING: 0, PENDING: 0, COMPLETED: 0, FAILED: 0 }
    for (const j of rows) map[j.state]++
    return map
  }, [rows])
  return (
    <div className="a5-four">
      {STATE_CARDS.map((f) => {
        const sel = active === f.state
        return (
          <Card
            key={f.state}
            className={`aws5-kpi a5-statecard${sel ? ' a5-statecard--sel' : ''}`}
            onClick={() => onToggle(sel ? null : f.state)}
          >
            <div className="aws5-kpi-row">
              <span className="aws5-kpi-label">{f.label}</span>
              <span className={`aws5-counticon aws5-counticon--${f.tint}`}><Lucide.CirclePlay size={0} strokeWidth={0} className="a5-hide" />{' '}</span>
            </div>
            <div className="aws5-kpi-val">{counts[f.state].toLocaleString('en-GB')}</div>
            <div className="a5-statecard-hint">{sel ? 'Filtered — click to clear' : 'Click to filter'}</div>
          </Card>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------- filters -- */

function Filters({ q, setQ, state, setState, part, setPart, account, setAccount, onClear, count, total }: {
  q: string; setQ: (v: string) => void
  state: string; setState: (v: string) => void
  part: string; setPart: (v: string) => void
  account: string; setAccount: (v: string) => void
  onClear: () => void
  count: number; total: number
}) {
  const dirty = Boolean(q || state !== 'ALL' || part !== 'ALL' || account !== 'ALL')
  return (
    <div className="a5-filterbar">
      <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search job ID, name, user, account…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="aws5-selectwrap">
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State filter">
          <option value="ALL">State: ALL</option>
          <option value="RUNNING">RUNNING</option>
          <option value="PENDING">PENDING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <div className="aws5-selectwrap">
        <select value={part} onChange={(e) => setPart(e.target.value)} aria-label="Partition filter">
          <option value="ALL">Partition: ALL</option>
          {PARTITIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <div className="aws5-selectwrap">
        <select value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Account filter">
          <option value="ALL">Account: ALL</option>
          {ACCOUNT_OPTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <button className={`a5-clearbtn${dirty ? '' : ' a5-clearbtn--off'}`} onClick={onClear} disabled={!dirty}>
        <Lucide.ListFilter size={12} />Clear filters
      </button>
      <span className="a5-filtercount">{count.toLocaleString('en-GB')} of {total.toLocaleString('en-GB')}</span>
    </div>
  )
}

const jobSearchKey = (j: EnJob): string => `${j.id} ${j.name} ${j.user} ${j.account}`

const ACCOUNT_OPTS = Array.from(new Set(JOBS.map((j) => j.account))).sort()

/* ---------------------------------------------------------------- table -- */

const OPT_COLS: Array<{ key: keyof ColumnToggles; label: string }> = [
  { key: 'cpus', label: 'CPUs' },
  { key: 'mem', label: 'Requested memory' },
  { key: 'gpus', label: 'GPUs' },
  { key: 'submit', label: 'Submit time' },
  { key: 'started', label: 'Start time' },
  { key: 'reason', label: 'Pending reason' },
]
void OPT_COLS

function JobsRow({ j, me, cols, onMenu }: { j: JRow; me: SessionIdentity; cols: ColumnToggles; onMenu: (j: JRow) => void }) {
  const open = () => navTo({ page: 'jb', jobId: j.id })
  // Stage 2: 'manage' on the jobs feature governs hold/release/requeue and
  // cancelling other users' jobs; cancelling your own jobs stays allowed.
  const adminActions = me.role === 'admin' && canPerformAction('jobs', 'admin', 'manage')
  // Standard users may cancel their own queued/running jobs; hold/release/requeue stay administrator-only.
  const canCancel = ((adminActions || isOwnJob(me.role, j)) && isFeatureEnabled('jobs')) && (j.state === 'RUNNING' || j.state === 'PENDING')
  return (
    <tr>
      <td className="mono a5-name-link" onClick={open}>{j.id}</td>
      <td className="sub">{j.name}</td>
      <td>{j.user}</td>
      <td className="mono">{j.partition}</td>
      <td><JobStateChip state={j.state} /></td>
      <td className="sub">{j.elapsedStr}</td>
      <td className="sub mono">{j.timeLimit}</td>
      <td className="mono">{j.nodes}</td>
      <td className="sub">{j.account}</td>
      <td className="mono">{j.qos}</td>
      <td className="mono a5-c">{j.priority.toLocaleString('en-GB')}</td>
      {cols.cpus && <td className="mono">{j.cpus}</td>}
      {cols.mem && <td className="mono">{j.memGB ? `${j.memGB} GB` : '—'}</td>}
      {cols.gpus && <td className="mono">{j.gpus ? String(j.gpus) : '—'}</td>}
      {cols.submit && <td className="sub">{j.submitStr}</td>}
      {cols.started && <td className="sub">{j.state === 'PENDING' ? '—' : j.submitStr}</td>}
      {cols.reason && <td className="sub">{j.pendingReason ?? '—'}</td>}
      <td className="a5-c">
        <MenuWrap
          align="right"
          button={<button className="aws5-iconbtn aws5-iconbtn--sm" aria-label={`Job ${j.id} actions`}><Lucide.MoreHorizontal size={14} /></button>}
          items={[
            { label: 'View details', icon: 'Eye', onClick: open },
            { label: 'Copy job ID', icon: 'Copy', onClick: () => emitToast('success', `${j.id} copied`) },
            { sep: true, label: '' },
            { label: 'Hold', icon: 'Pause', disabled: !adminActions || j.state !== 'PENDING', onClick: adminActions && j.state === 'PENDING' ? () => emitToast('warn', `Job ${j.id} held — simulated`) : undefined },
            { label: 'Release', icon: 'Play', disabled: !adminActions || j.state !== 'PENDING', onClick: adminActions && j.state === 'PENDING' ? () => emitToast('success', `Job ${j.id} released — simulated`) : undefined },
            { label: 'Requeue', icon: 'RotateCcw', disabled: !adminActions || j.state !== 'COMPLETED' && j.state !== 'FAILED', onClick: adminActions && (j.state === 'COMPLETED' || j.state === 'FAILED') ? () => emitToast('warn', `Job ${j.id} requeued — simulated`) : undefined },
            { label: 'Cancel', icon: 'Ban', kind: 'danger', disabled: !canCancel, onClick: canCancel ? () => onMenu(j) : undefined },
          ]}
        />
      </td>
    </tr>
  )
}

function JobsTable({ me, rows, cols, setCols, onConfirmCancel }: { me: SessionIdentity; rows: JRow[]; cols: ColumnToggles; setCols: (c: ColumnToggles) => void; onConfirmCancel: (j: JRow) => void }) {
  const [page, setPage] = useState(1)
  const perPage = 10
  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const cur = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  const [sort, setSort] = useState({ col: 'id', asc: false })
  const onSort = (c: string) => setSort((s) => ({ col: c, asc: s.col === c ? !s.asc : true }))
  const trows = useMemo(() => {
    const dir = sort.asc ? 1 : -1
    return [...cur].sort((a, b) => {
      let r = 0
      if (sort.col === 'id') r = a.id - b.id
      else if (sort.col === 'name') r = a.name.localeCompare(b.name)
      else if (sort.col === 'user') r = a.user.localeCompare(b.user)
      else if (sort.col === 'partition') r = a.partition.localeCompare(b.partition)
      else if (sort.col === 'state') r = a.state.localeCompare(b.state)
      else if (sort.col === 'nodes') r = a.nodes - b.nodes
      else if (sort.col === 'priority') r = a.priority - b.priority
      else if (sort.col === 'elapsed') r = a.elapsedStr.length === 1 ? 0 : a.elapsedStr.localeCompare(b.elapsedStr)
      else r = a.id - b.id
      return r * dir
    })
  }, [cur, sort])

  return (
    <Card>
      <div className="a5-card-h" style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MenuWrap
            label="Columns"
            items={[
              { label: 'Compact (default)', icon: 'List', onClick: () => setCols(DEFAULT_COLS) },
              { label: 'Show all optional columns', icon: 'Rows3', onClick: () => setCols(RICH_COLS) },
              { sep: true, label: '' },
              { label: 'CPUs', icon: cols.cpus ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, cpus: !cols.cpus }) },
              { label: 'Requested memory', icon: cols.mem ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, mem: !cols.mem }) },
              { label: 'GPUs', icon: cols.gpus ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, gpus: !cols.gpus }) },
              { label: 'Submit time', icon: cols.submit ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, submit: !cols.submit }) },
              { label: 'Start time', icon: cols.started ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, started: !cols.started }) },
              { label: 'Pending reason', icon: cols.reason ? 'CircleCheck' : 'Circle', onClick: () => setCols({ ...cols, reason: !cols.reason }) },
            ]}
          />
          <span className="sub">Optional columns appear between Priority and actions.</span>
        </div>
      </div>
      <div className="aws5-table-wrap a5-tableflush">
        <table className="aws5-table ptx-tight res-tight">
          <thead>
            <tr>
              <SortableTh label="Job ID" col="id" sort={sort} onSort={onSort} width={84} />
              <SortableTh label="Name" col="name" sort={sort} onSort={onSort} width={150} />
              <SortableTh label="User" col="user" sort={sort} onSort={onSort} width={110} />
              <SortableTh label="Partition" col="partition" sort={sort} onSort={onSort} width={96} />
              <SortableTh label="State" col="state" sort={sort} onSort={onSort} width={110} />
              <SortableTh label="Elapsed" col="elapsed" sort={sort} onSort={onSort} width={96} />
              <SortableTh label="Time limit" col="timelimit" sort={sort} onSort={onSort} width={104} />
              <SortableTh label="Nodes" col="nodes" sort={sort} onSort={onSort} width={66} center />
              <SortableTh label="Account" col="account" sort={sort} onSort={onSort} width={132} />
              <SortableTh label="QoS" col="qos" sort={sort} onSort={onSort} width={82} />
              <SortableTh label="Priority" col="priority" sort={sort} onSort={onSort} width={86} center />
              {cols.cpus && <th className="a5-c" style={{ width: 62 }}>CPUs</th>}
              {cols.mem && <th className="a5-c" style={{ width: 128 }}>Memory</th>}
              {cols.gpus && <th className="a5-c" style={{ width: 58 }}>GPUs</th>}
              {cols.submit && <th style={{ width: 132 }}>Submit time</th>}
              {cols.started && <th style={{ width: 132 }}>Start time</th>}
              {cols.reason && <th style={{ width: 190 }}>Pending reason</th>}
              <th style={{ width: 64 }} />
            </tr>
          </thead>
          <tbody>
            {trows.map((j) => <JobsRow key={j.id} j={j} me={me} cols={cols} onMenu={onConfirmCancel} />)}
            {trows.length === 0 && <tr><td colSpan={11 + Number(cols.cpus) + Number(cols.mem) + Number(cols.gpus) + Number(cols.submit) + Number(cols.started) + Number(cols.reason) + 1} className="a5-empty">No jobs match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && <Pagination page={page} pages={pages} onPage={setPage} total={rows.length} showing={`${cur.length} jobs · page ${page}`} />}
    </Card>
  )
}

function JobsCards({ rows }: { rows: JRow[] }) {
  return (
    <div className="res-cardgrid">
      {rows.map((j) => (
        <Card key={j.id}>
          <CardB>
            <div className="res-chead">
              <button className="a5-name-link mono" onClick={() => navTo({ page: 'jb', jobId: j.id })}>#{j.id}</button>
              <JobStateChip state={j.state} />
            </div>
            <div className="res-rows">
              <span className="res-k">Name</span><span>{j.name}</span>
              <span className="res-k">User</span><span>{j.user}</span>
              <span className="res-k">Partition</span><span className="mono">{j.partition}</span>
              <span className="res-k">Elapsed</span><span className="sub">{j.elapsedStr}</span>
              <span className="res-k">Nodes</span><span className="mono">{j.nodes}×</span>
              <span className="res-k">Resources</span><span className="sub">{j.resources}</span>
            </div>
            <div className="res-cfoot">
              <span className="sub">{j.account} · {j.qos}</span>
              <button className="a5-name-link" onClick={() => navTo({ page: 'jb', jobId: j.id })}>Details</button>
            </div>
          </CardB>
        </Card>
      ))}
      {rows.length === 0 && <p className="a5-empty">No jobs match the current filters.</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- modal -- */

function JobModal({ job, onClose, role, onOpenPage }: { job: JRow | null; onClose: () => void; role: Role; onOpenPage: (id: number) => void }) {
  if (!job) return null
  const cmd = `scontrol show job ${job.id}`
  const showJobInfoBar = role === 'admin'
  return (
    <Modal
      title={`Job ${job.id} — quick view`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', `${cmd} copied`)}><Lucide.Copy size={13} />Copy scontrol</button>
          <button className="aws5-btn aws5-btn--sm" onClick={() => { onClose(); onOpenPage(job.id) }}><Lucide.ExternalLink size={13} />View full page</button>
        </>
      }
    >
      <div className="j-modgrid">
        <div>
          <div className="j-modh">Summary</div>
          <Kv rows={[
            ['Job ID', <span className="mono">{job.id}</span>],
            ['Name', job.name],
            ['User', job.user],
            ['Account', job.account],
            ['QoS', <span className="mono">{job.qos}</span>],
            ['Priority', <span className="mono">{job.priority.toLocaleString('en-GB')}</span>],
          ]} cols={2} />
        </div>
        <div>
          <div className="j-modh">Schedule</div>
          <Kv rows={[
            ['State', <JobStateChip state={job.state} />],
            ['Partition', <span className="mono">{job.partition}</span>],
            ['Elapsed', job.elapsedStr],
            ['Time limit', <span className="mono">{job.timeLimit}</span>],
            ['Submitted', job.submitStr],
            ['Nodes', <span className="mono">{job.nodes}</span>],
          ]} cols={2} />
        </div>
      </div>
      <div className="j-modh" style={{ marginTop: 12 }}>Resources</div>
      <pre className="res-pre mono j-pre-sm">{job.resources}{job.nodeList.length ? `\n${job.nodeList.join(' ')}` : ''}</pre>
      {showJobInfoBar && job.state === 'RUNNING' && (
        <p className="a5-footnote"><Lucide.Info size={13} /> Cancel is available from the row actions menu (simulated).</p>
      )}
    </Modal>
  )
}

function CancelDialog({ job, onClose, onConfirm }: { job: JRow | null; onClose: () => void; onConfirm: (j: JRow) => void }) {
  if (!job) return null
  return (
    <Modal
      title={`Cancel job ${job.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={onClose}>Keep job</button>
          <button className="aws5-btn aws5-btn--sm aws5-btn--danger" onClick={() => onConfirm(job)}>Cancel job</button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13 }}>
        This will issue <span className="mono">scancel {job.id}</span> for <b>{job.name}</b> ({job.user}, {job.partition}).
        The simulated scheduler marks the job CANCELLED immediately.
      </p>
    </Modal>
  )
}

/* ---------------------------------------------------------- detail page -- */

function AccessDenied({ jobId }: { jobId: number }) {
  return (
    <>
      <Breadcrumbs items={[
        { label: 'Workloads' },
        { label: 'My Jobs', onClick: () => navTo({ page: 'jobs' }) },
        { label: `Job ${jobId}` },
      ]} />
      <Card>
        <CardB>
          <div className="a5-denied">
            <Lucide.ShieldAlert size={17} />
            <div>
              <div className="a5-denied-t">You do not have permission to view this job</div>
              <p className="a5-denied-b">
                <span className="mono">#{jobId}</span> does not belong to your user or any of your Slurm accounts.
                Administrators can view the full cluster-wide queue.
              </p>
            </div>
          </div>
          <div className="a5-denied-actions">
            <button className="aws5-btn aws5-btn--sm" onClick={() => navTo({ page: 'jobs' })}>Back to My Jobs</button>
          </div>
        </CardB>
      </Card>
    </>
  )
}

export function JobDetailPage({ jobId, role }: { jobId: number; role: Role }) {
  const rows = useMemo(() => scopedJobs(role).map((j) => ({ ...j, ...deriveJob(j) })), [role])
  const j = rows.find((x) => x.id === jobId)
  const [tab, setTab] = useState('Overview')
  // Permission gate: standard users may only open jobs that belong to them or to
  // one of their Slurm accounts, mirroring the scoped queue on the jobs list page.
  if (role === 'user' && j) {
    if (j.user !== SESSION_USER.user.uid && !SESSION_USER.user.allowedAccounts.includes(j.account)) {
      return <AccessDenied jobId={jobId} />
    }
  }
  if (!j) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Workloads' }, { label: role === 'admin' ? 'Slurm Jobs' : 'My Jobs', onClick: () => navTo({ page: 'jobs' }) }, { label: `Job ${jobId}` }]} />
        <p className="a5-empty">Job {jobId} not found.</p>
      </>
    )
  }
  const running = j.state === 'RUNNING'
  // Stage 2: 'manage' on the jobs feature governs the administrator actions
  // menu; owners may still cancel their own queued/running jobs.
  const adminActions = role === 'admin' && canPerformAction('jobs', 'admin', 'manage')
  const jobOwner = SESSION_USER.user.uid
  return (
    <>
      <Breadcrumbs items={[
        { label: 'Workloads' },
        { label: role === 'admin' ? 'Slurm Jobs' : 'My Jobs', onClick: () => navTo({ page: 'jobs' }) },
        { label: `Job ${j.id}` },
      ]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Lucide.ListChecks size={19} /> <span className="mono">#{j.id}</span></h1>
          <div className="a5-pagehead-sub">{j.name} · {j.user} on <span className="mono">{j.partition}</span> · submitted {j.submitStr}</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', `scontrol show job ${j.id} copied`)}>
            <Lucide.Copy size={13} />Copy scontrol
          </button>
          {adminActions ? (
            <MenuWrap
              label="Actions"
              items={[
                { label: j.state === 'PENDING' ? 'Release job' : j.state === 'RUNNING' ? 'Cancel job' : 'Requeue job', icon: 'Ban', onClick: () => emitToast('warn', `${j.state === 'PENDING' ? 'Release' : j.state === 'RUNNING' ? 'Cancel' : 'Requeue'} for ${j.id} — simulated`) },
              ]}
            />
          ) : (j.user === jobOwner && (j.state === 'RUNNING' || j.state === 'PENDING')) && (
            <MenuWrap
              label="Actions"
              items={[
                { label: 'Cancel job', icon: 'Ban', onClick: () => {
                  const target = JOBS.find((x) => x.id === j.id)
                  if (target) (target as { state: JobState }).state = 'COMPLETED'
                  emitToast('info', `scancel ${j.id} issued — job state updated in the simulated queue`)
                  navTo({ page: 'jobs' })
                } },
              ]}
            />
          )}
        </div>
      </div>
      <JobTabs j={j} tab={tab} setTab={setTab} running={running} />
    </>
  )
}

function JobTabs({ j, tab, setTab, running }: { j: JRow; tab: string; setTab: (t: string) => void; running: boolean }) {
  return (
    <div className="a5-stack a5-stack-lg">
      <div className="a5-tabs-row">
        <div className="aws5-tabs">
          {['Overview', 'Resources', 'Output', 'Script', 'Dependencies', 'History'].map((t) => (
            <button key={t} className={`aws5-tab${t === tab ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div><JobStateChip state={j.state} /></div>
      </div>
      {tab === 'Overview' && <JobOverview j={j} />}
      {tab === 'Resources' && <JobResources j={j} />}
      {tab === 'Output' && <JobOutput j={j} running={running} />}
      {tab === 'Script' && <JobScript j={j} />}
      {tab === 'Dependencies' && <JobDeps j={j} />}
      {tab === 'History' && <JobHistory j={j} />}
    </div>
  )
}

function JobOverview({ j }: { j: JRow }) {
  return (
    <>
      {j.state === 'PENDING' && j.pendingReason && (
        <div className="j-reasoncard">
          <div className="j-reasoncard-t"><Lucide.Hourglass size={15} /> Pending — {j.pendingReason}</div>
          <div className="j-reasoncard-b">{j.pendingDetail} The scheduler has not provided a start estimate for this queued job.</div>
        </div>
      )}
      <Card><CardH>Job</CardH><CardB>
        <Kv rows={[
          ['Job ID', <span className="mono">{j.id}</span>],
          ['Name', j.name],
          ['State', <JobStateChip state={j.state} />],
          ['User', j.user],
          ['Account', j.account],
          ['QoS', <span className="mono">{j.qos}</span>],
          ['Priority', <span className="mono">{j.priority.toLocaleString('en-GB')}</span>],
          ['Partition', <button className="a5-name-link mono" onClick={() => navTo({ page: 'partition', partition: j.partition })}>{j.partition}</button>],
          ['Submitted', j.submitStr],
          ['Elapsed', j.elapsedStr],
          ['Time limit', <span className="mono">{j.timeLimit}</span>],
          ['Working directory', <span className="mono">/scratch/{j.user}/{j.id}</span>],
          ['Stdout', <span className="mono">slurm-{j.id}.out</span>],
          ['Stderr', <span className="mono">slurm-{j.id}.err</span>],
        ]} cols={2} />
      </CardB></Card>
    </>
  )
}

function JobResources({ j }: { j: JRow }) {
  return (
    <>
      <Card><CardH>Requested vs allocated</CardH><CardB>
        <Kv rows={[
          ['Nodes', <span className="mono">{j.nodes}</span>],
          ['CPUs', <span className="mono">{j.cpus}</span>],
          ['Memory', <span className="mono">{j.memGB ? `${j.memGB} GB` : '—'}</span>],
          ['GPUs', <span className="mono">{j.gpus ? String(j.gpus) : '—'}</span>],
          ['Allocated nodes', <span className="mono">{j.state === 'PENDING' ? '—' : j.nodeList.length ? j.nodeList.join(' ') : '—'}</span>],
        ]} cols={2} />
      </CardB></Card>
      <Card><CardH>Live utilisation</CardH><CardB>
        {j.state === 'RUNNING' ? (
          <Kv rows={[
            ['CPU', <span className="mono j-utilext">{j.cpuUtil}%</span>],
            ['Memory', <span className="mono j-utilext">{j.memUtil}%</span>],
            ['GPU', <span className="mono j-utilext">{j.gpus ? `${j.gpuUtil}%` : 'n/a'}</span>],
          ]} />
        ) : <span className="a5-empty">Live utilisation is only available for RUNNING jobs.</span>}
      </CardB></Card>
      {j.state === 'PENDING' && j.pendingReason && (
        <div className="j-reasoncard">
          <div className="j-reasoncard-t"><Lucide.Hourglass size={15} /> Pending — {j.pendingReason}</div>
          <div className="j-reasoncard-b">{j.pendingDetail} The scheduler has not provided a start estimate for this queued job.</div>
        </div>
      )}
    </>
  )
}

function JobOutput({ j, running }: { j: JRow; running: boolean }) {
  const [auto, setAuto] = useState(true)
  const [stream, setStream] = useState<'stdout' | 'stderr'>('stdout')
  if (j.state === 'PENDING') {
    return <Card><CardB><span className="a5-empty">Job has not started — no output has been produced yet.</span></CardB></Card>
  }
  const text = stream === 'stdout' ? `srun: job ${j.id} started on ${j.nodeList[0] ?? 'node'}\nLoading module python/3.11\nEpoch 1/12 — loss 1.284\nEpoch 2/12 — loss 1.022\n${running ? 'Epoch 3/12 — loss 0.911 (in progress)' : 'Epoch 3/12 — loss 0.911 (final)'}`
    : '(no warnings recorded)'
  return (
    <Card>
      <CardH right={
        <div className="a5-pagehead-actions" style={{ margin: 0 }}>
          <div className="a5-seg" role="tablist" aria-label="Output stream">
            <button className={stream === 'stdout' ? 'active' : ''} onClick={() => setStream('stdout')}>stdout</button>
            <button className={stream === 'stderr' ? 'active' : ''} onClick={() => setStream('stderr')}>stderr</button>
          </div>
          <button className={auto ? 'aws5-btn aws5-btn--outline aws5-btn--sm a5-autobtn on' : 'aws5-btn aws5-btn--outline aws5-btn--sm a5-autobtn'} onClick={() => setAuto((x) => !x)}>Auto-scroll</button>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Log copied')}><Lucide.Copy size={13} />Copy</button>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Log download queued — simulated')}><Lucide.Download size={13} />Download</button>
        </div>
      }>{stream === 'stdout' ? 'Standard output' : 'Standard error'}</CardH>
      <CardB>
        <pre className="res-pre mono j-out" data-auto={auto ? '1' : '0'}>{text}</pre>
      </CardB>
    </Card>
  )
}

function JobScript({ j }: { j: JRow }) {
  if (j.id % 7 !== 3) {
    return <Card><CardB><span className="a5-empty">Batch script not available for this job in the simulated controller.</span></CardB></Card>
  }
  const script = `#!/bin/bash
#SBATCH --job-name=${j.name}
#SBATCH --partition=${j.partition}
#SBATCH --nodes=${j.nodes}
#SBATCH --cpus-per-task=${Math.max(1, Math.round(j.cpus / j.nodes))}
#SBATCH --mem=${j.memGB}G
${j.gpus ? `#SBATCH --gres=gpu:${j.gpus}\n` : ''}#SBATCH --time=${j.timeLimit}
#SBATCH --account=${j.account}

module load python/3.11
python train.py`
  return (
    <Card>
      <CardH right={<button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Batch script copied')}><Lucide.Copy size={13} />Copy</button>}>Batch script</CardH>
      <CardB><pre className="res-pre mono j-out">{script}</pre></CardB>
    </Card>
  )
}

function JobDeps({ j }: { j: JRow }) {
  void JOBS
  // Deterministic mock dependency for a slice of jobs.
  const dep = j.id % 11 === 5 ? { type: 'afterok', target: j.id + 2 } : null
  return (
    <Card><CardH>Dependencies</CardH><CardB>
      {dep ? (
        <Kv rows={[['Type', <span className="mono">{dep.type}</span>], ['Depends on', <button className="a5-name-link mono" onClick={() => navTo({ page: 'jb', jobId: dep.target })}>#{dep.target}</button>]]} />
      ) : <span className="a5-empty">This job has no dependencies.</span>}
    </CardB></Card>
  )
}

const HR_IN_MS = 3600_000

function JobHistory({ j }: { j: JRow }) {
  const events: Array<{ t: string; label: string; sub?: string }> = []
  events.push({ t: j.submitStr, label: 'Submitted', sub: `sbatch · ${j.partition}` })
  if (j.state !== 'PENDING') events.push({ t: j.submitStr, label: 'Started', sub: j.nodeList[0] ? `allocated ${j.nodeList.join(' ')}` : 'allocated' })
  if (j.state === 'COMPLETED') { events.push({ t: j.endedAt ?? '—', label: 'Completed' }); void HR_IN_MS }
  if (j.state === 'FAILED') events.push({ t: j.endedAt ?? '—', label: 'Failed', sub: 'exit code 1 (simulated)' })
  return (
    <Card><CardH>Job timeline</CardH><CardB>
      <div className="j-timeline">
        {events.map((e, i) => (
          <div key={i} className="j-tl-row">
            <span className="j-tl-dot" />
            <span className="sub j-tl-t">{e.t}</span>
            <span><b>{e.label}</b>{e.sub && <span className="sub"> · {e.sub}</span>}</span>
          </div>
        ))}
      </div>
    </CardB></Card>
  )
}

/* ------------------------------------------------------------------ page -- */

const VIEW_KEY = 'enucc5.jobsView'
const COLS_KEY = 'enucc5.jobsCols'

export function JobsPage({ role = 'admin', initialPartition }: { role?: Role; initialPartition?: string }) {
  const me = SESSION_USER[role]
  const [view, setView] = useState<'table' | 'cards'>(() => (safeGet(VIEW_KEY) === 'cards' ? 'cards' : 'table'))
  useEffect(() => { safeSet(VIEW_KEY, view) }, [view])

  // tick forces re-render after a simulated CANCELLED mutation of JOBS.
  const [tick, setTick] = useState(0)

  // Deep-link sync: re-set the filter if the hash partition changes while the page stays mounted.
  useEffect(() => { if (initialPartition) setFPart(initialPartition) }, [initialPartition])

  const [q, setQ] = useState('')
  const [fState, setFState] = useState<JobState | 'ALL'>('ALL')
  const [fPart, setFPart] = useState(initialPartition ?? 'ALL')
  const [fAccount, setFAccount] = useState('ALL')

  const [cols, setCols] = useState<ColumnToggles>(() => {
    const saved = safeGet(COLS_KEY)
    return saved === 'rich' ? RICH_COLS : DEFAULT_COLS
  })
  useEffect(() => { safeSet(COLS_KEY, cols === RICH_COLS ? 'rich' : 'default') }, [cols])

  const [menuJob, setMenuJob] = useState<JRow | null>(null)
  const [cancelJob, setCancelJob] = useState<JRow | null>(null)

  const all = useMemo(() => allJobs(me).map((j) => ({ ...j, ...deriveJob(j) })), [me, tick])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((j) =>
      (!needle || jobSearchKey(j).toLowerCase().includes(needle)) &&
      (fState === 'ALL' || j.state === fState) &&
      (fPart === 'ALL' || j.partition === fPart) &&
      (fAccount === 'ALL' || j.account === fAccount))
  }, [all, q, fState, fPart, fAccount])

  return (
    <>
      <JobsHeader me={me} view={view} setView={setView} onExport={() => emitToast('success', 'Queue export queued — simulated')} />
      <div className="a5-stack a5-stack-lg">
        <Kpis rows={all} active={fState === 'ALL' ? null : fState} onToggle={(s) => setFState(s ?? 'ALL')} />
        <Filters
          q={q} setQ={setQ}
          state={fState} setState={(v) => setFState(v as JobState | 'ALL')}
          part={fPart} setPart={setFPart}
          account={fAccount} setAccount={setFAccount}
          onClear={() => { setQ(''); setFState('ALL'); setFPart('ALL'); setFAccount('ALL') }}
          count={rows.length} total={all.length}
        />
        {view === 'table'
          ? <JobsTable me={me} rows={rows} cols={cols} setCols={setCols} onConfirmCancel={setCancelJob} />
          : <JobsCards rows={rows} />}
      </div>
      <JobModal job={menuJob} onClose={() => setMenuJob(null)} role={role} onOpenPage={(id) => navTo({ page: 'jb', jobId: id })} />
      <CancelDialog
        job={cancelJob}
        onClose={() => setCancelJob(null)}
        onConfirm={(job) => {
          const target = allJobs(me).find((x) => x.id === job.id)
          if (target) (target as { state: JobState }).state = 'COMPLETED'
          setCancelJob(null)
          emitToast('info', `scancel ${job.id} issued — job state updated in the simulated queue`)
          setTick((t) => t + 1)
        }}
      />
    </>
  )
}
