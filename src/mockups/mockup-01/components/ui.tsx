import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react'
import { cs } from '../../../lib/format'
import { ICONS } from '../../../lib/iconMap'
import { EASE } from './ease'
import type { LucideIcon } from 'lucide-react'

export { EASE }

export function Icon(props: {
  n: string
  size?: number
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}) {
  const C = ICONS[props.n] as LucideIcon
  if (!C) return null
  return (
    <C size={props.size ?? 14} strokeWidth={props.strokeWidth ?? 2} className={props.className} style={props.style} />
  )
}

export function Panel(props: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={cs('panel rounded-[14px]', props.padded && 'p-5', props.className)}>{props.children}</div>
}

export function PanelHead(props: { title: string; icon?: string; right?: ReactNode; className?: string; children?: ReactNode }) {
  if (props.children) {
    return (
      <div className={cs('flex items-end justify-between gap-3', props.className)}>
        <div className="flex items-center gap-2">
          {props.icon ? (
            <span className="text-ghost">
              <Icon n={props.icon} size={13} />
            </span>
          ) : null}
          <h3 className="text-[12.5px] font-semibold tracking-tight text-frost">{props.title}</h3>
        </div>
        {props.children}
      </div>
    )
  }
  return (
    <div className={cs('-mb-1 flex items-center gap-2', props.className)}>
      {props.icon ? (
        <span className="text-ghost">
          <Icon n={props.icon} size={13} />
        </span>
      ) : null}
      <h3 className="flex-1 truncate text-[12.5px] font-semibold tracking-tight text-frost">{props.title}</h3>
      {props.right}
    </div>
  )
}

export function SectionTitle(props: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cs('mb-3 flex items-center justify-between', props.className)}>
      <h3 className="text-[13px] font-semibold text-frost">{props.children}</h3>
      {props.right}
    </div>
  )
}

export function Dl(props: { items: Array<{ k: string; v: ReactNode }>; className?: string }) {
  return (
    <dl className={cs('grid gap-1.5', props.className)}>
      {props.items.map((it) => (
        <div key={it.k} className="flex items-baseline justify-between gap-4 border-b border-edge pb-1.5 last:border-b-0">
          <dt className="shrink-0 text-[11.5px] text-quill">{it.k}</dt>
          <dd className="truncate font-mono text-[11.5px] font-medium text-steam">{it.v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Stat(props: {
  label: string
  value: ReactNode
  monoSize?: string
  icon?: string
  progress?: number
  color?: string
  sub?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-medium tracking-[0.06em] text-quill uppercase">{props.label}</span>
        {props.icon ? (
          <span className="text-ghost">
            <Icon n={props.icon} size={13} strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div
        className="mt-2.5 font-mono font-medium tracking-[-0.02em] text-frost"
        style={{ fontSize: props.monoSize ?? '26px', lineHeight: 1.05 }}
      >
        {props.value}
      </div>
      {props.sub ? <div className="mt-1.5 text-[11px] text-quill">{props.sub}</div> : null}
      {props.progress != null && (
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-edge/80">
          <div
            className="anim-grow-w h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, props.progress))}%`, background: props.color ?? 'var(--color-accent)' }}
          />
        </div>
      )}
    </>
  )
  const cls = cs('panel anim-fade-up rounded-[14px] p-4', props.onClick && 'cursor-pointer transition-transform duration-200 hover:-translate-y-[2px]', props.className)
  return props.onClick ? (
    <button type="button" onClick={props.onClick} className={cs(cls, 'text-left')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function Kbd(props: { children: ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-edge bg-night px-1.5 py-0.5 font-mono text-[10px] leading-none text-quill dark:border-dusk dark:bg-dusk dark:text-mist">
      {props.children}
    </kbd>
  )
}

export function Chip(props: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={props.title} className={cs('chip inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10.5px] font-medium', props.className)}>
      {props.children}
    </span>
  )
}

export function ProgressBar(props: { value: number; color?: string; className?: string; height?: number }) {
  const v = Math.min(100, Math.max(0, props.value))
  return (
    <div className={cs('w-full overflow-hidden rounded-full bg-edge/70', props.className ?? 'h-[3px]')} style={props.height ? { height: props.height } : undefined}>
      <div className="anim-grow-w h-full rounded-full" style={{ width: `${v}%`, background: props.color ?? 'var(--color-accent)' }} />
    </div>
  )
}

export function SegTabs<T extends string>(props: {
  tabs: Array<{ id: T; label: string; count?: number }>
  active: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cs('chip inline-flex items-center rounded-[10px] p-[3px]', props.className)}>
      {props.tabs.map((t) => {
        const on = t.id === props.active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => props.onChange(t.id)}
            className={cs(
              'relative rounded-[7px] px-2.5 py-[5px] text-[11.5px] font-medium whitespace-nowrap transition-colors',
              on ? 'chip-solid text-frost' : 'text-quill hover:text-steam',
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 font-mono text-[10px] opacity-70">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Btn(props: {
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'danger' | 'brand'
  size?: 'xs' | 'sm' | 'md'
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { variant = 'default', size = 'sm', className, children, ...rest } = props
  const sizes: Record<string, string> = {
    xs: 'h-6 gap-1 rounded-md px-2 text-[10.5px]',
    sm: 'h-7 gap-1.5 rounded-lg px-2.5 text-[11.5px]',
    md: 'h-9 gap-2 rounded-[10px] px-4 text-[12.5px]',
  }
  const variants: Record<string, string> = {
    default: 'chip text-steam hover:border-ghost hover:text-frost',
    outline: 'border border-edge text-steam hover:border-ghost hover:text-frost',
    ghost: 'text-mist hover:bg-dusk hover:text-frost',
    primary: 'border border-accent/40 bg-accent text-white shadow-[0_6px_18px_-8px_var(--color-accent)] hover:brightness-110',
    brand: 'border border-accent/30 bg-accent/15 text-accent-soft hover:bg-accent/25',
    danger: 'border border-red/30 bg-red/10 text-red hover:bg-red/20',
  }
  return (
    <button
      type="button"
      className={cs(
        'inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-50',
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function LinkA(props: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={props.onClick} className={cs('cursor-pointer text-accent-bright transition-colors hover:text-accent-soft hover:underline', props.className)}>
      {props.children}
    </button>
  )
}

export function Empty(props: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 py-10 text-center">
      {props.icon ? (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[12px] border border-edge bg-night text-ghost dark:border-dusk dark:bg-dusk dark:text-mist">
          <Icon n={props.icon} size={16} />
        </div>
      ) : null}
      <div className="text-[13px] font-medium text-steam">{props.title}</div>
      {props.sub ? <div className="max-w-[440px] text-[11.5px] text-quill">{props.sub}</div> : null}
      {props.action ? <div className="mt-2">{props.action}</div> : null}
    </div>
  )
}

export function Switch(props: { on: boolean; onChange: (v: boolean) => void; label?: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onChange(!props.on)}
      aria-pressed={props.on}
      className={cs('group flex items-center gap-2.5 rounded-lg pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/60', props.disabled && 'pointer-events-none opacity-50')}
    >
      <span
        className={cs(
          'relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors duration-200',
          props.on ? (props.danger ? 'bg-red/70' : 'bg-accent/70') : 'bg-night group-hover:bg-dusk dark:bg-dusk dark:group-hover:bg-edge',
        )}
      >
        <span
          className="absolute top-[3px] left-[3px] h-[14px] w-[14px] rounded-full bg-steam shadow transition-transform duration-200 group-hover:bg-frost"
          style={{ transform: props.on ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </span>
      {props.label ? <span className="text-[12px] text-mist group-hover:text-frost">{props.label}</span> : null}
    </button>
  )
}

export function Spinner(props: { size?: number; className?: string }) {
  return (
    <span
      className={cs('anim-spin-slow inline-block rounded-full border-[1.5px] border-current border-t-transparent opacity-80', props.className)}
      style={{ width: props.size ?? 13, height: props.size ?? 13 }}
    />
  )
}

export function statusColor(status: string): string {
  if (status === 'online' || status === 'ok' || status === 'healthy' || status === 'up') return 'var(--color-green)'
  if (status === 'drain' || status === 'warn' || status === 'degraded' || status === 'rebuilding' || status === 'maintenance') return 'var(--color-amber)'
  if (status === 'offline' || status === 'error' || status === 'down') return 'var(--color-red)'
  return 'var(--color-accent-bright)'
}

export function StatusDot(props: { status: string; size?: number; pulse?: boolean; className?: string }) {
  const c = statusColor(props.status)
  const s = props.size ?? 7
  return (
    <span className={cs('relative inline-flex shrink-0', props.className)} style={{ width: s, height: s }}>
      {props.pulse ? <span className="anim-pulse-dot absolute inset-0 rounded-full" style={{ background: c, opacity: 0.5 }} /> : null}
      <span className="absolute inset-0 rounded-full" style={{ background: c }} />
    </span>
  )
}

export function hexA(hex: string, alpha: number): string {
  if (hex.startsWith('var(')) return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function LiveClock() {
  return null
}
