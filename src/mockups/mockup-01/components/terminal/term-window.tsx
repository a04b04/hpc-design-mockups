import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui'
import { cs } from '../../../../lib/format'
import { closeWindow, focusWindow, setWindowPos, toggleMaxWindow, useWindows } from '../../../../lib/store-win'
import type { WinItem } from '../../../../lib/store-win'

/* ------------------------------------------------ fake shell content */
type LineKind = 'out' | 'in' | 'sys'
interface Line {
  k: LineKind
  t: string
}

const mk = (k: LineKind, t: string): Line => ({ k, t })

function sinfoOut(): Line[] {
  return [
    mk('out', 'PARTITION    AVAIL  TIMELIMIT  NODES  STATE  NODELIST'),
    mk('out', 'standard*       up   infinite     86  mix    helios-c[001-092]'),
    mk('out', 'gpu             up   infinite     39  mix    helios-gpu[001-040]'),
    mk('out', 'bigmem          up   infinite      9  mix    helios-gpu[031-040]'),
    mk('out', 'debug           up      2:00:0     4  idle   helios-debug[1-4]'),
    mk('out', ''),
  ]
}

function squeueOut(): Line[] {
  return [
    mk('out', '   JOBID PARTITION      NAME     USER ST       TIME NODES NODELIST(REASON)'),
    mk('out', '   10733       gpu  ligand-dock      ada  R     14:22     2 gpu[004,011]'),
    mk('out', '   10729   standard  qcd-lattice    marie  R   1:12:05     4 c[012-015]'),
    mk('out', '   10721       gpu   proteome-ft      ken  R   3:41:08     3 gpu[008-010]'),
    mk('out', '   10736       gpu   cryo-refine    sofia PD      0:00     8 (Priority)'),
    mk('out', ''),
  ]
}

function nvidiaSmiOut(): Line[] {
  const rows = [
    [0, 94, 62310], [1, 88, 58112], [2, 12, 12984], [3, 0, 912],
    [4, 97, 70210], [5, 91, 58440], [6, 45, 31200], [7, 62, 45880],
  ]
  return [
    mk('out', 'Mon Nov 17 12:34:22 2026'),
    mk('out', '+-----------------------------------------------------------------------------+'),
    mk('out', '| NVIDIA-SMI 550.54.15    Driver Ver: 550.54.15    CUDA Ver: 12.4             |'),
    mk('out', '|-------------------------------+----------------------+----------------------|'),
    ...rows.map(
      ([i, util, mem]) =>
        mk('out', `|   ${i}  H100 SXM5     On  | ${String(mem).padStart(6)}MiB / 81559MiB  |  ${String(util).padStart(2)}%   Default |`),
    ),
    mk('out', ''),
  ]
}

function respond(cmd: string, nodeId: string, kind: string): Line[] {
  const c = cmd.trim()
  const base = c.split(/\s+/)[0] || ''
  if (!c) return []
  if (c === 'clear') return []
  if (c === 'sinfo') return sinfoOut()
  if (c === 'squeue') return squeueOut()
  if (base === 'srun')
    return [
      mk('out', 'srun: job 10741 queued and waiting for resources'),
      mk('out', 'srun: job 10741 has been allocated resources'),
      mk('out', nodeId),
      mk('out', ''),
    ]
  if (base === 'sacct')
    return [mk('out', '       JobID    JobName  Partition    Account  AllocCPUS      State ExitCode'), mk('out', ''), mk('out', ''), mk('out', '')]
  if (base === 'nvidia-smi') {
    return kind === 'gpu'
      ? nvidiaSmiOut()
      : [mk('out', 'nvidia-smi: no NVIDIA driver / GPU detected on this node'), mk('out', '')]
  }
  if (base === 'ls')
    return [mk('out', 'simcore/  data/  notes.md  run-ligand.sh  slurm-10733.out  submit-ligand.sh'), mk('out', '')]
  if (base === 'df')
    return [
      mk('out', 'Filesystem       Size  Used Avail Use%  Mounted on'),
      mk('out', 'fs-home:/home    220T  119T  101T  54%  /home'),
      mk('out', 'fs-scr:/scratch  1.8P  1.48P  340T  82%  /scratch'),
      mk('out', ''),
    ]
  if (base === 'whoami') return [mk('out', 'ada'), mk('out', '')]
  if (base === 'hostname') return [mk('out', nodeId), mk('out', '')]
  if (base === 'uptime')
    return [mk('out', ' 12:34:22 up 47 days,  3:12,  3 users,  load average: 8.41, 8.02, 7.90'), mk('out', '')]
  if (base === 'free')
    return [
      mk('out', '               total        used        free      shared  available'),
      mk('out', 'Mem:            1007G       745G       262G       4.1G        258G'),
      mk('out', ''),
    ]
  if (base === 'scancel') return [mk('out', 'scancel: access denied — this is a simulation'), mk('out', '')]
  if (base === 'sbatch')
    return [mk('out', `sbatch: Submitted batch job ${10700 + Math.floor(Math.random() * 40)}`), mk('out', '')]
  if (base === 'exit' || base === 'logout')
    return [mk('out', 'logout'), mk('sys', '── Session ended. Closing window… ──'), mk('out', '')]
  if (base === 'help' || c === '?')
    return [
      mk(
        'sys',
        'try: sinfo · squeue · srun hostname · nvidia-smi · ls · df -h · uptime · free · whoami · hostname · sbatch · clear · exit',
      ),
      mk('out', ''),
    ]
  return [mk('out', `bash: ${base}: command not found — type help for supported commands`), mk('out', '')]
}

function banner(nodeId: string): Line[] {
  return [
    mk('sys', `── connected to ${nodeId} · simulated SSH session ──`),
    mk('out', ''),
    mk('sys', '  ┌──────────────────────────────────────────────┐'),
    mk('sys', '  │   H E L I O S  ·  HPC cluster · Slurm 23.11.7 │'),
    mk('sys', '  └──────────────────────────────────────────────┘'),
    mk('out', ''),
    mk('out', '  Welcome to Helios. Unauthorised access is prohibited.'),
    mk('out', '  Last login: Tue Nov 17 12:19:03 2026 from 10.42.7.19'),
    mk('out', ''),
    mk('sys', '  quota: home 412 GB used of 1.0 TB   ·   scratch purge in 36h'),
    mk('sys', '  tip: type "help" for available commands'),
    mk('out', ''),
  ]
}

/* ------------------------------------------------ window chrome */
function TitleBar(props: { win: WinItem; onBeginDrag: (e: React.MouseEvent) => void }) {
  const { win, onBeginDrag } = props
  return (
    <div
      onMouseDown={onBeginDrag}
      onDoubleClick={() => toggleMaxWindow(win.id)}
      className="flex h-[38px] shrink-0 cursor-grab items-center gap-2 border-b border-edge bg-abyss/60 px-3 select-none active:cursor-grabbing"
    >
      <span className="text-green/80">
        <Icon n="terminal" size={13} />
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-steam">
        <span className="text-quill">{win.user}@</span>
        {win.host}
      </span>
      <span className="chip hidden font-mono text-[9px] tracking-wide sm:inline">ssh · simulated</span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Maximize window"
          onClick={(e) => { e.stopPropagation(); toggleMaxWindow(win.id) }}
          className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[7px] text-ghost hover:bg-steel hover:text-frost"
        >
          <Icon n="maximize" size={11} />
        </button>
        <button
          type="button"
          aria-label="Close window"
          onClick={(e) => { e.stopPropagation(); closeWindow(win.id) }}
          className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[7px] text-ghost hover:bg-red/20 hover:text-red"
        >
          <Icon n="x" size={11} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------ terminal body */
export function TerminalBody(props: {
  host: string
  user: string
  kind: string
  className?: string
  onClose?: () => void
}) {
  const { host, user, kind, className, onClose } = props
  const [lines, setLines] = useState<Line[]>(() => banner(host))
  const [value, setValue] = useState('')
  const [live, setLive] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)
  const historyRef = useRef<string[]>([])
  const histIdx = useRef(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit() {
    if (!live) return
    const entered = value
    if (!entered.trim()) {
      setLines((prev) => [...prev, mk('in', '')])
      setValue('')
      return
    }
    const out = respond(entered, host, kind)
    historyRef.current.push(entered)
    histIdx.current = -1
    const ended = /(^|\s)(exit|logout)(\s|$)/.test(entered.trim())
    setLines((prev) => [...prev, mk('in', entered), ...out])
    setValue('')
    if (ended) {
      setLive(false)
      if (onClose) setTimeout(onClose, 1100)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { submit(); return }
    if (e.key === 'Escape') { setValue(''); return }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setLines([mk('sys', '── session log cleared ──')])
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const hist = historyRef.current
      if (!hist.length) return
      histIdx.current = histIdx.current === -1 ? hist.length - 1 : Math.max(0, histIdx.current - 1)
      setValue(hist[histIdx.current] ?? '')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const hist = historyRef.current
      if (!hist.length || histIdx.current === -1) return
      histIdx.current = histIdx.current + 1
      if (histIdx.current >= hist.length) { histIdx.current = -1; setValue('') }
      else setValue(hist[histIdx.current] ?? '')
    }
  }

  const prompt = `${user}@${host.replace('helios-', '')}:~$`

  return (
    <div
      className={cs('flex min-h-0 flex-1 flex-col bg-[#0a0a0e] font-mono text-[11.5px] leading-[1.55]', className)}
      onMouseDown={(e) => {
        e.preventDefault()
        inputRef.current?.focus()
      }}
    >
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {l.k === 'sys' ? (
              <span className="text-cyan/80">{l.t}</span>
            ) : l.k === 'in' ? (
              <span>
                <span className="text-green/85">{prompt}</span> <span className="text-frost">{l.t}</span>
              </span>
            ) : (
              <span className="text-steam/90">{l.t}</span>
            )}
          </div>
        ))}
        {live && (
          <div className="flex items-center">
            <span className="text-green/85">{prompt}</span>
            <span className="mx-1.5 text-frost">{value}</span>
            <span className="anim-blink -ml-1.5 inline-block h-[13px] w-[6.5px] bg-accent-bright/90" />
          </div>
        )}
        {!live && <div className="mt-1.5 text-ghost">connection closed · you can close this window</div>}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-label="Terminal input"
      />
    </div>
  )
}

/* ------------------------------------------------ floating window frame */
export function TermWindow({ win, index }: { win: WinItem; index: number }) {
  const maximized = win.maximized
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  function onBeginDrag(e: React.MouseEvent) {
    if (maximized) return
    const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
    drag.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y }
    setDragging(true)
  }

  function onMouseMove(e: MouseEvent) {
    if (!drag.current) return
    const nx = Math.max(8, Math.min(window.innerWidth - 180, e.clientX - drag.current.dx))
    const ny = Math.max(52, Math.min(window.innerHeight - 60, e.clientY - drag.current.dy))
    setWindowPos(win.id, nx, ny)
  }

  function endDrag() {
    drag.current = null
    setDragging(false)
  }

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
    }
  })

  const style: React.CSSProperties = maximized
    ? { left: 12, top: 52, width: 'calc(100vw - 24px)', height: 'calc(100vh - 64px)' }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: 20 + index }

  return (
    <div
      style={style}
      onMouseDown={() => focusWindow(win.id)}
      className={cs(
        'panel-solid pointer-events-auto absolute flex flex-col overflow-hidden rounded-[13px]',
        maximized ? 'z-30' : '',
        'shadow-[0_24px_80px_-16px_rgba(0,0,0,0.65)] ring-1 ring-black/40',
        dragging && 'transition-none opacity-95',
      )}
    >
      <TitleBar win={win} onBeginDrag={onBeginDrag} />
      <TerminalBody host={win.host} user={win.user} kind={win.kind ?? 'compute'} onClose={() => closeWindow(win.id)} />
    </div>
  )
}

/* ------------------------------------------------ window layer */
export function TerminalWindows() {
  const wins = useWindows()
  if (wins.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="pointer-events-none fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" />
      {wins.map((w, i) => (
        <TermWindow key={w.id} win={w} index={i} />
      ))}
    </div>
  )
}
