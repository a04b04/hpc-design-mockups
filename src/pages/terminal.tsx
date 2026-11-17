import { useState } from 'react'
import { Icon, Chip, Btn, Panel, PanelHead, Empty, Spinner } from '../mockups/mockup-01/components/ui'
import { cs } from '../lib/format'
import { useApp, openTerminal } from '../lib/store'
import { MAX_WINDOWS, useWindows } from '../lib/store-win'
import { LOGIN_NODES, GPU_NODES, ALL_NODES, CLUSTER_CFG } from '../data/cluster-data'

export function TerminalPage() {
  const { role } = useApp()
  const wins = useWindows()
  const [connecting, setConnecting] = useState<string | null>(null)

  const login = LOGIN_NODES
  const gpu = GPU_NODES.filter((n) => n.status === 'online').slice(0, 8)
  const permitted = (id: string) => role === 'admin' || login.some((l) => l.id === id) || gpu.some((g) => g.id === id)

  function connect(id: string) {
    if (!permitted(id)) return
    setConnecting(id)
    setTimeout(() => {
      openTerminal(id)
      setConnecting(null)
    }, 420)
  }

  const slots = MAX_WINDOWS - wins.length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Terminal</h1>
          <p className="mt-1 text-[12.5px] text-quill">
            Simulated SSH sessions · {CLUSTER_CFG.fqdn} · {slots} of {MAX_WINDOWS} window slots free
          </p>
        </div>
        {wins.length > 0 && <Chip className="font-mono">{wins.length} active session{wins.length === 1 ? '' : 's'}</Chip>}
      </header>

      <Panel className="anim-fade-up">
        <PanelHead
          title="Quick connect — login nodes"
          icon="terminal"
          right={<Chip className="font-mono">ssh ada@{CLUSTER_CFG.fqdn}</Chip>}
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {login.map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-edge px-4 py-3 transition-colors hover:border-accent/30 dark:border-dusk">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-green/25 bg-green/10 text-green">
                  <Icon n="terminal" size={14} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-[12.5px] font-medium text-frost">{n.id}</span>
                    <span className="rounded bg-steel px-1 font-mono text-[9px] text-quill dark:bg-dusk">login</span>
                  </div>
                  <span className="text-[10.5px] text-ghost">load {n.cpuLoad}% · {n.uptimeMs / 86_400_000 >= 1 ? `${Math.floor(n.uptimeMs / 86_400_000)}d up` : 'recently rebooted'}</span>
                </div>
              </div>
              <Btn variant="primary" size="sm" onClick={() => connect(n.id)} disabled={connecting === n.id}>
                {connecting === n.id ? <Spinner /> : <Icon n="zap" size={11} />} Connect
              </Btn>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="anim-fade-up">
        <PanelHead
          title={role === 'admin' ? 'GPU nodes — direct session (admin)' : 'Permitted GPU nodes'}
          icon="zap"
          right={<Chip>{gpu.length} online</Chip>}
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {gpu.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => connect(n.id)}
              disabled={connecting === n.id || !permitted(n.id)}
              className={cs(
                'flex cursor-pointer items-center justify-between gap-2 rounded-[11px] border border-edge px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:border-accent/40 dark:border-dusk',
                !permitted(n.id) && 'cursor-not-allowed opacity-40 hover:translate-y-0',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-[11.5px] text-frost">{n.id}</span>
                <span className="font-mono text-[9.5px] text-ghost">{n.gpuUtils.filter((u) => u > 10).length}/{n.gpus} busy</span>
              </span>
              {connecting === n.id ? <Spinner /> : <Icon n="chevron-right" size={12} className="text-ghost" />}
            </button>
          ))}
        </div>
        {role === 'user' && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-edge px-3 py-2.5 text-[11px] text-quill dark:border-dusk">
            <Icon n="lock" size={12} className="text-ghost" /> Standard users may open interactive sessions on online GPU nodes only. Compute nodes accept batch jobs via Slurm.
          </div>
        )}
      </Panel>

      {role === 'admin' && (
        <Panel className="anim-fade-up">
          <PanelHead title="All nodes — admin direct access" icon="shield" right={<Chip>{ALL_NODES.length} hosts</Chip>} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ALL_NODES.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => connect(n.id)}
                disabled={n.status === 'offline'}
                className={cs(
                  'cursor-pointer rounded-md border px-1.5 py-[3px] font-mono text-[9.5px] transition-colors',
                  n.status === 'offline'
                    ? 'cursor-not-allowed border-red/20 text-red/50'
                    : 'border-edge text-quill hover:border-accent/40 hover:text-frost dark:border-dusk',
                )}
              >
                {n.id.replace('helios-', '')}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {wins.length === 0 && (
        <Empty
          icon="terminal"
          title="No active sessions"
          sub={`Open a simulated SSH session above — up to ${MAX_WINDOWS} concurrent terminal windows.`}
        />
      )}
    </div>
  )
}
