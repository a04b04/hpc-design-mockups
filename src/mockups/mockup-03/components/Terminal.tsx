import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './ui';
import { NODE_MAP, type T3Role } from '../data';

export type TermTab = { id: number; host: string; node?: string };
export type TermLine = { id: number; text: string; cls?: string };

let LINE_SEQ = 1;

const BANNER = [
  { text: 'AETHER SECURE SHELL — simulated session on $(hostname)', cls: 't3-t-dim' },
  { text: 'WARNING: interactive prototype. keystrokes never leave the browser.', cls: 't3-t-dim' },
];

/** build a deterministic fake history for a host */
function seedLines(host: string, node: string | undefined): TermLine[] {
  const out: TermLine[] = [
    { id: LINE_SEQ++, text: `[a.bhatti@titan-lgx-01 ~]$ ssh ${host}`, cls: 't3-t-cmd' },
    { text: `Warning: Permanently added '${host}' (ED25519) to the list of known hosts.`, cls: 't3-t-dim' },
    { text: `AETHER HPC — Linux ${host} 6.7.0-titan #1 SMP ${new Date().toISOString().slice(0, 10)}`, cls: 't3-t-out' },
    { text: node ? `Slurm: node ${node} — ${NODE_MAP.get(node)?.state ?? 'IDLE'} — ${NODE_MAP.get(node)?.cpuPct.toFixed(0) ?? '0'}% cpu load` : 'service node — no slurm allocation', cls: 't3-t-blue' },
    { text: 'Last login: Tue Nov 17 13:58:02 2026 from 10.44.7.12', cls: 't3-t-dim' },
  ].map((l) => ({ id: l.id ?? LINE_SEQ++, text: l.text, cls: l.cls }));
  return out;
}

function respond(host: string, cmd: string, node?: string): TermLine[] {
  const p = cmd.trim().split(/\s+/);
  const c = p[0];
  const nd = node ? NODE_MAP.get(node) : undefined;
  const lines: Array<{ text: string; cls?: string }> = [];
  const mk = (text: string, cls?: string) => lines.push({ text, cls });

  switch (c) {
    case '':
      break;
    case 'help':
      mk('AETHER simulated shell — available commands:', 't3-t-cyan');
      mk('  sinfo          partition + node state summary', 't3-t-dim');
      mk('  squeue         running job list', 't3-t-dim');
      mk('  srun --pty ... launch a fake interactive allocation', 't3-t-dim');
      mk('  nvidia-smi     GPU status (gpu nodes only)', 't3-t-dim');
      mk('  free -h        memory', 't3-t-dim');
      mk('  df -h /scratch filesystem', 't3-t-dim');
      mk('  uptime / whoami / hostname / sensors / ibstat / clear / exit', 't3-t-dim');
      break;
    case 'sinfo':
      mk('PARTITION     AVAIL  TIMELIMIT  NODES  STATE  NODELIST', 't3-t-cyan');
      mk('YWCN022*         up   infinite   3866   idle   titan-std-[0001-3866]', 't3-t-out');
      mk('QXRA114          up   infinite   2349  alloc   titan-com-[0001-2349]', 't3-t-out');
      mk('GPUA100          up   infinite    890   idle   titan-gpu-[0001-0890]', 't3-t-out');
      mk('HMGX512          up   infinite    448   idle   titan-him-[0001-0448]', 't3-t-out');
      mk('SVX0080          up   infinite     74   idle   titan-svx-[0001-0074]', 't3-t-out');
      break;
    case 'squeue':
      mk('  JOBID PARTITION     NAME     USER    ST  TIME  NODES', 't3-t-cyan');
      mk('  89412 QXRA114       hpl-mix  a.diaz  R   3:44      64', 't3-t-out');
      mk('  89418 GPUA100       llama405 j.kim   R   1:12      32', 't3-t-out');
      mk('  89431 YWCN022       cfdeno   m.okafo R  11:58     256', 't3-t-out');
      mk('  (simulated — live data only in the scheduler page)', 't3-t-dim');
      break;
    case 'srun':
      if (node) mk(`srun: job 95103 queued and waiting for resources on ${host} — (simulated)`, 't3-t-amber');
      else mk('srun: error: batch launch failed — interactive prototype demo', 't3-t-amber');
      break;
    case 'nvidia-smi':
      if (nd && nd.kind === 'gpu') {
        mk('+-----------------------------------------------------------------------------+', 't3-t-out');
        mk('| NVIDIA-SMI 550.54.15   Driver: 550.54.15   CUDA: 12.4                       |', 't3-t-out');
        for (let g = 0; g < 8; g++) mk(`|   ${g}  A100-SXM4   ${nd.gpuPct.toFixed(0)}%   ${(28 + g * 3).toFixed(0)}C   ${(260 + g * 14).toFixed(0)}W  |`, 't3-t-out');
        mk('+-----------------------------------------------------------------------------+', 't3-t-out');
      } else {
        mk('NVIDIA-SMI has failed because it could not communicate with the NVIDIA driver.', 't3-t-red');
      }
      break;
    case 'free':
      mk('               total        used        free      shared', 't3-t-cyan');
      mk(`Mem:          ${nd ? (nd.memUsedGB / 1024).toFixed(0) + 'Gi' : '512Gi'}       ${nd ? nd.memPct.toFixed(0) + '%' : '62%'}        ${nd ? (100 - nd.memPct).toFixed(0) + '%' : '38%'}        4.2Gi`, 't3-t-out');
      mk('Swap:         4.0Gi       0B          4.0Gi', 't3-t-out');
      break;
    case 'df':
      mk('Filesystem        Size  Used Avail Use% Mounted on', 't3-t-cyan');
      mk('titan-fs:/scratch  58P   41P   17P  71% /scratch', 't3-t-out');
      mk('titan-fs:/home      2T  1.1T   940G  55% /home', 't3-t-out');
      break;
    case 'uptime':
      mk(` ${new Date().toTimeString().slice(0, 8)} up ${nd ? `${nd.uptimeDays} days` : '214 days'},  24 users,  load average: ${nd ? (nd.cpuPct / 100 * 256).toFixed(2) : '12.44'}, 11.90, 11.42`, 't3-t-out');
      break;
    case 'whoami':
      mk('a.bhatti', 't3-t-out');
      break;
    case 'hostname':
      mk(host, 't3-t-out');
      break;
    case 'sensors':
      mk(`coretemp-isa-0000  Package id 0:  +${nd ? nd.tempC.toFixed(1) : '41.5'}°C  (high = +85.0°C)`, 't3-t-out');
      mk('nvme-pci-0400      Composite:     +38.2°C', 't3-t-out');
      break;
    case 'ibstat':
      mk('CA \'mlx5_0\'  MLNX ConnectX-7  State: Active  Physical state: LinkUp  Rate: 400', 't3-t-out');
      break;
    case 'clear':
      return [{ id: LINE_SEQ++, text: '@clear@' }];
    case 'exit':
      mk('logout', 't3-t-dim');
      mk('Connection to ' + host + ' closed.', 't3-t-dim');
      break;
    default:
      mk(`bash: ${c}: command not found — type "help" for the simulated command list`, 't3-t-red');
  }
  if (c !== 'exit' && c !== 'clear') mk('', undefined);
  return lines.map((l) => ({ id: LINE_SEQ++, ...l }));
}

export function Terminal({ tabs, activeTab, onFocusTab, onCloseTab, onNewTab, role, initialPrompt, docked }: {
  tabs: TermTab[]; activeTab: number | null;
  onFocusTab: (id: number) => void; onCloseTab: (id: number) => void;
  onNewTab: () => void; role: T3Role; initialPrompt?: string; docked?: boolean;
}) {
  const cur = tabs.find((t) => t.id === activeTab);
  const [max, setMax] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hist, setHist] = useState<Record<string, TermLine[]>>({});
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  /* seed history for new tabs */
  useEffect(() => {
    if (cur && !hist[cur.host]) {
      setHist((h) => ({ ...h, [cur.host]: seedLines(cur.host, cur.node) }));
    }
  }, [cur, hist]);

  /* auto-scroll */
  useEffect(() => {
    const b = bodyRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [hist, cur?.host]);

  useEffect(() => { inputRef.current?.focus(); }, [cur?.id]);

  const lines = useMemo(() => (cur && hist[cur.host]) || [], [cur, hist]);

  const doDrag = (e: React.MouseEvent) => {
    if (max || docked) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(-40, dragRef.current.ox + ev.clientX - dragRef.current.sx),
        y: Math.max(0, dragRef.current.oy + ev.clientY - dragRef.current.sy),
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const submit = () => {
    if (!cur) return;
    const cmd = input;
    setInput('');
    setHist((h) => ({
      ...h,
      [cur.host]: [
        ...(h[cur.host] || []),
        { id: LINE_SEQ++, text: `[a.bhatti@lgx-01 ~]$ ${cmd}`, cls: 't3-t-cmd' },
        ...respond(cur.host, cmd, cur.node),
      ],
    }));
  };

  const banner = BANNER.map((b) => b.text.replace('$(hostname)', cur?.host ?? ''));

  return (
    <div
      className={`t3-term${max ? ' t3-term--max' : ''}${docked ? ' t3-term--dock' : ''}`}
      style={max || docked ? undefined : { left: `calc(50% + ${pos.x / 2}px)`, top: 110 + pos.y }}
    >
      <div className="t3-term-head" onMouseDown={doDrag} onDoubleClick={docked ? undefined : () => setMax(!max)}>
        <span className="t3-term-dots"><i /><i /><i /></span>
        <div className="t3-term-tabs">
          {tabs.map((t) => (
            <span
              key={t.id}
              className={`t3-term-tab${t.id === activeTab ? ' on' : ''}`}
              onMouseDown={() => onFocusTab(t.id)}
            >
              <span className="t3-term-ss" />
              {t.host}
              <em
                onClick={(e) => { e.stopPropagation(); onCloseTab(t.id); }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Icon n="x" s={9} />
              </em>
            </span>
          ))}
          <button className="t3-term-newtab" onClick={onNewTab}><Icon n="plus" s={10} /></button>
        </div>
               <div className="t3-term-headr">
          <span className="t3-term-user">a.bhatti@titan-02 {role === 'admin' ? '(admin)' : '(user)'}</span>
          {!docked && (
            <button className="t3-term-ctl" onClick={() => setMax(!max)} title={max ? 'Restore' : 'Maximise'}>
              <Icon n="max" s={10} />
            </button>
          )}
        </div>
      </div>

      {cur ? (
        <>
          <div className="t3-term-body" ref={bodyRef}>
            {banner.map((b, i) => <div key={i} className="t3-t-dim">{b}</div>)}
            {lines.map((l) =>
              l.text === '@clear@' ? null : (
                <div key={l.id} className={l.cls ?? 't3-t-out'}>{l.text}</div>
              ),
            )}
            <div className="t3-term-input-line">
              <span className="t3-prompt">
                <i>a.bhatti@</i>lgx-01<i>:~$</i>
              </span>
              <input
                ref={inputRef}
                className="t3-inputbox"
                value={input}
                placeholder="type 'help'"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                  if (e.key === 'c' && e.ctrlKey) setInput('');
                }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="t3-term-foot">
            <span><b className="t3-term-dot-ok" /> LINK ESTABLISHED (SIMULATED)</span>
            <span className="t3-t-dim">no real ssh traffic leaves the browser — aes256-gcm@openssh.com fake kex</span>
          </div>
        </>
      ) : (
        <div className="t3-term-body t3-term-idle">
          <div style={{ textAlign: 'center', color: 'var(--t3-ink3)' }}>
            <div style={{ fontSize: 22, marginBottom: 10, color: 'var(--t3-vio2)' }}><Icon n="terminal" s={22} /></div>
            NO ACTIVE SESSION
            <div style={{ fontSize: 9, marginTop: 8 }}>
              open a node detail panel and press CONNECT VIA SSH, or choose a permitted node in the terminal page
              {initialPrompt ? ` — ${initialPrompt}` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
