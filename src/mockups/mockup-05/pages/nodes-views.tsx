// Nodes page view modes (Table / Cards / Matrix) for mockup-05 only.
// Cards view is Helios-inspired (grouped cards, utilisation bars);
// Matrix view is Aether-inspired with a muted, professional palette.
import { useMemo } from 'react'
import { Cpu, Grid3x3, ChevronRight, LayoutGrid, MemoryStick, Table2 } from 'lucide-react'
import { Bar, Card, CardB, CardH, StateDotChip, navTo } from '../components/ui'
import type { EnNode, SlurmState } from '../data'

export type NodesViewMode = 'table' | 'cards' | 'matrix'
export const NODES_VIEW_KEY = 'enucc5.nodesView'

export function loadNodesView(): NodesViewMode {
  try {
    const v = localStorage.getItem(NODES_VIEW_KEY)
    if (v === 'cards' || v === 'matrix') return v
  } catch { /* storage unavailable — fall back to table */ }
  return 'table'
}

// ---------------------------------------------------------------- selector --
const VIEW_OPTIONS: Array<{ id: NodesViewMode; label: string; Icon: typeof Table2 }> = [
  { id: 'table', label: 'Table', Icon: Table2 },
  { id: 'cards', label: 'Cards', Icon: LayoutGrid },
  { id: 'matrix', label: 'Matrix', Icon: Grid3x3 },
]

export function NodesViewSelector({ view, onChange }: { view: NodesViewMode; onChange: (v: NodesViewMode) => void }) {
  return (
    <div className="a5-seg" role="tablist" aria-label="Nodes view mode">
      {VIEW_OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={view === id}
          className={view === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- cards ----
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function gpuUtilOf(n: EnNode): number {
  if (n.gpuCount === 0 || n.state === 'DOWN') return 0
  const h = hashStr(n.name)
  if (n.state === 'ALLOCATED') return 58 + (h % 38)
  if (n.state === 'DRAINING') return 6 + (h % 10)
  return h % 5
}

const gpuSqColor = (u: number): string => (u >= 75 ? '#3e7ec2' : u >= 40 ? '#7ea9d6' : u >= 1 ? '#bcd4ee' : '#e2e8f0')

interface CardGroup {
  title: string
  desc: string
  match: (n: EnNode) => boolean
}

const CARD_GROUPS: CardGroup[] = [
  { title: 'Login Nodes', desc: 'Interactive gateways for shell access and job submission.', match: (n) => n.type === 'login' },
  { title: 'Service Nodes', desc: 'Scheduler, accounting and cluster infrastructure services.', match: (n) => (n.type as string) === 'service' },
  { title: 'GPU Nodes', desc: 'A100-accelerated nodes for AI, visualisation and GPGPU workloads.', match: (n) => n.type === 'gpu' },
  { title: 'Compute Nodes', desc: 'Standard 64-core batch nodes for parallel CPU workloads.', match: (n) => n.type === 'compute' },
  { title: 'High Memory Nodes', desc: 'Large-memory nodes for in-memory analytics and big-model simulation.', match: (n) => n.type === 'himem' },
]

function NodeCard({ n }: { n: EnNode }) {
  const gpu = gpuUtilOf(n)
  return (
    <div
      className="a5-ncard"
      role="link"
      tabIndex={0}
      onClick={() => navTo({ page: 'node', node: n.name })}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo({ page: 'node', node: n.name }) } }}
      aria-label={`Open ${n.name} details`}
    >
      <div className="a5-ncard-head">
        <span className="a5-ncard-name">{n.name}</span>
        <StateDotChip state={n.state} />
      </div>
      <div className="a5-ncard-meta">{n.partition} partition · up {n.uptimeStr}</div>
      <div className="a5-ncard-specs">
        <span><Cpu size={12} />{n.cores} cores</span>
        <span><MemoryStick size={12} />{n.memStr}</span>
        {n.gpuCount > 0 && <span>{n.gpuStr}</span>}
      </div>
      <div className="a5-ncard-bars">
        <div className="a5-utilrow"><span>CPU</span><span className="mono">{n.cpuUtil}%</span></div>
        <Bar pct={n.cpuUtil} />
        <div className="a5-utilrow"><span>MEM</span><span className="mono">{n.memUtil}%</span></div>
        <Bar pct={n.memUtil} />
        {n.gpuCount > 0 && (
          <>
            <div className="a5-utilrow"><span>GPU</span><span className="mono">{gpu}%</span></div>
            <Bar pct={gpu} />
            <div className="a5-gpurow">
              {Array.from({ length: n.gpuCount }, (_, i) => {
                const h = hashStr(`${n.name}:${i}`)
                const u = Math.min(100, Math.max(2, Math.round(gpu + ((h >>> 3) % 24) - 12)))
                return <i key={i} className="a5-gpusq" style={{ background: gpuSqColor(gpu ? u : 0) }} title={`GPU ${i + 1} · ${gpu ? u : 0}% used`} />
              })}
            </div>
          </>
        )}
      </div>
      <div className="a5-ncard-foot">
        <span>{n.jobs} running job{n.jobs === 1 ? '' : 's'}</span>
        <ChevronRight size={13} className="a5-ncard-chev" />
      </div>
    </div>
  )
}

export function NodesCardView({ nodes }: { nodes: EnNode[] }) {
  if (nodes.length === 0) {
    return <Card><CardB><div className="a5-empty">No nodes match the current filters.</div></CardB></Card>
  }
  return (
    <div className="a5-cv">
      {CARD_GROUPS.map((g) => {
        const list = nodes.filter(g.match)
        if (list.length === 0) return null
        return (
          <section key={g.title} className="a5-cv-sect">
            <div className="a5-cv-sect-head">
              <h2 className="a5-cv-sect-title">{g.title}</h2>
              <span className="a5-cv-sect-desc">{g.desc}</span>
              <span className="aws5-chip a5-cv-count">{list.length} node{list.length === 1 ? '' : 's'}</span>
            </div>
            <div className="a5-cv-grid">
              {list.map((n) => <NodeCard key={n.name} n={n} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- matrix ---
export const NODE_STATE_COLORS: Record<SlurmState | 'MIXED' | 'UNAVAILABLE', string> = {
  IDLE: '#70B89A',
  ALLOCATED: '#6B9BC3',
  MIXED: '#A18BC4',
  DRAINING: '#D5A65C',
  DOWN: '#CF7777',
  UNAVAILABLE: '#505866',
}

const MATRIX_LEGEND: Array<{ key: SlurmState | 'MIXED' | 'UNAVAILABLE'; label: string }> = [
  { key: 'IDLE', label: 'IDLE' },
  { key: 'ALLOCATED', label: 'ALLOCATED' },
  { key: 'MIXED', label: 'MIXED' },
  { key: 'DRAINING', label: 'DRAINING' },
  { key: 'DOWN', label: 'DOWN' },
  { key: 'UNAVAILABLE', label: 'UNAVAILABLE' },
]

export function NodesMatrixView({ nodes, clusterTotal, filterDesc }: {
  nodes: EnNode[]
  clusterTotal: number
  filterDesc: string
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const n of nodes) c[n.state] = (c[n.state] ?? 0) + 1
    return c
  }, [nodes])

  return (
    <Card>
      <CardH right={<span className="a5-mx-sub">Showing <b>{nodes.length}</b> of <b>{clusterTotal}</b> nodes · {filterDesc}</span>}>
        Node state matrix
      </CardH>
      <CardB>
        {nodes.length === 0 ? (
          <div className="a5-empty">No nodes match the current filters.</div>
        ) : (
          <div className="a5-mx-grid" role="grid" aria-label={`Node state matrix, ${nodes.length} nodes`}>
            {nodes.map((n) => (
              <button
                key={n.name}
                type="button"
                className="a5-mx-cell"
                style={{ background: NODE_STATE_COLORS[n.state] }}
                title={`${n.name}\nState: ${n.state}\nPartition: ${n.partition}\nCPU: ${n.cores} cores · ${n.cpuUtil}% in use\nMemory: ${n.memStr} · ${n.memUtil}% in use\nGPUs: ${n.gpuCount ? n.gpuStr : '—'}\nRunning jobs: ${n.jobs}`}
                onClick={() => navTo({ page: 'node', node: n.name })}
              />
            ))}
          </div>
        )}
      </CardB>
      <CardB className="a5-mx-legendwrap">
        <div className="a5-mx-legend">
          {MATRIX_LEGEND.map(({ key, label }) => {
            const count = counts[key] ?? 0
            return (
              <span key={key} className={`a5-mx-legend-item${count === 0 ? ' dim' : ''}`} title={`${count} node${count === 1 ? '' : 's'} in state ${label}`}>
                <i className="a5-mx-swatch" style={{ background: NODE_STATE_COLORS[key] }} />
                {label}
                <b className="mono">{count}</b>
              </span>
            )
          })}
        </div>
      </CardB>
    </Card>
  )
}
