// mockup-03 · AETHER HPC — TITAN-02 cluster mock dataset.
// Deterministic generation: every node is derived from a hashed seed so the
// matrix, scheduler, environmental view and terminal all agree on the same data.

export type T3Role = 'admin' | 'user'

export type SlurmState = 'IDLE' | 'ALLOCATED' | 'MIXED' | 'DRAINING' | 'DOWN' | 'UNAVAIL'
export type NodeKind = 'compute' | 'gpu' | 'himem' | 'login' | 'service'
export type Health = 'healthy' | 'warning' | 'critical' | 'offline'

export type T3Node = {
  id: number
  name: string
  kind: NodeKind
  partition: string
  state: SlurmState
  cores: number
  coresUsed: number
  memGB: number
  memUsedGB: number
  gpus: number
  gpusUsed: number
  cpuPct: number
  memPct: number
  gpuPct: number
  rack: string
  tempC: number
  powerW: number
  uptimeDays: number
  kernel: string
  os: string
  jobs: number[]
  health: Health
  cpuModel: string
  memModel: string
  gpuModel: string
}

export type T3Job = {
  id: number
  user: string
  partition: string
  nodes: number
  cores: number
  memMB: number
  walltime: number
  walltimeUsed: number
  timelimit: number
  state: 'RUNNING' | 'PENDING' | 'SUSPENDED'
  estStart: string | null
  progress: number
  name: string
  submit: string
  account: string
  qos: string
  nodelist: string
}

function fnv1a(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const CLUSTER = {
  name: 'TITAN-02',
  tag: 'ACTIVE',
  totalNodes: 8192,
  cpuLoad: 89.2,
  memPct: 74.5,
  memPB: 2.51,
  activeJobs: 2492,
  avgTemp: 32.4,
  powerMW: 1.42,
  pue: 1.14,
}

export const CLUSTERS = [
  { name: 'TITAN-02', tag: 'ACTIVE', tone: 'ok' },
  { name: 'HELIOS-01', tag: 'DEGRADED', tone: 'warn' },
  { name: 'AURORA-03', tag: 'MAINTENANCE', tone: 'dim' },
]

const KERNELS = ['5.14.0-503.el9.x86_64', '6.4.0-150.el9.x86_64', '5.15.0-107-generic']

type PartDef = {
  code: string
  label: string
  kind: NodeKind
  count: number
  cores: number
  memGB: number
  gpus: number
  tag: string
}

export const PARTITIONS: PartDef[] = [
  { code: 'YWCN022', label: 'standard', kind: 'compute', count: 4096, cores: 64, memGB: 256, gpus: 0, tag: 'titan-std' },
  { code: 'QXRA114', label: 'compute', kind: 'compute', count: 2464, cores: 128, memGB: 512, gpus: 0, tag: 'titan-com' },
  { code: 'GPUA100', label: 'gpu-a100', kind: 'gpu', count: 1024, cores: 64, memGB: 512, gpus: 8, tag: 'titan-gpu' },
  { code: 'HMGX512', label: 'high-memory', kind: 'himem', count: 512, cores: 128, memGB: 2048, gpus: 0, tag: 'titan-him' },
  { code: 'LGX0416', label: 'login', kind: 'login', count: 16, cores: 32, memGB: 128, gpus: 0, tag: 'titan-lgx' },
  { code: 'SVX0080', label: 'service', kind: 'service', count: 80, cores: 32, memGB: 256, gpus: 0, tag: 'titan-svx' },
]

function nodeState(r: number, kind: NodeKind): SlurmState {
  if (kind === 'login' || kind === 'service') {
    if (r < 0.62) return 'IDLE'
    if (r < 0.93) return 'ALLOCATED'
    if (r < 0.98) return 'MIXED'
    return 'DRAINING'
  }
  if (r < 0.335) return 'IDLE'
  if (r < 0.78) return 'ALLOCATED'
  if (r < 0.9) return 'MIXED'
  if (r < 0.955) return 'DRAINING'
  if (r < 0.985) return 'DOWN'
  return 'UNAVAIL'
}

function buildNodes(): T3Node[] {
  const out: T3Node[] = []
  let id = 0
  let jid = 86_400_1
  for (const p of PARTITIONS) {
    for (let i = 0; i < p.count; i++) {
      const name = `${p.tag}-${String(i + 1).padStart(p.count > 999 ? 4 : 2, '0')}`
      const rng = mulberry32(fnv1a(name))
      const st = nodeState(rng(), p.kind)
      let cpuPct = 0
      let memPct = 0
      let gpusUsed = 0
      if (st === 'ALLOCATED') {
        cpuPct = 76 + rng() * 23
        memPct = 55 + rng() * 40
        gpusUsed = p.gpus
      } else if (st === 'MIXED') {
        cpuPct = 34 + rng() * 40
        memPct = 30 + rng() * 45
        gpusUsed = Math.round(p.gpus * rng())
      } else if (st === 'DRAINING') {
        cpuPct = 8 + rng() * 30
        memPct = 15 + rng() * 30
      } else if (st === 'IDLE') {
        cpuPct = 1 + rng() * 9
        memPct = 4 + rng() * 14
      }
      const tempC =
        24 + cpuPct * 0.14 + rng() * 6 + (p.kind === 'gpu' ? 3 : 0) + (rng() < 0.02 ? 16 + rng() * 14 : 0)
      const jobs: number[] = []
      if (st === 'ALLOCATED' || st === 'MIXED') {
        const n = 1 + Math.floor(rng() * 4)
        for (let j = 0; j < n; j++) jobs.push(jid++)
      }
      const coresUsed = st === 'ALLOCATED' ? p.cores : st === 'MIXED' ? Math.round(p.cores * (cpuPct / 100)) : 0
      let health: Health =
        st === 'DOWN' || st === 'UNAVAIL' ? 'offline' : tempC > 46 ? 'critical' : tempC > 40 ? 'warning' : 'healthy'
      if (st === 'DRAINING' && health === 'healthy') health = 'warning'
      out.push({
        id,
        name,
        kind: p.kind,
        partition: p.code,
        state: st,
        cores: p.cores,
        coresUsed,
        memGB: p.memGB,
        memUsedGB: Math.round((p.memGB * memPct) / 100),
        gpus: p.gpus,
        gpusUsed,
        cpuPct: Math.round(cpuPct * 10) / 10,
        memPct: Math.round(memPct * 10) / 10,
        gpuPct: p.gpus ? Math.round((st === 'ALLOCATED' ? 60 + rng() * 39 : gpusUsed ? 25 + rng() * 50 : 0) * 10) / 10 : 0,
        rack: `R${String(1 + (id % 56)).padStart(2, '0')}`,
        tempC: Math.round(tempC * 10) / 10,
        powerW: st === 'DOWN' || st === 'UNAVAIL' ? 0 : Math.round(160 + cpuPct * 6.2 + p.gpus * 41 + rng() * 60),
        uptimeDays: st === 'DOWN' || st === 'UNAVAIL' ? 0 : 3 + Math.floor(rng() * 190),
        kernel: KERNELS[Math.floor(rng() * KERNELS.length)],
        os: 'Rocky Linux 9.4',
        jobs,
        health,
        cpuModel: p.cores > 64 ? 'AMD EPYC 9754 128-Core' : 'AMD EPYC 9554P 64-Core',
        memModel: p.memGB >= 2048 ? '32× 64GB DDR5-4800 ECC' : p.memGB >= 512 ? '16× 32GB DDR5-4800 ECC' : '8× 32GB DDR5-4800 ECC',
        gpuModel: p.gpus ? 'NVIDIA A100-SXM4-80GB' : '—',
      })
      id++
    }
  }
  return out
}

export const NODES: T3Node[] = buildNodes()
export const NODE_MAP = new Map(NODES.map((n) => [n.name, n]))

export function tempClass(tempC: number, health: Health): 'normal' | 'elevated' | 'high' | 'critical' | 'offline' {
  if (health === 'offline') return 'offline'
  if (tempC > 46) return 'critical'
  if (tempC > 40) return 'high'
  if (tempC > 34) return 'elevated'
  return 'normal'
}

export const CORES_TOTAL = NODES.reduce((s, n) => s + n.cores, 0)
export const CORES_USED = NODES.reduce((s, n) => s + n.coresUsed, 0)
export function stateCounts(): Record<SlurmState, number> {
  const c = { IDLE: 0, ALLOCATED: 0, MIXED: 0, DRAINING: 0, DOWN: 0, UNAVAIL: 0 }
  for (const n of NODES) c[n.state]++
  return c
}
export const STATE_COUNTS = stateCounts()

export const RACKS = Array.from({ length: 56 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`)
export function nodesInRack(rack: string): T3Node[] {
  return NODES.filter((n) => n.rack === rack)
}

const USERS = ['memors', 'premors', 'k.dane', 't.oyelaran', 's.branko', 'm.qureshi', 'h.lindqvist', 'b.okada', 'a.bhatti']
const JOB_NAMES = ['lennard_jones_md', 'genomics_align', 'cfd_sweep', 'cnn_training', 'fermi_scan', 'mesh_refine', 'dft_relax', 'weather_wrf', 'image_recon', 'spice_sim', 'monte_carlo', 'graph_embed']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

function buildJobs(): T3Job[] {
  const jobs: T3Job[] = []
  const base = 89_410
  for (let i = 0; i < 64; i++) {
    const rng = mulberry32(fnv1a(`t3job${i}`))
    const p = PARTITIONS[Math.floor(rng() * 4)]
    const running = rng() < 0.62
    const nodes = 1 + Math.floor(rng() * 22)
    const wall = [15, 25, 30, 45, 60, 120, 240][Math.floor(rng() * 7)]
    const used = running ? Math.round(wall * (0.15 + rng() * 0.8)) : 0
    jobs.push({
      id: base + i,
      user: USERS[Math.floor(rng() * USERS.length)],
      partition: p.code,
      nodes,
      cores: nodes * Math.max(8, Math.round(p.cores * (0.25 + rng() * 0.75))),
      memMB: [100, 128, 200, 256, 300, 500, 705, 1024, 2048][Math.floor(rng() * 9)],
      walltime: wall,
      walltimeUsed: used,
      timelimit: 33 + Math.floor(rng() * 60),
      state: running ? 'RUNNING' : rng() < 0.9 ? 'PENDING' : 'SUSPENDED',
      estStart: running ? null : `in ~${wall}m @ 13:${pad2(30 + (i % 40))}:${Math.floor(rng() * 6)}0`,
      progress: running ? Math.round((used * 100) / wall) : 0,
      name: JOB_NAMES[Math.floor(rng() * JOB_NAMES.length)],
      submit: `2026-11-17 0${1 + Math.floor(rng() * 8)}:${pad2(Math.floor(rng() * 59))}`,
      account: `acc-${String.fromCharCode(97 + Math.floor(rng() * 6))}${Math.floor(rng() * 90 + 10)}`,
      qos: rng() < 0.3 ? 'normal' : rng() < 0.7 ? 'premium' : 'largejob',
      nodelist: running ? `titan-com-${pad3(1 + Math.floor(rng() * 900))}[${Math.floor(rng() * 8)}-${Math.floor(rng() * 8 + 9)}]` : '(pending)',
    })
  }
  return jobs
}

export const JOBS: T3Job[] = buildJobs()
export const SCHED = { active: 1842, pending: 642, blocked: 8, fairshare: 0.85 }

export type GanttSeg = { start: number; len: number; kind: 'running' | 'pending' | 'reserved' }
export const GANTT: GanttSeg[][] = [
  [{ start: 0, len: 14, kind: 'running' }, { start: 18, len: 9, kind: 'running' }, { start: 31, len: 26, kind: 'pending' }, { start: 60, len: 12, kind: 'reserved' }],
  [{ start: 4, len: 22, kind: 'running' }, { start: 30, len: 14, kind: 'pending' }, { start: 52, len: 20, kind: 'reserved' }],
  [{ start: 0, len: 8, kind: 'running' }, { start: 10, len: 6, kind: 'running' }, { start: 24, len: 18, kind: 'running' }, { start: 44, len: 15, kind: 'pending' }, { start: 62, len: 10, kind: 'reserved' }],
  [{ start: 6, len: 26, kind: 'running' }, { start: 36, len: 10, kind: 'pending' }, { start: 50, len: 22, kind: 'reserved' }],
]

export type SlogLine = { tag: 'INFO' | 'WARN' | 'ERROR'; msg: string; t: string }
function clockOff(minutes: number): string {
  const d = new Date(2026, 10, 17, 14, 12, 0)
  d.setMinutes(d.getMinutes() - minutes)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}
export const SCHED_LOGS: SlogLine[] = []
{
  const rng = mulberry32(7371)
  let min = 3
  for (let i = 0; i < 26; i++) {
    min += 1 + Math.floor(rng() * 3)
    const r = rng()
    if (r < 0.62) {
      const msgs = [
        `Slurm scheduler allocated ${64 + Math.floor(rng() * 320)} nodes`,
        `Backfill scheduler: started job #${89_400 + Math.floor(rng() * 200)}`,
        `sched: allocate ${2 + Math.floor(rng() * 40)} nodes for job ${89_400 + Math.floor(rng() * 200)}`,
        `preemption completed for partition QXRA114`,
      ]
      SCHED_LOGS.push({ tag: 'INFO', msg: msgs[Math.floor(rng() * msgs.length)], t: clockOff(min) })
    } else if (r < 0.88) {
      const msgs = [
        `Backfill scheduler: delayed job #${89_400 + Math.floor(rng() * 200)}`,
        `job ${89_400 + Math.floor(rng() * 200)} exceeded memory limit — requeue`,
        `partition YWCN022 overloaded: ${180 + Math.floor(rng() * 400)} pending`,
      ]
      SCHED_LOGS.push({ tag: 'WARN', msg: msgs[Math.floor(rng() * msgs.length)], t: clockOff(min) })
    } else {
      const msgs = [
        `Job 894818: out of memory`,
        `node titan-gpu-0213 failed health check — drained`,
        `slurmctld timeout waiting for node response (titan-std-1128)`,
      ]
      SCHED_LOGS.push({ tag: 'ERROR', msg: msgs[Math.floor(rng() * msgs.length)], t: clockOff(min) })
    }
  }
}

export type T3Alert = { sev: 'INFO' | 'WARN' | 'ALERT' | 'CRIT'; at: string; src: string; msg: string; ack: boolean }
export const ALERTS: T3Alert[] = [
  { sev: 'CRIT', at: '14:09:41', src: 'thermal/R04', msg: 'Rack 04 temperature critical (47.8°C) — inlet exceeds limit', ack: false },
  { sev: 'ALERT', at: '14:02:11', src: 'slurmctld', msg: 'Node titan-gpu-0213 failed health check — drained', ack: false },
  { sev: 'WARN', at: '13:58:02', src: 'cooling/CDU-2', msg: 'Room 6 Exhaust temp exceeded limit (38.2°C)', ack: false },
  { sev: 'WARN', at: '13:57:44', src: 'cooling/CDU-2', msg: 'Room 6 Exhaust temp exceeded limit (37.9°C)', ack: true },
  { sev: 'WARN', at: '13:41:20', src: 'fs/lustre-ost06', msg: 'OST0006 usage crossed 88% watermark', ack: false },
  { sev: 'INFO', at: '13:30:57', src: 'cooler', msg: 'Fan-04 speed increased to 98%', ack: true },
  { sev: 'INFO', at: '13:22:03', src: 'cooler', msg: 'Fan-11 speed increased to 90%', ack: true },
  { sev: 'WARN', at: '12:59:19', src: 'power/PDU-B', msg: 'Phase B load 91% of breaker rating', ack: false },
  { sev: 'ALERT', at: '12:41:55', src: 'slurmctld', msg: 'Job 894817: out of memory (oom-kill at titan-him-0031)', ack: true },
  { sev: 'INFO', at: '12:18:40', src: 'scheduler', msg: 'Backfill scheduler: delayed job #89422', ack: true },
  { sev: 'WARN', at: '11:47:12', src: 'thermal/R17', msg: 'Rack 17 elevated temp trend over last 30 min', ack: true },
  { sev: 'INFO', at: '11:02:29', src: 'auth/ldap', msg: 'Certificate rotation completed for LDAP replicas', ack: true },
  { sev: 'ALERT', at: '10:31:08', src: 'net/mgmt-sw3', msg: 'Mgmt switch sw3 link flap on port 41 (titan-std-2210)', ack: true },
  { sev: 'INFO', at: '09:47:51', src: 'backup', msg: 'Nightly slurm accounting export finished (14.2 GB)', ack: true },
]

export const SYS_HEALTH = [
  { k: 'SLURMCTL DAEMON', v: 'OPERATIONAL', ok: true },
  { k: 'SLURMD AGENTS', v: '8,192/8,192', ok: true },
  { k: 'LUSTRE FS-MDT0000', v: 'ACTIVE', ok: true },
  { k: 'LUSTRE FS-OST0007', v: 'ACTIVE', ok: true },
  { k: 'MAUI SCHEDULER', v: 'ACTIVE', ok: true },
  { k: 'AUTH LDAP', v: 'OPERATIONAL', ok: true },
]

// 96-point history series (24 h).
function series(seed: string, base: number, amp: number): number[] {
  const rng = mulberry32(fnv1a(seed))
  let v = base
  const out: number[] = []
  for (let i = 0; i < 96; i++) {
    v += (rng() - 0.5) * amp
    v = Math.max(0.04, Math.min(0.99, v))
    out.push(v)
  }
  return out
}
export const SPARKS = {
  cpu: series('t3cpu', 0.72, 0.22),
  mem: series('t3mem', 0.74, 0.1),
  gpu: series('t3gpu', 0.83, 0.26),
}
export const POWER_HIST = {
  grid: series('t3grid', 0.55, 0.3),
  cooling: series('t3cool', 0.28, 0.16),
}

export type T3User = { user: string; uid: number; group: string; account: string; role: 'admin' | 'operator' | 'user'; jobs: number; lastSeen: string }
export const ADMIN_USERS: T3User[] = Array.from({ length: 12 }, (_, i) => {
  const rng = mulberry32(fnv1a(`t3u${i}`))
  return {
    user: USERS[i % USERS.length] + (i >= USERS.length ? String(i) : ''),
    uid: 60_100 + i * 7,
    group: ['hpc-core', 'gpu-lab', 'chem-dept', 'weather-team', 'vis-lab'][i % 5],
    account: `acc-${String.fromCharCode(97 + (i % 6))}${20 + i}`,
    role: i < 2 ? 'operator' : 'user',
    jobs: Math.floor(rng() * 40),
    lastSeen: `${String(8 + Math.floor(rng() * 6)).padStart(2, '0')}:${String(Math.floor(rng() * 59)).padStart(2, '0')}`,
  }
})

export const DEMO_USERS = {
  admin: { name: 'A. BHATTI', login: 'a.bhatti', title: 'ADMIN' },
  user: { name: 'K. DANE', login: 'k.dane', title: 'USER' },
}

export function permitsSSH(nodeName: string, role: T3Role): boolean {
  if (role === 'admin') return true
  const n = NODE_MAP.get(nodeName)
  return !!n && (n.kind === 'login' || n.kind === 'compute')
}

export const fmt = {
  int: (n: number): string => n.toLocaleString('en-US'),
  pct: (n: number, d = 1): string => `${n.toFixed(d)}%`,
  temp: (n: number): string => `${n.toFixed(1)}°C`,
}
