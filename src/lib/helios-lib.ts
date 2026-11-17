// Shared Helios clock + formatting + chart helpers.
// The simulation runs against a frozen timestamp so mock data always renders
// with identical relative times ("12m ago", "47d 3h", …).

export const FROZEN_NOW_MS = Date.parse('2026-11-17T12:34:00Z')

let nowMs = FROZEN_NOW_MS
export function tickNow(): number {
  return nowMs
}

export function cs(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export const SERIES_COLORS = [
  'var(--color-cyan)',
  'var(--color-green)',
  'var(--color-accent-bright)',
  'var(--color-amber)',
]

// ---------------------------------------------------------------- numbers --

export function fmtAgo(ms: number): string {
  const delta = Math.max(0, tickNow() - ms)
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function fmtBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(units.length - 1, Math.floor(Math.log2(bytes) / 10))
  const v = bytes / 1024 ** i
  return `${v.toFixed(decimals === 0 || Math.abs(v) >= 100 ? 0 : decimals)} ${units[i]}`
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const s = total % 60
  const mins = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600) % 24
  const d = Math.floor(total / 86400)
  if (d > 0) return `${d}d ${h}h${mins ? ` ${mins}m` : ''}`
  if (h > 0) return `${h}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${mins}:${String(s).padStart(2, '0')}`
}

export function fmtUptime(ms: number): string {
  const hours = Math.floor(ms / 3600e3) % 24
  const days = Math.floor(ms / 86400e3)
  return `${days}d ${hours}h`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(ms: number, withTime = false): string {
  const d = new Date(ms)
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
  if (!withTime) return date
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${date}, ${hh}:${mm}`
}

// Deterministic pseudo-random walk so every render is identical.
export function walk(seed: number, n: number, start: number, amp: number): number[] {
  let x = seed >>> 0
  const next = () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    return x / 4294967296
  }
  let v = start
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    v += (next() - 0.5) * amp
    v = Math.min(100, Math.max(2, v))
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

export type Pt = { x: number; y: number }

export function linePath(points: Pt[]): string {
  if (!points.length) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export function areaPath(points: Pt[], baseline: number): string {
  if (points.length < 2) return ''
  const line = linePath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${line} L${last.x.toFixed(2)},${baseline} L${first.x.toFixed(2)},${baseline} Z`
}
