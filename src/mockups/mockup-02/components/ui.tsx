import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Lucide from 'lucide-react'
import { linePath } from '../../../lib/helios-lib'
import { CLUSTER_SERIES, seriesPoints, seriesXLabels } from '../data'
import type { JobState, SlurmState } from '../data'

export function Icon({ name, size = 15, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const C = (Lucide as unknown as Record<string, Lucide.LucideIcon | undefined>)[name]
  if (!C) return null
  return <C size={size} strokeWidth={1.9} className={className} style={style} />
}

export function Breadcrumbs({ items }: { items: Array<{ label: string } | { label: string; onClick: () => void }> }) {
  return (
    <div className="aws2-crumbs">
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="a2-crumb-item">
            {'onClick' in it && !last ? (
              <button className="aws2-crumb-link" onClick={it.onClick}>{it.label}</button>
            ) : (
              <span className={last ? 'aws2-crumb-cur' : ''}>{it.label}</span>
            )}
            {!last && <Lucide.ChevronRight size={13} className="a2-crumb-sep" />}
          </span>
        )
      })}
    </div>
  )
}

export function Card({ className, style, children, onClick }: { className?: string; style?: CSSProperties; children: ReactNode; onClick?: () => void }) {
  return (
    <div className={`${className ? className + ' ' : ''}aws2-card`} style={style} onClick={onClick}>{children}</div>
  )
}

export function CardH({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="aws2-card-h">{<div className="a2-card-h-t">{children}</div>}{right && <div className="a2-card-h-r">{right}</div>}</div>
}

export function CardB({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`aws2-card-b ${className || ''}`} style={style}>{children}</div>
}

// State chips -----------------------------------------------------------
const NODE_STATE_STYLE: Record<SlurmState, { cls: string; label: string }> = {
  IDLE: { cls: 'green', label: 'IDLE' },
  ALLOCATED: { cls: 'blue', label: 'ALLOCATED' },
  DRAINING: { cls: 'purple', label: 'DRAINING' },
  DOWN: { cls: 'red', label: 'DOWN' },
}

export function StateDotChip({ state }: { state: SlurmState }) {
  const s = NODE_STATE_STYLE[state]
  return <span className={`aws2-chip aws2-chip--${s.cls}`}><span className="a2-dot" />{s.label}</span>
}

export function StateChipText({ text, kind }: { text: string; kind: 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'grey' }) {
  return <span className={`aws2-chip aws2-chip--${kind}`}><span className="a2-dot" />{text}</span>
}

const JOB_STATE_STYLE: Record<JobState, string> = {
  RUNNING: 'blue', PENDING: 'amber', COMPLETED: 'green', FAILED: 'red',
}

export function JobStateChip({ state }: { state: JobState }) {
  return <span className={`aws2-chip aws2-chip--${JOB_STATE_STYLE[state]}`}><span className="a2-dot" />{state}</span>
}

// Utility bits ----------------------------------------------------------
export function Bar({ pct, kind, large }: { pct: number; kind?: 'green' | 'blue' | 'amber' | 'purple' | 'red' | undefined; large?: boolean }) {
  const color = kind || (pct >= 90 ? 'red' : pct >= 75 ? 'amber' : 'blue')
  return (
    <div className={`aws2-bar${large ? ' aws2-bar--lg' : ''}`}>
      <i style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color === 'red' ? 'var(--a2-red)' : color === 'amber' ? 'var(--a2-amber-fill)' : color === 'purple' ? 'var(--a2-purple)' : color === 'green' ? 'var(--a2-green-fill)' : undefined }} />
    </div>
  )
}

export function CountCard({ icon, tint, count, label, href }: { icon: string; tint: string; count: number | string; label: string; href?: A2Route['page'] }) {
  return (
    <Card className={`aws2-kpi ${href ? 'a2-kpi-link' : ''}`} onClick={href ? () => navTo({ page: href } as A2Route) : undefined}>
      <div className="aws2-kpi-top">
        <span className={`aws2-counticon aws2-counticon--${tint}`}><Icon name={icon} size={15} /></span>
        <span className="aws2-kpi-label">{label}</span>
      </div>
      <div className="aws2-kpi-val">{typeof count === 'number' ? count.toLocaleString('en-GB') : count}</div>
    </Card>
  )
}

export function Tabs({ tabs, active, onChange, right }: { tabs: string[]; active: string; onChange: (t: string) => void; right?: ReactNode }) {
  return (
    <div className="a2-tabs-row">
      <div className="aws2-tabs">
        {tabs.map((t) => (
          <button key={t} className={`aws2-tab${t === active ? ' active' : ''}`} onClick={() => onChange(t)}>{t}</button>
        ))}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

export function Pagination({ page, pages, onPage, total, showing }: { page: number; pages: number; onPage: (p: number) => void; total: number; showing: string }) {
  return (
    <div className="aws2-pag">
      <span className="a2-pag-info">{showing} <span className="a2-pag-sep">·</span> {total.toLocaleString('en-GB')} total</span>
      <div className="aws2-pag-btns">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Lucide.ChevronLeft size={14} /></button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const base = Math.max(1, Math.min(page - 2, pages - 4))
          const p = base + i
          if (p > pages) return null
          return <button key={p} className={p === page ? 'cur' : ''} onClick={() => onPage(p)}>{p}</button>
        })}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Lucide.ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

export function SortableTh({ label, col, sort, onSort, width, center }: { label: string; col: string; sort: { col: string; asc: boolean }; onSort: (c: string) => void; width?: number | string; center?: boolean }) {
  const active = sort.col === col
  return (
    <th style={width ? { width } : undefined} className={`${center ? 'a2-c' : ''}${active ? ' sorted' : ''} sortable`} onClick={() => onSort(col)}>
      <span className="a2-th-inner">{label}{active && <Lucide.ArrowUp size={11} className={`a2-sort${sort.asc ? '' : ' a2-sort-desc'}`} />}</span>
    </th>
  )
}

// Menus -----------------------------------------------------------------
export function MenuWrap({ label, items, button, align }: {
  label?: string
  items: Array<{ label: string; onClick?: () => void; kind?: 'danger' | 'warn'; sep?: boolean; icon?: string; disabled?: boolean }>
  button?: ReactNode
  align?: 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="aws2-menuwrap" ref={ref}>
      {button ?? (
        <button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => setOpen(!open)} aria-haspopup="menu">{label}<Lucide.ChevronDown size={13} /></button>
      )}
      {open && (
        <div className={`aws2-menu${align === 'right' ? ' right' : ''}`} role="menu">
          {items.map((it, i) => it.sep ? (
            <div key={i} className="a2-menu-sep" />
          ) : (
            <button key={i} className={`a2-mi${it.kind ? ` ${it.kind}` : ''}`} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick?.() }}>
              {it.icon && <Icon name={it.icon} size={14} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Toasts ----------------------------------------------------------------
export type Toast = { id: number; kind: 'info' | 'success' | 'warn' | 'error'; text: string }
let toastSeq = 1
const toastListeners = new Set<(t: Toast) => void>()

export function emitToast(kind: Toast['kind'], text: string): void {
  const t = { id: toastSeq++, kind, text }
  toastListeners.forEach((fn) => fn(t))
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    const add = (t: Toast) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4200)
    }
    toastListeners.add(add)
    return () => { toastListeners.delete(add) }
  }, [])
  return (
    <div className="aws2-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`aws2-toast aws2-toast--${t.kind}`}>
          <Icon name={t.kind === 'success' ? 'CircleCheck' : t.kind === 'warn' ? 'TriangleAlert' : t.kind === 'error' ? 'CircleX' : 'Info'} size={15} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// Modal -----------------------------------------------------------------
export function Modal({ title, onClose, footer, children, wide }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="aws2-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`aws2-modal${wide ? ' aws2-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="aws2-modal-h">
          <h3>{title}</h3>
          <button className="aws2-iconbtn" onClick={onClose} aria-label="Close dialog"><Lucide.X size={15} /></button>
        </div>
        <div className="aws2-modal-b">{children}</div>
        {footer && <div className="aws2-modal-f">{footer}</div>}
      </div>
    </div>
  )
}

// Key-value table -------------------------------------------------------
export function Kv({ rows, cols }: { rows: Array<[string, ReactNode]>; cols?: 1 | 2 }) {
  if (cols === 2) {
    const half = Math.ceil(rows.length / 2)
    return (
      <div className="a2-kv-2col">
        {[rows.slice(0, half), rows.slice(half)].map((part, i) => (
          <div key={i} className="aws2-kv">
            {part.map(([k, v], j) => <div key={j} className="aws2-kv-row"><div className="k">{k}</div><div className="v">{v}</div></div>)}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="aws2-kv">
      {rows.map(([k, v], i) => <div key={i} className="aws2-kv-row"><div className="k">{k}</div><div className="v">{v}</div></div>)}
    </div>
  )
}

export function SysBanner({ kind, title, children }: { kind?: 'success' | 'error' | 'info' | 'warn'; title: string; children?: ReactNode }) {
  return (
    <div className={`sysbanner${kind && kind !== 'success' ? ` ${kind}` : ''}`}>
      <div className="a2-sysbanner-icon"><Icon name={kind === 'error' ? 'CircleX' : kind === 'warn' ? 'TriangleAlert' : kind === 'info' ? 'Info' : 'CircleCheck'} size={16} /></div>
      <div>
        <div className="a2-sysbanner-title">{title}</div>
        {children && <div className="a2-sysbanner-sub">{children}</div>}
      </div>
    </div>
  )
}

// Charts ----------------------------------------------------------------
export type SeriesSpec = { key: string; label: string; color: 'blue' | 'purple' | 'green' | 'amber' }

export function LineChart({ specs, hours = 24, width = 640, height = 220 }: { specs: SeriesSpec[]; hours?: number; width?: number; height?: number }) {
  const [hover, setHover] = useState<{ x: number; i: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const pad = 20
  const points = useMemo(() => specs.map((s) => seriesPoints(CLUSTER_SERIES[s.key as 'cpu' | 'mem' | 'gpu'] ?? [], width, height, pad)), [specs, width, height, pad])
  const labels = useMemo(() => seriesXLabels(hours), [hours])
  const data0 = useMemo(() => specs.map((s) => CLUSTER_SERIES[s.key as 'cpu' | 'mem' | 'gpu'] ?? []), [specs])

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    const x = e.clientX - box.left - pad
    const iw = width - pad * 2
    const i = Math.max(0, Math.min(data0[0].length - 1, Math.round((x / iw) * (data0[0].length - 1))))
    setHover({ x, i })
  }

  return (
    <div className="a2-chartbox" ref={boxRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
        {[0, 20, 40, 60, 80, 100].map((v) => {
          const y = pad + (100 - v) / 100 * (height - pad * 2)
          return (
            <g key={v}>
              <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--a2-line-soft)" strokeWidth={1} />
              <text x={pad - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--a2-muted)">{v}%</text>
            </g>
          )
        })}
        {specs.map((s, si) => (
          <path key={s.key} d={linePath(points[si])} fill="none" stroke={`var(--a2-${s.color})`} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover && specs.map((s, si) => {
          const p = points[si][hover.i]
          if (!p) return null
          return <circle key={s.key} cx={p.x} cy={p.y} r={3} fill={`var(--a2-${s.color})`} stroke="#fff" strokeWidth={1.5} />
        })}
        {hover && <line x1={pad + hover.x} x2={pad + hover.x} y1={pad} y2={height - pad} stroke="var(--a2-blue)" strokeWidth={1} strokeDasharray="3 3" />}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(hover.x + pad + 12, width - 140), top: 8 }}>
          <div className="tip-t">{labels[hover.i] ?? labels[labels.length - 1]}</div>
          {specs.map((s) => (
            <div key={s.key} className="tip-r"><span className="sw" style={{ background: `var(--a2-${s.color})` }} />{s.label} <b>{Math.round(data0[specs.indexOf(s)][hover.i])}%</b></div>
          ))}
        </div>
      )}
      <div className="aws2-legend">
        {specs.map((s) => (
          <span key={s.key} className="lg-it"><i style={{ background: `var(--a2-${s.color})` }} />{s.label}</span>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ data, color = 'blue', width = 90, height = 26 }: { data: number[]; color?: 'blue' | 'purple' | 'green' | 'amber'; width?: number; height?: number }) {
  const pad = 2
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const pts: Array<{ x: number; y: number }> = data.map((v, i) => ({
    x: (i / Math.max(1, data.length - 1)) * (width - pad * 2) + pad,
    y: height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2),
  }))
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={linePath(pts)} fill="none" stroke={`var(--a2-${color})`} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Router ----------------------------------------------------------------
export type A2Route =
  | { page: 'dashboard' } | { page: 'nodes' } | { page: 'node'; node: string }
  | { page: 'partitions' } | { page: 'reservations' }
  | { page: 'jobs' } | { page: 'submit-job' } | { page: 'job-templates' } | { page: 'job-history' }
  | { page: 'filesystems' } | { page: 'file-browser' } | { page: 'quotas' }
  | { page: 'cluster-health' } | { page: 'resource-utilisation' } | { page: 'alerts' }
  | { page: 'terminal' } | { page: 'remote-desktop' }
  | { page: 'users' } | { page: 'slurm-accounts' } | { page: 'qos' } | { page: 'node-mgmt' } | { page: 'configuration' }

export const A2_NAV_PERMISSIONS: Record<string, 'all' | 'admin'> = {
  'users': 'admin', 'slurm-accounts': 'admin', 'qos': 'admin', 'node-mgmt': 'admin', 'configuration': 'admin',
}

export function routeToHash(r: A2Route): string {
  if (r.page === 'node') return `#/mockup-02/nodes/${r.node}`
  return `#/mockup-02/${r.page}`
}

export function navTo(r: A2Route): void {
  window.location.hash = routeToHash(r)
}

export function parseHash(hash: string): A2Route | null {
  const m = /^#\/mockup-02\/([\w-]+)(?:\/([\w.-]+))?$/.exec(hash)
  if (!m) return null
  const [, seg, arg] = m
  if (seg === 'nodes' && arg) return { page: 'node', node: arg }
  const known = ['dashboard', 'nodes', 'partitions', 'reservations', 'jobs', 'submit-job', 'job-templates', 'job-history', 'filesystems', 'file-browser', 'quotas', 'cluster-health', 'resource-utilisation', 'alerts', 'terminal', 'remote-desktop', 'users', 'slurm-accounts', 'qos', 'node-mgmt', 'configuration']
  if (known.includes(seg)) return { page: seg } as A2Route
  return null
}
