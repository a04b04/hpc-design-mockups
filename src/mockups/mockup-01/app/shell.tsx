import { useEffect } from 'react'
import { Icon, Kbd } from '../components/ui'
import { cs, fmtAgo } from '../../../lib/format'
import { useApp, setSt, setTheme, setRole, setPage, toggleNotif, setCmdk } from '../../../lib/store'
import { ALL_NODES, ALL_JOBS, NOTIFICATIONS, CURRENT_USER, CLUSTER_CFG } from '../../../data/cluster-data'
import type { PageId } from '../../../data/cluster-data'
import { CommandK } from './cmdk'

const NAV: Array<{ id: PageId; label: string; icon: string; adminOnly?: boolean }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'nodes', label: 'Nodes', icon: 'nodes' },
  { id: 'jobs', label: 'Jobs', icon: 'jobs' },
  { id: 'storage', label: 'Storage', icon: 'storage' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'monitoring', label: 'Monitoring', icon: 'monitoring', adminOnly: true },
  { id: 'administration', label: 'Administration', icon: 'admin', adminOnly: true },
]

function RoleSwitch() {
  const role = useApp().role
  return (
    <div
      className="chip relative flex h-[30px] items-center rounded-[10px] p-[3px]"
      role="tablist"
      aria-label="Demo role mode"
    >
      <span
        className="chip-solid absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-[8px] transition-transform"
        style={{
          transform: role === 'admin' ? 'translateX(0)' : 'translateX(calc(100% + 0px))',
          left: 3,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDuration: '260ms',
        }}
      />
      {(['admin', 'user'] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={role === r}
          onClick={() => setRole(r)}
          className={cs(
            'relative z-1 h-[24px] w-[86px] cursor-pointer rounded-[8px] text-[11px] font-medium transition-colors',
            role === r ? 'text-frost' : 'text-quill hover:text-steam',
          )}
        >
          {r === 'admin' ? 'Administrator' : 'Standard user'}
        </button>
      ))}
    </div>
  )
}

function Clock() {
  const now = new Date()
  return (
    <span className="hidden font-mono text-[11px] text-quill md:block">
      {now.toISOString().slice(11, 19)} UTC
    </span>
  )
}

export function Shell(props: { children: React.ReactNode }) {
  const { page, role, theme, notifOpen } = useApp()
  const nav = NAV.filter((n) => role === 'admin' || !n.adminOnly)

  function gpuAvgPct(): string {
    const g = ALL_NODES.filter((n) => n.kind === 'gpu' && n.status === 'online')
    const avg = Math.round(
      g.reduce((a, n) => a + n.gpuUtils.reduce((x, y) => x + y, 0) / Math.max(1, n.gpuUtils.length), 0) / Math.max(1, g.length),
    )
    return `${avg}%`
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdk(true)
      }
      if (e.key === 'Escape') {
        setSt({ notifOpen: false })
        setCmdk(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-edge bg-panel/80 px-3 py-4 backdrop-blur-xl dark:bg-black/20">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent shadow-[0_4px_14px_-4px_var(--color-accent)]">
            <Icon n="zap" size={15} className="text-white" />
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-tight text-frost">{CLUSTER_CFG.name}</div>
            <div className="text-[10px] text-quill">HPC Console</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-1">
          {nav.map((n) => {
            const active = page === n.id
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setPage(n.id)}
                className={cs(
                  'group relative flex h-8 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 text-[12.5px] font-medium transition-all duration-150',
                  active ? 'chip-solid text-frost' : 'text-mist hover:bg-dusk/60 hover:text-frost',
                )}
              >
                <Icon n={n.icon} size={14.5} className={active ? 'text-accent-bright' : 'text-quill group-hover:text-steam'} />
                {n.label}
                {n.id === 'jobs' && (
                  <span className="ml-auto font-mono text-[10px] text-ghost">
                    {ALL_JOBS.filter((j) => j.state === 'running' || j.state === 'pending').length}
                  </span>
                )}
                {n.id === 'administration' && <span className="ml-auto"><Kbd>A</Kbd></span>}
              </button>
            )
          })}
        </nav>

        <div className="mt-2 space-y-2 px-1">
          <div className="panel rounded-[10px] px-2.5 py-2.5">
            <div className="flex items-center justify-between text-[10px] text-quill">
              <span>Cluster load</span>
              <span className="font-mono text-cyan">{gpuAvgPct()}</span>
            </div>
            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-edge">
              <div className="h-full w-[68%] rounded-full bg-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 hover:bg-dusk/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent-bright">
              {CURRENT_USER.name.split(' ').map((p) => p[0]).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-medium text-frost">{CURRENT_USER.name}</div>
              <div className="text-[10px] text-quill">{role === 'admin' ? 'Administrator' : 'Standard user'}</div>
            </div>
            <Icon n="chevron-right" size={12} className="text-ghost" />
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="ml-[228px] flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[54px] items-center gap-3 border-b border-edge bg-void/80 px-6 backdrop-blur-xl dark:bg-black/30">
          <button
            type="button"
            onClick={() => setCmdk(true)}
            className="chip hidden h-[30px] w-[240px] cursor-text items-center gap-2 rounded-[10px] px-2.5 text-left text-[12px] text-ghost md:flex"
          >
            <Icon n="search" size={13} />
            <span className="flex-1">Search nodes, jobs, users…</span>
            <Kbd>⌘K</Kbd>
          </button>

          <div className="ml-auto flex items-center gap-2.5">
            <RoleSwitch />
            <Clock />
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="chip flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[10px] text-mist hover:text-frost"
              aria-label="Toggle theme"
            >
              <Icon n={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={toggleNotif}
                className={cs(
                  'chip relative flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[10px]', notifOpen ? 'chip-solid text-frost' : 'text-mist hover:text-frost',
                )}
                aria-label="Notifications"
              >
                <Icon n="bell" size={14} />
                {NOTIFICATIONS.length > 0 && (
                  <span className="absolute right-[5px] top-[5px] h-[6px] w-[6px] rounded-full bg-red ring-2 ring-void dark:ring-black/40" />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSt({ notifOpen: false })} />
                  <div className="panel anim-panel-in absolute right-0 top-[36px] z-50 w-[340px] rounded-[14px] p-2">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-frost">Notifications</span>
                      <span className="chip rounded-md px-1.5 py-0.5 font-mono text-[10px] text-quill">{NOTIFICATIONS.length} new</span>
                    </div>
                    <div className="max-h-[320px] space-y-1 overflow-y-auto p-1">
                      {NOTIFICATIONS.map((a) => (
                        <div key={a.id} className="rounded-[10px] px-2 py-2 hover:bg-dusk/50">
                          <div className="flex items-start gap-2">
                            <span
                              className={cs(
                                'mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full',
                                a.sev === 'crit' ? 'bg-red' : a.sev === 'warn' ? 'bg-amber' : 'bg-cyan',
                              )}
                            />
                            <div className="min-w-0">
                              <div className="text-[11.5px] font-medium text-frost">{a.title}</div>
                              <div className="mt-0.5 text-[10.5px] text-quill">{fmtAgo(a.at)} · {a.source}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-edge px-2 pt-2 pb-1 text-center">
                      <button type="button" className="cursor-pointer text-[10.5px] text-accent-bright hover:underline">Mark all read</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-6 py-6">{props.children}</main>
      </div>

      <CommandK />
    </div>
  )
}
