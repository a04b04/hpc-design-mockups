import { useState } from 'react'

// Generic performance chart for Filesystem detail (throughput / IOPS / metadata ops).
// Deliberately local to mockup-05 so the shared LineChart (percent-based) stays untouched.
export const PERF_POINTS = { '1h': 60, '6h': 72, '24h': 96, '7d': 168 } as const
export type PERF_KEY = 'read' | 'write' | 'iops' | 'meta'
export const PERF_UNIT: Record<PERF_KEY, { label: string; unit: string }> = {
  read: { label: 'Read throughput', unit: ' MB/s' },
  write: { label: 'Write throughput', unit: ' MB/s' },
  iops: { label: 'IOPS', unit: '' },
  meta: { label: 'Metadata ops', unit: ' k ops/s' },
}
export function fmtPerf(v: number, metric: PERF_KEY): string {
  if (metric === 'iops') return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()
  if (metric === 'meta') return `${v.toFixed(1)}k`
  return `${v.toFixed(1)}${PERF_UNIT[metric].unit}`
}
export function fmtAxisTick(v: number, metric: PERF_KEY): string {
  if (metric === 'iops') return v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v).toString()
  if (metric === 'meta') return `${Math.round(v)}k`
  return `${Math.round(v)}${PERF_UNIT[metric].unit}`
}

export function FsChart({ data, metric, labels, yMin = 0 }: { data: number[]; metric: PERF_KEY; labels: string[]; yMin?: number }) {
  const [hover, setHover] = useState(-1)
  const n = data.length
  const mx = Math.max(...data)
  const mn = Math.min(...data)
  const span = mx - mn || (mx || 1) * 0.08
  const hi = mx + span * 0.12
  const lo = Math.max(yMin, mn - span * 0.12)
  const H = 150
  const W = 520
  const pts = data.map((v, i) => ({ x: 4 + (i / (n - 1 || 1)) * (W - 8), y: 4 + (1 - (v - lo) / (hi - lo || 1)) * (H - 8) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${(W - 4).toFixed(1)},${H - 4} L4,${H - 4} Z`
  const stats = { avg: data.reduce((s, v) => s + v, 0) / (n || 1), peak: mx, min: mn }
  const ticks = [hi, (hi + lo) / 2, lo]
  return (
    <div className="fs-chart">
      <div className="fs-chart-head mono">
        <span />
        <span className="fs-chart-stats">
          <span>avg <b>{fmtPerf(stats.avg, metric)}</b></span>
          <span>peak <b>{fmtPerf(stats.peak, metric)}</b></span>
          <span>min <b>{fmtPerf(stats.min, metric)}</b></span>
        </span>
      </div>
      <div className="fs-chart-hbox">
        {ticks.map((t, i) => <span key={i} className="fs-chart-hlabel mono">{fmtAxisTick(t, metric)}</span>)}
      </div>
      <div className="fs-chart-plot">
        <svg viewBox={`0 0 ${W + 4} ${H + 4}`} preserveAspectRatio="none" onMouseLeave={() => setHover(-1)}>
          <path d={area} className="fs-chart-area" />
          <path d={line} className="fs-chart-line" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 3.4 : 0} className="fs-chart-dot">
              <title>{`${fmtPerf(data[i], metric)} · ${labels[i]}`}</title>
            </circle>
          ))}
          {pts.map((p, i) => (
            <circle key={`h${i}`} cx={p.x} cy={p.y} r={7} fill="transparent" onMouseEnter={() => setHover(i)}>
              <title>{`${fmtPerf(data[i], metric)} · ${labels[i]}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="fs-chart-x mono">
        <span>{labels[0]}</span><span className="fs-chart-xmid">{labels[Math.floor(n / 2)]}</span><span>{labels[n - 1]}</span>
      </div>
      <span className="fs-chart-note">Times in UTC</span>
    </div>
  )
}
