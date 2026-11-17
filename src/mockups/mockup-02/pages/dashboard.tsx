import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, CountCard, Icon, JobStateChip, LineChart, type SeriesSpec,
  SysBanner, navTo, emitToast,
} from '../components/ui'
import { HEALTH_SERVICES, JOBS, NODES, SYS_ALERTS, ACTIVITY_LOG } from '../data'
import type { Role } from '../data'

const CHART_SPECS: SeriesSpec[] = [
  { key: 'cpu', label: 'CPU (68%)', color: 'blue' },
  { key: 'mem', label: 'Memory (72%)', color: 'purple' },
  { key: 'gpu', label: 'GPU (58%)', color: 'green' },
]

const ACTIVITY_ICON: Record<string, string> = { job: 'Play', node: 'Server', alert: 'TriangleAlert', admin: 'Wrench' }

export function DashboardPage({ role }: { role: Role }) {
  const runningJobs = JOBS.filter((j) => j.state === 'RUNNING')
  const recent = JOBS.filter((j) => ['RUNNING', 'PENDING'].includes(j.state)).slice(0, 6)
  const nodesAvailable = NODES.filter((n) => n.state !== 'DOWN' && n.state !== 'DRAINING').length

  return (
    <>
      <Breadcrumbs items={[{ label: 'Cluster Overview' }, { label: 'enucc' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Cluster Overview</h1>
          <div className="a2-pagehead-sub">enucc · Production HPC cluster for compute, GPU and large-memory workloads</div>
        </div>
        <div className="a2-pagehead-actions">
          <button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => emitToast('info', 'Cluster metadata refreshed (simulated)')}><Lucide.RefreshCw size={13} />Refresh</button>
          <button className="aws2-btn aws2-btn--primary" onClick={() => navTo({ page: 'submit-job' })}><Lucide.Plus size={15} />Submit Job</button>
        </div>
      </div>

      <SysBanner kind="success" title="All services operational. Scheduler Slurm 23.11.7 responding normally.">
        Uptime: <b>14 days, 6 hours</b> · Last scheduler contact: <b>10:32:44</b> · Next maintenance window: <b>none scheduled</b>
      </SysBanner>

      <div className="aws2-grid5 aws2-grid5--dash">
        <CountCard icon="Server" tint="navy" count={NODES.length} label="Total nodes" href="nodes" />
        <CountCard icon="CircleCheck" tint="green" count={nodesAvailable} label="Available nodes" href="nodes" />
        <CountCard icon="Play" tint="blue" count={runningJobs.length} label="Running jobs" href="jobs" />
        <CountCard icon="Clock" tint="amber" count={JOBS.filter((j) => j.state === 'PENDING').length} label="Pending jobs" href="jobs" />
        <CountCard icon="TriangleAlert" tint="red" count={SYS_ALERTS.filter((a) => a.severity === 'critical' || a.severity === 'warning').length} label="Active alerts" href="alerts" />
      </div>

      <div className="a2-pair">
        <Card>
          <CardH right={<span className="aws2-chip aws2-chip--grey">24 hours</span>}>Resource utilisation</CardH>
          <CardB>
            <LineChart specs={CHART_SPECS} height={230} />
          </CardB>
        </Card>

        <Card>
          <CardH right={<button className="a2-name-link" onClick={() => navTo({ page: 'cluster-health' })}>View all</button>}>Cluster health</CardH>
          <CardB className="a2-health-list">
            {HEALTH_SERVICES.map((s) => (
              <div key={s.name} className="a2-health-row">
                <span className={`aws2-chip aws2-chip--${s.status === 'Running' ? 'green' : s.status === 'Degraded' ? 'amber' : 'red'}`}><span className="a2-dot" />{s.status}</span>
                <div className="a2-health-name"><div>{s.name}</div><small>{s.detail}</small></div>
              </div>
            ))}
          </CardB>
        </Card>
      </div>

      <div className="a2-pair">
        <Card>
          <CardH right={<button className="a2-name-link" onClick={() => navTo({ page: 'jobs' })}>View all jobs</button>}>Recent Slurm jobs</CardH>
          <CardB className="a2-tableflush">
            <table className="aws2-table">
              <thead><tr><th>Job ID</th><th>Name</th><th>User</th><th>Partition</th><th>State</th></tr></thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id}>
                    <td className="mono"><span className="a2-name-link" onClick={() => navTo({ page: 'jobs' })}>{j.id}</span></td>
                    <td>{j.name}</td>
                    <td>{j.user}</td>
                    <td>{j.partition}</td>
                    <td><JobStateChip state={j.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardB>
        </Card>

        <Card>
          <CardH right={<button className="a2-name-link" onClick={() => navTo({ page: 'alerts' })}>View activity</button>}>Recent activity</CardH>
          <CardB>
            <div className="a2-activity">
              {ACTIVITY_LOG.slice(0, 7).map((e) => (
                <div key={e.ts} className="a2-activity-row">
                  <span className={`a2-activity-ico ${e.kind}`}><Icon name={ACTIVITY_ICON[e.kind] || 'Activity'} size={13} /></span>
                  <div className="a2-activity-body">
                    <div>{e.text}</div>
                    <small>{e.ts}</small>
                  </div>
                </div>
              ))}
            </div>
          </CardB>
        </Card>
      </div>

      {role === 'user' && (
        <p className="a2-footnote"><Lucide.Info size={13} /> You are viewing the standard-user console. Personal quotas and permitted nodes apply.</p>
      )}
    </>
  )
}
