import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, Bar, navTo,
} from '../components/ui'
import { FILESYSTEMS, USER_QUOTA } from '../data'

export function FilesystemsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Storage' }, { label: 'Filesystems' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Filesystems</h1>
          <div className="a5-pagehead-sub">4 mounted filesystems · 3 healthy, 1 degraded</div>
        </div>
      </div>
      <div className="aws5-table-wrap">
        <table className="aws5-table">
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
                  <td><div className="a5-barcell"><Bar pct={pct} /><span className="mono">{pct}%</span></div></td>
                  <td className="sub">{fs.quota}</td>
                  <td><StateText text={fs.status} kind={fs.status === 'Healthy' ? 'green' : 'amber'} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="a5-footnote"><Lucide.Info size={13} /> Degraded status on /archive reflects one slow OST; see <button className="a5-name-link" onClick={() => navTo({ page: 'alerts' })}>Alerts</button>.</p>
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
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Quotas</h1>
          <div className="a5-pagehead-sub">{role === 'admin' ? 'Demonstration persona: arun.bhatti' : 'Your personal storage quotas'}</div>
        </div>
      </div>
      <div className="a5-four">
        {rows.map(([mount, used, quota]) => {
          const pct = Math.round((used / quota) * 100)
          return (
            <Card key={mount}>
              <CardH right={<span className="a5-note mono">{mount}</span>}>{mount === '/home' ? 'Home' : mount === '/scratch' ? 'Scratch' : mount === '/shared' ? 'Shared' : 'Archive'}</CardH>
              <CardB>
                <Bar pct={pct} large kind={pct >= 80 ? 'amber' : 'blue'} />
                <div className="a5-quota-nums"><b className="mono">{fmt(used)}</b> of <span className="mono">{fmt(quota)}</span> used · <span className="mono">{pct}%</span></div>
              </CardB>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardH right={<span className="a5-note">Policies from lustre quota / setquota</span>}>Quota policy summary</CardH>
        <CardB>
          <ul className="a5-noteslist">
            <li>/home — 1.0 TB per user, no automatic purge.</li>
            <li>/scratch — 5 TB per user · files purged after 30 days of no access.</li>
            <li>/archive — 10 TB per group · migrated to tape after 90 days.</li>
          </ul>
        </CardB>
      </Card>
    </>
  )
}

function fmt(gb: number): string {
  return gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : `${gb} GB`
}

function StateText({ text, kind }: { text: string; kind: 'green' | 'amber' }) {
  return <span className={`aws5-chip aws5-chip--${kind}`}><span className="a5-dot" />{text}</span>
}
