import { useState } from 'react'
import { Icon, Chip, Btn, Panel, PanelHead, SegTabs } from '../mockups/mockup-01/components/ui'
import { cs, fmtBytes, fmtAgo } from '../lib/format'
import { ALL_USERS, CLUSTER_CFG, PARTITION_ROWS, ADMIN_ACTIONS, SCHED_EVENTS, OPERATIONS } from '../data/cluster-data'

type Tab = 'users' | 'partitions' | 'scheduler' | 'ops'

const roleChip: Record<string, string> = {
  admin: 'border-accent/40 bg-accent/10 text-accent-bright',
  staff: 'border-cyan/30 bg-cyan/10 text-cyan',
  user: 'border-edge bg-steel text-quill dark:border-dusk',
}
const statusChip: Record<string, string> = {
  active: 'border-green/30 bg-green/10 text-green',
  suspended: 'border-red/30 bg-red/10 text-red',
  invited: 'border-amber/30 bg-amber/10 text-amber',
}
const sevChip: Record<string, string> = {
  info: 'border-cyan/30 bg-cyan/10 text-cyan',
  warn: 'border-amber/30 bg-amber/10 text-amber',
  error: 'border-red/30 bg-red/10 text-red',
}

export function AdministrationPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function runToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const users = ALL_USERS.filter((u) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.username.includes(q) || u.group.includes(q)
  })

  return (
    <div className="relative space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Administration</h1>
          <p className="mt-1 text-[12.5px] text-quill">
            {CLUSTER_CFG.name} · {CLUSTER_CFG.scheduler} · {ALL_USERS.length} accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="chip flex h-8 items-center gap-2 rounded-[10px] px-2.5">
            <Icon n="search" size={13} className="text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="w-40 bg-transparent font-mono text-[11.5px] text-frost outline-none placeholder:text-ghost"
            />
          </div>
          <Btn variant="outline" size="sm" onClick={() => runToast('邀请 flow is stubbed in the prototype')}>
            <Icon n="plus" size={12} /> Invite user
          </Btn>
        </div>
      </header>

      <SegTabs
        tabs={[
          { id: 'users', label: 'Users', count: ALL_USERS.length },
          { id: 'partitions', label: 'Partitions' },
          { id: 'scheduler', label: 'Scheduler log' },
          { id: 'ops', label: 'Operations' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'users' && (
        <Panel padded={false} className="overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.4fr)_90px_100px_minmax(0,1fr)_110px_90px_gap3] grid-cols-[minmax(0,1.35fr)_84px_110px_minmax(0,1fr)_100px_96px] gap-3 border-b border-edge bg-abyss/40 px-4 py-2.5 dark:border-dusk">
            {['User', 'Role', 'Group', 'Storage', 'QoS', 'Status'].map((h) => (
              <span key={h} className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">{h}</span>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[minmax(0,1.35fr)_84px_110px_minmax(0,1fr)_100px_96px] items-center gap-3 border-b border-edge/60 px-4 py-2.5 transition-colors last:border-0 hover:bg-steel/40 dark:border-dusk/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[9px] font-semibold text-accent-bright">
                    {u.username.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-frost">{u.name}</div>
                    <div className="truncate font-mono text-[9.5px] text-ghost">{u.email}</div>
                  </div>
                </div>
                <span className={`rounded-md border px-1.5 py-[2px] text-center text-[9.5px] font-medium ${roleChip[u.role] ?? ''}`}>{u.role}</span>
                <span className="truncate text-[11px] text-steam">{u.group}</span>
                <span className="font-mono text-[10.5px] text-quill">
                  {fmtBytes(u.storageUsed, 0)} / {fmtBytes(u.diskQuota, 0)}
                </span>
                <span className="font-mono text-[10.5px] text-quill">{u.qos}</span>
                <span className={`rounded-md border px-1.5 py-[2px] text-center text-[9.5px] font-medium ${statusChip[u.status] ?? ''}`}>{u.status}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'partitions' && (
        <Panel padded={false} className="overflow-hidden">
          <div className="grid grid-cols-[130px_90px_100px_110px_120px_minmax(0,1fr)] gap-3 border-b border-edge bg-abyss/40 px-4 py-2.5 dark:border-dusk">
            {['Partition', 'Nodes', 'State', 'Max time', 'Default QoS', 'Priority weight'].map((h) => (
              <span key={h} className="text-[10px] font-medium tracking-[0.06em] text-quill uppercase">{h}</span>
            ))}
          </div>
          {PARTITION_ROWS.map((p) => (
            <div key={p.name} className="grid grid-cols-[130px_90px_100px_110px_120px_minmax(0,1fr)] items-center gap-3 border-b border-edge/60 px-4 py-3 last:border-0 hover:bg-steel/40 dark:border-dusk/50">
              <span className="font-mono text-[12px] text-frost">{p.name}</span>
              <span className="font-mono text-[11px] text-steam">{p.nodes}</span>
              <span className={cs('rounded-md border px-1.5 py-[2px] text-center text-[9.5px] font-medium', p.state === 'up' ? 'border-green/30 bg-green/10 text-green' : 'border-amber/30 bg-amber/10 text-amber')}>
                {p.state}
              </span>
              <span className="font-mono text-[11px] text-quill">{p.maxTime}</span>
              <span className="font-mono text-[11px] text-quill">{p.defaultQos}</span>
              <div className="flex items-center gap-2">
                <div className="h-[4px] w-full max-w-[130px] overflow-hidden rounded-full bg-edge/70">
                  <div className="anim-grow-w h-full rounded-full bg-accent" style={{ width: `${Math.min(100, p.priorityWeight * 10)}%` }} />
                </div>
                <span className="font-mono text-[10px] text-ghost">{p.priorityWeight}</span>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {tab === 'scheduler' && (
        <Panel>
          <PanelHead title="Scheduler event log" icon="radio" right={<Chip className="font-mono">{SCHED_EVENTS.length} events</Chip>} />
          <div className="mt-3 space-y-2">
            {SCHED_EVENTS.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] border border-edge px-3 py-2.5 dark:border-dusk">
                <span className={cs('rounded-md border px-1.5 py-[2px] text-[9.5px] font-medium capitalize', e.what.includes('fail') || e.what.includes('error') ? sevChip.error : e.what.includes('drain') || e.what.includes('kill') ? sevChip.warn : sevChip.info)}>
                  {e.what.split(' ')[0]}
                </span>
                <span className="w-[86px] shrink-0 font-mono text-[10px] text-ghost">{fmtAgo(e.at)}</span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-steam">{e.what} · {e.target}</span>
                <span className="hidden shrink-0 font-mono text-[10px] text-quill sm:inline">{e.who}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'ops' && (
        <div className="space-y-4">
          <Panel>
            <PanelHead title="Cluster actions" icon="wrench" right={<Chip>simulated</Chip>} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ADMIN_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => runToast(`"${a.label}" is simulated in this prototype — no action was taken.`)}
                  className={cs(
                    'group flex cursor-pointer items-start gap-3 rounded-[12px] border border-edge px-3.5 py-3 text-left transition-all hover:-translate-y-px hover:border-accent/40 dark:border-dusk',
                    a.danger && 'hover:border-red/40',
                  )}
                >
                  <span className={cs('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', a.danger ? 'bg-red/10 text-red' : 'bg-accent/10 text-accent-bright')}>
                    <Icon n={a.icon === 'sliders-horizontal' ? 'sliders' : a.icon} size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-frost">{a.label}</span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-quill">{a.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHead title="Recent operations" icon="clock" />
            <div className="mt-3 space-y-1.5">
              {OPERATIONS.map((o, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[9px] px-2 py-2 text-[11.5px] hover:bg-steel/40">
                  <span className={cs(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-steel text-ghost dark:bg-dusk',
                  )}>
                    <Icon n={o.kind === 'node' ? 'nodes' : o.kind === 'job' ? 'jobs' : o.kind === 'fs' ? 'database' : o.kind === 'power' ? 'power' : 'network'} size={10} />
                  </span>
                  <span className="w-[110px] shrink-0 font-mono text-[10px] text-ghost">{fmtAgo(o.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-steam">{o.text}</span>
                  {o.node ? <span className="shrink-0 font-mono text-[10px] text-quill">{o.node}</span> : null}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {toast && (
        <div className="anim-pop fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="panel-solid flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 shadow-xl">
            <span className="h-[7px] w-[7px] rounded-full bg-amber" />
            <span className="text-[11.5px] text-steam">{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
