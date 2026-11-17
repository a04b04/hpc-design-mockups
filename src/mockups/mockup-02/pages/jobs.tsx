import * as Lucide from 'lucide-react'
import { Breadcrumbs, JobStateChip, navTo } from '../components/ui'
import { JOBS } from '../data'

export function JobsPage() {
  const pinned = [...JOBS].sort((a, b) => b.id - a.id).slice(0, 25)
  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Slurm Jobs' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Slurm Jobs</h1>
          <div className="a2-pagehead-sub">{JOBS.filter((j) => j.state === 'RUNNING').length} running · {JOBS.filter((j) => j.state === 'PENDING').length} pending · 2418 total known jobs</div>
        </div>
      </div>
      <div className="a2-filterbar">
        <div className="aws2-searchbox-main"><Lucide.Search size={13} /><input placeholder="Filter by job ID, name or user (top 25 shown — newest first)" /></div>
      </div>
      <div className="aws2-table-wrap">
        <table className="aws2-table">
          <thead><tr><th>Job ID</th><th>Name</th><th>User</th><th>Partition</th><th>State</th><th>Elapsed</th><th>Nodes</th><th>Account</th><th>QoS</th><th>Priority</th></tr></thead>
          <tbody>
            {pinned.map((j) => (
              <tr key={j.id}>
                <td className="mono">{j.id}</td>
                <td>{j.name}</td>
                <td>{j.user}</td>
                <td>{j.partition}</td>
                <td><JobStateChip state={j.state} /></td>
                <td className="sub">{j.elapsedStr}</td>
                <td className="mono">{j.nodes}</td>
                <td className="sub">{j.account}</td>
                <td>{j.qos}</td>
                <td className="mono">{j.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="a2-footnote"><Lucide.Info size={13} /> Demonstrating the 25 most recent jobs. Full listing would stream from <span className="mono">squeue -a</span>. <button className="a2-name-link" onClick={() => navTo({ page: 'submit-job' })}>Submit Job</button></p>
    </>
  )
}
