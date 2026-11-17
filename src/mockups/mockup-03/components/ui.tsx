import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as I from 'lucide-react';

/* ------------------------------------------------------------------ */
/* toast bus                                                           */
/* ------------------------------------------------------------------ */
type T3Toast = { id: number; text: string; kind: 'ok' | 'warn' | 'err' };
let TOAST_SEQ = 100;
const toasts: T3Toast[] = [];
const toastSubs = new Set<(list: T3Toast[]) => void>();
export function emitToast(text: string, kind: T3Toast['kind'] = 'ok') {
  const t = { id: ++TOAST_SEQ, text, kind };
  toasts.unshift(t);
  if (toasts.length > 4) toasts.pop();
  toastSubs.forEach((fn) => fn([...toasts]));
  window.setTimeout(() => {
    const i = toasts.indexOf(t);
    if (i >= 0) {
      toasts.splice(i, 1);
      toastSubs.forEach((fn) => fn([...toasts]));
    }
  }, 3200);
}

/* ------------------------------------------------------------------ */
/* hash helpers                                                        */
/* ------------------------------------------------------------------ */
export function parseHash(): string {
  const h = window.location.hash || '#/mockup-03';
  const m = /^#\/mockup-03(?:\/([\w-]+))?(?:\/([\w.-]+))?/.exec(h);
  return m && m[1] ? m[1] : 'overview';
}
export function goPath(page: string, node?: string) {
  window.location.hash = node ? `#/mockup-03/${page}/${node}` : `#/mockup-03/${page}`;
}

/* ------------------------------------------------------------------ */
/* icons                                                               */
/* ------------------------------------------------------------------ */
const ICONS: Record<string, I.LucideIcon> = {
  layout: I.LayoutDashboard,
  grid: I.Grid3X3 as I.LucideIcon,
  scheduler: I.CalendarClock,
  list: I.ListChecks,
  chart: I.Activity,
  env: I.Thermometer,
  bell: I.BellRing,
  admin: I.ShieldCheck,
  terminal: I.TerminalSquare as I.LucideIcon,
  user: I.UserRound,
  users: I.UsersRound,
  settings: I.Settings,
  logout: I.LogOut,
  x: I.X,
  plus: I.Plus,
  minus: I.Minus,
  search: I.Search,
  chevdown: I.ChevronDown,
  chevright: I.ChevronRight,
  refresh: I.RefreshCw,
  play: I.Play,
  pause: I.Pause,
  stop: I.Square,
  send: I.SendHorizontal,
  max: I.Maximize2,
  cpu: I.Cpu,
  memory: I.MemoryStick,
  gpu: I.Zap,
  disk: I.HardDrive,
  net: I.Network,
  power: I.PlugZap,
  fan: I.Fan,
  drop: I.Droplets,
  wind: I.Wind,
  clock: I.Clock3,
  ok: I.Check as I.LucideIcon,
  okc: I.CheckCircle2,
  shield: I.ShieldCheck,
  warn: I.AlertTriangle,
  error: I.OctagonAlert as I.LucideIcon,
  info: I.Info,
  ssh: I.SquareTerminal as I.LucideIcon,
  cluster: I.Server,
  lock: I.Lock,
  copy: I.Copy,
  arrowdown: I.ArrowDown,
  arrowup: I.ArrowUp,
  filter: I.Filter,
  inbox: I.Inbox,
  sliders: I.SlidersHorizontal,
  waves: I.AudioWaveform as I.LucideIcon,
};
export function Icon({ n, s = 14, st }: { n: string; s?: number; st?: CSSProperties }) {
  const C = ICONS[n] ?? I.Circle;
  return <C size={s} strokeWidth={1.8} style={st} />;
}

/* ------------------------------------------------------------------ */
/* panel + controls                                                    */
/* ------------------------------------------------------------------ */
export function Panel({
  title, icon, tone, right, fill, nopad, className, style, children, bodyStyle,
}: {
  title?: string; icon?: string; tone?: 'grn' | 'mag' | 'vio' | 'warn' | 'red';
  right?: React.ReactNode; fill?: boolean; nopad?: boolean;
  className?: string; style?: CSSProperties; children?: React.ReactNode; bodyStyle?: CSSProperties;
}) {
  return (
    <section
      className={`t3-panel${fill ? ' fill' : ''}${nopad ? ' nopad' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {title !== undefined && (
        <div className="t3-ph">
          {icon && (
            <span className={`t3-ico${tone ? ` ${tone}` : ''}`}>
              <Icon n={icon} s={14} />
            </span>
          )}
          <span className="t3-ph-t">{title}</span>
          {right && <div className="t3-ph-r">{right}</div>}
        </div>
      )}
      <div className="t3-pb" style={bodyStyle}>{children}</div>
    </section>
  );
}

export function Btn({
  children, tone, icon, small, active, onClick, type = 'button', title,
}: {
  children?: React.ReactNode; tone?: 'grn' | 'mag' | 'danger' | 'gh'; icon?: string;
  small?: boolean; active?: boolean; onClick?: () => void; type?: 'button' | 'submit';
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      className={`t3-btn${tone ? ` ${tone}` : ''}${small ? ' small' : ''}${active ? ' on' : ''}`}
    >
      {icon && <Icon n={icon} s={12} />}
      {children}
    </button>
  );
}

export function Spark({ data, color, h = 36, fillArea = true, max = 1, min = 0 }: {
  data: number[]; color?: string; h?: number; fillArea?: boolean; max?: number; min?: number;
}) {
  const w = 100;
  const n = data.length || 1;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - 2 - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (h - 5) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M ${pts.join(' L ')}`;
  const area = `${d} L ${w},${h} L 0,${h} Z`;
  const c = color ?? 'var(--t3-green)';
  const id = `t3sg-${Math.abs(d.length * 7 + w + h + n) % 999999}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      {fillArea && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="0.33" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} stroke="none" />
        </>
      )}
      <path d={d} fill="none" stroke={c} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* circular gauge */
export function Gauge({ v, max, color, label, unit, big }: {
  v: number; max: number; color: string; label: string; unit: string; big?: boolean;
}) {
  const p = Math.max(0, Math.min(1, v / max));
  const SZ = big ? 72 : 58;
  const R = 24;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="t3-gauge">
    <div className="dial">
      <svg viewBox="0 0 60 60" width={SZ} height={SZ}>
        <circle cx="30" cy="30" r={R} fill="none" stroke="var(--t3-line2)" strokeWidth="4.5" />
        <circle
          cx="30" cy="30" r={R} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round"
          strokeDasharray={`${(p * CIRC * 0.75).toFixed(2)} ${CIRC}`}
          transform="rotate(135 30 30)"
        />
      </svg>
      <b style={{ color }}>
        {v.toFixed(1)}
        <i>{unit}</i>
      </b>
    </div>
    <div className="t3-gauge-k">{label}</div>
    </div>
  );
}

/* hook — simulated live drift of a value */
export function useDrift(base: number, amp = 0.6, ms = 2600) {
  const [v, setV] = useState(base);
  const ref = useRef(base);
  useEffect(() => {
    const t = window.setInterval(() => {
      const next = ref.current + (Math.random() - 0.5) * amp;
      ref.current = next;
      setV(next);
    }, ms);
    return () => window.clearInterval(t);
  }, [amp, ms]);
  return v;
}

/* sort icon for table headers */
export function Th({ children, k, sortKey, dir, onSort, num, w, title }: {
  children: React.ReactNode; k: string; sortKey?: string; dir?: 'asc' | 'desc';
  onSort?: (k: string) => void; num?: boolean; w?: string; title?: string;
}) {
  const on = sortKey === k;
  return (
    <th
      className={`${num ? 'num' : ''}${on ? ' srt' : ''}`}
      style={w ? { width: w } : undefined}
      title={title}
      onClick={onSort ? () => onSort(k) : undefined}
    >
      {children}
      {on && <span className="dir">{dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

/* status text */
export function St({ s }: { s: string }) {
  const cls = s.replace(/[^A-Z]/g, '');
  return <span className={`t3-st st-${cls}`}>{s}</span>;
}

export function Bar({ pct, tone, wide }: { pct: number; tone: string; wide?: boolean }) {
  return (
    <span className={`t3-bar${wide ? ' wide' : ''}`}>
      <span className="t3-monov" style={{ minWidth: 34, fontSize: 8.5 }}>
        {pct.toFixed(0)}%
      </span>
      <span className="t3-track">
        <i className={tone} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </span>
    </span>
  );
}
