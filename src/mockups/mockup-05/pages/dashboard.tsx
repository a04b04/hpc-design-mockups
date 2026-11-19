import * as Lucide from 'lucide-react'
import {
  Bar, Breadcrumbs, Card, CardB, CardH, CountCard, Icon, JobStateChip, LineChart, type SeriesSpec,
  SysBanner, navTo, emitToast,
} from '../components/ui'
import { ACTIVITY_LOG, HEALTH_SERVICES, JOBS, NODES, SESSION_USER, SYS_ALERTS, USER_QUOTA, scopedJobs } from '../data'
import type { Role } from '../data'

const CHART_SPECS: SeriesSpec[] = [
  { key: 'cpu', label: 'CPU (68%)', color: 'blue' },
  { key: 'mem', label: 'Memory (72%)', color: 'purple' },
  { key: 'gpu', label: 'GPU (58%)', color: 'green' },
]

const ACTIVITY_ICON: Record<string, string> = { job: 'Play', node: 'Server', alert: 'TriangleAlert', admin: 'Wrench', completed: 'CircleCheck' }

export function DashboardPage({ role }: { role: Role }) {
  // Stage 2: admins keep the cluster-wide views below; standard users get a
  // personal dashboard derived from the same shared dataset (no duplication).
  const isUser = role === 'user'
  const me = SESSION_USER[role]
  const myJobs = scopedJobs(role)
  const runningJobs = (isUser ? myJobs : JOBS).filter((j) => j.state === 'RUNNING')
  const pendingJobs = (isUser ? myJobs : JOBS).filter((j) => j.state === 'PENDING')
  const recent = (isUser ? myJobs : JOBS).filter((j) => ['RUNNING', 'PENDING'].includes(j.state)).slice(0, 6)
  const nodesAvailable = NODES.filter((n) => n.state !== 'DOWN' && n.state !== 'DRAINING').length

  const activity = isUser
    ? ACTIVITY_LOG.filter((e) => e.text.includes(SESSION_USER.user.uid) || e.text.includes(SESSION_USER.user.account) || e.text.includes('archive')).slice(0, 7)
    : ACTIVITY_LOG.slice(0, 7)

  return (
    <>
      <Breadcrumbs items={[{ label: isUser ? 'My Dashboard' : 'Cluster Overview' }, { label: 'enucc' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">{isUser ? 'My Dashboard' : 'Cluster Overview'}</h1>
          <div className="a5-pagehead-sub">
            {isUser
              ? `Welcome, ${me.name} · s.chen on enucc · charged to eng-vis`
              : 'enucc · Production HPC cluster for compute, GPU and large-memory workloads'}
          </div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('info', 'Cluster metadata refreshed (simulated)')}><Lucide.RefreshCw size={13} />Refresh</button>
          <button className="aws5-btn aws5-btn--primary" onClick={() => navTo({ page: 'submit-job' })}><Lucide.Plus size={15} />Submit Job</button>
        </div>
      </div>

      <SysBanner kind="success" title="All services operational. Scheduler Slurm 23.11.7 responding normally.">
        Uptime: <b>14 days, 6 hours</b> · Last scheduler contact: <b>10:32:44</b> · Next maintenance window: <b>none scheduled</b>
      </SysBanner>

      <div className="aws5-grid5 aws5-grid5--dash">
        <CountCard icon="Server" tint="navy" count={NODES.length} label="Total nodes" href="nodes" />
        <CountCard icon="CircleCheck" tint="green" count={nodesAvailable} label={isUser ? 'Available nodes' : 'Available nodes'} href="nodes" />
        <CountCard icon="Play" tint="blue" count={runningJobs.length} label={isUser ? 'My running jobs' : 'Running jobs'} href="jobs" />
        <CountCard icon="Clock" tint="amber" count={pendingJobs.length} label={isUser ? 'My pending jobs' : 'Pending jobs'} href="jobs" />
        <CountCard icon="TriangleAlert" tint="red" count={SYS_ALERTS.filter((a) => a.severity === 'critical' || a.severity === 'warning').length} label="Active alerts" href="alerts" />
      </div>

      <div className="a5-pair">
        <Card>
          <CardH right={<span className="aws5-chip aws5-chip--grey">24 hours</span>}>Resource utilisation</CardH>
          <CardB>
            <LineChart specs={CHART_SPECS} height={230} />
          </CardB>
        </Card>

        <Card>
          <CardH right={<button className="a5-name-link" onClick={() => navTo({ page: 'cluster-health' })}>View all</button>}>Cluster health</CardH>
          <CardB className="a5-health-list">
            {HEALTH_SERVICES.map((s) => (
              <div key={s.name} className="a5-health-row">
                <span className={`aws5-chip aws5-chip--${s.status === 'Running' ? 'green' : s.status === 'Degraded' ? 'amber' : 'red'}`}><span className="a5-dot" />{s.status}</span>
                <div className="a5-health-name"><div>{s.name}</div><small>{s.detail}</small></div>
              </div>
            ))}
          </CardB>
        </Card>
      </div>

      <div className="a5-pair">
        <Card>
          <CardH right={<button className="a5-name-link" onClick={() => navTo({ page: 'jobs' })}>{isUser ? 'My queue' : 'View all jobs'}</button>}>{isUser ? 'My recent jobs' : 'Recent Slurm jobs'}</CardH>
          <CardB className="a5-tableflush">
            <table className="aws5-table">
              <thead><tr><th>Job ID</th><th>Name</th>{!isUser && <th>User</th>}<th>Partition</th><th>State</th></tr></thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id}>
                    <td className="mono"><span className="a5-name-link" onClick={() => navTo({ page: 'jobs' })}>{j.id}</span></td>
                    <td>{j.name}</td>
                    {!isUser && <td>{j.user}</td>}
                    <td>{j.partition}</td>
                    <td><JobStateChip state={j.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isUser && recent.length === 0 && (
              <div className="a5-empty"><b>No jobs in your queue</b><span>Submit a job to see it listed here.</span></div>
            )}
          </CardB>
        </Card>

        <Card>
          <CardH right={<button className="a5-name-link" onClick={() => navTo({ page: 'alerts' })}>View activity</button>}>{isUser ? 'Your recent activity' : 'Recent activity'}</CardH>
          <CardB>
            <div className="a5-activity">
              {activity.map((e) => (
                <div key={e.ts} className="a5-activity-row">
                  <span className={`a5-activity-ico ${e.kind}`}><Icon name={ACTIVITY_ICON[e.kind] || 'Activity'} size={13} /></span>
                  <div className="a5-activity-body">
                    <div>{e.text}</div>
                    <small>{e.ts}</small>
                  </div>
                </div>
              ))}
            </div>
          </CardB>
        </Card>
      </div>

      {isUser ? (
        <>
          <Card className="a5-userstrip">
            <CardB>
              <div className="a5-userstrip-grid">
                <div className="a5-userstrip-title"><Lucide.Wallet size={14} /> My quotas</div>
                {([['home', 'Home'], ['scratch', 'Scratch'], ['shared', 'Shared'], ['archive', 'Archive']] as const).map(([key, label]) => {
                  const q = USER_QUOTA[key]
                  const pct = Math.round((q.usedGB / q.quotaGB) * 100)
                  return (
                    <div key={key} className="a5-quota-row">
                      <span className="a5-quota-label">{label}</span>
                      <Bar pct={pct} kind={pct >= 80 ? 'amber' : 'blue'} />
                      <small className="mono">{pct}%</small>
                    </div>
                  )
                })}
              </div>
              <p className="a5-userstrip-note">Home and shared quotas are per user; scratch and archive quotas are charged to your Slurm accounts. Figures from the storage service (simulated).</p>
              <div className="a5-denied-actions">
                <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'filesystems' })}>Browse storage</button>
              </div>
            </CardB>
          </Card>
          <p className="a5-footnote"><Lucide.Info size={13} /> {`You are signed in as ${me.name} (${me.uid}) — a simulated standard-user persona. Your jobs, quotas and permissions are scoped to your account.`}</p>
        </>
      ) : (
        <p className="a5-footnote"><Lucide.Info size={13} /> Figures cover the full enucc cluster. Switch to the standard-user persona to preview the personal dashboard.</p>
      )}
    </>
  )
}
