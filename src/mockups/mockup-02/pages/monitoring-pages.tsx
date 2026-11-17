import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, LineChart, type SeriesSpec, Sparkline, emitToast, navTo,
} from '../components/ui'
import { CLUSTER_SERIES, NODES, SYS_ALERTS, seriesPoints } from '../data'

function StateText({ text, kind }: { text: string; kind: 'green' | 'amber' | 'blue' }) {
  return <span className={`aws2-chip aws2-chip--${kind}`}><span className="a2-dot" />{text}</span>
}

const CPU_WALK = () => seriesPoints(CLUSTER_SERIES.cpu, 600, 200, 6)

function utilTally() {
  const up = NODES.filter((n) => n.state !== 'DOWN')
  const cpu = Math.round(up.reduce((s, n) => s + n.cpuUtil, 0) / up.length)
  const mem = Math.round(up.reduce((s, n) => s + n.memUtil, 0) / up.length)
  const gpuNodes = NODES.filter((n) => n.gpuCount > 0 && n.state !== 'DOWN')
  const gpu = gpuNodes.length ? Math.round(gpuNodes.reduce((s, n) => s + n.cpuUtil, 0) / gpuNodes.length) : 0
  return { cpu, mem, gpu }
}

export function ClusterHealthPage() {
  const rows = [
    { svc: 'Slurm controller (slurmctld)', host: 'enucc-mgmt-01', status: 'Running', detail: 'Slurm 23.11.7 · RPC latency 2 ms' },
    { svc: 'Scheduler partitions', host: '—', status: 'Running', detail: '4 partitions · backfill active' },
    { svc: 'Filesystem fs-home (NFS)', host: 'fs-home', status: 'Running', detail: '1.0 TB · 73% used' },
    { svc: 'Filesystem /scratch (Lustre)', host: 'fs-scratch', status: 'Running', detail: '2.0 TB · 70% used' },
    { svc: 'Filesystem /archive (NFS)', host: 'fs-archive', status: 'Degraded', detail: 'OST 12 responding slowly' },
    { svc: 'Authentication (LDAP)', host: 'enucc-mgmt-02', status: 'Running', detail: 'slapd · replication in sync' },
    { svc: 'Monitoring (Prometheus + Grafana)', host: 'enucc-mgmt-03', status: 'Running', detail: 'Scrape health 100% · 128 targets' },
  ]
  return (
    <>
      <Breadcrumbs items={[{ label: 'Monitoring' }, { label: 'Cluster Health' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Cluster Health</h1>
          <div className="a2-pagehead-sub">Service-level view across controllers, storage, auth and monitoring</div>
        </div>
        <div className="a2-pagehead-actions"><button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => navTo({ page: 'alerts' })}><Lucide.TriangleAlert size={13} />View alerts</button></div>
      </div>
      <div className="a2-filterbar"><div className="aws2-searchbox-main"><Lucide.Search size={13} /><input placeholder="Filter services" /></div></div>
      <div className="aws2-table-wrap">
        <table className="aws2-table">
          <thead><tr><th>Service</th><th>Host</th><th>Status</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.svc}>
                <td>{r.svc}</td>
                <td className="sub mono">{r.host}</td>
                <td><StateText text={r.status} kind={r.status === 'Running' ? 'green' : 'amber'} /></td>
                <td className="sub">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function ResourceUtilisationPage() {
  const [range, setRange] = useState('24h')
  const t = utilTally()
  const specs: SeriesSpec[] = [
    { key: 'cpu', label: `CPU (${t.cpu}%)`, color: 'blue' },
    { key: 'mem', label: `Memory (${t.mem}%)`, color: 'purple' },
    { key: 'gpu', label: `GPU (${t.gpu}%)`, color: 'green' },
  ]
  void range
  void CPU_WALK
  return (
    <>
      <Breadcrumbs items={[{ label: 'Monitoring' }, { label: 'Resource Utilisation' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Resource Utilisation</h1>
          <div className="a2-pagehead-sub">Cluster-wide CPU, memory and GPU usage averaged across responding nodes</div>
        </div>
        <div className="a2-pagehead-actions">
          <div className="aws2-selectwrap"><select value={range} onChange={(e) => setRange(e.target.value)}><option>6h</option><option>24h</option><option>7d</option><option>30d</option></select><Lucide.ChevronDown size={13} /></div>
        </div>
      </div>
      <div className="a2-three">
        <Card><CardB><div className="a2-util-kpi"><span>Cluster CPU</span><b className="mono">{t.cpu}%</b><Sparkline data={CLUSTER_SERIES.cpu} color="blue" width={110} height={30} /></div></CardB></Card>
        <Card><CardB><div className="a2-util-kpi"><span>Cluster memory</span><b className="mono">{t.mem}%</b><Sparkline data={CLUSTER_SERIES.mem} color="purple" width={110} height={30} /></div></CardB></Card>
        <Card><CardB><div className="a2-util-kpi"><span>Cluster GPU</span><b className="mono">{t.gpu}%</b><Sparkline data={CLUSTER_SERIES.gpu} color="green" width={110} height={30} /></div></CardB></Card>
      </div>
      <Card>
        <CardH right={<span className="a2-note">Hours: {new Date().toISOString().slice(11, 16)} · UTC mocked</span>}>Utilisation over the last 24 hours</CardH>
        <CardB><LineChart specs={specs} height={260} /></CardB>
      </Card>
    </>
  )
}

export function AlertsPage() {
  const [openId, setOpenId] = useState<number | null>(SYS_ALERTS[2]?.id ?? null)
  return (
    <>
      <Breadcrumbs items={[{ label: 'Monitoring' }, { label: 'Alerts' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Alerts</h1>
          <div className="a2-pagehead-sub">1 critical · 1 warning · 2 informational in the last 7 days</div>
        </div>
        <div className="a2-pagehead-actions"><button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => emitToast('success', 'All alerts acknowledged — simulated')}><Lucide.CheckCheck size={13} />Acknowledge all</button></div>
      </div>
      <div className="a2-alertlist">
        {SYS_ALERTS.map((a) => (
          <Card key={a.id} className="a2-alertcard">
            <CardB>
              <button className="a2-alertrow" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                <span className={`aws2-chip aws2-chip--${a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue'}`}><span className="a2-dot" />{a.severity}</span>
                <span className="a2-alert-title">{a.title}</span>
                <span className="a2-alert-time">{a.time}</span>
                <Lucide.ChevronDown size={14} className={openId === a.id ? 'a2-open' : ''} />
              </button>
              {openId === a.id && (
                <div className="a2-alert-detail">
                  <div><b>Service:</b> {a.service}</div>
                  <div>{a.detail}</div>
                </div>
              )}
            </CardB>
          </Card>
        ))}
      </div>
    </>
  )
}

export function FileBrowserPage() {
  const [cwd, setCwd] = useState<string[]>(['home', 'arun.bhatti'])
  const dirs: Record<string, Array<{ name: string; kind: 'dir' | 'file'; size?: string }>> = {
    'home/arun.bhatti': [
      { name: 'projects', kind: 'dir' }, { name: 'slurm-logs', kind: 'dir' }, { name: 'datasets', kind: 'dir' },
      { name: 'README.md', kind: 'file', size: '2.1 KB' }, { name: 'submit.sh', kind: 'file', size: '812 B' },
    ],
    'home/arun.bhatti/projects': [
      { name: 'lennard-jones', kind: 'dir' }, { name: 'vis-pipeline', kind: 'dir' }, { name: 'train_cnn.py', kind: 'file', size: '12 KB' },
    ],
    'home/arun.bhatti/slurm-logs': [
      { name: 'job-489347.out', kind: 'file', size: '184 KB' }, { name: 'job-489322.out', kind: 'file', size: '96 KB' },
    ],
    'home/arun.bhatti/datasets': [
      { name: 'imagenet-subset.tar', kind: 'file', size: '48.2 GB' }, { name: 'md-trajectories.h5', kind: 'file', size: '128 GB' },
    ],
  }
  const key = cwd.join('/')
  const rows = dirs[key] ?? []
  return (
    <>
      <Breadcrumbs items={[{ label: 'Storage' }, { label: 'File Browser' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">File Browser</h1>
          <div className="a2-pagehead-sub mono">fs-home:/{key}</div>
        </div>
      </div>
      <Card>
        <CardB>
          <div className="a2-crumbs-row">
            <button className="a2-crumb-link" onClick={() => setCwd(['home', 'arun.bhatti'])}>~</button>
            {cwd.slice(2).map((seg, i) => (
              <button key={i} className="a2-crumb-link" onClick={() => setCwd(cwd.slice(0, 3 + i))}>{seg}</button>
            ))}
          </div>
          <table className="aws2-table">
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th /></tr></thead>
            <tbody>
              {cwd.length > 2 && (
                <tr><td><button className="a2-name-link" onClick={() => setCwd(cwd.slice(0, -1))}>../</button></td><td>directory</td><td className="sub">—</td><td /></tr>
              )}
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>
                    {r.kind === 'dir'
                      ? <button className="a2-name-link mono" onClick={() => setCwd([...cwd, r.name])}>{r.name}/</button>
                      : <span className="mono">{r.name}</span>}
                  </td>
                  <td className="sub">{r.kind}</td>
                  <td className="mono">{r.size ?? '—'}</td>
                  <td className="a2-c"><button className="a2-name-link" onClick={() => emitToast('info', `${r.kind === 'dir' ? 'Download (recursive)' : 'Download'} ${r.name} — simulated`)}>Download</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="a2-empty">Directory is empty.</td></tr>}
            </tbody>
          </table>
        </CardB>
      </Card>
    </>
  )
}

export function TerminalPage({ role, onOpenSession }: { role: 'admin' | 'user'; onOpenSession: (node: string) => void }) {
  const pool = role === 'admin' ? NODES : NODES.filter((n) => n.state !== 'DOWN')
  return (
    <>
      <Breadcrumbs items={[{ label: 'Access' }, { label: 'Terminal (SSH)' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Terminal (SSH)</h1>
          <div className="a2-pagehead-sub">Open a simulated SSH session to any {role === 'admin' ? 'cluster node' : 'node you are permitted to access'}</div>
        </div>
      </div>
      <div className="aws2-grid5">
        {pool.slice(0, 10).map((n) => (
          <Card key={n.name} className="a2-kpi-link">
            <CardB>
              <div className="a2-termcard" onClick={() => onOpenSession(n.name)}>
                <span className={`aws2-chip aws2-chip--${n.health === 'Unreachable' ? 'red' : n.state === 'DRAINING' ? 'purple' : n.state === 'ALLOCATED' ? 'blue' : 'green'}`}><span className="a2-dot" />{n.state}</span>
                <div className="mono">{n.name}</div>
                <div className="a2-note">{n.type} · {n.partition}</div>
                <button className="aws2-btn aws2-btn--sm mt-auto"><Lucide.SquareTerminal size={13} />Connect via SSH</button>
              </div>
            </CardB>
          </Card>
        ))}
      </div>
      <p className="a2-footnote"><Lucide.Info size={13} /> Sessions appear as a floating terminal window; no real SSH connections are made.</p>
    </>
  )
}

export function RemoteDesktopPage({ role }: { role: 'admin' | 'user' }) {
  void role
  return (
    <>
      <Breadcrumbs items={[{ label: 'Access' }, { label: 'Remote Desktop' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Remote Desktop</h1>
          <div className="a2-pagehead-sub">Virtual desktop sessions hosted on interactive compute nodes</div>
        </div>
      </div>
      <Card>
        <CardH>Available desktops</CardH>
        <CardB>
          <table className="aws2-table">
            <thead><tr><th>Session</th><th>Host</th><th>Resolution</th><th>Status</th><th /></tr></thead>
            <tbody>
              <tr><td>enucc-desktop-01</td><td className="mono">enucc-cpu-003</td><td>1920×1080</td><td><StateText text="Available" kind="green" /></td><td className="a2-c"><button className="aws2-btn aws2-btn--primary aws2-btn--sm" onClick={() => navTo({ page: 'remote-desktop' })}>Connect</button></td></tr>
              <tr><td>enucc-desktop-02</td><td className="mono">enucc-gpu-002</td><td>2560×1440</td><td><StateText text="In use · m.ross" kind="blue" /></td><td className="a2-c"><button className="aws2-btn aws2-btn--sm" disabled>Join queue</button></td></tr>
            </tbody>
          </table>
          <p className="a2-footnote"><Lucide.Info size={13} /> Connectivity would use NoMachine/VNC. Fully simulated in this prototype.</p>
        </CardB>
      </Card>
    </>
  )
}

export function NodeManagementPage() {
  const draining = NODES.filter((n) => n.state === 'DRAINING')
  const down = NODES.filter((n) => n.state === 'DOWN')
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Node Management' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Node Management</h1>
          <div className="a2-pagehead-sub">Administrative node operations — drain, resume, reboot, power</div>
        </div>
      </div>
      <div className="a2-pair">
        <Card><CardH>Draining ({draining.length})</CardH><CardB>{draining.slice(0, 6).map((n) => <div key={n.name} className="mono a2-drainrow">{n.name}</div>)}{draining.length > 6 && <div className="a2-note">+{draining.length - 6} more…</div>}</CardB></Card>
        <Card><CardH>Down ({down.length})</CardH><CardB>{down.map((n) => <div key={n.name} className="mono a2-drainrow">{n.name}</div>)}</CardB></Card>
      </div>
      <Card>
        <CardH>Bulk operations</CardH>
        <CardB>
          <div className="a2-note">Operations act through <span className="mono">scontrol update nodename=… state=RESUME|DRAIN</span>. All actions are simulated.</div>
          <div className="a2-quickactions">
            <button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => emitToast('warn', 'Drain queued for all idle nodes — simulated')}><Lucide.Ban size={13} />Drain idle nodes</button>
            <button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => emitToast('success', 'Resume queued for all draining nodes — simulated')}><Lucide.Power size={13} />Resume draining nodes</button>
            <button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => navTo({ page: 'nodes' })}><Lucide.Server size={13} />Open node explorer</button>
          </div>
        </CardB>
      </Card>
    </>
  )
}

export function QosPage() {
  const rows = [
    ['high', '5000', '7-00:00:00', 'unlimited', 'unlimited', 'Admin and priority workloads'],
    ['normal', '1000', '7-00:00:00', '256', '1024', 'Default partition QoS'],
    ['low', '100', '1-00:00:00', '32', '128', 'Best-effort pre-emptible work'],
    ['long', '500', '30-00:00:00', '64', '512', 'Long-running campaign runs'],
  ] as const
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Quality of Service (QoS)' }]} />
      <div className="a2-pagehead-row"><div><h1 className="aws2-h1">Quality of Service (QoS)</h1><div className="a2-pagehead-sub">sacctmgr show qos — priority, limits and pre-emption</div></div></div>
      <div className="aws2-table-wrap">
        <table className="aws2-table">
          <thead><tr><th>QoS</th><th>Priority</th><th>Max walltime</th><th>Max jobs</th><th>Max CPUs</th><th>Description</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r[0]}><td className="mono">{r[0]}</td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td><td className="mono">{r[4]}</td><td className="sub">{r[5]}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  )
}

export function ConfigurationPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Configuration' }]} />
      <div className="a2-pagehead-row"><div><h1 className="aws2-h1">Configuration</h1><div className="a2-pagehead-sub">slurm.conf summary for enucc</div></div></div>
      <div className="a2-four">
        <Card><CardH>Controller</CardH><CardB><div className="mono a2-drainrow">SlurmctldHost=enucc-mgmt-01</div><div className="mono a2-drainrow">SlurmctldPort=6817</div><div className="mono a2-drainrow">AuthType=auth/munge</div></CardB></Card>
        <Card><CardH>Scheduling</CardH><CardB><div className="mono a2-drainrow">SchedulerType=sched/backfill</div><div className="mono a2-drainrow">SelectType=select/cons_tres</div><div className="mono a2-drainrow">PreemptMode=REQUEUE</div></CardB></Card>
        <Card><CardH>Accounting</CardH><CardB><div className="mono a2-drainrow">StorageHost=enucc-mgmt-02</div><div className="mono a2-drainrow">AccountingStorageType=accounting_storage/slurmdbd</div></CardB></Card>
        <Card><CardH>Prolog / Epilog</CardH><CardB><div className="mono a2-drainrow">Prolog=/etc/slurm/prolog.d/*</div><div className="mono a2-drainrow">Epilog=/etc/slurm/epilog.d/*</div></CardB></Card>
      </div>
    </>
  )
}
