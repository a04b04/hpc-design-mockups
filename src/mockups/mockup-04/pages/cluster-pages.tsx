import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, StateChipText, emitToast,
} from '../components/ui'
import { PARTITIONS, RESERVATIONS, USERS } from '../data'

export function PartitionsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Partitions' }]} />
      <div className="a4-pagehead-row">
        <div>
          <h1 className="aws4-h1">Partitions</h1>
          <div className="a4-pagehead-sub">4 configured partitions · all scheduling normally</div>
        </div>
      </div>
      <div className="a4-four">
        {PARTITIONS.map((p) => (
          <Card key={p.name}>
            <CardB>
              <div className="a4-pt-head"><span className="mono">{p.name}</span><StateChipText text="up" kind="green" /></div>
              <div className="a4-pt-stats">
                <div><b className="mono">{p.nodes}</b><span>nodes</span></div>
                <div><b className="mono">{p.coresPerNode}</b><span>cores/node</span></div>
                <div><b className="mono">{p.memPerNodeGB >= 1024 ? '1 TB' : `${p.memPerNodeGB} GB`}</b><span>mem/node</span></div>
                <div><b className="mono">{p.gpus || '—'}</b><span>GPUs</span></div>
              </div>
              <div className="a4-pt-foot mono">Timelimit {p.timelimit}</div>
            </CardB>
          </Card>
        ))}
      </div>
      <p className="a4-footnote"><Lucide.Info size={13} /> Equivalent to <span className="mono">sinfo</span>. Partitions group nodes with shared scheduling policy.</p>
    </>
  )
}

export function ReservationsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Reservations' }]} />
      <div className="a4-pagehead-row">
        <div>
          <h1 className="aws4-h1">Reservations</h1>
          <div className="a4-pagehead-sub">3 active or upcoming reservations (scontrol show reservation)</div>
        </div>
      </div>
      <div className="aws4-table-wrap">
        <table className="aws4-table">
          <thead><tr><th>Reservation</th><th>Partition</th><th>Nodes</th><th>Start</th><th>End</th><th>Users</th><th>State</th></tr></thead>
          <tbody>
            {RESERVATIONS.map((r) => (
              <tr key={r.name}>
                <td className="mono">{r.name}</td>
                <td>{r.partition}</td>
                <td className="mono">{r.nodes}</td>
                <td className="sub">{r.start}</td>
                <td className="sub">{r.end}</td>
                <td className="sub">{r.users}</td>
                <td><StateChipText text={r.state} kind={r.state === 'ACTIVE' ? 'green' : 'blue'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function UsersPage() {
  const [q, setQ] = useState('')
  const list = USERS.filter((u) => !q.trim() || u.uid.includes(q.trim().toLowerCase()) || u.name.toLowerCase().includes(q.trim().toLowerCase()) || u.group.includes(q.trim().toLowerCase()))
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration' }, { label: 'Users & Groups' }]} />
      <div className="a4-pagehead-row">
        <div>
          <h1 className="aws4-h1">Users &amp; Groups</h1>
          <div className="a4-pagehead-sub">{USERS.length} accounts provisioned via LDAP</div>
        </div>
        <div className="a4-pagehead-actions"><button className="aws4-btn aws4-btn--primary" onClick={() => emitToast('info', 'User provisioning wizard (simulated)')}><Lucide.UserPlus size={14} />Add user</button></div>
      </div>
      <div className="a4-filterbar">
        <div className="aws4-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search by username, name or group" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="aws4-table-wrap">
        <table className="aws4-table">
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
                <td className="a4-c"><button className="a4-name-link" onClick={() => emitToast('info', `Edit ${u.uid} (simulated)`)}>Edit</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="a4-empty">No users match.</td></tr>}
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
      <div className="a4-pagehead-row"><div><h1 className="aws4-h1">Slurm Accounts</h1><div className="a4-pagehead-sub">Association hierarchy (sacctmgr show account)</div></div></div>
      <div className="aws4-table-wrap">
        <table className="aws4-table">
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
