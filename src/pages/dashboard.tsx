import { Icon, Stat, Panel, PanelHead, Chip, Btn, StatusDot } from '../mockups/mockup-01/components/ui'
import { LineChart, Bars, SegmentBar, GpuArray, NetStat } from '../mockups/mockup-01/components/charts/charts'
import { cs, fmtAgo, fmtDuration } from '../lib/format'
import { useApp, setPage, openNode } from '../lib/store'
import {
  ALL_NODES, ALL_JOBS, ALL_FILESYSTEMS, OPERATIONS, ALERTS, AGG_CPU, AGG_NET, CURRENT_USER, GPU_NODES, LOGIN_NODES, PARTITION_ROWS,
} from '../data/cluster-data'
import type { Job } from '../data/cluster-data'

const runningJobs = ALL_JOBS.filter((j) => j.state === 'running')
const pendingJobs = ALL_JOBS.filter((j) => j.state === 'pending')
const gpuNodes = ALL_NODES.filter((n) => n.kind === 'gpu')
const busyGpus = gpuNodes.filter((n) => n.gpuUtils.some((u) => u > 80)).length

function jobsByUser(jobs: Job[]) {
  const m = new Map<string, number>()
  for (const j of jobs) m.set(j.user, (m.get(j.user) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
}

export function DashboardPage() {
  const { role } = useApp()
  const isUser = role === 'user'
  const myJobs = ALL_JOBS.filter((j) => j.user === CURRENT_USER.username)
  const myActive = myJobs.filter((j) => j.state === 'running' || j.state === 'pending')
  const topUsers = jobsByUser(runningJobs)
  const activeAlerts = ALERTS.filter((a) => !a.ack).slice(0, 3)
  const loadSeries = AGG_CPU.slice(-24)
  const ops = OPERATIONS.slice(0, 6)

  const fsRows = ALL_FILESYSTEMS.map((f) => ({ f, pct: Math.round((f.usedB / f.sizeB) * 100) }))

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium tracking-[0.08em] text-quill uppercase">
            Helios Cluster <StatusDot status="online" pulse /> <span className="text-green">operational</span>
          </div>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-frost">
            {isUser ? `Good afternoon, ${CURRENT_USER.name.split(' ')[0]}` : 'Cluster overview'}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-quill">
            {isUser
              ? 'Your jobs, allocations and personal storage at a glance.'
              : `140 nodes · Slurm 23.11.7 · ${runningJobs.length} active jobs across 5 partitions.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isUser ? (
            <>
              <Btn variant="primary" size="md" onClick={() => setPage('jobs')}>
                <Icon n="plus" size={13} /> New job
              </Btn>
              <Btn variant="default" size="md" onClick={() => setPage('terminal')}>
                <Icon n="terminal" size={13} /> Open terminal
              </Btn>
            </>
          ) : (
            <>
              <Chip className="border-red/25 bg-red/10 text-red">
                <Icon n="alert" size={11} /> {ALERTS.filter((a) => a.sev === 'crit' && !a.ack).length} critical
              </Chip>
              <Chip className="border-amber/25 bg-amber/10 text-amber">
                <Icon n="warn" size={11} /> {ALERTS.filter((a) => a.sev === 'warn' && !a.ack).length} warnings
              </Chip>
              <Btn variant="default" size="md"><Icon n="refresh" size={13} /> Refresh</Btn>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat
          label={isUser ? 'My active jobs' : 'Active jobs'}
          value={isUser ? myActive.length : runningJobs.length}
          icon="jobs"
          sub={isUser ? `${myJobs.filter((j) => j.state === 'pending').length} pending` : `${pendingJobs.length} pending · ${ALL_JOBS.filter((j) => j.state === 'failed').length} failed 24h`}
          onClick={() => setPage('jobs')}
        />
        <Stat
          label="CPU utilisation"
          value={`${68}%`}
          icon="cpu"
          progress={68}
          color="var(--color-cyan)"
          sub="91 of 134 cores in use — fleet-wide"
          onClick={isUser ? undefined : () => setPage('monitoring')}
        />
        <Stat
          label="GPU load"
          value={`${gpuAvg()}%`}
          icon="gpu"
          progress={gpuAvg()}
          color="var(--color-accent-bright)"
          sub={`${busyGpus} nodes above 80% util`}
          onClick={() => setPage('nodes')}
        />
        <Stat
          label="Memory pressure"
          value={`${74}%`}
          icon="memory"
          progress={74}
          color="var(--color-amber)"
          sub="2.1 TiB high-water mark"
          onClick={isUser ? undefined : () => setPage('monitoring')}
        />
      </div>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" padded>
          <PanelHead title={isUser ? 'My GPU utilisation (last 24h)' : 'Cluster CPU load (last 24h)'} icon="trend-up">
            <div className="flex gap-1">
              <Chip>1h</Chip>
              <Chip className="chip-solid text-frost">24h</Chip>
              <Chip>7d</Chip>
            </div>
          </PanelHead>
          <LineChart data={loadSeries.map((v, i) => v + (i % 4) * 3)} height={168} color="var(--color-cyan)" max={100} unit="%" />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-edge pt-3 text-[11px]">
            {[
              ['Mean', '64.2%'],
              ['P95', '91.8%'],
              ['Peak', '97.4%'],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-quill">{k}</span>
                <div className="mt-0.5 font-mono text-[13px] text-frost">{v}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel padded>
          <PanelHead title="Activity" icon="activity" right={<Chip>{ALERTS.filter((a) => !a.ack).length} live</Chip>} />
          <div className="pt-4">
            <div className="space-y-3.5">
              {ops.map((op) => (
                <div key={op.id} className="flex items-start gap-2.5">
                  <span className={cs('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', op.kind === 'fs' ? 'border-amber/30 bg-amber/10 text-amber' : 'border-edge bg-night text-quill dark:border-dusk dark:bg-dusk')}>
                    <Icon n={op.kind === 'job' ? 'jobs' : op.kind === 'fs' ? 'storage' : op.kind === 'net' ? 'network' : op.kind === 'power' ? 'zap' : 'nodes'} size={10} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] leading-snug text-steam">{op.text}</div>
                    <div className="mt-0.5 font-mono text-[9.5px] text-ghost">{fmtAgo(op.at)}{op.node ? ` · ${op.node}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => isUser ? undefined : setPage('administration')} className="mt-4 w-full cursor-pointer text-center text-[10.5px] text-accent-bright hover:underline">
              View activity log →
            </button>
          </div>
        </Panel>
      </div>

      {/* Node snapshot + partitions/quota */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead title={isUser ? 'My jobs' : 'Running jobs'} icon="jobs" right={<Btn size="xs" variant="ghost" onClick={() => setPage('jobs')}>View all</Btn>} />
          <div className="overflow-x-auto pt-4">
            <table className="w-full text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-edge text-[10px] tracking-wide text-ghost uppercase">
                  <th className="py-1.5 pr-3 font-medium">Job</th>
                  <th className="py-1.5 pr-3 font-medium">User</th>
                  <th className="py-1.5 pr-3 font-medium">Partition</th>
                  <th className="py-1.5 pr-3 font-medium">Elapsed</th>
                  <th className="py-1.5 pr-3 font-medium">Node</th>
                </tr>
              </thead>
              <tbody>
                {(isUser ? myActive.slice(0, 5) : runningJobs.slice(0, 6)).map((j) => (
                  <tr key={j.id} className="group cursor-pointer border-b border-edge/70 transition-colors last:border-0 hover:bg-dusk/40" onClick={() => setPage('jobs')}>
                    <td className="py-2 pr-3 font-mono text-steam group-hover:text-frost">{j.name}</td>
                    <td className="py-2 pr-3 text-quill">{j.user}</td>
                    <td className="py-2 pr-3"><Chip>{j.partition}</Chip></td>
                    <td className="py-2 pr-3 font-mono text-quill">{fmtDuration(j.timeUsedMs)}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className="cursor-pointer font-mono text-[10.5px] text-accent-bright hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openNode(j.nodes[0] ?? 'helios-login1')
                        }}
                      >
                        {j.nodes[0] ?? '—'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel padded>
            <PanelHead title="Partitions" icon="layers" />
            <div className="space-y-2 pt-4">
              {PARTITION_ROWS.filter((p) => p.name !== 'scratch').map((p) => {
                const n = p.nodes
                const up = p.state === 'up'
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <StatusDot status={up ? 'online' : 'drain'} />
                    <span className="flex-1 text-[12px] text-steam">{p.name}</span>
                    <span className="font-mono text-[10.5px] text-quill">{n} nodes</span>
                    <span className="w-14 text-right font-mono text-[10.5px] text-ghost">{p.maxTime}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel padded>
            <PanelHead title={isUser ? 'My storage' : 'Storage'} icon="storage" right={<Btn size="xs" variant="ghost" onClick={() => setPage('storage')}>Details</Btn>} />
            <div className="space-y-3 pt-4">
              {(isUser ? fsRows.slice(0, 2) : fsRows).map(({ f, pct }) => (
                <div key={f.id}>
                  <div className="mb-1 flex items-baseline justify-between text-[11px]">
                    <span className="font-mono text-steam">{f.mount}</span>
                    <span className={cs('font-mono', pct > 80 ? 'text-red' : pct > 70 ? 'text-amber' : 'text-quill')}>{pct}%</span>
                  </div>
                  <div className="h-[5px] w-full overflow-hidden rounded-full bg-edge/80">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: pct > 80 ? 'var(--color-red)' : pct > 70 ? 'var(--color-amber)' : 'var(--color-accent)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Admin extras */}
      {isUser ? (
        <Panel padded>
          <PanelHead title="Permitted nodes" icon="shield" right={<Chip>{permittedCount()} accessible</Chip>} />
          <div className="flex flex-wrap gap-2 pt-4">
            {GPU_NODES.filter((n) => n.status === 'online').slice(0, 10).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNode(n.id)}
                className="chip flex cursor-pointer items-center gap-2 rounded-[9px] px-2.5 py-1.5 font-mono text-[11px] text-steam hover:border-ghost hover:text-frost"
              >
                <StatusDot status={n.status} size={6} />
                {n.id}
                <span className="text-ghost">·{n.gpus}×GPU</span>
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <Panel padded>
            <PanelHead title="Job mix" icon="pie" />
            <div className="pt-4">
              <SegmentBar
                segments={[
                  { label: 'Running', value: runningJobs.length, color: 'var(--color-green)' },
                  { label: 'Pending', value: pendingJobs.length, color: 'var(--color-amber)' },
                  { label: 'Completed', value: ALL_JOBS.filter((j) => j.state === 'completed').length, color: 'var(--color-cyan)' },
                  { label: 'Failed', value: ALL_JOBS.filter((j) => j.state === 'failed' || j.state === 'timeout' || j.state === 'cancelled').length, color: 'var(--color-red)' },
                ]}
              />
            </div>
          </Panel>
          <Panel padded>
            <PanelHead title="Top users (running)" icon="users" />
            <div className="space-y-2.5 pt-4">
              {topUsers.map(([u, n]) => (
                <div key={u} className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[9px] font-semibold text-accent-bright">{u.slice(0, 2).toUpperCase()}</div>
                  <span className="flex-1 text-[11.5px] text-steam">{u}</span>
                  <span className="font-mono text-[10.5px] text-quill">{n} jobs</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel padded>
            <PanelHead title="Network throughput" icon="network" />
            <div className="pt-4">
              <Bars data={AGG_NET.slice(-20)} color="var(--color-cyan)" height={56} />
              <div className="mt-3 flex justify-between text-[10.5px] text-quill">
                <NetStat rx={2.8e6} tx={1.2e6} />
              </div>
            </div>
          </Panel>
          <Panel padded>
            <PanelHead title="Alerts" icon="alert" right={<Chip>{ALERTS.length} total</Chip>} />
            <div className="space-y-2 pt-4">
              {activeAlerts.map((a) => (
                <div key={a.id} className="rounded-[9px] border border-edge px-2.5 py-2 dark:border-dusk">
                  <div className="flex items-center gap-1.5">
                    <span className={cs('h-[6px] w-[6px] rounded-full', a.sev === 'crit' ? 'bg-red' : a.sev === 'warn' ? 'bg-amber' : 'bg-cyan')} />
                    <span className="truncate text-[11px] font-medium text-steam">{a.title}</span>
                  </div>
                  <div className="mt-0.5 pl-3 text-[10px] text-ghost">{a.source} · {fmtAgo(a.at)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Node spotlight strip */}
      <Panel padded>
        <PanelHead title="GPU fleet spotlight" icon="gpu" right={<Btn size="xs" variant="ghost" onClick={() => setPage('nodes')}>Open explorer</Btn>} />
        <div className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4">
          {GPU_NODES.filter((n) => n.status === 'online').slice(0, 4).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openNode(n.id)}
              className="chip cursor-pointer rounded-[11px] p-3 text-left transition-transform hover:-translate-y-[2px] hover:border-ghost"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium text-frost">{n.id}</span>
                <span className="font-mono text-[10px] text-quill">{n.gpus}× H100</span>
              </div>
              <div className="mt-2"><GpuArray utils={n.gpuUtils} cell={21} /></div>
              <div className="mt-2 flex items-center justify-between text-[9.5px] text-ghost">
                <span>Load {n.cpuLoad}%</span>
                <span className="text-green">{(n.netRx / 1000).toFixed(1)} Gb/s</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )

  function gpuAvg() {
    const g = gpuNodes.filter((n) => n.status === 'online')
    return Math.round(g.reduce((a, n) => a + n.gpuUtils.reduce((x, y) => x + y, 0) / Math.max(1, n.gpuUtils.length), 0) / Math.max(1, g.length))
  }
  function permittedCount() {
    return LOGIN_NODES.length + GPU_NODES.filter((n) => n.status === 'online').length
  }
}
