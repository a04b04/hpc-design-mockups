// Enucc HPC cluster — mock data for mockup-05 (AWS-style console).
// Deterministic generators keyed to a frozen clock; values are invented but realistic.
import { walk, linePath, areaPath } from '../../lib/helios-lib'
import type { Pt } from '../../lib/helios-lib'

export const FROZEN = Date.parse('2026-11-17T10:34:12Z')
export const HOUR = 3600e3
export const DAY = 24 * HOUR

export type Role = 'admin' | 'user'
export type NodeType = 'compute' | 'login' | 'gpu' | 'himem'
export type SlurmState = 'IDLE' | 'ALLOCATED' | 'DRAINING' | 'DOWN'
export type JobState = 'RUNNING' | 'PENDING' | 'COMPLETED' | 'FAILED'

export interface EnNode {
  name: string
  type: NodeType
  state: SlurmState
  partition: string
  cores: number
  memStr: string
  gpuStr: string
  gpuCount: number
  jobs: number
  uptimeStr: string
  os: string
  kernel: string
  arch: string
  cpuModel: string
  memGB: number
  cpuUtil: number
  memUtil: number
  load1: number
  realMemGB: number
  health: 'Healthy' | 'Degraded' | 'Unreachable'
  ip: string
  rack: string
  localDisk: string
  net: string
}

export interface EnJob {
  id: number
  name: string
  user: string
  partition: string
  state: JobState
  elapsedStr: string
  resources: string
  submitStr: string
  nodes: number
  account: string
  qos: string
  priority: number
}

// ---------------------------------------------------------------- jobs --
const JOB_NAMES = [
  'cnn_training', 'md_simulation', 'data_process', 'viz_render', 'mesh_analysis',
  'genomics_align', 'cfd_sweep', 'monte_carlo', 'fem_struct', 'climate_run',
  'protein_fold', 'image_recon', 'lattice_qcd', 'wave_props', 'thermal_sim',
]
const JOB_USERS = ['s.chen', 'j.davies', 'a.khan', 'm.ross', 'l.patel', 'r.oconnell', 't.nakamura', 'e.silva', 'k.dubois', 'p.okafor']
const ACCOUNTS = ['physics', 'chemistry', 'eng-vis', 'bio-informatics', 'math-modelling', 'eng-cfd']

export const PARTITIONS = [
  { name: 'login', avail: 'up', timelimit: 'infinite', nodes: 2, coresPerNode: 8, memPerNodeGB: 32, gpus: 0 },
  { name: 'compute', avail: 'up', timelimit: 'infinite', nodes: 101, coresPerNode: 64, memPerNodeGB: 256, gpus: 0 },
  { name: 'gpu', avail: 'up', timelimit: '7-00:00:00', nodes: 13, coresPerNode: 32, memPerNodeGB: 512, gpus: 52 },
  { name: 'himem', avail: 'up', timelimit: '5-00:00:00', nodes: 12, coresPerNode: 128, memPerNodeGB: 1024, gpus: 0 },
]


export const NODES: EnNode[] = buildNodes()
export const JOBS: EnJob[] = buildJobs()
export const CLUSTER_SERIES = buildClusterSeries()

// ---------------------------------------------------------------- nodes --

function mkNode(
  name: string,
  type: NodeType,
  state: SlurmState,
  partition: string,
  cores: number,
  memStr: string,
  gpuStr: string,
  gpuCount: number,
  jobs: number,
  uptimeStr: string,
  seed: number,
  os = 'Rocky Linux 9.4',
  kernel = '5.14.0-427.43.1.el9.x86_64',
): EnNode {
  const cpuUtil = state === 'DOWN' ? 0 : state === 'IDLE' ? Math.round(2 + (seed % 9)) : state === 'DRAINING' ? 14 : Math.round(48 + (seed * 7) % 44)
  const memUtil = state === 'DOWN' ? 0 : state === 'IDLE' ? Math.round(8 + (seed % 11)) : state === 'DRAINING' ? 22 : Math.round(45 + (seed * 5) % 48)
  return {
    name,
    type,
    state,
    partition,
    cores,
    memStr,
    gpuStr,
    gpuCount,
    jobs,
    uptimeStr,
    os,
    kernel,
    arch: 'x86_64',
    cpuModel: type === 'himem' ? 'Intel Xeon Platinum 8592+' : type === 'gpu' ? 'AMD EPYC 9354' : 'AMD EPYC 9654',
    memGB: memStr === '1 TB' ? 1024 : memStr === '512 GB' ? 512 : memStr === '256 GB' ? 256 : 32,
    cpuUtil,
    memUtil,
    load1: state === 'ALLOCATED' ? Math.round(cores * (0.55 + (seed % 30) / 100) * 10) / 10 : state === 'IDLE' ? Math.round(10 + (seed % 20)) / 10 : 0,
    realMemGB: Math.round((memGBOf(memStr) * memUtil) / 100),
    health: state === 'DOWN' ? 'Unreachable' : state === 'DRAINING' ? 'Degraded' : 'Healthy',
    ip: `10.14.${type === 'gpu' ? 30 : type === 'himem' ? 41 : type === 'login' ? 4 : 17}.${20 + (seed % 200)}`,
    rack: `${type === 'gpu' ? 'R-GPU' : type === 'himem' ? 'R-HM' : type === 'login' ? 'R-LGN' : 'R-CPU'}-${String(1 + (seed % 8)).padStart(2, '0')}`,
    localDisk: type === 'login' ? '2 × 960 GB NVMe' : '2 × 3.84 TB NVMe',
    net: type === 'login' ? '2 × 25 GbE' : 'NDR200 InfiniBand + 25 GbE',
  }
}

function memGBOf(s: string): number {
  return s === '1 TB' ? 1024 : s === '512 GB' ? 512 : s === '256 GB' ? 256 : 32
}

function buildNodes(): EnNode[] {
  const out: EnNode[] = [
    mkNode('enucc-login-01', 'login', 'IDLE', 'login', 8, '32 GB', '—', 0, 0, '46 days, 12 hours', 71),
    mkNode('enucc-login-02', 'login', 'IDLE', 'login', 8, '32 GB', '—', 0, 0, '46 days, 12 hours', 72),
  ]
  // cpu-001..005 pinned from the reference spec; fill to 128 nodes total.
  const cpuStates: Array<[string, string, number]> = [
    ['ALLOCATED', '14 days, 6 hours', 4],
    ['ALLOCATED', '14 days, 6 hours', 3],
    ['IDLE', '21 days, 3 hours', 0],
    ['DRAINING', '2 hours, 17 minutes', 0],
    ['IDLE', '21 days, 3 hours', 0],
  ]
  cpuStates.forEach(([state, up, jobs], i) => out.push(mkNode(`enucc-cpu-${String(i + 1).padStart(3, '0')}`, 'compute', state as SlurmState, 'compute', 64, '256 GB', '—', 0, jobs, up, 40 + i * 3)))

  const gpuStates: Array<[string, string, number]> = [
    ['ALLOCATED', '14 days, 6 hours', 2],
    ['IDLE', '21 days, 3 hours', 0],
    ['DOWN', '8 hours, 44 minutes', 0],
  ]
  gpuStates.forEach(([state, up, jobs], i) => out.push(mkNode(`enucc-gpu-${String(i + 1).padStart(3, '0')}`, 'gpu', state as SlurmState, 'gpu', 32, '512 GB', '4 × A100 (80 GB)', 4, jobs, up, 10 + i * 5)))
  // Remaining GPU fill: gpu-004..016.
  for (let i = 4; i <= 13; i++) out.push(mkNode(`enucc-gpu-${String(i).padStart(3, '0')}`, 'gpu', 'IDLE', 'gpu', 32, '512 GB', '4 × A100 (80 GB)', 4, 0, '21 days, 3 hours', 60 + i))

  // himem pinned two, then fill the himem pool to 12.
  out.push(mkNode('enucc-himem-01', 'himem', 'ALLOCATED', 'himem', 128, '1 TB', '—', 0, 6, '10 days, 5 hours', 21))
  out.push(mkNode('enucc-himem-02', 'himem', 'IDLE', 'himem', 128, '1 TB', '—', 0, 0, '10 days, 5 hours', 22))
  for (let i = 3; i <= 12; i++) out.push(mkNode(`enucc-himem-${String(i).padStart(2, '0')}`, 'himem', 'IDLE', 'himem', 128, '1 TB', '—', 0, 0, '10 days, 5 hours', 30 + i))

  // Compute fill: cpu-001..005 above already 5; fill the remaining compute pool 011..107.
  // Reference tallies: 87 IDLE / 28 ALLOCATED / 8 DRAINING / 5 DOWN across all 128 nodes.
  const tally = { IDLE: 87, ALLOCATED: 28, DRAINING: 8, DOWN: 5 }
  for (const n of out) tally[n.state]--
  const queue: Record<SlurmState, number> = { IDLE: tally.IDLE, ALLOCATED: tally.ALLOCATED, DRAINING: tally.DRAINING, DOWN: tally.DOWN }
  for (let i = 11; i <= 106; i++) {
    const state: SlurmState = queue.DRAINING > 0 ? 'DRAINING' : queue.IDLE > 0 ? 'IDLE' : queue.DOWN > 0 ? 'DOWN' : 'ALLOCATED'
    queue[state]--
    const jobs = state === 'ALLOCATED' ? 2 + (i % 5) : 0
    out.push(mkNode(`enucc-cpu-${String(i).padStart(3, '0')}`, 'compute', state, 'compute', 64, '256 GB', '—', 0, jobs, '17 days, 9 hours', 100 + i))
  }
  return out
}

export const NODE_BY_NAME: Record<string, EnNode> = Object.fromEntries(NODES.map((n) => [n.name, n]))

function buildJobs(): EnJob[] {
  const pinned: EnJob[] = [
    { id: 489347, name: 'cnn_training', user: 's.chen', partition: 'gpu', state: 'RUNNING', elapsedStr: '6h 12m', resources: '16 CPU, 64 GB, 1 GPU', submitStr: 'Today, 10:27:14', nodes: 1, account: 'eng-vis', qos: 'normal', priority: 8123 },
    { id: 489322, name: 'md_simulation', user: 'j.davies', partition: 'compute', state: 'RUNNING', elapsedStr: '4h 17m', resources: '32 CPU, 128 GB', submitStr: 'Today, 10:25:02', nodes: 1, account: 'chemistry', qos: 'normal', priority: 5321 },
    { id: 489301, name: 'data_process', user: 'a.khan', partition: 'compute', state: 'RUNNING', elapsedStr: '1h 03m', resources: '8 CPU, 32 GB', submitStr: 'Today, 10:18:37', nodes: 1, account: 'bio-informatics', qos: 'normal', priority: 4110 },
    { id: 489276, name: 'viz_render', user: 'm.ross', partition: 'gpu', state: 'RUNNING', elapsedStr: '57m', resources: '8 CPU, 32 GB, 1 GPU', submitStr: 'Today, 10:04:11', nodes: 1, account: 'eng-vis', qos: 'normal', priority: 3022 },
    { id: 489254, name: 'mesh_analysis', user: 'l.patel', partition: 'himem', state: 'PENDING', elapsedStr: '—', resources: '128 GB', submitStr: 'Today, 09:58:09', nodes: 1, account: 'eng-cfd', qos: 'normal', priority: 9001 },
  ]
  const out = [...pinned]
  let id = 489253
  const push = (state: JobState, count: number, part: string): void => {
    for (let i = 0; i < count; i++) {
      id--
      const seed = id >>> 0
      const nameI = (Math.abs(id) + seed % JOB_NAMES.length) % JOB_NAMES.length
      const userI = (Math.abs(id) * 7 + 3) % JOB_USERS.length
      const elH = state === 'PENDING' ? 0 : 1 + (Math.abs(id) % 70)
      const elM = seed % 60
      const el = elH >= 24 ? `${Math.floor(elH / 24)}d ${elH % 24}h ${elM}m` : elH > 0 ? `${elH}h ${elM}m` : `${elM}m`
      const submit = state === 'PENDING' ? `Today, ${String(9 + (i % 2)).padStart(2, '0')}:${String(seed % 60).padStart(2, '0')}:${String(seed % 60).padStart(2, '0')}` : `Nov ${String(14 + (i % 4)).padStart(2, '0')}, ${String(8 + (i % 14)).padStart(2, '0')}:${String(seed % 60).padStart(2, '0')}`
      out.push({
        id,
        name: JOB_NAMES[nameI],
        user: JOB_USERS[userI],
        partition: PARTITIONS.some((p) => p.name === part) ? part : 'compute',
        state,
        elapsedStr: state === 'PENDING' ? '—' : el,
        resources:
          part === 'gpu'
            ? `${8 + (seed % 3) * 8} CPU, 128 GB, ${1 + (seed % 3)} GPU`
            : part === 'himem'
              ? '32 CPU, 512 GB'
              : `${16 + (seed % 4) * 16} CPU, ${32 + (seed % 4) * 32} GB`,
        submitStr: submit,
        nodes: 1 + (seed % 4),
        account: ACCOUNTS[(Math.abs(id) * 5 + 1) % ACCOUNTS.length],
        qos: ['normal', 'normal', 'normal', 'high', 'low'][(seed + i) % 5],
        priority: 1000 + (Math.abs(id) % 9000),
      })
    }
  }
  // Counts pinned from the dashboard reference: 1,684 running / 312 pending / 412 completed / 10 failed (2,418 total).
  push('RUNNING', 1675, 'compute')
  push('RUNNING', 3, 'gpu')
  push('RUNNING', 2, 'himem')
  push('PENDING', 310, 'compute')
  push('PENDING', 1, 'gpu')
  push('COMPLETED', 412, 'compute')
  push('FAILED', 10, 'compute')
  return out
}

export const RESERVATIONS = [
  { name: 'chem-survey', partition: 'compute', nodes: 16, start: 'Nov 18 00:00', end: 'Nov 20 23:59', users: 'j.davies, a.khan', state: 'ACTIVE' as const },
  { name: 'gpu-maintenance', partition: 'gpu', nodes: 4, start: 'Nov 22 08:00', end: 'Nov 22 18:00', users: 'root (admins)', state: 'FUTURE' as const },
  { name: 'sc-course', partition: 'himem', nodes: 6, start: 'Nov 19 09:00', end: 'Nov 19 17:00', users: 'students*', state: 'FUTURE' as const },
]

export const FILESYSTEMS = [
  { name: '/home', server: 'fs-home.nucc.local', type: 'NFS', backend: 'NFSv4 · ZFS pool (RAID-Z2)', totalTB: 100, usedTB: 74.2, mounted: true, quota: '1.0 TB per user (hard)', health: 'Healthy' as const },
  { name: '/scratch', server: 'fs-scratch.nucc.local', type: 'Lustre', backend: 'Lustre 2.15 (flock)', totalTB: 2048, usedTB: 1428, mounted: true, quota: '5.0 TB per user · purge 30 d', health: 'Healthy' as const },
  { name: '/shared', server: 'fs-shared.nucc.local', type: 'Lustre', backend: 'Lustre 2.15 (no flock)', totalTB: 512, usedTB: 380, mounted: true, quota: 'Project quotas (RFM)', health: 'Healthy' as const },
  { name: '/archive', server: 'fs-archive.nucc.local', type: 'NFS', backend: 'NFSv4 · ZFS pool + HSM tape tier', totalTB: 5120, usedTB: 3620, mounted: true, quota: '10 TB per group · migrate 90 d', health: 'Degraded' as const },
]

export const USER_QUOTA = {
  user: 'arun.bhatti',
  home: { usedGB: 412, quotaGB: 1024 },
  scratch: { usedGB: 1830, quotaGB: 5120 },
  shared: { usedGB: 96, quotaGB: 512 },
  archive: { usedGB: 204, quotaGB: 10240 },
} as const

export const HEALTH_SERVICES = [
  { name: 'Slurm (controller)', kind: 'controller', status: 'Running' as const, detail: 'slurmctld 23.11.7 · enucc-mgmt-01' },
  { name: 'Partitions', kind: 'scheduler', status: 'Running' as const, detail: '4 partitions scheduled normally' },
  { name: 'Filesystems (Lustre)', kind: 'storage', status: 'Running' as const, detail: '3 of 4 targets healthy · /archive degraded (1 NFS export)' },
  { name: 'Authentication (LDAP)', kind: 'auth', status: 'Running' as const, detail: 'slapd · enucc-mgmt-02' },
  { name: 'Monitoring (Prometheus)', kind: 'monitor', status: 'Running' as const, detail: 'Prometheus 2.53 + Grafana · enucc-mgmt-03' },
] as const

export const SYS_ALERTS = [
  { id: 1, severity: 'warning', title: '/archive NFS export degraded', time: 'Today, 09:41', service: 'Filesystems (NFS)', detail: 'Export fs-archive:0 failed over to nfs-archive-02 after a backend-path outage; I/O retries elevated. No data loss detected.' },
  { id: 2, severity: 'info', title: 'Slurm 23.11.8 patch release available', time: 'Yesterday, 16:02', service: 'Slurm (controller)', detail: 'Advisory RHSA-2026:1042 fixes scheduling edge case with preemption. Recommended during next maintenance window.' },
  { id: 3, severity: 'critical', title: 'enucc-gpu-003 unreachable', time: 'Yesterday, 14:26', service: 'Nodes', detail: 'Node stopped reporting to slurmctld; IPMI console shows POST failure. Drained automatically, hardware ticket HW-4471 opened.' },
  { id: 4, severity: 'info', title: 'Scratch purge completed', time: 'Nov 14, 02:00', service: 'Filesystems (Lustre)', detail: 'Weekly purge reclaimed 14.2 TB on /scratch. Next purge scheduled Nov 21 02:00.' },
] as const

export const ACTIVITY_LOG = [
  { id: 1, ts: 'Today, 10:27:14', kind: 'job', text: 'Job 489347 (cnn_training) submitted by s.chen to gpu' },
  { id: 2, ts: 'Today, 10:25:02', kind: 'job', text: 'Job 489322 (md_simulation) submitted by j.davies to compute' },
  { id: 3, ts: 'Today, 10:18:37', kind: 'job', text: 'Job 489301 (data_process) submitted by a.khan to compute' },
  { id: 4, ts: 'Today, 10:11:02', kind: 'node', text: 'enucc-cpu-004 set DRAINING by admin (pending maintenance)' },
  { id: 5, ts: 'Today, 10:04:11', kind: 'job', text: 'Job 489276 (viz_render) submitted by m.ross to gpu' },
  { id: 6, ts: 'Today, 09:58:09', kind: 'job', text: 'Job 489254 (mesh_analysis) submitted by l.patel to himem' },
  { id: 7, ts: 'Today, 09:41:03', kind: 'alert', text: 'Warning raised on /archive NFS export' },
  { id: 8, ts: 'Today, 09:35:47', kind: 'completed', text: 'Job 489208 (thermal_sim) completed · 4h 02m' },
  { id: 9, ts: 'Today, 09:22:31', kind: 'completed', text: 'Job 489197 (genomics_align) completed · 1d 06h' },
  { id: 10, ts: 'Today, 09:10:02', kind: 'job', text: 'Job 489180 (monte_carlo) submitted by r.oconnell to compute' },
  { id: 11, ts: 'Yesterday, 14:26:55', kind: 'alert', text: 'enucc-gpu-003 marked DOWN (unreachable)' },
  { id: 12, ts: 'Yesterday, 11:02:14', kind: 'admin', text: 'QoS "high" limit raised to 512 jobs by admin (a.thornton)' },
] as const

export const USERS = [
  { uid: 'arun.bhatti', name: 'Arun Bhatti', role: 'Administrator', group: 'staff', account: 'staff', qos: 'high', lastLogin: 'Today, 10:30', status: 'Active' as const },
  { uid: 's.chen', name: 'Shu Chen', role: 'Standard user', group: 'vis-lab', account: 'eng-vis', qos: 'normal', lastLogin: 'Today, 10:26', status: 'Active' as const },
  { uid: 'j.davies', name: 'Joss Davies', role: 'Standard user', group: 'chem', account: 'chemistry', qos: 'normal', lastLogin: 'Today, 10:24', status: 'Active' as const },
  { uid: 'a.khan', name: 'Amara Khan', role: 'Standard user', group: 'bio', account: 'bio-informatics', qos: 'normal', lastLogin: 'Today, 10:17', status: 'Active' as const },
  { uid: 'm.ross', name: 'Mira Ross', role: 'Standard user', group: 'vis-lab', account: 'eng-vis', qos: 'normal', lastLogin: 'Today, 10:03', status: 'Active' as const },
  { uid: 'l.patel', name: 'Leena Patel', role: 'Standard user', group: 'cfd', account: 'eng-cfd', qos: 'normal', lastLogin: 'Today, 09:57', status: 'Active' as const },
  { uid: 'r.oconnell', name: 'Ryan O’Connell', role: 'Standard user', group: 'math', account: 'math-modelling', qos: 'low', lastLogin: 'Nov 15, 17:42', status: 'Suspended' as const },
  { uid: 't.nakamura', name: 'Taro Nakamura', role: 'Standard user', group: 'math', account: 'math-modelling', qos: 'normal', lastLogin: 'Nov 15, 09:18', status: 'Active' as const },
  { uid: 'e.silva', name: 'Eduarda Silva', role: 'Standard user', group: 'chem', account: 'chemistry', qos: 'normal', lastLogin: 'Nov 14, 14:05', status: 'Active' as const },
  { uid: 'k.dubois', name: 'Katia Dubois', role: 'Standard user', group: 'vis-lab', account: 'eng-vis', qos: 'normal', lastLogin: 'Nov 14, 08:52', status: 'Active' as const },
] as const

export const SLURM_ACCOUNTS = [
  { account: 'staff', parent: '—', desc: 'Cluster administrators', users: 2, defaultQos: 'high', maxJobs: 'unlimited' },
  { account: 'eng-vis', parent: 'engineering', desc: 'Visualisation and imaging group', users: 3, defaultQos: 'normal', maxJobs: '64' },
  { account: 'chemistry', parent: 'science', desc: 'Computational chemistry', users: 2, defaultQos: 'normal', maxJobs: '128' },
  { account: 'bio-informatics', parent: 'science', desc: 'Genomics and bioinformatics', users: 1, defaultQos: 'normal', maxJobs: '64' },
  { account: 'eng-cfd', parent: 'engineering', desc: 'CFD and meshing', users: 1, defaultQos: 'normal', maxJobs: '64' },
  { account: 'math-modelling', parent: 'science', desc: 'Mathematical modelling', users: 2, defaultQos: 'normal', maxJobs: '32' },
]

export const QOS_LIST = [
  { name: 'high', priority: 5000, maxWall: '7-00:00:00', maxJobs: 'unlimited', maxCpus: 'unlimited', desc: 'Admin and priority workloads' },
  { name: 'normal', priority: 1000, maxWall: '7-00:00:00', maxJobs: '256', maxCpus: '1024', desc: 'Default partition QoS' },
  { name: 'low', priority: 100, maxWall: '1-00:00:00', maxJobs: '32', maxCpus: '128', desc: 'Best-effort pre-emptible work' },
  { name: 'long', priority: 500, maxWall: '30-00:00:00', maxJobs: '64', maxCpus: '512', desc: 'Long-running campaign runs' },
]

export const DEMO_USER = {
  uid: 'arun.bhatti',
  permittedNodes: ['enucc-login-01', 'enucc-login-02', 'enucc-cpu-003', 'enucc-cpu-005', 'enucc-gpu-002'],
  remoteDesktop: ['enucc-cpu-003'],
} as const

// ---------------------------------------------------------------- series --

function buildClusterSeries(): { cpu: number[]; mem: number[]; gpu: number[] } {
  return { cpu: walk(90210, 24, 64, 9), mem: walk(13337, 24, 70, 6), gpu: walk(77777, 24, 55, 11) }
}

/** 24 hourly buckets, newest last; label like "11:00" for today's, "Yesterday, 23:00" style for chart axis. */
export function seriesXLabels(n = 24): string[] {
  const out: string[] = []
  const end = new Date(FROZEN)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * HOUR)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    out.push(`${hh}:00`)
  }
  return out
}

export function seriesPoints(data: number[], w: number, h: number, pad = 0): Array<Pt& { v: number }> {
  const max = Math.max(100, ...data)
  return data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: pad + (1 - v / max) * (h - pad * 2),
    v,
  }))
}

export { linePath, areaPath }

// Filesystem infrastructure, quotas, alerts and synthetic performance seeds. Single
// source of truth for mockup-05 storage: kept internally consistent and coherent with
// the HUD narrative (/archive degraded via a degraded NFS export).
export type FsHealth = 'Healthy' | 'Degraded' | 'Critical' | 'Offline'

export type FsSeriesSeed = Record<'1h' | '6h' | '24h' | '7d', { seed: number; base: number; amp: number }>

const fsSeed = (seed: number, h00: [number, number], h06: [number, number], h24: [number, number], d07: [number, number]): FsSeriesSeed => ({
  '1h': { seed, base: h00[0], amp: h00[1] },
  '6h': { seed, base: h06[0], amp: h06[1] },
  '24h': { seed, base: h24[0], amp: h24[1] },
  '7d': { seed, base: d07[0], amp: d07[1] },
})

export const FS_PERF_SOURCE: Record<string, Record<'read' | 'write' | 'iops' | 'meta', FsSeriesSeed | null>> = {
  '/home': {
    read: fsSeed(301, [690, 130], [660, 190], [620, 240], [590, 300]),
    write: fsSeed(302, [470, 110], [450, 160], [430, 200], [400, 260]),
    iops: fsSeed(303, [8600, 1400], [8000, 2200], [7500, 3000], [6800, 3600]),
    meta: null,
  },
  '/scratch': {
    read: fsSeed(311, [9200, 1600], [8700, 2400], [8100, 3200], [7600, 4200]),
    write: fsSeed(312, [7800, 1500], [7400, 2200], [6900, 3000], [6300, 3900]),
    iops: fsSeed(313, [42000, 6000], [39000, 9000], [36000, 13000], [32000, 17000]),
    meta: fsSeed(314, [3100, 400], [2900, 700], [2600, 1000], [2300, 1300]),
  },
  '/shared': {
    read: fsSeed(321, [1100, 200], [1050, 320], [990, 420], [920, 520]),
    write: fsSeed(322, [820, 160], [780, 240], [730, 330], [670, 420]),
    iops: fsSeed(323, [9800, 1500], [9200, 2400], [8500, 3200], [7700, 4000]),
    meta: fsSeed(324, [830, 120], [790, 180], [730, 260], [660, 340]),
  },
  '/archive': {
    read: fsSeed(331, [95, 25], [90, 35], [85, 45], [78, 55]),
    write: fsSeed(332, [60, 18], [57, 25], [53, 33], [48, 42]),
    iops: fsSeed(333, [640, 150], [610, 210], [570, 280], [520, 340]),
    meta: null,
  },
}

export interface FsQuotaRow { type: 'User' | 'Group' | 'Project'; principal: string; usedGB: number; softGB: number; hardGB: number; grace?: string }
export const FS_QUOTAS: Record<string, FsQuotaRow[]> = {
  '/home': [
    { type: 'User', principal: 'arun.bhatti', usedGB: 412, softGB: 900, hardGB: 1024 },
    { type: 'Project', principal: 'genomics-core', usedGB: 38700, softGB: 60000, hardGB: 65536 },
    { type: 'Project', principal: 'astro-lrg', usedGB: 14100, softGB: 18000, hardGB: 20480 },
  ],
  '/scratch': [
    { type: 'User', principal: 'arun.bhatti', usedGB: 1830, softGB: 4608, hardGB: 5120 },
    { type: 'Project', principal: 'genomics-core', usedGB: 613700, softGB: 760000, hardGB: 786432 },
    { type: 'Project', principal: 'astro-lrg', usedGB: 431000, softGB: 560000, hardGB: 589824 },
  ],
  '/shared': [
    { type: 'Group', principal: 'bioinformatics', usedGB: 197, softGB: 256, hardGB: 512 },
    { type: 'Project', principal: 'genomics-core', usedGB: 141000, softGB: 200000, hardGB: 225280 },
  ],
  '/archive': [
    { type: 'User', principal: 'arun.bhatti', usedGB: 204, softGB: 8704, hardGB: 10240 },
    { type: 'Project', principal: 'astro-lrg', usedGB: 1726000, softGB: 2400000, hardGB: 2621440 },
  ],
}

export interface FsAlert { severity: 'Informational' | 'Warning' | 'Critical'; title: string; component: string; description: string; timestamp: string; status: 'Active' | 'Acknowledged' | 'Resolved' }

export const FS_ALERTS: Record<string, FsAlert[]> = {
  '/home': [
    { severity: 'Informational', title: 'Weekly scrub completed', component: 'export /home', description: 'Weekly rsync scrub verified 1,204,551 files (2.03% mismatch rate, within tolerance).', timestamp: 'Nov 16 02:00', status: 'Resolved' },
  ],
  '/scratch': [
    { severity: 'Informational', title: 'Scratch purge completed', component: 'Policy Engine', description: 'Purge removed 48.7 TB of files unused \u2265 30 days; freed space immediately available.', timestamp: 'Nov 14 02:00', status: 'Resolved' },
    { severity: 'Informational', title: 'OST 41 rebalanced', component: 'lfs-mgs', description: 'OST 41 usage normalised to 61% after rebalance finished; no user impact.', timestamp: 'Nov 15 09:12', status: 'Resolved' },
  ],
  '/shared': [
    { severity: 'Warning', title: 'Project quota nearing soft limit', component: 'project genomics-core', description: 'genomics-core has used 70% of its 200 TB soft limit; RFM notified \u2014 no service impact.', timestamp: 'Today 08:05', status: 'Acknowledged' },
  ],
  '/archive': [
    { severity: 'Warning', title: 'Export fs-archive:0 degraded after backend-path outage', component: 'Export fs-archive:0 on nfs-archive-01', description: 'NFS backend path on nfs-archive-01 became unresponsive; mount failed over to nfs-archive-02 and I/O retries elevated. Writes to /archive slowed; reads unaffected after recovery. Follow INC-1042.', timestamp: 'Today 09:41', status: 'Active' },
    { severity: 'Informational', title: 'Tape staging lag cleared', component: 'HSM layer', description: 'Tape staging backlog aged 3\u20135 days drained; recall times normal.', timestamp: 'Nov 15 14:30', status: 'Resolved' },
  ],
}

// Per-filesystem infrastructure components: Lustre targets (MGS/MDS/MDT/OSS/OST)
// and NFS servers+exports. Capacities in TB; utilPct in percent; jobs = active I/O jobs.
export interface FsInfraComp {
  id: string
  role: string
  host: string
  index?: string
  capacityTB?: number
  utilPct?: number
  health: 'Healthy' | 'Degraded' | 'Down'
  jobs?: number
}
export const FS_INFRA: Record<string, FsInfraComp[]> = {
  '/home': [
    { id: 'nfs-h0', role: 'NFS server', host: 'nfs-home-01.nucc.local', health: 'Healthy', jobs: 14 },
    { id: 'nfs-h1', role: 'Export', host: 'fs-home.nucc.local', index: '/export/home', capacityTB: 100, utilPct: 74, health: 'Healthy', jobs: 14 },
  ],
  '/scratch': [
    { id: 'lts-0', role: 'MGS', host: 'lfs-mgs.nucc.local', health: 'Healthy', jobs: 0 },
    { id: 'lts-1', role: 'MDS', host: 'lfs-mds-01.nucc.local', health: 'Healthy', jobs: 96 },
    { id: 'lts-2', role: 'MDT', host: 'lfs-mds-01.nucc.local', index: 'MDT0000', capacityTB: 32, utilPct: 41, health: 'Healthy', jobs: 96 },
    { id: 'lts-3', role: 'OSS', host: 'lfs-oss-01.nucc.local', health: 'Healthy', jobs: 610 },
    { id: 'lts-4', role: 'OSS', host: 'lfs-oss-02.nucc.local', health: 'Healthy', jobs: 588 },
    { id: 'lts-5', role: 'OST', host: 'lfs-oss-01.nucc.local', index: 'OST0000', capacityTB: 256, utilPct: 66, health: 'Healthy', jobs: 305 },
    { id: 'lts-6', role: 'OST', host: 'lfs-oss-01.nucc.local', index: 'OST0001', capacityTB: 256, utilPct: 71, health: 'Healthy', jobs: 305 },
    { id: 'lts-7', role: 'OST', host: 'lfs-oss-02.nucc.local', index: 'OST0002', capacityTB: 256, utilPct: 58, health: 'Healthy', jobs: 294 },
    { id: 'lts-8', role: 'OST', host: 'lfs-oss-02.nucc.local', index: 'OST0003', capacityTB: 256, utilPct: 63, health: 'Healthy', jobs: 294 },
  ],
  '/shared': [
    { id: 'lsh-0', role: 'MGS', host: 'lfs-mgs.nucc.local', health: 'Healthy', jobs: 0 },
    { id: 'lsh-1', role: 'MDS', host: 'lfs-mds-02.nucc.local', health: 'Healthy', jobs: 22 },
    { id: 'lsh-2', role: 'MDT', host: 'lfs-mds-02.nucc.local', index: 'MDT0000', capacityTB: 16, utilPct: 37, health: 'Healthy', jobs: 22 },
    { id: 'lsh-3', role: 'OSS', host: 'lfs-oss-03.nucc.local', health: 'Healthy', jobs: 140 },
    { id: 'lsh-4', role: 'OST', host: 'lfs-oss-03.nucc.local', index: 'OST0000', capacityTB: 248, utilPct: 76, health: 'Healthy', jobs: 140 },
  ],
  '/archive': [
    { id: 'lar-0', role: 'NFS server', host: 'nfs-archive-01.nucc.local', health: 'Degraded', jobs: 8 },
    { id: 'lar-1', role: 'NFS server', host: 'nfs-archive-02.nucc.local', health: 'Healthy', jobs: 6 },
    { id: 'lar-2', role: 'Export', host: 'fs-archive.nucc.local', index: '/export/archive', capacityTB: 5120, utilPct: 71, health: 'Healthy', jobs: 14 },
    { id: 'lar-3', role: 'HSM layer', host: 'tape-robot-01.nucc.local', health: 'Healthy', jobs: 3 },
  ],
}
