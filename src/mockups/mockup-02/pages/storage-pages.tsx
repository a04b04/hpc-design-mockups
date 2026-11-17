import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, Bar, emitToast, navTo,
} from '../components/ui'
import { FILESYSTEMS, PARTITIONS, USER_QUOTA, JOBS } from '../data'

export function FilesystemsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Storage' }, { label: 'Filesystems' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Filesystems</h1>
          <div className="a2-pagehead-sub">4 mounted filesystems · 3 healthy, 1 degraded</div>
        </div>
      </div>
      <div className="aws2-table-wrap">
        <table className="aws2-table">
          <thead><tr><th>Mount</th><th>Server</th><th>Type</th><th>Size</th><th>Used</th><th>Utilisation</th><th>Quota policy</th><th>Status</th></tr></thead>
          <tbody>
            {FILESYSTEMS.map((fs) => {
              const pct = Math.round((fs.usedTB / fs.sizeTB) * 100)
              return (
                <tr key={fs.name}>
                  <td className="mono">{fs.name}</td>
                  <td className="sub mono">{fs.server}</td>
                  <td>{fs.type}</td>
                  <td className="mono">{fs.sizeTB.toFixed(1)} TB</td>
                  <td className="mono">{fs.usedTB.toFixed(1)} TB</td>
                  <td><div className="a2-barcell"><Bar pct={pct} /><span className="mono">{pct}%</span></div></td>
                  <td className="sub">{fs.quota}</td>
                  <td><StateText text={fs.status} kind={fs.status === 'Healthy' ? 'green' : 'amber'} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="a2-footnote"><Lucide.Info size={13} /> Degraded status on /archive reflects one slow OST; see <button className="a2-name-link" onClick={() => navTo({ page: 'alerts' })}>Alerts</button>.</p>
    </>
  )
}

export function QuotasPage({ role }: { role: 'admin' | 'user' }) {
  const rows: Array<[string, number, number]> = [
    ['/home', USER_QUOTA.home.usedGB, USER_QUOTA.home.quotaGB],
    ['/scratch', USER_QUOTA.scratch.usedGB, USER_QUOTA.scratch.quotaGB],
    ['/shared', USER_QUOTA.shared.usedGB, USER_QUOTA.shared.quotaGB],
    ['/archive', USER_QUOTA.archive.usedGB, USER_QUOTA.archive.quotaGB],
  ]
  return (
    <>
      <Breadcrumbs items={[{ label: 'Storage' }, { label: 'Quotas' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Quotas</h1>
          <div className="a2-pagehead-sub">{role === 'admin' ? 'Demonstration persona: arun.bhatti' : 'Your personal storage quotas'}</div>
        </div>
      </div>
      <div className="a2-four">
        {rows.map(([mount, used, quota]) => {
          const pct = Math.round((used / quota) * 100)
          return (
            <Card key={mount}>
              <CardH right={<span className="a2-note mono">{mount}</span>}>{mount === '/home' ? 'Home' : mount === '/scratch' ? 'Scratch' : mount === '/shared' ? 'Shared' : 'Archive'}</CardH>
              <CardB>
                <Bar pct={pct} large kind={pct >= 80 ? 'amber' : 'blue'} />
                <div className="a2-quota-nums"><b className="mono">{fmt(used)}</b> of <span className="mono">{fmt(quota)}</span> used · <span className="mono">{pct}%</span></div>
              </CardB>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardH right={<span className="a2-note">Policies from lustre quota / setquota</span>}>Quota policy summary</CardH>
        <CardB>
          <ul className="a2-noteslist">
            <li>/home — 1.0 TB per user, no automatic purge.</li>
            <li>/scratch — 5 TB per user · files purged after 30 days of no access.</li>
            <li>/archive — 10 TB per group · migrated to tape after 90 days.</li>
          </ul>
        </CardB>
      </Card>
    </>
  )
}

export function SubmitJobPage() {
  const [partition, setPartition] = useState('compute')
  const [cpus, setCpus] = useState(16)
  const [memGB, setMemGB] = useState(64)
  const [gpus, setGpus] = useState(0)
  const [jobName, setJobName] = useState('my_job')
  const [walltime, setWalltime] = useState('08:00:00')
  const [qos, setQos] = useState('normal')
  const [script, setScript] = useState('#!/bin/bash\n#SBATCH --job-name=my_job\nmodule load python/3.11\npython train.py --epochs 10\n')

  const part = PARTITIONS.find((p) => p.name === partition)
  const estQueue = JOBS.filter((j) => j.state === 'PENDING' && j.partition === partition).length

  const command = `sbatch --partition=${partition} --cpus-per-task=${cpus} --mem=${memGB}G${gpus ? ` --gres=gpu:${gpus}` : ''} --time=${walltime} --qos=${qos} --job-name=${jobName} submit.sh`

  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Submit Job' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Submit Job</h1>
          <div className="a2-pagehead-sub">Slurm workload submission — simulated locally, no scheduler traffic</div>
        </div>
      </div>
      <div className="a2-pair">
        <Card>
          <CardH>Job specification</CardH>
          <CardB>
            <div className="a2-form-grid">
              <label>Job name<input value={jobName} onChange={(e) => setJobName(e.target.value)} /></label>
              <label>Partition<select value={partition} onChange={(e) => setPartition(e.target.value)}>{PARTITIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select></label>
              <label> CPUs per task<input type="number" min={1} max={part?.coresPerNode ?? 64} value={cpus} onChange={(e) => setCpus(Math.max(1, Number(e.target.value)))} /></label>
              <label>Memory (GB)<input type="number" min={8} max={part?.memPerNodeGB ?? 256} step={8} value={memGB} onChange={(e) => setMemGB(Math.max(8, Number(e.target.value)))} /></label>
              <label>GPUs<input type="number" min={0} max={part?.gpus || 0} value={gpus} onChange={(e) => setGpus(Math.max(0, Number(e.target.value)))} disabled={!part?.gpus} /></label>
              <label>Walltime<input value={walltime} onChange={(e) => setWalltime(e.target.value)} /></label>
              <label>QoS<select value={qos} onChange={(e) => setQos(e.target.value)}><option>normal</option><option>high</option><option>low</option><option>long</option></select></label>
            </div>
            <label className="a2-script-label">Batch script<textarea value={script} rows={6} onChange={(e) => setScript(e.target.value)} spellCheck={false} /></label>
          </CardB>
        </Card>
        <Card>
          <CardH>Submission preview</CardH>
          <CardB>
            <pre className="a2-logpre mono a2-logpre--tight">{command}</pre>
            <ul className="a2-noteslist">
              <li>Selected partition <b>{partition}</b> currently has <b>{estQueue}</b> pending jobs.</li>
              <li>Node type: <b>{part?.coresPerNode}</b> cores · <b>{part && part.memPerNodeGB >= 1024 ? '1 TB' : `${part?.memPerNodeGB} GB`}</b> RAM{part?.gpus ? ` · ${part.gpus} A100 GPUs total` : ''}.</li>
              <li>Estimated start: immediately (adequate idle capacity) — demo estimate.</li>
            </ul>
            <button className="aws2-btn aws2-btn--primary aws2-btn--wide" onClick={() => emitToast('success', `Job ${jobName} submitted to partition ${partition} (job id 489352) — simulated`)}>
              <Lucide.Play size={14} />Submit job
            </button>
          </CardB>
        </Card>
      </div>
    </>
  )
}

function fmt(gb: number): string {
  return gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : `${gb} GB`
}

function StateText({ text, kind }: { text: string; kind: 'green' | 'amber' }) {
  return <span className={`aws2-chip aws2-chip--${kind}`}><span className="a2-dot" />{text}</span>
}
