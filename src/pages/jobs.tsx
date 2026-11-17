import { useMemo, useState } from 'react'
import { Icon, Btn, SegTabs, StatusDot, Empty, Stat, Panel, ProgressBar } from '../mockups/mockup-01/components/ui'
import { LineChart } from '../mockups/mockup-01/components/charts/charts'
import { cs, fmtAgo, fmtDate, fmtDuration } from '../lib/format'
import { useApp, openNode } from '../lib/store'
import { ALL_JOBS, ALL_NODES, CLUSTER_CFG, ALL_USERS } from '../data/cluster-data'
import type { Job } from '../data/cluster-data'

type SortKey = 'id' | 'name' | 'user' | 'priority' | 'timeUsed' | 'submit'
type StateFilter = 'all' | 'running' | 'pending' | 'completed' | 'failed'
type Dir = 'asc' | 'desc'

const stateChip: Record<string, string> = {
  running: 'border-green/30 bg-green/10 text-green',
  pending: 'border-amber/30 bg-amber/10 text-amber',
  completed: 'border-cyan/30 bg-cyan/10 text-cyan',
  failed: 'border-red/30 bg-red/10 text-red',
  timeout: 'border-red/30 bg-red/10 text-red',
  cancelled: 'border-edge bg-steel text-quill dark:border-dusk',
}

function sortJobs(jobs: Job[], key: SortKey, dir: Dir): Job[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...jobs].sort((a, b) => {
    switch (key) {
      case 'id': return (a.id - b.id) * mul
      case 'name': return a.name.localeCompare(b.name) * mul
      case 'user': return a.user.localeCompare(b.user) * mul
      case 'priority': return (a.priority - b.priority) * mul
      case 'timeUsed': return (a.timeUsedMs - b.timeUsedMs) * mul
      case 'submit': return (a.submitMs - b.submitMs) * mul
    }
  })
}

function JobRow(props: { job: Job; onOpen: () => void }) {
  const { job, onOpen } = props
  const memPct = Math.min(100, Math.round((job.memGiB / 512) * 100))
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full cursor-pointer grid-cols-[92px_minmax(0,1.1fr)_84px_88px_74px_74px_92px_64px_minmax(0,90px)_20px] items-center gap-3 border-b border-edge/70 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-steel/50 dark:border-dusk/60"
    >
      <span className="font-mono text-[11.5px] font-medium text-accent-bright">{job.id}</span>
      <span className="truncate font-mono text-[11.5px] text-frost">{job.name}</span>
      <span className="flex items-center gap-1.5 text-[11px] text-steam">
        <StatusDot status={job.state} size={6} />
        <span className={cs('rounded-md border px-1.5 py-[1px] text-[9.5px] font-medium', stateChip[job.state] ?? '')}>{job.state}</span>
      </span>
      <span className="truncate text-[11px] text-steam">{job.user}</span>
      <span className="truncate text-[10.5px] text-quill">{job.partition}</span>
      <span className="font-mono text-[10.5px] text-quill">{job.cpus}c{job.gpus ? ` · ${job.gpus}g` : ''}</span>
      <span className="font-mono text-[10.5px] text-steam">{fmtDuration(job.timeUsedMs)}</span>
      <div className="min-w-0">
        <ProgressBar value={memPct} color={memPct > 80 ? 'var(--color-amber)' : 'var(--color-accent)'} height={3} />
      </div>
      <span className="truncate text-right text-[10px] text-ghost">{fmtAgo(job.submitMs)}</span>
      <Icon n="chevron-right" size={12} className="text-ghost" />
    </button>
  )
}

export function JobsPage() {
  const { role } = useApp()
  const me = ALL_USERS.find((u) => u.username === 'ada')!
  const [state, setState] = useState<StateFilter>('all')
  const [part, setPart] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('submit')
  const [dir, setDir] = useState<Dir>('desc')
  const [detail, setDetail] = useState<Job | null>(null)
  const [mine, setMine] = useState(role === 'user')

  const pool = useMemo(() => {
    let jobs = ALL_JOBS
    if (mine && role === 'user') jobs = jobs.filter((j) => j.user === me.username)
    if (state !== 'all') jobs = jobs.filter((j) => j.state === state)
    if (part !== 'all') jobs = jobs.filter((j) => j.partition === part)
    const q = query.trim().toLowerCase()
    if (q) jobs = jobs.filter((j) => j.name.toLowerCase().includes(q) || String(j.id).includes(q) || j.user.toLowerCase().includes(q))
    return jobs
  }, [mine, state, part, query, role, me.username])

  const jobs = useMemo(() => sortJobs(pool, sortKey, dir), [pool, sortKey, dir])

  const counts = useMemo(() => {
    const by = (s: string) => pool.filter((j) => j.state === s).length
    return { running: by('running'), pending: by('pending'), completed: by('completed'), failed: by('failed') + by('timeout') }
  }, [pool])

  function toggleSort(k: SortKey) {
    if (k === sortKey) setDir(dir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setDir(k === 'name' || k === 'user' ? 'asc' : 'desc') }
  }

  function head(k: SortKey, label: string, cls = '') {
    const on = k === sortKey
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cs('flex cursor-pointer items-center gap-1 text-[10px] font-medium tracking-[0.06em] uppercase transition-colors', on ? 'text-frost' : 'text-quill hover:text-steam', cls)}
      >
        {label}
        <Icon n={on ? (dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size={10} className={cs('transition-opacity', on ? 'opacity-80' : 'opacity-25')} />
      </button>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Jobs</h1>
          <p className="mt-1 text-[12.5px] text-quill">
            Slurm scheduler · {ALL_JOBS.length} jobs in ledger · max {CLUSTER_CFG.maxJobsPerUser} per user
          </p>
        </div>
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <SegTabs
              tabs={[
                { id: 'all', label: 'All jobs' },
                { id: 'mine', label: `Mine (${ALL_JOBS.filter((j) => j.user === me.username).length})` },
              ]}
              active={mine ? 'mine' : 'all'}
              onChange={(id) => setMine(id === 'mine')}
            />
          )}
          <div className="chip flex h-8 items-center gap-2 rounded-[10px] px-2.5">
            <Icon n="search" size={13} className="text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="w-44 bg-transparent font-mono text-[11.5px] text-frost outline-none placeholder:text-ghost"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Running" value={String(counts.running)} icon="play" color="var(--color-green)" />
        <Stat label="Pending" value={String(counts.pending)} icon="hourglass" color="var(--color-amber)" />
        <Stat label="Completed · 24h" value={String(counts.completed)} icon="check" color="var(--color-cyan)" />
        <Stat label="Failed / timeout" value={String(counts.failed)} icon="ban" color="var(--color-red)" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SegTabs
          tabs={[
            { id: 'all', label: 'All', count: pool.length },
            { id: 'running', label: 'Running', count: counts.running },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'failed', label: 'Failed', count: counts.failed },
          ]}
          active={state}
          onChange={setState}
        />
        <div className="chip inline-flex h-[30px] items-center rounded-[10px] px-1">
          <Icon n="filter" size={12} className="ml-1.5 mr-1 text-quill" />
          {['all', ...CLUSTER_CFG.partitions].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPart(p)}
              className={cs(
                'cursor-pointer rounded-lg px-2 py-1 text-[10.5px] font-medium capitalize transition-colors',
                part === p ? 'chip-solid text-frost' : 'text-quill hover:text-steam',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Panel padded={false} className="overflow-hidden">
        <div className="grid grid-cols-[92px_minmax(0,1.1fr)_84px_88px_74px_74px_92px_64px_minmax(0,90px)_20px] gap-3 border-b border-edge bg-abyss/40 px-4 py-2.5 dark:border-dusk">
          {head('id', 'Job ID')}
          {head('name', 'Name')}
          <span className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">State</span>
          {head('user', 'User')}
          <span className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">Part</span>
          <span className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">Resources</span>
          {head('timeUsed', 'Used')}
          <span className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">Mem</span>
          {head('submit', 'Submitted')}
          <span />
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {jobs.length === 0 ? (
            <Empty icon="jobs" title="No jobs found" sub="Adjust filters or clear the search." />
          ) : (
            jobs.map((j) => <JobRow key={j.id} job={j} onOpen={() => setDetail(j)} />)
          )}
        </div>
      </Panel>

      {/* ------------------------------------------------ job detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="anim-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setDetail(null)} />
          <div className="anim-slide-l absolute top-0 right-0 h-full w-[460px] max-w-[94vw]">
            <div className="panel-solid flex h-full flex-col shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-frost">{detail.id}</span>
                    <span className={cs('rounded-md border px-1.5 py-[2px] text-[9.5px] font-medium', stateChip[detail.state] ?? '')}>{detail.state}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[12px] text-steam">{detail.name}</p>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setDetail(null)} aria-label="Close job details">
                  <Icon n="x" size={14} />
                </Btn>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <KV k="User" v={detail.user} />
                  <KV k="Account" v={detail.account} />
                  <KV k="Partition" v={detail.partition} />
                  <KV k="QoS" v={detail.qos} />
                  <KV k="CPUs" v={String(detail.cpus)} />
                  <KV k="GPUs" v={detail.gpus ? String(detail.gpus) : '—'} />
                  <KV k="Memory" v={`${detail.memGiB} GiB`} />
                  <KV k="Priority" v={String(detail.priority)} />
                </div>
                <section>
                  <h4 className="mb-2 text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <KV k="Walltime" v={fmtDuration(detail.walltimeMs)} />
                    <KV k="Used" v={fmtDuration(detail.timeUsedMs)} />
                    <KV k="Submitted" v={fmtDate(detail.submitMs, true)} />
                    <KV k="Started" v={detail.startMs ? fmtDate(detail.startMs, true) : 'queued'} />
                    {detail.endMs ? <KV k="Ended" v={fmtDate(detail.endMs, true)} /> : null}
                  </div>
                </section>
                {detail.state === 'running' && (
                  <section>
                    <h4 className="mb-2 text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">CPU on {ALL_NODES.find((n) => n.jobs.includes(detail.id))?.id ?? detail.nodes[0]}</h4>
                    <LineChart
                      data={(ALL_NODES.find((n) => n.jobs.includes(detail.id))?.cpuSeries ?? []).map((v) => (v * 0.92) + (detail.id % 13))}
                      color="var(--color-cyan)"
                      height={64}
                      unit="%"
                    />
                  </section>
                )}
                <section>
                  <h4 className="mb-2 text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">
                    Nodes <span className="ml-1 font-mono normal-case text-ghost">({detail.nodes.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.nodes.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          if (ALL_NODES.some((a) => a.id === n)) {
                            openNode(n, 'overview')
                            setDetail(null)
                          }
                        }}
                        className="cursor-pointer rounded-md border border-edge bg-steel px-1.5 py-[2px] font-mono text-[10px] text-steam transition-colors hover:border-accent/40 hover:text-frost dark:border-dusk"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h4 className="mb-2 text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">Working directory</h4>
                  <div className="rounded-[10px] border border-edge bg-[#0a0a0e] px-3 py-2.5 font-mono text-[10.5px] text-steam dark:border-dusk">
                    <span className="text-green/85">$</span> {detail.workdir}
                  </div>
                  <div className="mt-1.5 rounded-[10px] border border-edge bg-[#0a0a0e] px-3 py-2.5 font-mono text-[10.5px] text-steam dark:border-dusk">
                    <span className="text-quill">out →</span> {detail.std_out}
                  </div>
                </section>
                {detail.reason && detail.state === 'pending' && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-amber/25 bg-amber/5 px-3 py-2.5 text-[11px] text-amber">
                    <Icon n="hourglass" size={12} /> Pending · {detail.reason}
                  </div>
                )}
                {(detail.state === 'failed' || detail.state === 'timeout') && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-red/25 bg-red/5 px-3 py-2.5 text-[11px] text-red">
                    <Icon n="alert" size={12} /> Exit code {detail.exitCode}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KV(props: { k: string; v: string }) {
  return (
    <div className="rounded-[10px] border border-edge px-3 py-2 dark:border-dusk">
      <div className="text-[10px] tracking-wide text-quill">{props.k}</div>
      <div className="mt-0.5 truncate font-mono text-[11.5px] text-frost">{props.v}</div>
    </div>
  )
}
