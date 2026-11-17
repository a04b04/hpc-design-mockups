import { Icon, Chip, Btn, StatusDot, Dl } from '../../components/ui'
import { LineChart, GpuArray, NetStat, StorageBar, CellMeter } from '../../components/charts/charts'
import { cs, fmtBytes, fmtUptime, fmtDuration } from '../../../../lib/format'
import { closePanel, setPanelTab, useApp, openTerminal } from '../../../../lib/store'
import { ALL_JOBS, ALL_NODES } from '../../../../data/cluster-data'
import type { PanelTab, ClusterNode } from '../../../../data/cluster-data'

const TABS: PanelTab[] = ['overview', 'hardware', 'metrics', 'jobs', 'storage']

function kindLabel(kind: ClusterNode['kind']) {
  return kind === 'gpu' ? 'GPU node' : kind === 'compute' ? 'Compute node' : kind === 'login' ? 'Login node' : 'Service node'
}

function UserBadge({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase()
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent/15 font-mono text-[8px] font-semibold text-accent-bright">
      {initials}
    </span>
  )
}

export function NodePanel() {
  const { panel } = useApp()
  const node = panel ? ALL_NODES.find((n) => n.id === panel.nodeId) : undefined
  if (!panel || !node) return null
  const tab = panel.tab
  const memPct = Math.round((node.memUsed / node.memTotal) * 100)
  const jobs = ALL_JOBS.filter((j) => node.jobs.includes(j.id))
  const userCount = new Set(jobs.map((j) => j.user)).size
  const gpusAllocated = jobs.reduce((a, j) => a + (j.gpus ?? 0), 0)
  const isGpu = node.kind === 'gpu'

  return (
    <div className="anim-slide-l pointer-events-auto fixed top-[76px] right-4 bottom-4 z-50 w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[16px] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.6)]">
      <div className="panel-solid flex h-full flex-col">
        {/* header */}
        <div className="border-b border-edge px-4 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusDot status={node.status} pulse={node.status === 'online'} />
                <span className="truncate font-mono text-[13.5px] font-semibold text-frost">{node.id}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Chip>{kindLabel(node.kind)}</Chip>
                <Chip>{node.partition}</Chip>
                <span className="text-[10.5px] text-ghost">{node.rack}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close panel"
              className="chip flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[9px] text-mist hover:text-frost"
            >
              <Icon n="x" size={13} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Btn
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => openTerminal(node.id, 'ada')}
              disabled={node.status === 'offline'}
            >
              <Icon n="terminal" size={12} /> Connect via SSH
              <Kbd>ada@{node.id.replace('helios-', '')}</Kbd>
            </Btn>
          </div>
          <div className="mt-2.5 flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPanelTab(t)}
                className={cs(
                  'cursor-pointer rounded-md px-2 py-[3px] text-[10.5px] font-medium capitalize transition-colors',
                  tab === t ? 'chip-solid text-frost' : 'text-quill hover:text-steam',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Mini label="CPU load" value={`${node.cpuLoad}%`} pct={node.cpuLoad} color="var(--color-cyan)" />
                <Mini label="Memory" value={`${memPct}%`} sub={`${fmtBytes(node.memUsed * 1024 ** 3, 0)} / ${node.memTotal} GiB`} pct={memPct} color={memPct > 85 ? 'var(--color-amber)' : 'var(--color-green)'} />
              </div>
              {isGpu && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">GPU array</span>
                    <span className="font-mono text-[10px] text-ghost">{gpusAllocated}/{node.gpus} allocated</span>
                  </div>
                  <GpuArray utils={node.gpuUtils} cell={26} />
                </div>
              )}
              <div className="rounded-[11px] border border-edge px-3 py-2.5 dark:border-dusk">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-quill">Network</span>
                  <span className="font-mono text-[9.5px] text-green">live</span>
                </div>
                <div className="mt-1.5"><NetStat rx={node.netRx * 1000} tx={node.netTx * 1000} /></div>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <Dl items={[{ k: 'Uptime', v: fmtUptime(node.uptimeMs) }, { k: 'CPU temp', v: `${node.temps.cpu}°C` }, { k: 'Locals', v: `${userCount}` }]} />
                <Dl items={[{ k: 'Disk', v: `${node.diskUsed}/${node.diskTotal} TB` }, { k: 'GPU temp', v: gpuTempN(node) ? `${node.temps.gpu}°C` : '—' }]} />
              </div>
              {node.notes && (
                <div className="flex items-start gap-2 rounded-[10px] border border-amber/25 bg-amber/5 px-3 py-2.5">
                  <Icon n="info" size={12} className="mt-0.5 shrink-0 text-amber" />
                  <span className="text-[11px] leading-snug text-amber">{node.notes}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'hardware' && (
            <Dl
              className="gap-3"
              items={[
                { k: 'CPU model', v: <span className="text-right">{node.cpuModel}</span> },
                { k: 'Cores', v: `${node.cores}` },
                { k: 'Memory', v: `${node.memTotal} GiB` },
                { k: 'GPUs', v: node.gpus ? `${node.gpus}× ${node.gpuModel?.replace('NVIDIA ', '')}` : 'None' },
                { k: 'Local disk', v: `${node.diskTotal} TB` },
                { k: 'Interconnect', v: node.kind === 'gpu' ? 'InfiniBand NDR 400' : 'Ethernet 25 GbE' },
                { k: 'Rack', v: node.rack },
                { k: 'Uptime', v: fmtUptime(node.uptimeMs) },
              ]}
            />
          )}

          {tab === 'metrics' && (
            <div className="space-y-4">
              <MetricRow label="CPU utilisation" color="var(--color-cyan)" data={node.cpuSeries} unit="%" />
              <MetricRow label="Memory" color="var(--color-green)" data={node.memSeries} unit="%" />
              {isGpu && <MetricRow label="GPU" color="var(--color-accent-bright)" data={node.gpuSeries} unit="%" />}
              <MetricRow label="Network" color="var(--color-cyan)" data={node.netSeries} unit="" />
              {(node.kind === 'gpu' || node.kind === 'compute') && (
                <div>
                  <div className="mb-2 text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">Core activity</div>
                  <CellMeter data={node.cpuSeries.slice(-64).map((v, i) => (v + (i * 7) % 31) % 100)} cell={18} />
                </div>
              )}
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-1.5">
              {jobs.length === 0 && <div className="py-8 text-center text-[11.5px] text-ghost">No jobs running here</div>}
              {jobs.map((j) => (
                <div key={j.id} className="rounded-[10px] border border-edge px-3 py-2 hover:bg-steel dark:border-dusk">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] text-frost">{j.name}</span>
                    <JobStateChip state={j.state} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-quill">
                    <UserBadge username={j.user} /> {j.user}
                    <span className="text-ghost">·</span> #{j.id}
                    <span className="ml-auto font-mono">{fmtDuration(j.timeUsedMs)} elapsed</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'storage' && (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
                  <span className="font-mono text-steam">/local scratch</span>
                  <span className="font-mono text-quill">{node.diskUsed} / {node.diskTotal} TB</span>
                </div>
                <StorageBar usedPct={(node.diskUsed / node.diskTotal) * 100} />
              </div>
              <div className="rounded-[11px] border border-edge p-3 dark:border-dusk">
                <div className="text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">Shared filesystems serving this node</div>
                <div className="mt-2 space-y-2.5">
                  {['/home', '/scratch'].map((m, i) => {
                    const pct = i === 0 ? 54 : 82
                    return (
                      <div key={m}>
                        <div className="mb-1 flex justify-between font-mono text-[10.5px]"><span className="text-steam">{m}</span><span className={pct > 80 ? 'text-amber' : 'text-quill'}>{pct}%</span></div>
                        <StorageBar usedPct={pct} color={pct > 80 ? 'var(--color-amber)' : 'var(--color-accent)'} height={5} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-edge px-4 py-2 text-[10px] text-ghost">
          <span>Last metrics refresh 12s ago</span>
          <span className="font-mono">{node.status === 'offline' ? 'not schedulable' : 'schedulable'}</span>
        </div>
      </div>
    </div>
  )
}

function gpuTempN(node: ClusterNode) { return node.temps.gpu }

function Kbd(props: { children: React.ReactNode }) {
  return <span className="ml-1 hidden rounded-[5px] border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[9.5px] text-white/85 sm:inline">{props.children}</span>
}

function JobStateChip({ state }: { state: string }) {
  const map: Record<string, string> = {
    running: 'border-green/30 bg-green/10 text-green',
    pending: 'border-amber/30 bg-amber/10 text-amber',
    completed: 'border-cyan/30 bg-cyan/10 text-cyan',
    failed: 'border-red/30 bg-red/10 text-red',
    timeout: 'border-red/30 bg-red/10 text-red',
    cancelled: 'border-edge bg-steel text-quill dark:border-dusk',
  }
  return <span className={`rounded-md border px-1.5 py-[2px] text-[9.5px] font-medium ${map[state] ?? ''}`}>{state}</span>
}

function MetricRow(props: { label: string; color: string; data: number[]; unit: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">{props.label}</span>
        <span className="font-mono text-[10.5px] text-steam">{props.data[props.data.length - 1]?.toFixed(0)}{props.unit === '%' ? '%' : ''}</span>
      </div>
      <LineChart data={props.data} color={props.color} height={54} unit={props.unit} strokeWidth={1.4} />
    </div>
  )
}

function Mini(props: { label: string; value: string; sub?: string; pct: number; color: string }) {
  return (
    <div className="rounded-[11px] border border-edge px-3 py-2.5 dark:border-dusk">
      <div className="text-[10.5px] text-quill">{props.label}</div>
      <div className="mt-1 font-mono text-[16px] font-medium text-frost">{props.value}</div>
      {props.sub ? <div className="mt-0.5 font-mono text-[9.5px] text-ghost">{props.sub}</div> : null}
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-edge">
        <div className="anim-grow-w h-full rounded-full" style={{ width: `${props.pct}%`, background: props.color }} />
      </div>
    </div>
  )
}
