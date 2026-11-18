import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, StateChipText, emitToast,
} from '../components/ui'
import { USERS } from '../data'

export function UsersPage() {
  const [q, setQ] = useState('')
  const list = USERS.filter((u) => !q.trim() || u.uid.includes(q.trim().toLowerCase()) || u.name.toLowerCase().includes(q.trim().toLowerCase()) || u.group.includes(q.trim().toLowerCase()))
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Users & Groups' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Users &amp; Groups</h1>
          <div className="a5-pagehead-sub">{USERS.length} accounts provisioned via LDAP</div>
        </div>
        <div className="a5-pagehead-actions"><button className="aws5-btn aws5-btn--primary" onClick={() => emitToast('info', 'User provisioning wizard (simulated)')}><Lucide.UserPlus size={14} />Add user</button></div>
      </div>
      <div className="a5-filterbar">
        <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search by username, name or group" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="aws5-table-wrap">
        <table className="aws5-table">
          <thead><tr><th>Username</th><th>Full name</th><th>Console role</th><th>Group</th><th>Slurm account</th><th>QoS</th><th>Last login</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.uid}>
                <td className="mono">{u.uid}</td>
                <td>{u.name}</td>
                <td className="sub">{u.role}</td>
                <td>{u.group}</td>
                <td className="mono">{u.account}</td>
                <td>{u.qos}</td>
                <td className="sub">{u.lastLogin}</td>
                <td><StateChipText text={u.status} kind={u.status === 'Active' ? 'green' : 'amber'} /></td>
                <td className="a5-c"><button className="a5-name-link" onClick={() => emitToast('info', `Edit ${u.uid} (simulated)`)}>Edit</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="a5-empty">No users match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function SlurmAccountsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Slurm Accounts' }]} />
      <div className="a5-pagehead-row"><div><h1 className="aws5-h1">Slurm Accounts</h1><div className="a5-pagehead-sub">Association hierarchy (sacctmgr show account)</div></div></div>
      <div className="aws5-table-wrap">
        <table className="aws5-table">
          <thead><tr><th>Account</th><th>Parent</th><th>Description</th><th>Users</th><th>Default QoS</th><th>Max jobs</th></tr></thead>
          <tbody>
            <tr><td className="mono">staff</td><td className="sub">—</td><td>Cluster administrators</td><td className="mono">2</td><td>high</td><td>unlimited</td></tr>
            <tr><td className="mono">eng-vis</td><td className="sub">engineering</td><td>Visualisation and imaging group</td><td className="mono">3</td><td>normal</td><td>64</td></tr>
            <tr><td className="mono">chemistry</td><td className="sub">science</td><td>Computational chemistry</td><td className="mono">2</td><td>normal</td><td>128</td></tr>
            <tr><td className="mono">bio-informatics</td><td className="sub">science</td><td>Genomics and bioinformatics</td><td className="mono">1</td><td>normal</td><td>64</td></tr>
            <tr><td className="mono">eng-cfd</td><td className="sub">engineering</td><td>CFD and meshing</td><td className="mono">1</td><td>normal</td><td>64</td></tr>
            <tr><td className="mono">math-modelling</td><td className="sub">science</td><td>Mathematical modelling</td><td className="mono">2</td><td>normal</td><td>32</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
