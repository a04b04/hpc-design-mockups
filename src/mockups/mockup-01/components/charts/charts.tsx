import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cs, fmtBytes } from '../../../../lib/format'
import { EASE, hexA } from '../ui'

function niceMax(v: number) {
  if (v <= 1) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / mag) * mag
}

export function LineChart(props: {
  data: number[]
  height?: number
  color?: string
  className?: string
  max?: number
  strokeWidth?: number
  showDot?: boolean
  unit?: string
  fill?: boolean
}) {
  const h = props.height ?? 64
  const w = 300
  const pad = 3
  const [hover, setHover] = useState<number | null>(null)
  const gid = useMemo(() => `lg${Math.random().toString(36).slice(2, 8)}`, [])
  const max = props.max ?? niceMax(Math.max(...props.data) * 1.08)
  const min = Math.min(0, Math.min(...props.data))
  const range = max - min || 1
  const pts = props.data.map((v, i) => {
    const x = pad + (i / (props.data.length - 1 || 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return [x, y] as const
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const area = `${path} L${w - pad},${h} L${pad},${h} Z`
  const color = props.color ?? 'var(--color-cyan)'
  const last = pts[pts.length - 1]
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: h }}
      className={props.className}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const fx = ((e.clientX - r.left) / r.width) * w
        const idx = Math.round(((fx - pad) / (w - pad * 2)) * (props.data.length - 1))
        setHover(Math.min(props.data.length - 1, Math.max(0, idx)))
      }}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={props.fill === false ? 0 : '0.16'} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {props.fill !== false && <path d={area} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={props.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
      {props.showDot !== false && <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />}
      {hover != null && (
        <g>
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={h} stroke="var(--color-ghost)" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
          <circle cx={pts[hover][0]} cy={pts[hover][1]} r="3" fill={color} stroke="var(--color-void)" strokeWidth="1.5" />
          <g transform={`translate(${Math.min(pts[hover][0] + 5, w - 56)},${Math.max(pts[hover][1] - 18, 12)})`}>
            <rect x="0" y="-10" width="52" height="15" rx="4" fill="var(--color-dusk)" stroke="var(--color-edge)" />
            <text x="6" y="1" fill="var(--color-steam)" style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)' }}>
              {`${props.data[hover].toFixed(1)}${props.unit ?? ''}`.slice(0, 10)}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}

export function MiniLine(props: { data: number[]; color?: string; height?: number; className?: string }) {
  const h = props.height ?? 26
  const w = 120
  const max = Math.max(...props.data)
  const min = Math.min(...props.data, 0)
  const range = max - min || 1
  let d = ''
  props.data.forEach((v, i) => {
    const x = 1 + (i / (props.data.length - 1 || 1)) * (w - 2)
    const y = h - 2 - ((v - min) / range) * (h - 4)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={props.className} style={{ width: '100%', height: h }} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={props.color ?? 'var(--color-accent-bright)'} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Bars(props: { data: number[]; color?: string; className?: string; height?: number; gap?: number; max?: number; rounded?: number }) {
  const max = props.max ?? Math.max(...props.data, 1)
  const h = props.height ?? 42
  return (
    <div className={cs('flex items-end', props.className)} style={{ height: h, gap: props.gap ?? 3 }}>
      {props.data.map((v, i) => (
        <div
          key={i}
          title={String(Math.round(v))}
          style={{
            flex: 1,
            height: `${Math.max(3, (v / max) * 100)}%`,
            background: props.color ?? 'var(--color-accent)',
            opacity: 0.35 + (i / props.data.length) * 0.65,
            borderRadius: props.rounded ?? 3,
          }}
        />
      ))}
    </div>
  )
}

export function LiveChart(props: {
  series: Array<{ label: string; color: string; data: number[] }>
  height?: number
  step?: number
  yFmt?: (v: number) => string
  yMax?: number
  yMin?: number
  className?: string
  showLegend?: boolean
  legendNote?: string
}) {
  const h = props.height ?? 220
  const seedsRef = useRef(props.series.map((s) => [...s.data]))
  seedsRef.current = props.series.map((s) => [...s.data])
  const [tickN, setTickN] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTickN((t) => t + 1), props.step ?? 2600)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const w = 640
  const padL = 38
  const yMax = props.yMax ?? niceMax(Math.max(...props.series.flatMap((s) => s.data)) * 1.05)
  const yMin = props.yMin ?? 0
  const len = Math.max(...props.series.map((s) => s.data.length), 2)
  const yFor = (v: number) => 8 + (1 - (v - yMin) / (yMax - yMin)) * (h - 26)
  const valFor = (data: number[], i: number, rate: number) => data[Math.floor(tickN * rate + i) % data.length]
  const pathFor = (data: number[], rate: number) => {
    let d = ''
    for (let i = 0; i < len; i++) {
      const x = padL + (i / (len - 1)) * (w - padL - 8)
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yFor(valFor(data, i, rate)).toFixed(1)}`
    }
    return d
  }
  const gridCount = 4
  return (
    <div className={props.className}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }} preserveAspectRatio="none">
        {Array.from({ length: gridCount + 1 }, (_, i) => {
          const g = i / gridCount
          const y = 8 + g * (h - 26)
          const val = yMax - g * (yMax - yMin)
          return (
            <g key={i}>
              <line x1={padL} x2={w - 6} y1={y} y2={y} stroke="var(--color-edge)" strokeWidth="1" opacity={i === 0 ? 0 : 0.55} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fill="var(--color-ghost)" style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)' }}>
                {props.yFmt ? props.yFmt(val) : String(Math.round(val))}
              </text>
            </g>
          )
        })}
        {props.series.map((s, i) => (
          <g key={s.label}>
            <circle cx={w - 8} cy={yFor(valFor(s.data, len - 1, 0.25))} r="2.3" fill={s.color}>
              <animate attributeName="opacity" values="0.95;0.3;0.95" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <path d={pathFor(s.data, (i + 1) * 0.25)} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
          </g>
        ))}
      </svg>
      {props.showLegend !== false && (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {props.series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[10.5px] text-quill">
              <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
          <span className="ml-auto font-mono text-[10px] text-ghost">{props.legendNote ?? 'live · simulated'}</span>
        </div>
      )}
    </div>
  )
}

export function Donut(props: {
  value: number
  size?: number
  thickness?: number
  color?: string
  children?: ReactNode
  className?: string
}) {
  const size = props.size ?? 96
  const th = props.thickness ?? 8
  const r = (size - th) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(100, Math.max(0, props.value))
  return (
    <div className={cs('relative inline-flex items-center justify-center', props.className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={th} stroke="var(--color-edge)" opacity="0.9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={props.color ?? 'var(--color-accent)'}
          strokeWidth={th}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: `stroke-dashoffset 900ms ${EASE}` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{props.children}</div>
    </div>
  )
}

export function SegmentBar(props: {
  segments: Array<{ label: string; value: number; color: string }>
  height?: number
  showLegend?: boolean
  className?: string
}) {
  const total = props.segments.reduce((a, s) => a + s.value, 0) || 1
  return (
    <div className={props.className}>
      <div className="flex w-full overflow-hidden rounded-full" style={{ height: props.height ?? 10 }}>
        {props.segments.map((s, i) => (
          <div
            key={i}
            title={`${s.label} · ${Math.round((s.value / total) * 100)}%`}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              opacity: 0.92,
              transition: `width 700ms ${EASE}`,
              borderRight: i < props.segments.length - 1 ? '1px solid var(--color-abyss)' : undefined,
            }}
          />
        ))}
      </div>
      {props.showLegend !== false && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {props.segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[11px] text-quill">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="font-mono text-steam">{Math.round((s.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StorageBar(props: { usedPct: number; color?: string; height?: number; ticks?: boolean; className?: string }) {
  const h = props.height ?? 8
  const v = Math.min(100, Math.max(0, props.usedPct))
  return (
    <div className={cs('relative w-full overflow-hidden rounded-full bg-edge/70', props.className)} style={{ height: h }}>
      <div className="anim-grow-w h-full rounded-full" style={{ width: `${v}%`, background: props.color ?? 'var(--color-accent)', opacity: 0.92 }} />
      {props.ticks && [25, 50, 75].map((t) => <div key={t} className="absolute top-0 h-full w-px bg-void/60" style={{ left: `${t}%` }} />)}
    </div>
  )
}

export function QuotaMeter(props: { usedPct: number; className?: string; height?: number; color?: string }) {
  const v = Math.min(100, Math.max(0, props.usedPct))
  const color = props.color ?? (v > 90 ? 'var(--color-red)' : v > 75 ? 'var(--color-amber)' : 'var(--color-green)')
  return (
    <div className={cs('relative w-full rounded-full bg-edge/60', props.className)} style={{ height: props.height ?? 6 }}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color, transition: `width 600ms ${EASE}` }} />
      <div className="absolute top-[-3px] h-[12px] w-[2px] rounded-full bg-mist/70" style={{ left: `calc(${Math.min(97, v)}% - 1px)` }} />
    </div>
  )
}

export function GpuArray(props: { utils: number[]; cell?: number; className?: string }) {
  const s = props.cell ?? 24
  return (
    <div className={cs('flex flex-wrap gap-1.5', props.className)}>
      {props.utils.map((u, i) => {
        const color = u > 85 ? 'var(--color-amber)' : u > 55 ? 'var(--color-cyan)' : u > 5 ? 'var(--color-green)' : 'var(--color-ghost)'
        return (
          <div
            key={i}
            title={`GPU ${i} — ${Math.round(u)}% util`}
            className="flex items-center justify-center rounded-[6px] border font-mono text-[9.5px]"
            style={{ width: s, height: s, borderColor: hexA(color, 0.45), color, background: hexA(color, 0.09) }}
          >
            {Math.round(u)}
          </div>
        )
      })}
    </div>
  )
}

export function NetStat(props: { rx: number; tx: number; className?: string }) {
  return (
    <div className={cs('flex items-center gap-4 font-mono text-[10.5px]', props.className)}>
      <span className="flex items-center gap-1.5 text-quill">
        <span className="text-green">↓</span>
        {fmtBytes(props.rx)}/s
      </span>
      <span className="flex items-center gap-1.5 text-quill">
        <span className="text-cyan">↑</span>
        {fmtBytes(props.tx)}/s
      </span>
    </div>
  )
}

export function CellMeter(props: { data: number[]; cell?: number; className?: string }) {
  const s = (props.cell ?? 26) - 10
  return (
    <div className={cs('flex flex-wrap gap-[3px]', props.className)}>
      {props.data.map((v, i) => {
        const c = v > 80 ? 'var(--color-red)' : v > 60 ? 'var(--color-amber)' : v > 30 ? 'var(--color-cyan)' : 'var(--color-green)'
        return <div key={i} title={`core ${i} — ${Math.round(v)}%`} className="rounded-[3px]" style={{ width: s, height: s, background: hexA(c, 0.2 + (v / 100) * 0.68) }} />
      })}
    </div>
  )
}
