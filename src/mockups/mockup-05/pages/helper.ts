import {
  FILESYSTEMS, FS_INFRA, FS_QUOTAS, FS_ALERTS, FS_PERF_SOURCE, USER_QUOTA,
  FROZEN,
} from '../data'
export type { FsSeriesSeed } from '../data'

export {
  FILESYSTEMS, FS_INFRA, FS_QUOTAS, FS_ALERTS, FS_PERF_SOURCE, USER_QUOTA,
  FROZEN,
}

// Like helios-lib walk(), but for unbounded metrics (throughput/IOPS): clamps
// to a sane band around the base instead of the 2–100 percent clamp.
export function fsWalk(seed: number, n: number, base: number, amp: number): number[] {
  let x = seed >>> 0
  const next = () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    return x / 4294967296
  }
  let v = base
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    v += (next() - 0.5) * amp
    v = Math.min(base * 1.5, Math.max(base * 0.5, v))
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

// Filesystem chart X labels. Same cadence as seriesXLabels but scales the
// step for multi-day ranges (1h→5m, 6h→30m, 24h→hourly, 7d→6-hourly).
export function fsXLabels(n: number): string[] {
  const span: Record<number, number> = { 60: 5, 72: 30, 96: 60, 168: 360 }
  const stepMin = span[n] ?? 60
  const end = new Date(FROZEN)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = new Date(end.getTime() - (n - 1 - i) * stepMin * 60000)
    const hh = String(t.getUTCHours()).padStart(2, '0')
    const mm = String(t.getUTCMinutes()).padStart(2, '0')
    out.push(stepMin >= 60 ? `${hh}:00` : `${hh}:${mm}`)
  }
  return out
}
