import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, LineChart, type SeriesSpec, Sparkline, emitToast, navTo,
} from '../components/ui'
import { CLUSTER_SERIES, NODES, SYS_ALERTS, seriesPoints } from '../data'

function StateText({ text, kind }: { text: string; kind: 'green' | 'amber' | 'blue' }) {
  return <span className={`aws5-chip aws5-chip--${kind}`}><span className="a5-dot" />{text}</span>
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
    { svc: 'Filesystem /archive (NFS)', host: 'fs-archive', status: 'Degraded', detail: 'Export fs-archive:0 failed over after backend-path outage' },
    { svc: 'Authentication (LDAP)', host: 'enucc-mgmt-02', status: 'Running', detail: 'slapd · replication in sync' },
    { svc: 'Monitoring (Prometheus + Grafana)', host: 'enucc-mgmt-03', status: 'Running', detail: 'Scrape health 100% · 128 targets' },
  ]
  return (
    <>
      <Breadcrumbs items={[{ label: 'Monitoring' }, { label: 'Cluster Health' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Cluster Health</h1>
          <div className="a5-pagehead-sub">Service-level view across controllers, storage, auth and monitoring</div>
        </div>
        <div className="a5-pagehead-actions"><button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'alerts' })}><Lucide.TriangleAlert size={13} />View alerts</button></div>
      </div>
      <div className="a5-filterbar"><div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Filter services" /></div></div>
      <div className="aws5-table-wrap">
        <table className="aws5-table">
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
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Resource Utilisation</h1>
          <div className="a5-pagehead-sub">Cluster-wide CPU, memory and GPU usage averaged across responding nodes</div>
        </div>
        <div className="a5-pagehead-actions">
          <div className="aws5-selectwrap"><select value={range} onChange={(e) => setRange(e.target.value)}><option>6h</option><option>24h</option><option>7d</option><option>30d</option></select><Lucide.ChevronDown size={13} /></div>
        </div>
      </div>
      <div className="a5-three">
        <Card><CardB><div className="a5-util-kpi"><span>Cluster CPU</span><b className="mono">{t.cpu}%</b><Sparkline data={CLUSTER_SERIES.cpu} color="blue" width={110} height={30} /></div></CardB></Card>
        <Card><CardB><div className="a5-util-kpi"><span>Cluster memory</span><b className="mono">{t.mem}%</b><Sparkline data={CLUSTER_SERIES.mem} color="purple" width={110} height={30} /></div></CardB></Card>
        <Card><CardB><div className="a5-util-kpi"><span>Cluster GPU</span><b className="mono">{t.gpu}%</b><Sparkline data={CLUSTER_SERIES.gpu} color="green" width={110} height={30} /></div></CardB></Card>
      </div>
      <Card>
        <CardH right={<span className="a5-note">Hours: {new Date().toISOString().slice(11, 16)} · UTC mocked</span>}>Utilisation over the last 24 hours</CardH>
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
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Alerts</h1>
          <div className="a5-pagehead-sub">1 critical · 1 warning · 2 informational in the last 7 days</div>
        </div>
        <div className="a5-pagehead-actions"><button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'All alerts acknowledged — simulated')}><Lucide.CheckCheck size={13} />Acknowledge all</button></div>
      </div>
      <div className="a5-alertlist">
        {SYS_ALERTS.map((a) => (
          <Card key={a.id} className="a5-alertcard">
            <CardB>
              <button className="a5-alertrow" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                <span className={`aws5-chip aws5-chip--${a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue'}`}><span className="a5-dot" />{a.severity}</span>
                <span className="a5-alert-title">{a.title}</span>
                <span className="a5-alert-time">{a.time}</span>
                <Lucide.ChevronDown size={14} className={openId === a.id ? 'a5-open' : ''} />
              </button>
              {openId === a.id && (
                <div className="a5-alert-detail">
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


export function TerminalPage({ role, onOpenSession }: { role: 'admin' | 'user'; onOpenSession: (node: string) => void }) {
  const pool = role === 'admin' ? NODES : NODES.filter((n) => n.state !== 'DOWN')
  return (
    <>
      <Breadcrumbs items={[{ label: 'Access' }, { label: 'Terminal (SSH)' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Terminal (SSH)</h1>
          <div className="a5-pagehead-sub">Open a simulated SSH session to any {role === 'admin' ? 'cluster node' : 'node you are permitted to access'}</div>
        </div>
      </div>
      <div className="aws5-grid5">
        {pool.slice(0, 10).map((n) => (
          <Card key={n.name} className="a5-kpi-link">
            <CardB>
              <div className="a5-termcard" onClick={() => onOpenSession(n.name)}>
                <span className={`aws5-chip aws5-chip--${n.health === 'Unreachable' ? 'red' : n.state === 'DRAINING' ? 'purple' : n.state === 'ALLOCATED' ? 'blue' : 'green'}`}><span className="a5-dot" />{n.state}</span>
                <div className="mono">{n.name}</div>
                <div className="a5-note">{n.type} · {n.partition}</div>
                <button className="aws5-btn aws5-btn--sm mt-auto"><Lucide.SquareTerminal size={13} />Connect via SSH</button>
              </div>
            </CardB>
          </Card>
        ))}
      </div>
      <p className="a5-footnote"><Lucide.Info size={13} /> Sessions appear as a floating terminal window; no real SSH connections are made.</p>
    </>
  )
}

export function RemoteDesktopPage({ role }: { role: 'admin' | 'user' }) {
  void role
  return (
    <>
      <Breadcrumbs items={[{ label: 'Access' }, { label: 'Remote Desktop' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Remote Desktop</h1>
          <div className="a5-pagehead-sub">Virtual desktop sessions hosted on interactive compute nodes</div>
        </div>
      </div>
      <Card>
        <CardH>Available desktops</CardH>
        <CardB>
          <table className="aws5-table">
            <thead><tr><th>Session</th><th>Host</th><th>Resolution</th><th>Status</th><th /></tr></thead>
            <tbody>
              <tr><td>enucc-desktop-01</td><td className="mono">enucc-cpu-003</td><td>1920×1080</td><td><StateText text="Available" kind="green" /></td><td className="a5-c"><button className="aws5-btn aws5-btn--primary aws5-btn--sm" onClick={() => navTo({ page: 'remote-desktop' })}>Connect</button></td></tr>
              <tr><td>enucc-desktop-02</td><td className="mono">enucc-gpu-002</td><td>2560×1440</td><td><StateText text="In use · m.ross" kind="blue" /></td><td className="a5-c"><button className="aws5-btn aws5-btn--sm" disabled>Join queue</button></td></tr>
            </tbody>
          </table>
          <p className="a5-footnote"><Lucide.Info size={13} /> Connectivity would use NoMachine/VNC. Fully simulated in this prototype.</p>
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
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Node Management</h1>
          <div className="a5-pagehead-sub">Administrative node operations — drain, resume, reboot, power</div>
        </div>
      </div>
      <div className="a5-pair">
        <Card><CardH>Draining ({draining.length})</CardH><CardB>{draining.slice(0, 6).map((n) => <div key={n.name} className="mono a5-drainrow">{n.name}</div>)}{draining.length > 6 && <div className="a5-note">+{draining.length - 6} more…</div>}</CardB></Card>
        <Card><CardH>Down ({down.length})</CardH><CardB>{down.map((n) => <div key={n.name} className="mono a5-drainrow">{n.name}</div>)}</CardB></Card>
      </div>
      <Card>
        <CardH>Bulk operations</CardH>
        <CardB>
          <div className="a5-note">Operations act through <span className="mono">scontrol update nodename=… state=RESUME|DRAIN</span>. All actions are simulated.</div>
          <div className="a5-quickactions">
            <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('warn', 'Drain queued for all idle nodes — simulated')}><Lucide.Ban size={13} />Drain idle nodes</button>
            <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Resume queued for all draining nodes — simulated')}><Lucide.Power size={13} />Resume draining nodes</button>
            <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'nodes' })}><Lucide.Server size={13} />Open node explorer</button>
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
      <div className="a5-pagehead-row"><div><h1 className="aws5-h1">Quality of Service (QoS)</h1><div className="a5-pagehead-sub">sacctmgr show qos — priority, limits and pre-emption</div></div></div>
      <div className="aws5-table-wrap">
        <table className="aws5-table">
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
      <div className="a5-pagehead-row"><div><h1 className="aws5-h1">Configuration</h1><div className="a5-pagehead-sub">slurm.conf summary for enucc</div></div></div>
      <div className="a5-four">
        <Card><CardH>Controller</CardH><CardB><div className="mono a5-drainrow">SlurmctldHost=enucc-mgmt-01</div><div className="mono a5-drainrow">SlurmctldPort=6817</div><div className="mono a5-drainrow">AuthType=auth/munge</div></CardB></Card>
        <Card><CardH>Scheduling</CardH><CardB><div className="mono a5-drainrow">SchedulerType=sched/backfill</div><div className="mono a5-drainrow">SelectType=select/cons_tres</div><div className="mono a5-drainrow">PreemptMode=REQUEUE</div></CardB></Card>
        <Card><CardH>Accounting</CardH><CardB><div className="mono a5-drainrow">StorageHost=enucc-mgmt-02</div><div className="mono a5-drainrow">AccountingStorageType=accounting_storage/slurmdbd</div></CardB></Card>
        <Card><CardH>Prolog / Epilog</CardH><CardB><div className="mono a5-drainrow">Prolog=/etc/slurm/prolog.d/*</div><div className="mono a5-drainrow">Epilog=/etc/slurm/epilog.d/*</div></CardB></Card>
      </div>
    </>
  )
}
