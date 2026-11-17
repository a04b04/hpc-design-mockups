// Helios HPC cluster — mock data v2.
// Everything is keyed to one frozen demo clock (FROZEN) so the whole app
// renders deterministically. All values here are invented but realistic.

export const FROZEN = Date.parse('2026-11-17T12:34:00Z')
export const HOUR = 3600e3
export const DAY = 24 * HOUR

// ------------- types -------------
export type PageId =
  | 'dashboard'
  | 'nodes'
  | 'jobs'
  | 'storage'
  | 'terminal'
  | 'monitoring'
  | 'administration'
export type Role = 'admin' | 'user'
export type PanelTab = 'overview' | 'hardware' | 'metrics' | 'jobs' | 'storage'

export type ClusterNode = {
  id: string
  kind: 'login' | 'gpu' | 'compute' | 'service'
  partition: string
  status: 'online' | 'drain' | 'offline'
  rack: string
  cores: number
  gpus: number
  gpuModel?: string
  cpuModel: string
  memUsed: number // GiB
  memTotal: number // GiB
  gpuUtils: number[] // 0-100 per GPU
  cpuLoad: number // percent
  netRx: number // B/s
  netTx: number // B/s
  temps: { cpu: number; gpu: number }
  locals: number // logged-in users
  diskUsed: number // TB
  diskTotal: number // TB
  uptimeMs: number
  cpuSeries: number[]
  memSeries: number[]
  gpuSeries: number[]
  netSeries: number[]
  jobs: number[]
  notes?: string
}

export type JobState = 'running' | 'pending' | 'completed' | 'failed' | 'timeout' | 'cancelled'

export type Job = {
  id: number
  name: string
  user: string
  state: JobState
  partition: string
  nodes: string[]
  cpus: number
  gpus?: number
  memGiB: number
  priority: number
  account: string
  qos: string
  timeUsedMs: number
  walltimeMs: number
  submitMs: number
  startMs: number | null
  endMs?: number | null
  workdir: string
  std_out: string
  reason?: string
  exitCode?: number
}

export type Fs = {
  id: string
  mount: string
  sizeB: number
  usedB: number
  status: 'ok' | 'degraded' | 'rebuilding'
  desc: string
  proto: string
  inodePct: number
  iopsRw: number // ops/s
  aggThroughput: number // B/s
  quotaSoftB: number
  quotaHardB: number
  servers: string[]
}

export type AppUser = {
  id: string
  name: string
  username: string
  email: string
  group: string
  role: 'admin' | 'staff' | 'user'
  qos: string
  status: 'active' | 'suspended' | 'invited'
  storageUsed: number
  diskQuota: number
  defaultAccount: string
}

export type Alert = { id: string; sev: 'crit' | 'warn' | 'info'; title: string; at: number; source: string; ack?: boolean }
export type Notification = { id: string; sev: 'crit' | 'warn' | 'info'; title: string; at: number; source: string; ack?: boolean }
export type Operation = { id: string; kind: 'job' | 'fs' | 'net' | 'power' | 'node'; text: string; at: number; node?: string }
export type AdminAction = { id: string; label: string; desc: string; icon: string; danger?: boolean }
export type SchedEvent = { at: number; what: string; target: string; who: string }
export type PartitionRow = { name: string; nodes: string; state: 'up' | 'down'; maxTime: string; defaultQos: string; priorityWeight: number }

// ------------- series helpers -------------
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

// ------------- cluster config + partitions -------------
export const CLUSTER_CFG = {
  name: 'Helios',
  nodesTotal: 140,
  partitions: ['standard', 'gpu', 'bigmem', 'debug'] as const,
  version: '23.11.7',
  scheduler: 'Slurm Workload Manager',
  maxJobsPerUser: 64,
  cpuModel: 'EPYC 9554 · 96c',
  gpuModel: 'H100 SXM5 · 80GB',
  fabric: 'NDR InfiniBand 400G',
  fqdn: 'helios.hpc.example.edu',
}

export const PARTITION_ROWS: PartitionRow[] = [
  { name: 'standard', nodes: '86', state: 'up', maxTime: '7-00:00:00', defaultQos: 'normal', priorityWeight: 70 },
  { name: 'gpu', nodes: '12', state: 'up', maxTime: '2-00:00:00', defaultQos: 'normal', priorityWeight: 85 },
  { name: 'bigmem', nodes: '3', state: 'up', maxTime: '14-00:00:00', defaultQos: 'highmem', priorityWeight: 55 },
  { name: 'debug', nodes: '4', state: 'up', maxTime: '01:00:00', defaultQos: 'debug', priorityWeight: 20 },
  { name: 'login', nodes: '2', state: 'up', maxTime: '—', defaultQos: 'interactive', priorityWeight: 0 },
  { name: 'service', nodes: '4', state: 'up', maxTime: '—', defaultQos: 'system', priorityWeight: 0 },
]

// ------------- nodes -------------
function loginNode(id: string, ix: number): ClusterNode {
  return {
    id,
    kind: 'login',
    partition: 'login',
    status: 'online',
    rack: 'edge-1',
    cores: 64,
    gpus: 0,
    cpuModel: 'EPYC 7702P · 64c',
    memUsed: 36 + ix * 2.2,
    memTotal: 256,
    gpuUtils: [],
    cpuLoad: 12 + ix * 4,
    netRx: 84_000 + ix * 9_000,
    netTx: 61_000 + ix * 7_000,
    temps: { cpu: 41, gpu: 0 },
    locals: 13 + ix * 2,
    diskUsed: 6.4,
    diskTotal: 16,
    uptimeMs: 41 * DAY + 6 * HOUR + 12 * 60e3,
    cpuSeries: walk(1200 + ix, 80, 14 + ix * 5, 14),
    memSeries: walk(1400 + ix, 80, 16, 8),
    gpuSeries: [],
    netSeries: walk(1600 + ix, 80, 45, 25),
    jobs: [],
  }
}

function gpuNode(ix: number): ClusterNode {
  const i = String(ix).padStart(3, '0')
  const status = ix === 4 ? 'drain' : ix === 11 ? 'offline' : 'online'
  const utils0 = [86, 24, 61, 0, 78, 45, 93, 12, 67, 32, 0, 71][ix - 1] ?? 40
  const load0 = [91, 37, 74, 4, 82, 55, 95, 18, 71, 38, 0, 77][ix - 1] ?? 40
  const memPct = [74, 31, 58, 4, 81, 49, 88, 20, 66, 35, 0, 72][ix - 1] ?? 45
  return {
    id: `helios-gpu${i}`,
    kind: 'gpu',
    partition: 'gpu',
    status,
    rack: `gpu-r1`,
    cores: 128,
    gpus: 8,
    gpuModel: 'NVIDIA H100 SXM5',
    cpuModel: 'EPYC 9554 · 96c',
    memUsed: Math.round((memPct / 100) * 2048), // GiB
    memTotal: 2048,
    gpuUtils: [0, 1, 2, 3, 4, 5, 6, 7].map((g) => Math.min(99, Math.max(0, utils0 + ((g * 17) % 29) - 12))),
    cpuLoad: load0,
    netRx: 2_400_000 + ix * 137_000,
    netTx: 890_000 + ix * 88_000,
    temps: { cpu: 38 + (load0 % 34), gpu: status === 'offline' ? 0 : 47 + (load0 % 26) },
    locals: ix === 11 ? 0 : 1 + (ix % 3),
    diskUsed: 28 + ((ix * 7) % 18),
    diskTotal: 64,
    uptimeMs: status === 'offline' ? 47 * DAY : (18 + (ix % 40)) * DAY + (ix * 3700) % 86_000e3,
    cpuSeries: walk(2000 + ix, 80, Math.max(2, load0 - 6), 22),
    memSeries: walk(2200 + ix, 80, Math.max(2, memPct - 4), 10),
    gpuSeries: walk(2400 + ix, 80, Math.max(2, utils0 - 5), 24),
    netSeries: walk(2600 + ix, 80, 40, 28),
    jobs: [],
  }
}

function computeNode(ix: number): ClusterNode {
  const i = String(ix).padStart(3, '0')
  const status = ix === 17 ? 'drain' : ix === 32 ? 'offline' : 'online'
  const load0 = [88, 44, 76, 21, 91, 12, 64, 37, 84, 55, 29, 70, 47, 93, 17, 62, 8, 79, 52, 33, 86, 25, 71, 40, 95, 58, 14, 82, 36, 67, 23, 0, 74, 49, 30, 89, 63, 18, 84, 41][ix - 1] ?? 45
  const memPct = [72, 39, 61, 17, 79, 9, 54, 31, 76, 48, 25, 63, 41, 87, 13, 57, 6, 71, 45, 28, 80, 21, 65, 36, 90, 52, 11, 75, 32, 61, 19, 0, 68, 44, 27, 83, 57, 15, 78, 37][ix - 1] ?? 45
  const bigmem = ix === 38 || ix === 39
  return {
    id: `helios-c-${i}`,
    kind: 'compute',
    partition: bigmem ? 'bigmem' : 'standard',
    status,
    rack: `r${Math.floor((ix - 1) / 10) + 1}`,
    cores: bigmem ? 192 : 128,
    gpus: 0,
    cpuModel: bigmem ? 'EPYC 9654 · 96c' : 'EPYC 7763 · 64c',
    memUsed: Math.round((memPct / 100) * (bigmem ? 4096 : 1024)),
    memTotal: bigmem ? 4096 : 1024,
    gpuUtils: [],
    cpuLoad: load0,
    netRx: 340_000 + ix * 63_000,
    netTx: 210_000 + ix * 44_000,
    temps: { cpu: 34 + (load0 % 28), gpu: 0 },
    locals: ix === 32 ? 0 : ix % 2,
    diskUsed: 6 + ((ix * 5) % 15),
    diskTotal: 32,
    uptimeMs: status === 'offline' ? 2 * DAY : (32 + (ix % 60)) * DAY + (ix * 5100) % 86_000e3,
    cpuSeries: walk(3000 + ix, 80, Math.max(2, load0 - 8), 20),
    memSeries: walk(3200 + ix, 80, Math.max(2, memPct - 5), 10),
    gpuSeries: [],
    netSeries: walk(3400 + ix, 80, 30, 22),
    jobs: [],
  }
}

export const LOGIN_NODES: ClusterNode[] = [loginNode('helios-login1', 1), loginNode('helios-login2', 2)]
export const GPU_NODES: ClusterNode[] = Array.from({ length: 12 }, (_, k) => gpuNode(k + 1))
export const COMPUTE_NODES: ClusterNode[] = Array.from({ length: 40 }, (_, k) => computeNode(k + 1))
export const SERVICE_NODES: ClusterNode[] = [
  {
    id: 'helios-scr1', kind: 'service', partition: 'service', status: 'online', rack: 'svc-1',
    cores: 64, gpus: 0, cpuModel: 'EPYC 7643 · 48c', memUsed: 340, memTotal: 1024, gpuUtils: [],
    cpuLoad: 33, netRx: 620_000, netTx: 540_000, temps: { cpu: 47, gpu: 0 }, locals: 0,
    diskUsed: 61, diskTotal: 64, uptimeMs: 63 * DAY + 9 * HOUR,
    cpuSeries: walk(4001, 80, 31, 10), memSeries: walk(4002, 80, 30, 6), gpuSeries: [], netSeries: walk(4003, 80, 52, 18), jobs: [],
  },
  {
    id: 'helios-scr2', kind: 'service', partition: 'service', status: 'online', rack: 'svc-1',
    cores: 64, gpus: 0, cpuModel: 'EPYC 7643 · 48c', memUsed: 318, memTotal: 1024, gpuUtils: [],
    cpuLoad: 27, netRx: 585_000, netTx: 502_000, temps: { cpu: 46, gpu: 0 }, locals: 0,
    diskUsed: 58, diskTotal: 64, uptimeMs: 63 * DAY,
    cpuSeries: walk(4011, 80, 26, 10), memSeries: walk(4012, 80, 29, 6), gpuSeries: [], netSeries: walk(4013, 80, 48, 18), jobs: [],
  },
  {
    id: 'helios-adm1', kind: 'service', partition: 'service', status: 'online', rack: 'svc-2',
    cores: 64, gpus: 0, cpuModel: 'EPYC 7313 · 16c', memUsed: 46, memTotal: 256, gpuUtils: [],
    cpuLoad: 8, netRx: 22_000, netTx: 17_000, temps: { cpu: 38, gpu: 0 }, locals: 0,
    diskUsed: 3.2, diskTotal: 16, uptimeMs: 77 * DAY + 4 * HOUR,
    cpuSeries: walk(4021, 80, 9, 6), memSeries: walk(4022, 80, 12, 4), gpuSeries: [], netSeries: walk(4023, 80, 6, 5), jobs: [],
  },
  {
    id: 'helios-dns1', kind: 'service', partition: 'service', status: 'online', rack: 'svc-2',
    cores: 32, gpus: 0, cpuModel: 'Xeon Silver 4310 · 12c', memUsed: 12, memTotal: 128, gpuUtils: [],
    cpuLoad: 3, netRx: 9_000, netTx: 6_000, temps: { cpu: 35, gpu: 0 }, locals: 0,
    diskUsed: 0.9, diskTotal: 4, uptimeMs: 91 * DAY + 11 * HOUR,
    cpuSeries: walk(4031, 80, 4, 3), memSeries: walk(4032, 80, 8, 3), gpuSeries: [], netSeries: walk(4033, 80, 4, 4), jobs: [],
  },
]

export const ALL_NODES: ClusterNode[] = [...LOGIN_NODES, ...GPU_NODES, ...COMPUTE_NODES, ...SERVICE_NODES]

// ------------- jobs -------------
function mkJob(
  id: number,
  name: string,
  user: string,
  state: JobState,
  partition: string,
  nodes: string[],
  cpus: number,
  gpus: number | undefined,
  memGiB: number,
  timeH: number,
  wallH: number,
  submitH: number,
  startH: number | null,
  account: string,
  qos: string,
  priority: number,
  reason?: string,
  exitCode?: number,
): Job {
  const timeUsedMs = state === 'pending' ? 0 : Math.round(timeH * HOUR)
  const endMs = state === 'completed' || state === 'failed' || state === 'timeout' || state === 'cancelled' ? FROZEN - ((startH ?? 0) - timeH) * HOUR : null
  return {
    id, name, user, state, partition, nodes, cpus, gpus,
    memGiB,
    priority,
    account,
    qos,
    timeUsedMs,
    walltimeMs: Math.round(wallH * HOUR),
    submitMs: FROZEN - Math.round(submitH * HOUR),
    startMs: startH === null ? null : FROZEN - Math.round(startH * HOUR),
    endMs,
    workdir: `/home/${user}/work`,
    std_out: `slurm-${id}.out`,
    reason,
    exitCode,
  }
}

export const ALL_JOBS: Job[] = [
  mkJob(10741, 'ligand-dock', 'ada', 'running', 'gpu', ['helios-gpu001', 'helios-gpu011'], 32, 8, 640, 14.4, 48, 14.6, 14.4, 'heliogen', 'normal', 5231),
  mkJob(10740, 'proteome-ft', 'ada', 'running', 'standard', ['helios-c-001', 'helios-c-002', 'helios-c-003', 'helios-c-004'], 256, undefined, 2048, 6.9, 30, 7.0, 6.9, 'heliogen', 'normal', 4938),
  mkJob(10738, 'wave-eq-3d', 'ada', 'running', 'standard', ['helios-c-006', 'helios-c-007'], 128, undefined, 1024, 21.7, 120, 21.9, 21.7, 'heliogen', 'normal', 4602),
  mkJob(10736, 'cryo-refine', 'ada', 'pending', 'gpu', [], 64, 8, 960, 0, 36, 4.2, null, 'heliogen', 'normal', 4488, 'Resources'),
  mkJob(10733, 'qcd-lattice', 'marie', 'running', 'standard', ['helios-c-012', 'helios-c-013', 'helios-c-014', 'helios-c-015'], 384, undefined, 3072, 19.2, 96, 19.6, 19.2, 'physx', 'normal', 3970),
  mkJob(10731, 'genomics-nf', 'ada', 'running', 'standard', ['helios-c-021'], 96, undefined, 380, 2.1, 12, 2.15, 2.1, 'heliogen', 'normal', 3812),
  mkJob(10729, 'climate-isles', 'marie', 'running', 'bigmem', ['helios-c-038'], 192, undefined, 3580, 40.5, 336, 41.2, 40.5, 'physx', 'highmem', 3566),
  mkJob(10727, 'fold-v3-b', 'ken', 'running', 'gpu', ['helios-gpu002'], 32, 8, 640, 9.8, 24, 9.9, 9.8, 'aiml', 'normal', 3371),
  mkJob(10725, 'astro-tomo', 'sofia', 'pending', 'gpu', [], 96, 16, 1600, 0, 72, 26.4, null, 'physx', 'normal', 3249, 'Priority'),
  mkJob(10723, 'cfd-wing', 'ken', 'running', 'standard', ['helios-c-023', 'helios-c-024'], 192, undefined, 1536, 12.3, 60, 12.5, 12.3, 'aiml', 'normal', 3108),
  mkJob(10721, 'big-merge-sort', 'ken', 'running', 'bigmem', ['helios-c-039'], 192, undefined, 3520, 27.6, 96, 28.0, 27.6, 'aiml', 'highmem', 2997),
  mkJob(10719, 'sparse-solve', 'marie', 'running', 'standard', ['helios-c-026'], 128, undefined, 800, 5.4, 36, 5.5, 5.4, 'physx', 'normal', 2885),
  mkJob(10717, 'fft-bench', 'ken', 'completed', 'debug', ['helios-debug1'], 32, undefined, 128, 0.6, 1, 1.2, 1.1, 'aiml', 'debug', 2771),
  mkJob(10715, 'grid-ppr', 'sofia', 'pending', 'standard', [], 128, undefined, 500, 0, 24, 8.8, null, 'physx', 'normal', 2657),
  mkJob(10713, 'rna-fold', 'ken', 'completed', 'standard', ['helios-c-031'], 64, undefined, 220, 7.9, 12, 9.0, 8.9, 'aiml', 'normal', 2533),
  mkJob(10711, 'crispr-diff', 'ada', 'pending', 'standard', [], 64, undefined, 250, 0, 18, 11.4, null, 'heliogen', 'normal', 2409, 'Resources'),
  mkJob(10709, 'monte-carlo', 'ken', 'completed', 'standard', ['helios-c-033'], 128, undefined, 900, 19.6, 24, 22.1, 21.9, 'aiml', 'normal', 2285),
  mkJob(10707, 'ocean-idx', 'sofia', 'timeout', 'bigmem', ['helios-c-038'], 128, undefined, 2400, 24.0, 24, 25.9, 24.8, 'physx', 'highmem', 2161),
  mkJob(10705, 'llm-pretrain', 'ken', 'running', 'gpu', ['helios-gpu003', 'helios-gpu004', 'helios-gpu005', 'helios-gpu006'], 128, 32, 1600, 68.9, 120, 69.2, 68.9, 'aiml', 'normal', 2037),
  mkJob(10703, 'blast-sweep', 'ada', 'completed', 'standard', ['helios-c-035'], 32, undefined, 220, 4.2, 8, 5.4, 5.3, 'heliogen', 'normal', 1913),
  mkJob(10701, 'tensor-train', 'ada', 'failed', 'gpu', ['helios-gpu002'], 16, 2, 320, 3.3, 8, 6.0, 5.9, 'heliogen', 'normal', 1789, undefined, 1),
  mkJob(10699, 'seq-align', 'ken', 'completed', 'standard', ['helios-c-036'], 64, undefined, 220, 11.2, 24, 13.0, 12.9, 'aiml', 'normal', 1665),
  mkJob(10697, 'fold-infer', 'ada', 'cancelled', 'gpu', ['helios-gpu002'], 16, 2, 320, 1.9, 8, 15.2, 15.1, 'heliogen', 'normal', 1541),
  mkJob(10695, 'gwas-sweep', 'ada', 'pending', 'standard', [], 128, undefined, 500, 0, 12, 19.8, null, 'heliogen', 'normal', 1417, 'Resources'),
  mkJob(10693, 'image-recon', 'marie', 'completed', 'standard', ['helios-c-036'], 64, undefined, 280, 8.4, 12, 23.5, 23.3, 'physx', 'normal', 1293),
  mkJob(10691, 'lattice-qcd', 'sofia', 'running', 'standard', ['helios-c-008', 'helios-c-009'], 160, undefined, 1100, 2.8, 48, 2.85, 2.8, 'physx', 'normal', 1169),
  mkJob(10689, 'fold-v3', 'ada', 'completed', 'gpu', ['helios-gpu001'], 16, 2, 320, 5.7, 8, 30.1, 29.9, 'heliogen', 'normal', 1045),
  mkJob(10687, 'wave-sim-cuda', 'ken', 'failed', 'gpu', ['helios-gpu002'], 32, 4, 640, 1.2, 6, 34.6, 34.5, 'aiml', 'normal', 921, undefined, 2),
  mkJob(10685, 'grid-ppr-b', 'sofia', 'cancelled', 'standard', ['helios-c-009'], 128, undefined, 500, 0.8, 24, 38.9, 38.7, 'physx', 'normal', 797),
  mkJob(10683, 'rna-structure', 'ada', 'completed', 'standard', ['helios-c-034'], 64, undefined, 250, 9.7, 12, 44.2, 44.0, 'heliogen', 'normal', 673),
]

const _jobsById = new Map(ALL_JOBS.map((j) => [j.id, j]))

// attach running job ids onto nodes so node panels list live work
for (const n of ALL_NODES) n.jobs = ALL_JOBS.filter((j) => j.state === 'running' && j.nodes.includes(n.id)).map((j) => j.id)
export function nodeJobs(nodeId: string): Job[] {
  const n = ALL_NODES.find((x) => x.id === nodeId)
  return (n?.jobs ?? []).map((id) => _jobsById.get(id)!).filter(Boolean)
}

// ------------- filesystems -------------
export const ALL_FILESYSTEMS: Fs[] = [
  {
    id: 'fs-home', mount: '/home', sizeB: 220 * 1024 ** 4, usedB: 119 * 1024 ** 4, status: 'ok',
    desc: 'Per-user durable home, snapshot + quota enforced.',
    proto: 'Lustre', inodePct: 46, iopsRw: 118_000, aggThroughput: 24 * 1024 ** 3,
    quotaSoftB: 1.1 * 1024 ** 4, quotaHardB: 1.3 * 1024 ** 4, servers: ['oss-h1', 'oss-h2'],
  },
  {
    id: 'fs-scr', mount: '/scratch', sizeB: 1.8 * 1024 ** 4, usedB: 1.48 * 1024 ** 4, status: 'ok',
    desc: 'High-throughput scratch. Purged 30 days after last job.',
    proto: 'Lustre', inodePct: 82, iopsRw: 214_000, aggThroughput: 91 * 1024 ** 3,
    quotaSoftB: 25 * 1024 ** 4, quotaHardB: 27 * 1024 ** 4, servers: ['oss-s1', 'oss-s2'],
  },
  {
    id: 'fs-prj', mount: '/projects', sizeB: 480 * 1024 ** 4, usedB: 210 * 1024 ** 4, status: 'ok',
    desc: 'Project allocations, provisioned per research group.',
    proto: 'Lustre', inodePct: 38, iopsRw: 260_000, aggThroughput: 38 * 1024 ** 3,
    quotaSoftB: 210 * 1024 ** 4, quotaHardB: 260 * 1024 ** 4, servers: ['oss-p1', 'oss-p2'],
  },
  {
    id: 'fs-arc', mount: '/archive', sizeB: 3.2 * 1024 ** 4, usedB: 2.4 * 1024 ** 4, status: 'rebuilding',
    desc: 'Deep archive tier on tape + disk mirror, restore queue online.',
    proto: 'Lustre', inodePct: 31, iopsRw: 6_800, aggThroughput: 5 * 1024 ** 3,
    quotaSoftB: 2.4 * 1024 ** 4, quotaHardB: 3 * 1024 ** 4, servers: ['arc-1'],
  },
]

// ------------- users -------------
export const ALL_USERS: AppUser[] = [
  { id: 'u1', name: 'Ada Lovelace', username: 'ada', email: 'ada@helios.hpc', group: 'heliogen', role: 'staff', qos: 'normal', status: 'active', storageUsed: 412e9, diskQuota: 1.1e12, defaultAccount: 'heliogen' },
  { id: 'u2', name: 'Marie Curie', username: 'marie', email: 'marie@helios.hpc', group: 'physx', role: 'user', qos: 'normal', status: 'active', storageUsed: 1.8e12, diskQuota: 2.2e12, defaultAccount: 'physx' },
  { id: 'u3', name: 'Ken Thompson', username: 'ken', email: 'ken@helios.hpc', group: 'aiml', role: 'user', qos: 'normal', status: 'active', storageUsed: 890e9, diskQuota: 1.5e12, defaultAccount: 'aiml' },
  { id: 'u4', name: 'Sofia Kovalevskaya', username: 'sofia', email: 'sofia@helios.hpc', group: 'physx', role: 'user', qos: 'normal', status: 'active', storageUsed: 2.1e12, diskQuota: 2.5e12, defaultAccount: 'physx' },
  { id: 'u5', name: 'Grace Hopper', username: 'grace', email: 'grace@helios.hpc', group: 'heliogen', role: 'admin', qos: 'highmem', status: 'active', storageUsed: 640e9, diskQuota: 2e12, defaultAccount: 'heliogen' },
  { id: 'u6', name: 'Alan Turing', username: 'turing', email: 'turing@helios.hpc', group: 'aiml', role: 'user', qos: 'normal', status: 'active', storageUsed: 1.2e12, diskQuota: 1.5e12, defaultAccount: 'aiml' },
  { id: 'u7', name: 'Edsger Dijkstra', username: 'dijkstra', email: 'dijkstra@helios.hpc', group: 'cs-dept', role: 'user', qos: 'normal', status: 'suspended', storageUsed: 220e9, diskQuota: 1.1e12, defaultAccount: 'cs-dept' },
  { id: 'u8', name: 'Donald Knuth', username: 'knuth', email: 'knuth@helios.hpc', group: 'cs-dept', role: 'user', qos: 'normal', status: 'active', storageUsed: 310e9, diskQuota: 1.3e12, defaultAccount: 'cs-dept' },
  { id: 'u9', name: 'Richard Hamming', username: 'hamming', email: 'hamming@helios.hpc', group: 'cs-dept', role: 'staff', qos: 'debug', status: 'active', storageUsed: 150e9, diskQuota: 1e12, defaultAccount: 'cs-dept' },
  { id: 'u10', name: 'Linus Pauling', username: 'pauling', email: 'pauling@helios.hpc', group: 'chem', role: 'user', qos: 'normal', status: 'invited', storageUsed: 0, diskQuota: 0.5e12, defaultAccount: 'chem' },
]

export const CURRENT_USER = { name: 'Ada Lovelace', username: 'ada' }

// ------------- alerts / notifications / ops / sched events -------------
export const ALERTS: Alert[] = [
  { id: 'al1', sev: 'crit', title: 'GPU011 MDC error storm — node drained', at: FROZEN - 18 * 60e3, source: 'slurmctld' },
  { id: 'al2', sev: 'crit', title: 'fs-arc mirror rebuild lagging (3h 12m)', at: FROZEN - 41 * 60e3, source: 'zfs-monitor' },
  { id: 'al3', sev: 'warn', title: 'Login1 load > 14 for 20m', at: FROZEN - 22 * 60e3, source: 'telegraf' },
  { id: 'al4', sev: 'warn', title: 'C-017 draining for kernel patch', at: FROZEN - 55 * 60e3, source: 'slurmctld' },
  { id: 'al5', sev: 'info', title: 'Scratch purge reclaimed 12 TB overnight', at: FROZEN - 8 * HOUR, source: 'purge-bot' },
  { id: 'al6', sev: 'info', title: 'Slurm 23.11.7 security patch notes published', at: FROZEN - 26 * HOUR, source: 'sched' },
]
export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', sev: 'crit', title: 'GPU011 drained — MDC errors', at: FROZEN - 18 * 60e3, source: 'nodes' },
  { id: 'n2', sev: 'warn', title: 'Your job 10736 is waiting on Resources', at: FROZEN - 9 * 60e3, source: 'scheduler' },
  { id: 'n3', sev: 'info', title: 'Job 10703 completed (5.3h)', at: FROZEN - 47 * 60e3, source: 'scheduler' },
  { id: 'n4', sev: 'info', title: 'Storage quota warning for /home', at: FROZEN - 3 * HOUR, source: 'storage' },
  { id: 'n5', sev: 'warn', title: 'fs-arc rebuilding — restores may queue', at: FROZEN - 41 * 60e3, source: 'storage' },
]

export const OPERATIONS: Operation[] = [
  { id: 'op1', kind: 'power', text: 'Power cycled gpu011 after MIB flash', at: FROZEN - 12 * 60e3, node: 'helios-gpu011' },
  { id: 'op2', kind: 'fs', text: 'zpool scrub started on fs-scr', at: FROZEN - 26 * 60e3, node: 'helios-scr1' },
  { id: 'op3', kind: 'node', text: 'C-017 reserved for internal use', at: FROZEN - 52 * 60e3, node: 'helios-c-017' },
  { id: 'op4', kind: 'job', text: 'Backfill scheduling window widened to 15%', at: FROZEN - 1.6 * HOUR },
  { id: 'op5', kind: 'net', text: 'InfiniBand switch sw-r2 firmware updated', at: FROZEN - 2.4 * HOUR },
  { id: 'op6', kind: 'fs', text: 'Quota bump for group chem', at: FROZEN - 5.1 * HOUR },
  { id: 'op7', kind: 'node', text: 'Drain lifted on gpu004 after VBIOS refresh', at: FROZEN - 7.3 * HOUR, node: 'helios-gpu004' },
]

export const SCHED_EVENTS: SchedEvent[] = [
  { at: FROZEN - 40 * 60e3, what: 'reconfig', target: 'partition gpu', who: 'slurm' },
  { at: FROZEN - 2 * HOUR, what: 'backfill', target: 'window widened', who: 'slurm' },
  { at: FROZEN - 5 * HOUR, what: 'priority', target: 'weights recalculated', who: 'slurm' },
  { at: FROZEN - 9 * HOUR, what: 'maintenance', target: 'bigmem reserved', who: 'ops' },
]

// ------------- aggregate series (monitoring + dashboard) -------------
export const AGG_CPU: number[] = walk(10, 80, 62, 16)
export const AGG_MEM: number[] = walk(20, 80, 58, 10)
export const AGG_GPU: number[] = walk(30, 80, 66, 18)
export const AGG_NET: number[] = walk(40, 80, 48, 26)
export const AGG_IO: number[] = walk(50, 80, 42, 30)

export const CLUSTER_AGGR = {
  cpu: Math.round(AGG_CPU[AGG_CPU.length - 1]),
  mem: Math.round(AGG_MEM[AGG_MEM.length - 1]),
  gpu: Math.round(AGG_GPU[AGG_GPU.length - 1]),
  net: Math.round(AGG_NET[AGG_NET.length - 1]),
}

// ------------- admin actions -------------
export const ADMIN_ACTIONS: AdminAction[] = [
  { id: 'aa1', label: 'Drain a node', desc: 'Take compute capacity out of the scheduler.', icon: 'server-cog' },
  { id: 'aa2', label: 'Broadcast message', desc: 'Wall a notice to all logged-in sessions.', icon: 'bell' },
  { id: 'aa3', label: 'Purge scratch', desc: 'Force the 30-day scratch purge now.', icon: 'database', danger: true },
  { id: 'aa4', label: 'Restart slurmctld', desc: 'Rolling restart of the scheduler daemon.', icon: 'refresh', danger: true },
  { id: 'aa5', label: 'Quota policy', desc: 'Edit group quota + purge exemptions.', icon: 'sliders-horizontal' },
  { id: 'aa6', label: 'Power cap', desc: 'Rack-level power budget enforcement.', icon: 'power' },
]
