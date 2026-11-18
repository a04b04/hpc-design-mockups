import * as Lucide from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar, Breadcrumbs, Card, CardB, CardH, JobStateChip, MenuWrap, StateDotChip, StateChipText,
  LineChart, emitToast, navTo,
} from '../components/ui'
import { JOBS, NODES } from '../data'
import type { EnNode, Role } from '../data'

const TABS = ['Overview', 'Hardware', 'Jobs', 'Metrics', 'Logs'] as const
type Tab = (typeof TABS)[number]

const nodeInfoFor = (node: EnNode) => ({
  domain: 'enucc.alces.network',
  os: node.os,
  kernel: node.kernel,
  arch: node.arch,
  sockets: 2,
  storage: node.localDisk,
  nics: node.net,
})

export function NodeDetailPage({ nodeName, role, onOpenSession }: {
  nodeName: string; role: Role; onOpenSession?: (node: string) => void
}) {
  const node = NODES.find((n) => n.name === nodeName)
  if (!node) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Nodes' }, { label: 'Not found' }]} />
        <div className="aws5-card"><div className="a5-empty">Node <b>{nodeName}</b> was not found. <button className="a5-name-link" onClick={() => navTo({ page: 'nodes' })}>Back to nodes</button></div></div>
      </>
    )
  }
  return <NodeDetail node={node} role={role} onOpenSession={onOpenSession} />
}

function nodeNameHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function NodeDetail({ node, role, onOpenSession }: { node: EnNode; role: Role; onOpenSession?: (node: string) => void }) {
  const [tab, setTab] = useState<Tab>('Overview')
  // Deterministic per-node job assignment: pick node.jobs running jobs keyed on the node name hash.
  const jobs = useMemo(() => {
    if (node.jobs === 0) return []
    const pool = JOBS.filter((j) => j.state === 'RUNNING')
    const h = nodeNameHash(node.name)
    return pool
      .map((j) => ({ j, k: Math.imul(j.id, 2654435761) ^ h }))
      .sort((a, b) => a.k - b.k)
      .slice(0, node.jobs)
      .map((x) => x.j)
  }, [node])
  const hardware = nodeInfoFor(node)
  const gpuNode = node.type === 'gpu'

  const cpuLoad = 68
  const cpuDelta = 12
  const memLoad = 72
  const memDelta = 6

  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Nodes', onClick: () => navTo({ page: 'nodes' }) }, { label: node.name }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1 mono-h1">{node.name}</h1>
          <div className="a5-pagehead-sub">
            <StateDotChip state={node.state} /> <span>{node.type} node · partition {node.partition} · rack {node.rack}</span> <span className="a5-pagehead-sub">· {jobs.length} running job{jobs.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--sm" onClick={() => { if (onOpenSession) { onOpenSession(node.name); emitToast('info', `Connecting to ${node.name} via SSH — simulated`) } else emitToast('success', `Terminal session to ${node.name} opened — simulated`) }}><Lucide.SquareTerminal size={14} />Connect via SSH</button>
          {role === 'admin' && (
            <MenuWrap
              label="Node actions"
              items={[
                { label: 'Drain node', icon: 'Ban', kind: 'warn', onClick: () => emitToast('warn', `Drain requested for ${node.name} — simulated`) },
                { label: 'Resume node', icon: 'Power', onClick: () => emitToast('success', `Resume requested for ${node.name} — simulated`) },
                { label: 'Reboot node', icon: 'RotateCcw', kind: 'danger', onClick: () => emitToast('error', 'Reboot rejected in demo mode') },
              ]}
            />
          )}
        </div>
      </div>

      <div className="aws5-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`aws5-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}{t === 'Jobs' ? ` (${jobs.length})` : ''}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <div className="aws5-grid6">
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">Status</div><div className="a5-kv-v"><StateChipText kind={node.health === 'Healthy' ? 'green' : 'amber'} text={node.health} /></div></div></CardB></Card>
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">Slurm state</div><div className="a5-kv-v"><StateChipText kind="blue" text={node.state} /></div></div></CardB></Card>
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">Partition</div><div className="a5-kv-v">{node.partition}</div></div></CardB></Card>
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">CPU cores</div><div className="a5-kv-v mono">{node.cores}</div></div></CardB></Card>
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">Total RAM</div><div className="a5-kv-v mono">{node.memStr}</div></div></CardB></Card>
            <Card><CardB><div className="a5-kvrow"><div className="a5-kv-k">GPUs</div><div className="a5-kv-v mono">{node.gpuCount ? String(node.gpuCount) : '—'}</div></div></CardB></Card>
          </div>

          <div className="a5-pair">
            <Card>
              <CardH>Key information</CardH>
              <CardB className="a5-kvwrap">
                <div className="a5-kv-k">Hostname</div><div className="a5-kv-v mono">{node.name}.{hardware.domain}</div>
                <div className="a5-kv-k">Node type</div><div className="a5-kv-v">{node.type}</div>
                <div className="a5-kv-k">Operating system</div><div className="a5-kv-v">{hardware.os}</div>
                <div className="a5-kv-k">Kernel version</div><div className="a5-kv-v mono">{hardware.kernel}</div>
                <div className="a5-kv-k">CPU architecture</div><div className="a5-kv-v mono">{hardware.arch}</div>
                <div className="a5-kv-k">Uptime</div><div className="a5-kv-v">{node.uptimeStr}</div>
                <div className="a5-kv-k">Partitions</div><div className="a5-kv-v">{node.partition}</div>
                <div className="a5-kv-k">Running jobs</div><div className="a5-kv-v">{jobs.length}</div>
              </CardB>
            </Card>

            <Card>
              <CardH right={<span className="a5-note">Last 24 hours</span>}>Utilisation</CardH>
              <CardB>
                <div className="a5-util-rows">
                  <div className="a5-util-row"><span>CPU</span><Bar pct={cpuLoad} /><b className="mono">{cpuLoad}%</b></div>
                  <div className="a5-util-row"><span>Memory</span><Bar pct={memLoad} /><b className="mono">{memLoad}%</b></div>
                  {gpuNode && <div className="a5-util-row"><span>GPU</span><Bar pct={58} kind="green" /><b className="mono">58%</b></div>}
                </div>
                <div className="a5-note-row"><Lucide.TrendingUp size={14} className="a5-up" /> CPU {cpuLoad}% <span className="a5-delta">↑ {cpuDelta}%</span> · Memory {memLoad}% <span className="a5-delta">↑ {memDelta}%</span> vs previous period</div>
              </CardB>
            </Card>
          </div>

          <Card>
            <CardH right={<button className="a5-name-link" onClick={() => navTo({ page: 'jobs' })}>View all</button>}>Jobs on this node</CardH>
            <CardB className="a5-tableflush">
              <table className="aws5-table">
                <thead><tr><th>Job ID</th><th>Name</th><th>User</th><th>State</th><th>Runtime</th><th>Allocation</th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="mono">{j.id}</td>
                      <td>{j.name}</td>
                      <td>{j.user}</td>
                      <td><JobStateChip state={j.state} /></td>
                      <td className="sub">{j.elapsedStr}</td>
                      <td className="sub mono">{j.resources}</td>
                    </tr>
                  ))}
                  {jobs.length === 0 && <tr><td colSpan={6} className="a5-empty">No jobs currently allocated to this node.</td></tr>}
                </tbody>
              </table>
            </CardB>
          </Card>

          <div className="a5-quickactions">
            <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('info', 'CPU load averaged (simulated)')}><Lucide.Cpu size={13} />CPU details</button>
            <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('info', 'Memory breakdown (simulated)')}><Lucide.MemoryStick size={13} />Memory details</button>
            {gpuNode && <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('info', 'GPU summary (simulated)')}><Lucide.CircuitBoard size={13} />GPU details</button>}
          </div>
        </>
      )}

      {tab === 'Hardware' && (
        <Card>
          <CardH>Hardware specifications</CardH>
          <CardB className="a5-kvwrap">
            <div className="a5-kv-k">CPU model</div><div className="a5-kv-v">{node.cpuModel}</div>
            <div className="a5-kv-k">CPU sockets / cores</div><div className="a5-kv-v mono">{hardware.sockets} × {node.cpuModel.split('(')[0].trim()} · {node.cores} cores</div>
            <div className="a5-kv-k">Total RAM</div><div className="a5-kv-v mono">{node.memStr}</div>
            <div className="a5-kv-k">GPU</div><div className="a5-kv-v">{node.gpuCount ? `${node.gpuStr}` : 'None'}</div>
            <div className="a5-kv-k">Local storage</div><div className="a5-kv-v mono">{hardware.storage}</div>
            <div className="a5-kv-k">Network interfaces</div><div className="a5-kv-v mono">{hardware.nics}</div>
            <div className="a5-kv-k">BMC</div><div className="a5-kv-v mono">{node.name}-bmc.{hardware.domain}</div>
          </CardB>
        </Card>
      )}

      {tab === 'Jobs' && (
        <Card>
          <CardH>Jobs allocated on {node.name}</CardH>
          <CardB className="a5-tableflush">
            <table className="aws5-table">
              <thead><tr><th>Job ID</th><th>Job name</th><th>User</th><th>State</th><th>Runtime</th><th>Allocated resources</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="mono">{j.id}</td><td>{j.name}</td><td>{j.user}</td><td><JobStateChip state={j.state} /></td>
                    <td className="sub">{j.elapsedStr}</td><td className="sub mono">{j.resources}</td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={6} className="a5-empty">No jobs on this node.</td></tr>}
              </tbody>
            </table>
          </CardB>
        </Card>
      )}

      {tab === 'Metrics' && (
        <div className="a5-twoauto">
          <Card><CardH>CPU utilisation</CardH><CardB><LineChart specs={[{ key: 'cpu', label: 'CPU (68%)', color: 'blue' }]} height={210} /></CardB></Card>
          <Card><CardH>Memory utilisation</CardH><CardB><LineChart specs={[{ key: 'mem', label: 'Memory (72%)', color: 'purple' }]} height={210} /></CardB></Card>
          {gpuNode && <Card><CardH>GPU utilisation</CardH><CardB><LineChart specs={[{ key: 'gpu', label: 'GPU (58%)', color: 'green' }]} height={210} /></CardB></Card>}
          <Card><CardH>Network activity</CardH><CardB><LineChart specs={[{ key: 'net', label: 'Network out (2.1 Gbps)', color: 'amber' }]} height={210} /></CardB></Card>
          <Card>
            <CardH>Resource allocation</CardH>
            <CardB>
              <div className="a5-util-rows">
                <div className="a5-util-row"><span>CPU alloc</span><Bar pct={node.jobs > 0 ? 100 : 0} kind="blue" /><b className="mono">{node.jobs > 0 ? '100%' : '0%'}</b></div>
                <div className="a5-util-row"><span>Memory</span><Bar pct={memLoad} /><b className="mono">{memLoad}%</b></div>
                {gpuNode && <div className="a5-util-row"><span>GPU</span><Bar pct={58} kind="green" /><b className="mono">58%</b></div>}
              </div>
            </CardB>
          </Card>
        </div>
      )}

      {tab === 'Logs' && (
        <Card>
          <CardH>Recent logs — slurmd</CardH>
          <CardB>
            <pre className="a5-logpre mono">{[
              `[2026-11-17 10:32:44] slurmd: launched job ${jobs[0]?.id ?? '489301'} on behalf of slurmctld`,
              `[2026-11-17 10:18:02] slurmd: prolog running /etc/slurm/prolog.d/00-env`,
              `[2026-11-17 09:40:11] kernel: enp0s1: link up, 100 Gbps full duplex`,
              `[2026-11-17 08:12:36] slurmd: node configured with ${node.cores} CPUs, ${node.memStr} RAM`,
              `[2026-11-17 06:05:03] systemd: Started Slurm node daemon.`,
            ].join('\n')}</pre>
          </CardB>
        </Card>
      )}

    </>
  )
}
