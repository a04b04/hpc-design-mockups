import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, SysBanner, emitToast, navTo } from '../components/ui'
import { JOBS, NODES, PARTITIONS, QOS_LIST } from '../data'
import type { EnJob } from '../data'

type AdvField = 'ntasks' | 'ntasksPerNode' | 'arraySpec' | 'dependency' | 'outFile' | 'errFile' | 'workDir' | 'constraint' | 'gres' | 'notifyEmail'

type JobForm = {
  name: string
  partition: string
  nodes: number
  cpusPerTask: number
  memGB: number
  gpus: number
  walltime: string
  qos: string
  account: string
  adv: Record<AdvField, string> & { exclusive: boolean }
}

const DEFAULT_ADV: JobForm['adv'] = {
  ntasks: '', ntasksPerNode: '', arraySpec: '', dependency: '',
  outFile: 'slurm-%j.out', errFile: 'slurm-%j.err', workDir: '', constraint: '', gres: '', notifyEmail: '',
  exclusive: false,
}

const ACCOUNTS = ['physics', 'chemistry', 'eng-vis', 'bio-informatics', 'math-modelling', 'eng-cfd', 'staff', 'vis-lab']

const EMPTY_FORM: JobForm = {
  name: '', partition: 'compute', nodes: 1, cpusPerTask: 1, memGB: 4, gpus: 0,
  walltime: '01:00:00', qos: 'normal', account: 'staff', adv: { ...DEFAULT_ADV },
}

/* ============================ templates ============================ */

type TplId = 'serial' | 'mpi' | 'gpu' | 'array' | ''

const TPL_ICONS: Partial<Record<TplId, LucideIcon>> = {
  serial: Lucide.Cpu, mpi: Lucide.Network, gpu: Lucide.CircuitBoard, array: Lucide.Grid3X3,
}

type Template = { id: TplId; name: string; desc: string; fld: JobForm; post: string[] }

const TEMPLATES: Template[] = [
  {
    id: 'serial', name: 'Serial CPU Job', desc: '1 node · 1 task · 1 CPU · 4 GB · compute',
    fld: { ...EMPTY_FORM, name: 'serial-analysis', walltime: '04:00:00' },
    post: ['module load gcc/13.2', 'python analyse.py --input /shared/data/run.h5'],
  },
  {
    id: 'mpi', name: 'MPI Job', desc: '2 nodes · 32 tasks (16 per node) · 1 CPU per task · compute',
    fld: { ...EMPTY_FORM, name: 'mpi-wave', nodes: 2, adv: { ...DEFAULT_ADV, ntasks: '32', ntasksPerNode: '16' } },
    post: ['module load gcc/13.2 openmpi/4.1', 'mpirun -np 64 ./wave3d --nx 2048'],
  },
  {
    id: 'gpu', name: 'GPU Job', desc: 'gpu partition · 1 GPU · 8 CPUs per task · 32 GB',
    fld: { ...EMPTY_FORM, name: 'gpu-train', partition: 'gpu', gpus: 1, cpusPerTask: 8, memGB: 32, walltime: '08:00:00' },
    post: ['module load cuda/12.4', 'python train.py --epochs 100'],
  },
  {
    id: 'array', name: 'Job Array', desc: 'Array 1-64 · 2 CPUs per task · 16 GB · compute',
    fld: { ...EMPTY_FORM, name: 'sweep-array', cpusPerTask: 2, memGB: 16, walltime: '02:00:00', adv: { ...DEFAULT_ADV, arraySpec: '1-64' } },
    post: ['module load gcc/13.2', 'python sweep.py --task $SLURM_ARRAY_TASK_ID'],
  },
]

/* ============================ script generation ============================ */

const TIME_RE = /^\d{1,2}-\d{1,2}:\d{2}:\d{2}$|^\d{1,2}:\d{2}:\d{2}$/

function normalizeWall(raw: string): string {
  const s = raw.trim()
  if (s === '') return ''
  if (TIME_RE.test(s)) return s
  const hm = /^(\d{1,2}):(\d{1,2})$/.exec(s)
  if (hm) return `${hm[1]!.padStart(2, '0')}:${hm[2]!.padStart(2, '0')}:00`
  return s
}

function postLines(f: JobForm): string {
  const l: string[] = ['', '# Workload — replace with your launcher']
  if (f.partition === 'gpu') {
    l.push('module load cuda/12.4', '', 'python train.py')
  } else if (f.partition === 'himem') {
    l.push('module load python/3.11', '', './analyse --input /shared/datasets/large.h5')
  } else if (f.partition === 'login') {
    l.push('# login partition is for interactive work — srun runs here, not sbatch')
  } else {
    l.push('module load gcc/13.2', '')
    l.push(f.adv.arraySpec.trim() !== '' ? 'python sweep.py --task $SLURM_ARRAY_TASK_ID' : 'python run.py')
  }
  return l.join('\n')
}

function generateScript(f: JobForm): string {
  const a = f.adv
  const d: string[] = []
  if (f.name.trim() !== '') d.push(`#SBATCH --job-name=${f.name.trim()}`)
  if (f.partition !== '') d.push(`#SBATCH --partition=${f.partition}`)
  if (a.arraySpec.trim() !== '') d.push(`#SBATCH --array=${a.arraySpec.trim()}`)
  if (a.ntasks.trim() === '' && a.ntasksPerNode.trim() === '') d.push(`#SBATCH --nodes=${f.nodes}`)
  if (a.ntasks.trim() !== '') d.push(`#SBATCH --ntasks=${a.ntasks.trim()}`)
  if (a.ntasksPerNode.trim() !== '') d.push(`#SBATCH --ntasks-per-node=${a.ntasksPerNode.trim()}`)
  d.push(`#SBATCH --cpus-per-task=${f.cpusPerTask}`)
  d.push(`#SBATCH --mem=${f.memGB}G`)
  if (f.gpus > 0) d.push(`#SBATCH --gres=gpu:${f.gpus}`)
  if (a.gres.trim() !== '') d.push(`#SBATCH --gres=${a.gres.trim()}`)
  if (f.qos !== '') d.push(`#SBATCH --qos=${f.qos}`)
  if (f.account !== '') d.push(`#SBATCH --account=${f.account}`)
  if (a.dependency.trim() !== '') d.push(`#SBATCH --dependency=${a.dependency.trim()}`)
  if (a.exclusive) d.push('#SBATCH --exclusive')
  if (a.constraint.trim() !== '') d.push(`#SBATCH --constraint=${a.constraint.trim()}`)
  const wall = normalizeWall(f.walltime)
  if (wall !== '') d.push(`#SBATCH --time=${wall}`)
  if (f.partition !== 'login') {
    if (a.outFile.trim() !== '') d.push(`#SBATCH --output=${a.outFile.trim()}`)
    if (a.errFile.trim() !== '') d.push(`#SBATCH --error=${a.errFile.trim()}`)
  }
  if (a.notifyEmail.trim() !== '') {
    d.push('#SBATCH --mail-type=ALL')
    d.push(`#SBATCH --mail-user=${a.notifyEmail.trim()}`)
  }
  if (a.workDir.trim() !== '') d.push(`#SBATCH --chdir=${a.workDir.trim()}`)
  return `#!/bin/bash\n${d.join('\n')}${d.length > 0 ? '\n' : ''}${postLines(f)}`
}

function copy(text: string, label: string): void {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
  emitToast('success', `${label} copied to clipboard`)
}

/* ============================ partition availability ============================ */

type PName = 'login' | 'compute' | 'gpu' | 'himem' | 'service'
type PAvail = { key: PName; total: number; idle: number; alloc: number; maxWall: string; pending: number; running: number; gpusFree: number | null }

const NODE_KEY: Record<string, PName> = {
  login: 'login', compute: 'compute', gpu: 'gpu', himem: 'himem', high_memory: 'himem', service: 'service',
}
const nodeKey = (n: { partition: string }): PName => NODE_KEY[n.partition] ?? 'compute'

const K2P: Record<PName, string> = { login: 'login', compute: 'compute', gpu: 'gpu', himem: 'himem', service: 'service' }
const K2U: Record<PName, string> = { login: 'login', compute: 'compute', gpu: 'gpu', himem: 'high-memory', service: 'service' }
const DESC: Record<PName, string> = {
  login: 'Interactive login and shell access',
  compute: 'General-purpose CPU workloads',
  gpu: 'GPU-accelerated workloads (A100 · 80 GB)',
  himem: 'Large-memory single-node jobs',
  service: 'Cluster infrastructure services',
}

function buildPartitions(): PAvail[] {
  const acc = new Map<PName, { total: number; idle: number }>()
  for (const k of Object.keys(K2P) as PName[]) acc.set(k, { total: 0, idle: 0 })
  for (const n of NODES) {
    const k = nodeKey(n)
    const e = acc.get(k)
    if (!e) continue
    e.total += 1
    if (n.state === 'IDLE') e.idle += 1
  }
  const running = new Map<PName, number>()
  const pending = new Map<PName, number>()
  for (const j of JOBS) {
    const k = nodeKey(j)
    if (j.state === 'RUNNING') running.set(k, (running.get(k) ?? 0) + 1)
    if (j.state === 'PENDING') pending.set(k, (pending.get(k) ?? 0) + 1)
  }
  return (Object.keys(K2P) as PName[])
    .map((k) => {
      const p = PARTITIONS.find((x) => x.name === K2P[k])!
      const a = acc.get(k)!
      return {
        key: k, total: a.total, idle: a.idle, alloc: a.total - a.idle,
        maxWall: p !== undefined ? p.timelimit : 'infinite', pending: pending.get(k) ?? 0, running: running.get(k) ?? 0,
        gpusFree: k === 'gpu' ? 12 : null,
      }
    })
    .filter((x) => x.key !== 'service' || x.total > 0)
}

const PA = buildPartitions()

const paFor = (part: string): PAvail => PA.find((x) => K2P[x.key] === part) ?? PA[1]!

/* ============================ validation ============================ */

type Kind = 'red' | 'amber'
type Check = { ok: false; text: string; kind: Kind }
type Warn = { kind: 'amber' | 'red'; text: string }

function maxMemGB(p: { memPerNodeGB: number }): number { return p.memPerNodeGB }

function validate(f: JobForm, script: string, custom: boolean): Check[] {
  const out: Check[] = []
  if (f.name.trim() === '') out.push({ ok: false, text: 'A job name is required so the job can be identified in squeue.', kind: 'red' })
  else if (f.name.length > 96) out.push({ ok: false, text: 'Job name exceeds 96 characters and will be truncated.', kind: 'red' })
  if (script.trim() === '') out.push({ ok: false, text: 'The batch script is empty — add a shebang, directives and a job body.', kind: 'red' })
  else {
    if (!/^#!\s*\/bin\/(ba|z)?sh/.test(script)) out.push({ ok: false, text: 'Batch script does not start with a #!/bin/bash shebang.', kind: 'red' })
    if (custom && !/(^|\n)#SBATCH\s/.test(script)) out.push({ ok: false, text: 'No #SBATCH directives found — the scheduler would apply queue defaults.', kind: 'amber' })
    for (const c of slurmDirectiveErrors(script)) out.push(c)
  }
  const p = PARTITIONS.find((x) => x.name === f.partition)
  if (p === undefined) {
    out.push({ ok: false, text: `Partition "${f.partition}" does not exist.`, kind: 'red' })
  } else {
    if (f.partition !== 'login') {
      if (!(f.cpusPerTask >= 1 && f.cpusPerTask <= p.coresPerNode)) out.push({ ok: false, text: `CPUs per task must be between 1 and ${p.coresPerNode} on "${f.partition}".`, kind: 'red' })
      if (f.memGB > maxMemGB(p)) out.push({ ok: false, text: `Memory exceeds the ${maxMemGB(p)} GB per node available on "${f.partition}".`, kind: 'red' })
      else if (f.memGB > 0.8 * maxMemGB(p)) out.push({ ok: false, text: 'Memory above 80% of a node reduces backfill opportunity.', kind: 'amber' })
      if (f.gpus > 0 && p.gpus === 0) out.push({ ok: false, text: `Partition "${f.partition}" has no GPUs, but ${f.gpus} were requested.`, kind: 'red' })
      else if (f.gpus > p.gpus) out.push({ ok: false, text: `${f.gpus} GPUs exceed the ${p.gpus} GPUs per node on "${f.partition}".`, kind: 'red' })
      const limD = /^(\d+)-/.exec(p.timelimit)?.[1]
      const reqD = /^(\d+)-/.exec(f.walltime)?.[1]
      if (limD !== undefined && reqD !== undefined && +limD < +reqD) out.push({ ok: false, text: `Walltime must be at most ${p.timelimit} on "${f.partition}".`, kind: 'red' })
    } else {
      out.push({ ok: false, text: 'Batch submission into the login partition is discouraged — sbatch belongs on compute, srun stays on login.', kind: 'amber' })
    }
  }
  if (!(f.nodes >= 1 && f.nodes <= 128)) out.push({ ok: false, text: 'Node count must be between 1 and 128.', kind: 'red' })
  if (!TIME_RE.test(normalizeWall(f.walltime))) out.push({ ok: false, text: 'Walltime must use HH:MM:SS or D-HH:MM:SS format.', kind: 'red' })
  if (custom) for (const w of warnAgainstForm(script, f)) out.push({ ok: false, text: w.text, kind: w.kind })
  return out
}

const KNOWN = ['job-name', 'partition', 'nodes', 'ntasks', 'ntasks-per-node', 'cpus-per-task', 'mem', 'gres', 'time', 'qos', 'account', 'array', 'dependency', 'output', 'error', 'chdir', 'constraint', 'mail-user', 'mail-type', 'exclusive', 'propagate', 'requeue', 'signal', 'export']

function sbatchAll(script: string, key: string): string[] {
  const out: string[] = []
  for (const line of script.split('\n')) {
    const m = new RegExp(`^#SBATCH[ \\t]+--${key}=(.*)$`).exec(line)
    if (m) out.push(m[1]!.trim())
  }
  return out
}

function slurmDirectiveErrors(script: string): Check[] {
  if (!/(^|\n)\s*#SBATCH/.test(script)) return []
  const out: Check[] = []
  const seen = new Map<string, number>()
  let inHeader = true
  for (const line of script.split('\n')) {
    if (inHeader && line.trim() !== '' && !line.trim().startsWith('#')) inHeader = false
    if (!inHeader) continue
    const m = /^\s*#SBATCH\s+(.*)$/.exec(line)
    if (!m) continue
    const body = m[1]!
    const km = /^--([a-z][a-z-]*)/.exec(body)
    if (km) {
      const key = km[1]!
      if (!KNOWN.includes(key)) out.push({ ok: false, text: `Unknown Slurm directive --${key}.`, kind: 'red' })
      else seen.set(key, (seen.get(key) ?? 0) + 1)
    } else if (/^-[a-zA-Z](\s|$|=)/.test(body) === false) {
      out.push({ ok: false, text: `Malformed #SBATCH line: ${line.trim()}`, kind: 'red' })
    }
  }
  for (const [key, count] of seen) {
    if (count === 1) continue
    if (key === 'output') { out.push({ ok: false, text: 'Two --output directives conflict — keep one.', kind: 'red' }); continue }
    if (key === 'error') { out.push({ ok: false, text: 'Two --error directives conflict — keep one.', kind: 'red' }); continue }
    if (key === 'gres') { out.push({ ok: false, text: 'Multiple --gres directives conflict — combine into a single value.', kind: 'red' }); continue }
    out.push({ ok: false, text: `--${key} appears ${count}× — the last one wins at submit time.`, kind: 'amber' })
  }
  return out
}

function warnAgainstForm(script: string, f: JobForm): Warn[] {
  const w: Warn[] = []
  const val = (key: string): string | undefined => sbatchAll(script, key)[0]
  const n = val('nodes')
  if (n !== undefined && +n !== f.nodes) w.push({ text: `Script sets --nodes=${n} but the form has ${f.nodes} — the script wins.`, kind: 'amber' })
  const q = val('qos')
  if (q !== undefined && q !== f.qos) w.push({ text: `Script sets --qos=${q} but the form has ${f.qos} — the script wins.`, kind: 'amber' })
  const ac = val('account')
  if (ac !== undefined && ac !== f.account) w.push({ text: `Script sets --account=${ac} but the form has ${f.account} — the script wins.`, kind: 'amber' })
  const g = sbatchAll(script, 'gres').find((x) => /gpu/.test(x))
  if (g !== undefined) {
    const m = /gpu:(\d+)/.exec(g)
    if (m && +m[1]! !== f.gpus) w.push({ text: `Script sets ${g} but the form has ${f.gpus} GPU(s) — the script wins.`, kind: 'amber' })
  }
  return w
}

/* ============================ custom script parsing ============================ */

function parseMemGB(v: string): number | null {
  const g = /^(\d+(?:\.\d+)?)G(?:B)?$/i.exec(v)
  if (g) return Math.round(+g[1]!)
  const m = /^(\d+(?:\.\d+)?)M$/i.exec(v)
  if (m) return Math.max(1, Math.round(+m[1]! / 1024))
  const t = /^(\d+(?:\.\d+)?)T$/i.exec(v)
  if (t) return Math.round(+t[1]! * 1024)
  return null
}

function parsePartition(v: string, fallback: string): string {
  if (PARTITIONS.some((p) => p.name === v)) return v
  if (v === 'high_memory') return 'himem'
  return fallback
}

const gpuCount = (gres: string): number | undefined => {
  const m = /gpu:(\d+)/.exec(gres)
  return m ? +m[1]! : undefined
}

function readCustomFields(script: string, fallback: JobForm): JobForm {
  const val = (key: string): string => sbatchAll(script, key)[0] ?? ''
  const gresParts = sbatchAll(script, 'gres')
  const gpuFromGres = gresParts.map(gpuCount).find((n) => n !== undefined)
  const gpusFromFlag = /#SBATCH[ \t]+--gpus?[ \t]*=?[ \t]*(\d+)/.exec(script)?.[1]
  const mem = val('mem')
  return {
    ...fallback,
    name: val('job-name') !== '' ? val('job-name') : fallback.name,
    partition: parsePartition(val('partition'), fallback.partition),
    nodes: parseInt(val('nodes'), 10) || fallback.nodes,
    cpusPerTask: parseInt(val('cpus-per-task'), 10) || fallback.cpusPerTask,
    memGB: mem === '' ? fallback.memGB : parseMemGB(mem) ?? fallback.memGB,
    gpus: gpuFromGres ?? (gpusFromFlag !== undefined ? +gpusFromFlag : 0),
    walltime: val('time') !== '' ? val('time') : fallback.walltime,
    qos: val('qos') !== '' ? val('qos') : fallback.qos,
    account: val('account') !== '' ? val('account') : fallback.account,
    adv: {
      ...fallback.adv,
      ntasks: val('ntasks'), ntasksPerNode: val('ntasks-per-node'), arraySpec: val('array'),
      dependency: val('dependency'), outFile: val('output') !== '' ? val('output') : '— (script)',
      errFile: val('error') !== '' ? val('error') : '— (script)',
      workDir: val('chdir'), constraint: val('constraint'), gres: gresParts[0] ?? '',
      notifyEmail: val('mail-user'),
    },
  }
}

function countArray(spec: string): number {
  let n = 0
  for (const part of spec.split(',')) {
    if (/^\d+$/.test(part)) n += 1
    else if (/^\d+-\d+$/.test(part)) {
      const [lo, hi] = part.split('-')
      n += Math.max(0, +hi! - +lo! + 1)
    }
  }
  return n
}

/* ============================ script editor ============================ */

type Tok = { t: string; k: 'cm' | 'dir' | 'flag' | 'val' | 'cmd' | 'kw' | 'mod' }

function tokenLine(line: string): Tok[] {
  if (line.trim() === '') return [{ t: line, k: 'cm' }]
  if (line.trimStart().startsWith('#SBATCH')) return tokSlurm(line)
  if (line.trimStart().startsWith('#')) return [{ t: line, k: 'cm' }]
  return tokCmd(line)
}

function tokSlurm(line: string): Tok[] {
  const m = /^(\s*#SBATCH)(\s*)(\S+)(?:=(.*))?$/.exec(line)
  if (!m) return [{ t: line, k: 'cm' }]
  const [, sb, sp, flag, val] = m
  const out: Tok[] = [{ t: sb!, k: 'dir' }, { t: sp ?? ' ', k: 'cm' }, { t: flag!, k: 'flag' }]
  if (val !== undefined) out.push({ t: '=', k: 'cm' }, { t: val, k: 'val' })
  return out
}

function tokCmd(line: string): Tok[] {
  const m = /^(\s*)(\S+)(\s+([\s\S]*))?$/.exec(line)
  if (!m) return [{ t: line, k: 'cmd' }]
  const [, ind, head, , rest] = m
  const out: Tok[] = [{ t: ind!, k: 'kw' }, { t: head!, k: 'cmd' }]
  if (!rest) return out
  const mm = /^(\s*(?:module|ml)\s+load\s+)([\s\S]+)$/.exec(rest)
  if (mm) {
    out.push({ t: mm[1]!, k: 'mod' }, { t: mm[2]!, k: 'val' })
    return out
  }
  const varRe = /(\$\{?[A-Za-z_][A-Za-z0-9_]*\}?)/g
  let idx = 0
  for (const match of rest.matchAll(varRe)) {
    const i = match.index ?? 0
    if (i > idx) out.push({ t: rest.slice(idx, i), k: 'val' })
    out.push({ t: match[0], k: 'kw' })
    idx = i + match[0].length
  }
  if (idx < rest.length) out.push({ t: rest.slice(idx), k: 'val' })
  return out
}

function tokenScript(src: string): Tok[] {
  const out: Tok[] = []
  const ls = src.split('\n')
  for (let i = 0; i < ls.length; i++) {
    for (const t of tokenLine(ls[i]!)) out.push(t)
    if (i < ls.length - 1) out.push({ t: '\n', k: 'cm' })
  }
  return out
}

const TOK_CLS: Record<Tok['k'], string> = {
  cm: 'a5-shl-cm', dir: 'a5-shl-dir', flag: 'a5-shl-flag', val: 'a5-shl-val',
  cmd: 'a5-shl-cmd', kw: 'a5-shl-kw', mod: 'a5-shl-mod',
}

function ScriptEditor(p: { script: string; onChange: (v: string) => void }): ReactNode {
  const preRef = useRef<HTMLPreElement | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const toks = useMemo(() => tokenScript(p.script), [p.script])

  const sync = (): void => {
    if (!preRef.current || !taRef.current) return
    preRef.current.scrollTop = taRef.current.scrollTop
    preRef.current.scrollLeft = taRef.current.scrollLeft
  }

  const lineCount = Math.max(p.script.split('\n').length + (p.script.endsWith('\n') ? 1 : 0), 24)
  const numbers: string[] = []
  for (let i = 1; i <= lineCount; i++) numbers.push(String(i))
  const gutter = numbers.map((n) => <div key={n} className="a5-editor-ln">{n}</div>)

  return (
    <div className="a5-editor">
      <div className="a5-editor-gutter" aria-hidden>{gutter}</div>
      <div className="a5-editor-code">
        <pre ref={preRef} className="a5-editor-pre" aria-hidden>
          {toks.map((t, i) => (t.t === '\n' ? '\n' : <span key={i} className={TOK_CLS[t.k]}>{t.t}</span>))}
        </pre>
        <textarea
          ref={taRef}
          className="a5-editor-ta"
          spellCheck={false}
          value={p.script}
          onChange={(e) => p.onChange(e.target.value)}
          onScroll={sync}
        />
      </div>
    </div>
  )
}

/* ============================ small form pieces ============================ */

function FieldRow(p: { cells: Array<{ label: string; el: ReactNode }> }): ReactNode {
  return (
    <div className="a5-frow">
      {p.cells.map((c, i) => (
        <div key={i} className="a5-field">
          <label className="a5-label">{c.label}</label>
          {c.el}
        </div>
      ))}
    </div>
  )
}

function TemplChip(p: { t: Template; active: boolean; onPick: () => void }): ReactNode {
  const Ico = TPL_ICONS[p.t.id] ?? Lucide.Cpu
  return (
    <button
      type="button"
      className={`a5-tpl-chip${p.active ? ' active' : ''}`}
      title={p.t.desc}
      onClick={p.onPick}
    >
      <Ico size={12} />
      <span>{p.t.name}</span>
    </button>
  )
}

function InfoRow(p: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="a5-info-row">
      <div className="a5-info-label">{p.label}</div>
      <div className="a5-info-value">{p.children}</div>
    </div>
  )
}

/* ============================ page ============================ */

// Simulated IDs continue after the highest seeded mock job.
let JOB_SEQ = 489348

export function SubmitJobPage(): ReactNode {
  const [f, setF] = useState<JobForm>(() => ({ ...TEMPLATES[0]!.fld, adv: { ...TEMPLATES[0]!.fld.adv } }))
  const [advOpen, setAdvOpen] = useState(false)
  const [mode, setMode] = useState<'gen' | 'custom'>('gen')
  const [draft, setDraft] = useState<string | null>(null)
  const [confirmSwitch, setConfirmSwitch] = useState<'toGen' | 'toCustom' | null>(null)
  const [activeTpl, setActiveTpl] = useState<TplId>('serial')
  const [checked, setChecked] = useState(false)
  const [submitted, setSubmitted] = useState<{ id: number; name: string } | null>(null)
  const valRef = useRef<HTMLDivElement | null>(null)

  const gen = useMemo(() => generateScript(f), [f])
  const script = mode === 'gen' ? gen : (draft ?? gen)
  const custom = mode === 'custom'
  const warns = useMemo(() => (custom ? warnAgainstForm(script, f) : []), [custom, script, f])
  const checks = useMemo(() => validate(f, script, custom), [f, script, custom])
  const errors = checks // Check is only produced for problems
  const ok = errors.length === 0

  const reads = useMemo(() => (custom ? readCustomFields(script, f) : null), [custom, script, f])
  const fEff = custom && reads !== null ? reads : f

  const totalCpus = fEff.nodes * (fEff.adv.ntasks.trim() !== '' ? Math.max(1, parseInt(fEff.adv.ntasks, 10) || 1) : 1) * fEff.cpusPerTask
  const arrayN = fEff.adv.arraySpec.trim() === '' ? null : countArray(fEff.adv.arraySpec)
  const pa = paFor(fEff.partition)
  const pMeta = PARTITIONS.find((x) => x.name === fEff.partition)

  const setField = (u: (prev: JobForm) => JobForm): void => {
    setActiveTpl('')
    setF(u)
  }

  const applyTemplate = (t: Template): void => {
    setActiveTpl(t.id)
    setF({ ...t.fld, adv: { ...t.fld.adv } })
    if (mode === 'custom') { setDraft(null); setMode('gen') }
    emitToast('info', `Template "${t.name}" loaded as a starting point — adjust the values, then validate.`)
  }

  const setAdv = (k: AdvField, v: string): void => setField((prev) => ({ ...prev, adv: { ...prev.adv, [k]: v } }))
  const numAdv = (k: AdvField, v: string): void => setAdv(k, v.replace(/[^0-9]/g, ''))
  const toggleExclusive = (): void => setField((prev) => ({ ...prev, adv: { ...prev.adv, exclusive: !prev.adv.exclusive } }))

  const dirty = custom && draft !== null && draft !== gen

  const requestMode = (m: 'gen' | 'custom'): void => {
    if (m === mode) return
    if (m === 'custom') { setMode('custom'); return }
    if (dirty) { setConfirmSwitch('toGen'); return }
    setDraft(null)
    setMode('gen')
  }

  const doSwitch = (): void => {
    if (confirmSwitch === 'toGen') { setDraft(null); setMode('gen') }
    else if (confirmSwitch === 'toCustom') setMode('custom')
    setConfirmSwitch(null)
  }

  const validateNow = (): void => {
    setChecked(true)
    emitToast(ok ? 'success' : 'error', ok ? 'Job configuration is valid — ready to submit.' : `${errors.length} validation error${errors.length === 1 ? '' : 's'} need attention.`)
    if (!ok) window.setTimeout(() => valRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const doSubmit = (): void => {
    const errs = validate(f, script, custom)
    if (errs.length > 0) {
      setChecked(true)
      emitToast('error', 'Resolve validation errors before submitting.')
      window.setTimeout(() => valRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      return
    }
    const id = JOB_SEQ++
    const job: EnJob = {
      id,
      name: f.name.trim() === '' ? 'sbatch-job' : f.name,
      user: 'arun.bhatti',
      partition: f.partition,
      state: 'PENDING',
      elapsedStr: '0:00',
      nodes: f.nodes,
      account: f.account,
      qos: f.qos,
      priority: 4291,
      resources: `${f.nodes} node${f.nodes === 1 ? '' : 's'} · ${f.cpusPerTask} cpus${f.gpus > 0 ? ` · ${f.gpus} gpu` : ''}${f.memGB > 0 ? ` · ${f.memGB}G` : ''}`,
      submitStr: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
    }
    JOBS.push(job)
    setSubmitted({ id, name: job.name })
    setChecked(false)
    emitToast('success', `Job ${id} accepted by the simulated scheduler`)
  }

  const resetForm = (): void => {
    setF({ ...EMPTY_FORM, adv: { ...DEFAULT_ADV } })
    setActiveTpl('')
    setChecked(false)
    setSubmitted(null)
    setMode('gen')
    setDraft(null)
    emitToast('info', 'Form reset to defaults.')
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Slurm Jobs', onClick: () => navTo({ page: 'jobs' }) }, { label: 'Submit Job' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Submit Job</h1>
          <div className="a5-pagehead-sub">Configure a Slurm batch submission · validated entirely in the browser · no real scheduler is contacted</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn" onClick={resetForm}><Lucide.RotateCcw size={13} />Reset form</button>
          <button className="aws5-btn aws5-btn--primary" onClick={doSubmit}><Lucide.Play size={13} />Submit Job</button>
        </div>
      </div>

      <div className="a5-sub">
        {/* ---------------- left column ---------------- */}
        <div className="a5-subleft">
          <Card>
            <CardH>
              <span>Job Configuration</span>
              <div className="a5-tplrow">
                {TEMPLATES.map((t) => (
                  <TemplChip key={t.id} t={t} active={activeTpl === t.id} onPick={() => applyTemplate(t)} />
                ))}
              </div>
            </CardH>
            <CardB>
              {pMeta !== undefined ? (
                <div className="a5-avail-note">
                  <Lucide.Info size={13} />
                  <span className="mono">{pMeta.name}</span> · {pMeta.nodes} nodes · {pMeta.coresPerNode} cores/node · {pMeta.memPerNodeGB} GB RAM{pMeta.gpus > 0 ? ` · ${pMeta.gpus} GPUs/node (${pa.gpusFree ?? 0} free)` : ''} · walltime ≤ <span className="mono">{pMeta.timelimit}</span>
                </div>
              ) : null}
              <div className="a5-fgrid">
                <FieldRow cells={[{ label: 'Job Name', el: <input className="aws5-input" placeholder="e.g. turbulence-prod-2025" value={fEff.name} onChange={(e) => setField((prev) => ({ ...prev, name: e.target.value }))} /> }]} />
                <FieldRow cells={[{ label: 'Partition', el: (
                  <select className="aws5-select" value={fEff.partition} onChange={(e) => setField((prev) => ({ ...prev, partition: e.target.value }))}>
                    {PARTITIONS.map((op) => <option key={op.name} value={op.name}>{op.name} — {DESC[nodeKey({ partition: op.name })] ?? op.name}</option>)}
                  </select>
                ) }]} />
                {pMeta !== undefined ? (
                  <div className="a5-pcap mono">sinfo -p {pMeta.name} · {pa.total} nodes · {pa.idle} idle · {pa.alloc} allocated · walltime cap <span className="mono">{pMeta.timelimit}</span></div>
                ) : null}
                <FieldRow cells={[
                  { label: 'Nodes', el: <input className="aws5-input" type="number" min={1} max={128} value={fEff.nodes} onChange={(e) => setField((prev) => ({ ...prev, nodes: Math.max(1, parseInt(e.target.value, 10) || 1) }))} /> },
                  { label: 'CPUs per Task', el: <input className="aws5-input" type="number" min={1} value={fEff.cpusPerTask} onChange={(e) => setField((prev) => ({ ...prev, cpusPerTask: Math.max(1, parseInt(e.target.value, 10) || 1) }))} /> },
                ]} />
                <FieldRow cells={[
                  { label: 'Memory', el: <div className="a5-unitwrap"><input className="aws5-input" type="number" min={0} value={fEff.memGB} onChange={(e) => setField((prev) => ({ ...prev, memGB: Math.max(0, parseInt(e.target.value, 10) || 0) }))} /><span className="a5-unit">GB</span></div> },
                  { label: 'GPUs', el: <div className="a5-unitwrap"><input className="aws5-input" type="number" min={0} value={fEff.gpus} onChange={(e) => setField((prev) => ({ ...prev, gpus: Math.max(0, parseInt(e.target.value, 10) || 0) }))} /><span className="a5-unit">GPUs</span></div> },
                ]} />
                <FieldRow cells={[
                  { label: 'Walltime', el: <input className="aws5-input mono" placeholder="HH:MM:SS" value={fEff.walltime} onChange={(e) => setField((prev) => ({ ...prev, walltime: e.target.value }))} /> },
                  { label: 'QoS', el: (
                    <select className="aws5-select" value={fEff.qos} onChange={(e) => setField((prev) => ({ ...prev, qos: e.target.value }))}>
                      {QOS_LIST.map((q) => <option key={q.name} value={q.name}>{q.name} — {q.desc}</option>)}
                    </select>
                  ) },
                ]} />
                <FieldRow cells={[
                  { label: 'Account', el: (
                    <select className="aws5-select" value={fEff.account} onChange={(e) => setField((prev) => ({ ...prev, account: e.target.value }))}>
                      {ACCOUNTS.map((a: string) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) },
                  { label: 'Exclusive allocation', el: (
                    <button type="button" className={`aws5-btn${fEff.adv.exclusive ? ' aws5-btn--primary' : ''}`} style={{ justifyContent: 'flex-start', width: '100%' }} onClick={toggleExclusive}>
                      {fEff.adv.exclusive ? <Lucide.CheckCircle2 size={13} /> : <Lucide.Plus size={13} />}
                      <span>{fEff.adv.exclusive ? 'Requested — exclusive nodes' : 'Not requested (shared nodes)'}</span>
                    </button>
                  ) },
                ]} />
              </div>

              {custom ? (
                <div className="a5-avail-note"><Lucide.PenLine size={13} />Custom script mode — the values above are best-effort reads from the script. On conflict the script wins.</div>
              ) : null}
              {warns.length > 0 ? (
                <div className="a5-warnlist">
                  {warns.map((w, i) => (
                    <div key={i} className={`a5-warnrow${w.kind === 'red' ? ' red' : ''}`}><Lucide.AlertTriangle size={12} />{w.text}</div>
                  ))}
                </div>
              ) : null}

              <details className="a5-adv" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
                <summary>
                  <Lucide.ChevronRight size={13} className={`a5-adv-chev${advOpen ? ' open' : ''}`} />
                  <span>Advanced Options</span>
                  <span className="a5-adv-sub">{[
                    fEff.adv.arraySpec.trim() !== '' ? 'array' : null,
                    fEff.adv.ntasks.trim() !== '' ? 'ntasks' : null,
                    fEff.adv.ntasksPerNode.trim() !== '' ? 'tasks/node' : null,
                    fEff.adv.gres.trim() !== '' ? 'gres' : null,
                    fEff.adv.constraint.trim() !== '' ? 'constraint' : null,
                    fEff.adv.dependency.trim() !== '' ? 'dependency' : null,
                    fEff.adv.exclusive ? 'exclusive' : null,
                    fEff.adv.notifyEmail.trim() !== '' ? 'email' : null,
                    fEff.adv.workDir.trim() !== '' ? 'chdir' : null,
                  ].filter(Boolean).join(' · ') || 'no overrides set'}</span>
                </summary>
                <div className="a5-adv-body">
                  <FieldRow cells={[
                    { label: 'Tasks per node (--ntasks-per-node)', el: <input className="aws5-input" type="number" min={1} placeholder="none" value={fEff.adv.ntasksPerNode} onChange={(e) => numAdv('ntasksPerNode', e.target.value)} /> },
                    { label: 'Total tasks (--ntasks)', el: <input className="aws5-input" type="number" min={1} placeholder="none" value={fEff.adv.ntasks} onChange={(e) => numAdv('ntasks', e.target.value)} /> },
                  ]} />
                  <FieldRow cells={[
                    { label: 'Job array (--array)', el: <input className="aws5-input mono" placeholder="1-10,20,40-48" value={fEff.adv.arraySpec} onChange={(e) => setAdv('arraySpec', e.target.value)} /> },
                    { label: 'Dependency (--dependency)', el: <input className="aws5-input mono" placeholder="afterok:489347" value={fEff.adv.dependency} onChange={(e) => setAdv('dependency', e.target.value)} /> },
                  ]} />
                  <FieldRow cells={[
                    { label: 'Output file (--output)', el: <input className="aws5-input mono" value={fEff.adv.outFile} onChange={(e) => setAdv('outFile', e.target.value)} /> },
                    { label: 'Error file (--error)', el: <input className="aws5-input mono" value={fEff.adv.errFile} onChange={(e) => setAdv('errFile', e.target.value)} /> },
                  ]} />
                  <FieldRow cells={[
                    { label: 'Working directory (--chdir)', el: <input className="aws5-input mono" placeholder="/shared/projects/…" value={fEff.adv.workDir} onChange={(e) => setAdv('workDir', e.target.value)} /> },
                    { label: 'Node constraints (--constraint)', el: <input className="aws5-input mono" placeholder="epyc|milan" value={fEff.adv.constraint} onChange={(e) => setAdv('constraint', e.target.value)} /> },
                  ]} />
                  <FieldRow cells={[
                    { label: 'Generic resources (--gres)', el: <input className="aws5-input mono" placeholder="gpu:a100:2,nic:1" value={fEff.adv.gres} onChange={(e) => setAdv('gres', e.target.value)} /> },
                    { label: 'Email notifications', el: (
                      <div>
                        <input className="aws5-input" type="email" placeholder="you@institute.ac.uk" value={fEff.adv.notifyEmail} onChange={(e) => setAdv('notifyEmail', e.target.value)} />
                        <div className="a5-adv-hint mono">adds --mail-type=ALL + --mail-user</div>
                      </div>
                    ) },
                  ]} />
                  <div className="a5-switchrow">
                    <label className="a5-switch">
                      <input type="checkbox" checked={fEff.adv.exclusive} onChange={toggleExclusive} />
                      <span className="a5-switch-track"><span className="a5-switch-knob" /></span>
                      <span>Exclusive node allocation <span className="mono">(--exclusive)</span></span>
                    </label>
                  </div>
                </div>
              </details>
            </CardB>
          </Card>

          <Card>
            <CardH>
              <span>Batch Script</span>
              <div className="a5-editor-side">
                <div className="a5-seg">
                  <button type="button" className={`a5-segbtn${mode === 'gen' ? ' active' : ''}`} onClick={() => requestMode('gen')}><Lucide.Wand2 size={13} /><span>Generated</span></button>
                  <button type="button" className={`a5-segbtn${mode === 'custom' ? ' active' : ''}`} onClick={() => requestMode('custom')}><Lucide.PenLine size={13} /><span>Custom</span></button>
                </div>
                <button className="aws5-btn aws5-btn--sm" onClick={() => copy(script, 'Batch script')}><Lucide.Clipboard size={13} />Copy script</button>
              </div>
            </CardH>
            <CardB>
              {custom ? (
                <div className="a5-editnote custom">
                  <Lucide.PenLine size={13} />
                  <span><strong>Custom script is the source of truth.</strong> The form no longer regenerates the script — edit it freely below. <button className="a5-name-link" onClick={() => requestMode('gen')}>Back to Generated</button></span>
                </div>
              ) : (
                <div className="a5-editnote"><Lucide.Wand2 size={13} />Script is generated from the form above — change a field to update it. Switch to <em>Custom</em> to edit it freely.</div>
              )}
              <ScriptEditor script={script} onChange={(v) => { if (mode === 'custom') setDraft(v) }} />
            </CardB>
          </Card>
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="a5-subright">
          <Card>
            <CardH>
              <span>Submission Preview</span>
              <span className="a5-modechip">{custom ? 'custom script' : 'generated'}</span>
            </CardH>
            <CardB>
              <InfoRow label="Job name"><span className={fEff.name.trim() === '' ? 'a5-info-missing' : ''}>{fEff.name.trim() === '' ? 'not set' : fEff.name}</span></InfoRow>
              <InfoRow label="Partition"><span className="mono">{fEff.partition}</span></InfoRow>
              <InfoRow label="Requested resources"><span className="mono">{fEff.nodes} node{fEff.nodes === 1 ? '' : 's'} · {fEff.cpusPerTask} cpus per task · {fEff.memGB} GB RAM{fEff.gpus > 0 ? ` · ${fEff.gpus} GPU${fEff.gpus === 1 ? '' : 's'}` : ''}</span></InfoRow>
              <InfoRow label="Total requested CPUs"><span className="mono">{totalCpus}</span></InfoRow>
              <InfoRow label="Walltime"><span className="mono">{normalizeWall(fEff.walltime)}</span>{pMeta !== undefined ? <span className="a5-info-sub"> · partition cap {pMeta.timelimit}</span> : null}</InfoRow>
              <InfoRow label="QoS"><span className="mono">{fEff.qos}</span></InfoRow>
              <InfoRow label="Account"><span className="mono">{fEff.account !== '' ? fEff.account : 'staff'}</span></InfoRow>
              {arrayN !== null ? <InfoRow label="Array"><span className="mono">{fEff.adv.arraySpec}</span><span className="a5-info-sub"> · ≈ {arrayN} task instances</span></InfoRow> : null}
              {fEff.adv.ntasks.trim() !== '' ? <InfoRow label="Total tasks (--ntasks)"><span className="mono">{fEff.adv.ntasks}</span>{fEff.adv.ntasksPerNode.trim() !== '' ? <span className="a5-info-sub"> · {fEff.adv.ntasksPerNode} per node</span> : null}</InfoRow> : null}
              <InfoRow label="Command"><span className="mono">sbatch submit.sh</span></InfoRow>
              <div className="a5-preview-acts">
                <button className="aws5-btn aws5-btn--sm" onClick={() => copy('sbatch submit.sh', 'Submission command')}><Lucide.Clipboard size={13} />Copy command</button>
                <button className="aws5-btn aws5-btn--sm" onClick={() => copy(script, 'Batch script')}><Lucide.FileCode2 size={13} />Copy script</button>
              </div>
            </CardB>
          </Card>

          <Card>
            <CardH><span>Partition Availability</span></CardH>
            <CardB>
              <div className="a5-avail-list">
                {PA.map((x) => (
                  <button key={x.key} type="button" className={`a5-prow${fEff.partition === K2P[x.key] ? ' active' : ''}`} onClick={() => setField((prev) => ({ ...prev, partition: K2P[x.key]! }))}>
                    <span className="a5-prow-name mono">{K2U[x.key]}</span>
                    <span className="a5-prow-nums">{x.idle}/{x.total} idle</span>
                    <span className="a5-bar"><span className="a5-barfill" style={{ width: `${x.total === 0 ? 0 : Math.round(100 * (x.idle / x.total))}%` }} /></span>
                    <span className="a5-prow-meta">{x.alloc} alloc · cap {x.maxWall} · {x.pending} pending</span>
                  </button>
                ))}
              </div>
              <p className="a5-footnote"><Lucide.Info size={13} />Idle counts are a simulated estimate from the mock cluster snapshot — actual start times depend on scheduler backfill.</p>
            </CardB>
          </Card>

          <div ref={valRef}>
            <Card>
              <CardH>
                <span>Job Validation</span>
                <span className={`a5-valbadge${ok ? (checked ? ' ok' : '') : ' bad'}`}>
                  {ok ? (checked ? 'valid' : 'not yet checked') : `${errors.length} error${errors.length === 1 ? '' : 's'}`}
                </span>
              </CardH>
              <CardB>
                {errors.length === 0 ? (
                  <div className="a5-vrow ok"><Lucide.CheckCircle2 size={12} /><span>All checks passed — configuration and script look good.</span></div>
                ) : (
                  <div className="a5-vallist">
                    {errors.map((c, i) => (
                      <div key={i} className={`a5-vrow ${c.kind === 'red' ? 'red' : 'amber'}`}>
                        <Lucide.AlertTriangle size={12} />
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="a5-valfoot">
                  <span className="a5-val-counts"><span className="mono">{errors.length}</span> error{errors.length === 1 ? '' : 's'} · {errors.filter((c) => c.kind === 'amber').length} warning{errors.filter((c) => c.kind === 'amber').length === 1 ? '' : 's'}</span>
                  <button className="aws5-btn aws5-btn--sm" onClick={validateNow}><Lucide.ClipboardCheck size={13} />Validate Job</button>
                </div>
                {checked && !ok ? <div className="a5-vrow red"><Lucide.AlertTriangle size={12} /><span>Resolve the highlighted errors — errors block submission, warnings do not.</span></div> : null}
                {checked && ok ? (<div className="a5-vrow ok"><Lucide.CheckCircle2 size={12} /><span>Validation passed — the submit button is enabled.</span></div>) : null}
              </CardB>
            </Card>
          </div>

          <Card>
            <CardH><span>Submit</span></CardH>
            <CardB>
              {submitted !== null ? (
                <SysBanner kind="success" title={`Job ${submitted.id} accepted (simulated)`}>
                  “{submitted.name}” is PENDING in <span className="mono">{f.partition}</span> as <span className="mono">arun.bhatti</span>.
                  <div className="a5-banner-acts">
                    <button className="aws5-btn aws5-btn--sm" onClick={() => navTo({ page: 'jobs' })}><Lucide.ListOrdered size={13} />View submitted job</button>
                    <button className="aws5-btn aws5-btn--sm" onClick={resetForm}><Lucide.Plus size={13} />Submit another job</button>
                  </div>
                </SysBanner>
              ) : null}
              <button className="aws5-btn aws5-btn--primary a5-submit-big" onClick={doSubmit} disabled={!ok && checked}>
                <Lucide.Play size={14} />Submit Job
              </button>
              <div className="a5-submitmeta"><span className="mono">sbatch submit.sh</span></div>
              <p className="a5-footnote"><Lucide.Info size={13} />Simulated submission — no scheduler is contacted; the job is appended to the mock queue.</p>
            </CardB>
          </Card>
        </div>
      </div>

      {confirmSwitch !== null ? (
        <div className="a5-modal-veil" onClick={() => setConfirmSwitch(null)}>
          <div className="a5-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="a5-modal-head">
              <h3 className="a5-modal-title">{confirmSwitch === 'toGen' ? 'Discard the custom script?' : 'Switch to a custom script?'}</h3>
              <button className="a5-iconbtn" onClick={() => setConfirmSwitch(null)}><Lucide.X size={14} /></button>
            </div>
            <div className="a5-modal-body">
              {confirmSwitch === 'toGen'
                ? 'Generated mode will replace the script with one rebuilt from the current form values.'
                : 'Custom mode keeps the current script as a starting point — later form changes will not rewrite it.'}
            </div>
            <div className="a5-modal-foot">
              <button className="aws5-btn" onClick={() => setConfirmSwitch(null)}>Cancel</button>
              <button className="aws5-btn aws5-btn--primary" onClick={doSwitch}>
                {confirmSwitch === 'toGen' ? 'Discard & regenerate' : 'Switch to custom'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}