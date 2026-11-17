import { useMemo, useState } from 'react'
import { Icon, Chip, StatusDot, SegTabs, Btn, ProgressBar, Empty } from '../mockups/mockup-01/components/ui'
import { GpuArray } from '../mockups/mockup-01/components/charts/charts'
import { cs } from '../lib/format'
import { useApp, openNode, setSt } from '../lib/store'
import { ALL_NODES, GPU_NODES, LOGIN_NODES, COMPUTE_NODES, CLUSTER_CFG } from '../data/cluster-data'

type KindFilter = 'all' | 'login' | 'gpu' | 'compute' | 'service'

const GROUPS: Array<{ id: KindFilter; label: string; nodes: typeof ALL_NODES }> = [
  { id: 'all', label: 'All', nodes: ALL_NODES },
  { id: 'login', label: 'Login', nodes: LOGIN_NODES },
  { id: 'gpu', label: 'GPU', nodes: GPU_NODES },
  { id: 'compute', label: 'Compute', nodes: COMPUTE_NODES },
  { id: 'service', label: 'Service', nodes: [] },
]

function NodeCard(props: { id: string; kind: string }) {
  const { role } = useApp()
  const node = ALL_NODES.find((n) => n.id === props.id)!
  const memPct = Math.round((node.memUsed / node.memTotal) * 100)
  const gpuAvg = Math.round(node.gpuUtils.reduce((a, b) => a + b, 0) / Math.max(1, node.gpuUtils.length))
  const reachable = role === 'admin' || node.status !== 'offline'
  const permitted = role === 'admin' || node.kind === 'login' || (node.kind === 'gpu' && node.status === 'online')

  return (
    <button
      type="button"
      onClick={() => openNode(node.id, 'overview')}
      disabled={!reachable}
      className={cs(
        'group anim-fade-up panel relative cursor-pointer overflow-hidden rounded-[13px] p-3.5 text-left transition-all',
        !reachable && 'cursor-not-allowed opacity-50',
        reachable && 'hover:-translate-y-px hover:bg-steel/60 hover:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.5)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={node.status} pulse={node.status === 'online'} size={7} />
          <span className="truncate font-mono text-[12px] font-medium text-frost">{node.id}</span>
        </div>
        <Icon n="chevron-right" size={13} className="shrink-0 text-ghost opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9.5px] text-quill">
        <span className="rounded-full bg-steel px-1.5 py-[1px] dark:bg-dusk">{node.partition}</span>
        <span className="rounded-full bg-steel px-1.5 py-[1px] dark:bg-dusk">{node.cores} cores</span>
        {node.gpus > 0 && <span className="rounded-full bg-steel px-1.5 py-[1px] dark:bg-dusk">{node.gpus}× GPU</span>}
        <span className="ml-auto font-mono text-[9px] text-ghost">{node.rack}</span>
      </div>

      <div className="mt-3 space-y-2">
        <Meter label="CPU" value={node.cpuLoad} unit="%" color="var(--color-cyan)" />
        <Meter label="MEM" value={memPct} unit="%" sub={`${node.memUsed}/${node.memTotal}G`} color={memPct > 85 ? 'var(--color-amber)' : 'var(--color-green)'} />
      </div>

      {node.kind === 'gpu' && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <GpuArray utils={node.gpuUtils} cell={9} />
          <span className="font-mono text-[9.5px] text-quill">{gpuAvg}% avg</span>
        </div>
      )}

      {node.notes && <div className="mt-2.5 truncate text-[9.5px] text-amber">{node.notes}</div>}

      {!permitted && role === 'user' && (
        <span className="absolute top-2.5 right-2 text-ghost" title="Not permitted for your role">
          <Icon n="lock" size={11} />
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-accent/0 transition-colors group-hover:bg-accent/30" />
    </button>
  )
}

function Meter(props: { label: string; value: number; unit: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-[9px] font-medium tracking-wider text-quill">{props.label}</span>
      <div className="min-w-0 flex-1">
        <ProgressBar value={props.value} color={props.color} height={4} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[9.5px] text-steam">
        {props.value}
        {props.unit}
      </span>
      {props.sub && <span className="hidden font-mono text-[9px] text-ghost sm:inline">{props.sub}</span>}
    </div>
  )
}

export function NodesPage() {
  const { role } = useApp()
  const [kind, setKind] = useState<KindFilter>('all')
  const [query, setQuery] = useState('')
  const [health, setHealth] = useState<'all' | 'attention'>('all')

  const visible = useMemo(() => {
    let pool = kind === 'service' ? ALL_NODES.filter((n) => n.kind === 'service') : (GROUPS.find((g) => g.id === kind)?.nodes ?? ALL_NODES)
    if (role === 'user') pool = pool.filter((n) => LOGIN_NODES.some((l) => l.id === n.id) || (n.kind === 'gpu' && n.status === 'online'))
    if (health === 'attention') pool = pool.filter((n) => n.status !== 'online' || n.cpuLoad > 90 || n.notes)
    const q = query.trim().toLowerCase()
    if (q) pool = pool.filter((n) => n.id.includes(q) || n.partition.includes(q) || n.cpuModel.toLowerCase().includes(q))
    return pool
  }, [kind, query, health, role])

  const on = ALL_NODES.filter((n) => n.status === 'online').length
  const drain = ALL_NODES.filter((n) => n.status === 'drain').length
  const off = ALL_NODES.filter((n) => n.status === 'offline').length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Nodes</h1>
          <p className="mt-1 text-[12.5px] text-quill">
            {CLUSTER_CFG.nodesTotal} nodes across {CLUSTER_CFG.partitions.length} partitions · {on} online · {drain} draining · {off} offline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="chip flex h-8 items-center gap-2 rounded-[10px] px-2.5">
            <Icon n="search" size={13} className="text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter nodes…"
              className="w-44 bg-transparent font-mono text-[11.5px] text-frost outline-none placeholder:text-ghost"
            />
          </div>
          {role === 'admin' && (
            <Btn variant="outline" size="sm" onClick={() => setSt({ page: 'administration' })}>
              <Icon n="settings" size={12} /> Manage
            </Btn>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegTabs
          tabs={GROUPS.map((g) => ({ id: g.id, label: g.label, count: g.id === 'service' ? ALL_NODES.filter((n) => n.kind === 'service').length : g.nodes.length }))}
          active={kind}
          onChange={setKind}
        />
        <SegTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'attention', label: 'Needs attention', count: ALL_NODES.filter((n) => n.status !== 'online' || n.notes).length },
          ]}
          active={health}
          onChange={setHealth}
        />
      </div>

      {visible.length === 0 ? (
        <Empty icon="nodes" title="No nodes match" sub="Try a different filter or search term." />
      ) : kind === 'all' || kind === 'login' ? (
        <>
          {kind === 'login' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((n) => (
                <NodeCard key={n.id} id={n.id} kind={n.kind} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <SectionLabel icon="zap" title="Login nodes" hint="Entry points for interactive sessions" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {visible.filter((n) => n.kind === 'login').map((n) => (
                    <NodeCard key={n.id} id={n.id} kind={n.kind} />
                  ))}
                </div>
              </section>
              <section>
                <SectionLabel icon="circuit-board" title="Service nodes" hint="Scheduler, filesystem and admin services">
                  <Chip>{ALL_NODES.filter((n) => n.kind === 'service').length} nodes</Chip>
                </SectionLabel>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {visible.filter((n) => n.kind === 'service').map((n) => (
                    <NodeCard key={n.id} id={n.id} kind={n.kind} />
                  ))}
                </div>
              </section>
              <section>
                <SectionLabel icon="circuit-board" title="GPU nodes" hint={`${GPU_NODES.length} H100 SXM5 accelerators per node group`}>
                  <Chip>{GPU_NODES.length} nodes</Chip>
                </SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visible.filter((n) => n.kind === 'gpu').map((n) => (
                    <NodeCard key={n.id} id={n.id} kind={n.kind} />
                  ))}
                </div>
              </section>
              <section>
                <SectionLabel icon="chip" title="Compute nodes" hint="Standard CPU partitions">
                  <Chip>{COMPUTE_NODES.length} nodes</Chip>
                </SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {visible.filter((n) => n.kind === 'compute').map((n) => (
                    <NodeCard key={n.id} id={n.id} kind={n.kind} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      ) : (
        <div
          className={cs(
            'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3',
            kind === 'gpu' && '2xl:grid-cols-4',
            kind === 'compute' && '2xl:grid-cols-4',
          )}
        >
          {visible.map((n) => (
            <NodeCard key={n.id} id={n.id} kind={n.kind} />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel(props: { icon: string; title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-ghost">
        <Icon n={props.icon} size={13} />
      </span>
      <h2 className="text-[12.5px] font-semibold tracking-tight text-frost">{props.title}</h2>
      {props.hint && <span className="hidden text-[10.5px] text-ghost md:inline">{props.hint}</span>}
      <span className="flex-1" />
      {props.children}
    </div>
  )
}
