import { useEffect, useRef, useState } from 'react'
import * as Lucide from 'lucide-react'
import { FROZEN } from '../../data'
import type { EnNode, Role } from '../../data'

export type TermTab = { id: number; host: string; node: string }

type TermLine = { text: string; cls?: string }

const PROMPT_USER = 'arun.bhatti'

const pad2 = (n: number): string => String(n).padStart(2, '0')
const clock = (d: Date): string => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`

const fmtUptime = (up: string): string => up.replace(/,/g, ',').toLowerCase()
const pick = (seed: string, arr: string[]): string => arr[Math.abs(nodeNameHash(seed)) % arr.length]

function nodeNameHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function buildCommand(host: string, node: EnNode | undefined, cmd: string): TermLine[] {
  const c = cmd.trim()
  const bare = c.split(/\s+/)[0]
  const args = c.split(/\s+/).slice(1)
  const now = new Date(FROZEN)

  const res = (lines: TermLine[]): TermLine[] => lines

  switch (bare) {
    case '':
      return res([])
    case 'help':
      return res([
        { text: 'GNU Bash 5.1 — Enucc console demo shell (simulated SSH)', cls: 'a2-t-dim' },
        { text: 'Available: hostname  uptime  free -h  df -h  squeue  sinfo  sjobs  nvidia-smi  ls  whoami  date  clear  exit', cls: 'a2-t-out' },
      ])
    case 'hostname':
      return res([{ text: host, cls: 'a2-t-out' }])
    case 'whoami':
      return res([{ text: PROMPT_USER, cls: 'a2-t-out' }])
    case 'date':
      return res([{ text: now.toUTCString().replace('GMT', 'UTC'), cls: 'a2-t-out' }])
    case 'uptime': {
      const up = node ? fmtUptime(node.uptimeStr) : '46 days, 12 hours'
      const load = node && node.state === 'ALLOCATED' ? node.load1.toFixed(2) : '0.08'
      return res([
        { text: ` ${clock(now)} up ${up},  3 users,  load average: ${load}, ${Math.max(0, Number(load) - 0.31).toFixed(2)}, ${Math.max(0, Number(load) - 0.55).toFixed(2)}`, cls: 'a2-t-out' },
      ])
    }
    case 'free':
      if (node) {
        const realGB = node.realMemGB
        const totalMB = node.memGB * 1024
        const usedMB = realGB * 1024
        const availMB = totalMB - usedMB
        const swapT = 8192
        return res([
          { text: '               total        used        free      shared  buff/cache   available', cls: 'a2-t-out' },
          { text: `Mem:      ${fmtGB(totalMB / 1024).padStart(10)}  ${fmtGB(usedMB / 1024).padStart(10)}  ${fmtGB(Math.max(16, (availMB * 0.08) / 1024)).padStart(10)}        312Mi  ${fmtGB(Math.max(64, (availMB * 0.16) / 1024)).padStart(10)}  ${fmtGB(availMB / 1024).padStart(10)}`, cls: 'a2-t-out' },
          { text: `Swap:     ${fmtGB(swapT / 1024).padStart(10)}         0B  ${fmtGB(swapT / 1024).padStart(10)}`, cls: 'a2-t-out' },
        ])
      }
      return res([{ text: 'Mem:            30Gi       4.2Gi        21Gi       312Mi       4.8Gi        24Gi', cls: 'a2-t-out' }, { text: 'Swap:          8.0Gi          0B       8.0Gi', cls: 'a2-t-out' }])
    case 'df':
      return res([
        { text: 'Filesystem                Size  Used Avail Use% Mounted on', cls: 'a2-t-out' },
        { text: 'en fs-home:/export/home   1.0T  742G  288G  73% /home', cls: 'a2-t-out' },
        { text: 'fs-scratch@o2ib:/scratch  2.0T  1.4T  610G  70% /scratch', cls: 'a2-t-out' },
        { text: 'fs-shared@o2ib:/shared    1.0T  742G  288G  73% /shared', cls: 'a2-t-out' },
        { text: '/dev/nvme0n1p2            3.8T  128G  3.7T   4% /opt/slurm', cls: 'a2-t-out' },
      ])
    case 'ls':
      return res([{ text: pick(host, ['slurm-logs/", "scripts/", "checkpoint.pt  data/  results/', 'data/  jobs/  logs/  scripts/  README.md']),
        cls: 'a2-t-blue' }])
    case 'squeue':
      return res([
        { text: 'JOBID      PARTITION        NAME             USER          ST  TIME        NODES  NODELIST(REASON)', cls: 'a2-t-cyan' },
        { text: '489347_0         gpu      cnn_training     s.chen        R   6:12:44     1      enucc-gpu-001', cls: 'a2-t-out' },
        { text: '489322            compute  md_simulation    j.davies      R   4:17:01     1      enucc-cpu-001', cls: 'a2-t-out' },
        { text: '489301            compute  data_process     a.khan        R   1:03:56     1      enucc-cpu-002', cls: 'a2-t-out' },
        { text: '489276            gpu      viz_render       m.ross        R   0:57:12     1      enucc-gpu-002', cls: 'a2-t-out' },
        { text: '489254            himem    mesh_analysis    l.patel      PD   --          1      (Resources)', cls: 'a2-t-amber' },
      ])
    case 'sinfo':
      return res([
        { text: 'PARTITION    AVAIL  TIMELIMIT   NODES  NODELIST', cls: 'a2-t-cyan' },
        { text: 'login*          up   infinite       2   enucc-login-[01-02]', cls: 'a2-t-out' },
        { text: 'compute         up   infinite     101   enucc-cpu-[001-106]', cls: 'a2-t-out' },
        { text: 'gpu             up  7-00:00:00    13   enucc-gpu-[001-013]', cls: 'a2-t-out' },
        { text: 'himem           up  5-00:00:00    12   enucc-himem-[01-12]', cls: 'a2-t-out' },
      ])
    case 'sjobs':
    case 'sacct':
      return res([
        { text: 'JobID      JobName       Partition  Account   AllocCPUS  State     ExitCode', cls: 'a2-t-cyan' },
        { text: '489347     cnn_training  gpu        eng-vis   16         RUNNING   0:0', cls: 'a2-t-out' },
        { text: '489322     md_simulation compute    chemistry 32         RUNNING   0:0', cls: 'a2-t-out' },
      ])
    case 'sbatch':
      return res([{ text: `sbatch: submitted batch job ${489340 + (nodeNameHash(c) % 40)} — simulated`, cls: 'a2-t-green' }])
    case 'srun':
      return res([{ text: 'srun: job 489351 queued and waiting for resources — simulated', cls: 'a2-t-amber' }])
    case 'scancel':
      return res([{ text: args[0] ? `scancel: signalling Job ${args[0]} — simulated` : 'scancel: error: No job_id specified', cls: args[0] ? 'a2-t-amber' : 'a2-t-red' }])
    case 'nvidia-smi': {
      if (!node || node.gpuCount === 0) return res([{ text: 'NVIDIA-SMI has failed because it could not communicate with the NVIDIA driver (no GPUs on this host)', cls: 'a2-t-red' }])
      const rows = Array.from({ length: node.gpuCount }, (_, i) => {
        const temp = 62 + (i % 7)
        const pwr = 268 + (i * 17) % 120
        const memU = 32 + (i * 9) % 18
        return [
          { text: `|   ${i}  A100-SXM4-80GB    On            | 00000000:${hex(i)}:00.0   On |                  Off |`, cls: 'a2-t-out' },
          { text: `|  ${30 + (i % 9)}%   ${temp}C    P0         ${pwr}W / 400W |   ${memU * 1024}MiB / 81920MiB  |     ${(52 + (i * 7) % 30) % 100}%      Default |`, cls: 'a2-t-out' },
          { text: '|-----------------------------------------+------------------------+---------------------|', cls: 'a2-t-out' },
        ]
      }).flat()
      return res([
        { text: `Mon Nov 17 ${clock(now)} 2026`, cls: 'a2-t-out' },
        { text: '+---------------------------------------------------------------------------------------+', cls: 'a2-t-out' },
        { text: '| NVIDIA-SMI 550.54.15       Driver Version: 550.54.15       CUDA Version: 12.4         |', cls: 'a2-t-out' },
        { text: '|-----------------------------------------+------------------------+---------------------+', cls: 'a2-t-out' },
        { text: '| GPU  Name        Persistence-M          | Bus-Id          Disp.A | Volatile Uncorr. ECC |', cls: 'a2-t-out' },
        { text: '| Fan  Temp  Perf         Pwr:Usage/Cap   |    Memory-Usage        | GPU-Util  Compute M. |', cls: 'a2-t-out' },
        { text: '|=========================================+========================+=====================|', cls: 'a2-t-out' },
        ...rows,
        { text: '', cls: 'a2-t-out' },
        { text: '+---------------------------------------------------------------------------------------+', cls: 'a2-t-out' },
      ])
    }
    case 'clear':
      return res([{ text: '@clear@' }])
    case 'exit':
      return res([{ text: 'logout', cls: 'a2-t-dim' }, { text: 'Connection to host closed. (Demo terminal — you can close this pane.)', cls: 'a2-t-amber' }])
    default:
      return res([{ text: `bash: ${bare}: command not found`, cls: 'a2-t-red' }])
  }
}

function hex(i: number): string {
  return (0x1b + (i * 7) % 0x2f).toString(16).padStart(2, '0')
}

function fmtGB(gib: number): string {
  if (gib >= 1024) return `${(gib / 1024).toFixed(1)}Ti`
  if (gib >= 10) return `${Math.round(gib)}Gi`
  return `${gib.toFixed(1)}Gi`
}

export function TerminalWindow({
  tabs, activeTab, onCloseTab, onFocusTab, onNewTab, onCloseAll, nodes, role,
}: {
  tabs: TermTab[]
  activeTab: number | null
  onCloseTab: (id: number) => void
  onFocusTab: (id: number) => void
  onNewTab: () => void
  onCloseAll: () => void
  nodes: EnNode[]
  role: Role
}) {
  const [commands, setCommands] = useState<Record<string, Array<{ id: number; line: TermLine }>>>({})
  const [input, setInput] = useState('')
  const [pos, setPos] = useState({ x: 160, y: 110 })
  const [maximized, setMaximized] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const seqRef = useRef(0)
  const activeHost = tabs.find((t) => t.id === activeTab)?.host ?? 'enucc'

  // Auto-scroll to bottom.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [commands, activeTab, tabs.length])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy })
    }
    const up = () => { dragRef.current = null }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [activeTab])

  const runCommand = (cmd: string) => {
    const tabId = activeTab
    if (tabId == null) return
    const node = nodes.find((n) => n.name === activeHost)
    seqRef.current += 1
    const entry = { id: seqRef.current, line: { text: `${PROMPT_USER}@${activeHost}:~$ ${cmd}`, cls: 'a2-t-cmd' } }
    setCommands((prev) => {
      const hist = prev[activeHost] ?? []
      let out: TermLine[] = []
      if (cmd.trim() === 'clear') out = []
      else out = buildCommand(activeHost, node, cmd)
      const outRows = out.filter((l) => l.text !== '@clear@').map((l, i) => ({ id: seqRef.current * 100 + i, line: l }))
      return { ...prev, [activeHost]: cmd.trim() === 'clear' ? outRows : [...hist, entry, ...outRows] }
    })
    void tabId
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(input)
      setInput('')
    }
  }

  if (tabs.length === 0) return null

  const isMax = maximized

  return (
    <div
      className={`a2-term${isMax ? ' a2-term--max' : ''}`}
      style={isMax ? undefined : { left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="Simulated SSH terminal"
    >
      <div className="a2-term-head" onMouseDown={(e) => {
        if (isMax) return
        dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
      }}
      onDoubleClick={() => setMaximized((m) => !m)}
      >
        <span className="a2-term-dots"><i /><i /><i /></span>
        <div className="a2-term-tabs">
          {tabs.map((t) => (
            <div
              key={t.id}
              className={`a2-term-tab${t.id === activeTab ? ' active' : ''}`}
              onClick={() => onFocusTab(t.id)}
            >
              <Lucide.SquareTerminal size={12} />
              <span>{t.host}</span>
              <button className="a2-term-close" aria-label={`Close ${t.host} session`} onClick={(e) => { e.stopPropagation(); onCloseTab(t.id) }}>
                <Lucide.X size={11} />
              </button>
            </div>
          ))}
          <button className="a2-term-newtab" title="New terminal tab" onClick={onNewTab}><Lucide.Plus size={12} /></button>
        </div>
        <div className="a2-term-actions">
          <button className="a2-term-act" title={isMax ? 'Restore' : 'Maximise'} onClick={() => setMaximized((m) => !m)}>
            {isMax ? <Lucide.Minimize2 size={13} /> : <Lucide.Maximize2 size={13} />}
          </button>
          <button className="a2-term-act" title="Close all sessions" onClick={onCloseAll}><Lucide.X size={13} /></button>
        </div>
      </div>

      <div className="a2-term-body" ref={bodyRef} onMouseDown={() => inputRef.current?.focus()}>
        <div className="a2-term-banner a2-t-dim">
          <div>Enucc Console — simulated SSH session ({role === 'admin' ? 'administrator' : 'standard user'} persona)</div>
          <div>Connected to <span className="a2-t-cyan">{activeHost}.enucc.alces.network</span> · demo shell · type <span className="a2-t-green">help</span> for commands.</div>
        </div>
        {(commands[activeHost] ?? []).map((r) => (
          <div key={`${activeHost}-${r.id}`} className={r.line.cls ? `a2-termineline ${r.line.cls}` : 'a2-termineline'}>{r.line.text || '\u00A0'}</div>
        ))}
        <div className="a2-term-inputline">
          <span className="a2-term-prompt a2-t-cyan">{PROMPT_USER}@{activeHost}<span className="a2-t-out">:~$ </span></span>
          <input
            ref={inputRef}
            className="a2-term-inputbox"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Terminal input"
          />
        </div>
      </div>

      <div className="a2-term-foot">
        <span><Lucide.ShieldCheck size={11} /> simulated connection — no real SSH traffic</span>
        <span className="a2-term-foot-dim">bash 5.1 · enucc.alces.network</span>
      </div>
    </div>
  )
}

/** Convenience: derive host from node name (login nodes keep full host). */
export function hostOf(nodeName: string): string {
  return nodeName
}
