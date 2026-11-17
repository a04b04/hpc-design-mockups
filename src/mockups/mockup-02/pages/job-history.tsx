import { useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, JobStateChip, MenuWrap, Pagination, SortableTh, emitToast, navTo,
} from '../components/ui'
import { JOBS } from '../data'

type SortCol = 'id' | 'name' | 'user' | 'state' | 'submit'

export function JobHistoryPage() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ col: SortCol; asc: boolean }>({ col: 'id', asc: false })
  const [page, setPage] = useState(1)
  const PER = 12

  const rows0 = JOBS.filter((j) => j.state === 'COMPLETED' || j.state === 'FAILED')
  const filtered = rows0.filter((j) => {
    if (!q.trim()) return true
    const n = q.trim().toLowerCase()
    return j.name.toLowerCase().includes(n) || j.user.toLowerCase().includes(n) || String(j.id).includes(n)
  })
  const dir = sort.asc ? 1 : -1
  if (q.trim() === '' || true) {
    filtered.sort((a, b) => {
      switch (sort.col) {
        case 'name': return a.name.localeCompare(b.name) * dir
        case 'user': return a.user.localeCompare(b.user) * dir
        case 'state': return a.state.localeCompare(b.state) * dir
        case 'submit': {
          const ha = a.submitStr.includes('Today') ? 2 : a.submitStr.includes('Yesterday') ? 1 : 0
          const hb = b.submitStr.includes('Today') ? 2 : b.submitStr.includes('Yesterday') ? 1 : 0
          return (ha - hb) * dir || b.id - a.id
        }
        default: return (a.id - b.id) * dir
      }
    })
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const cur = Math.min(page, pages)
  const rows = filtered.slice((cur - 1) * PER, cur * PER)
  const totalFail = rows0.filter((j) => j.state === 'FAILED').length

  const onSort = (c: string) => setSort((p) => (p.col === c ? { col: c as SortCol, asc: !p.asc } : { col: c as SortCol, asc: true }))

  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Job History' }]} />
      <div className="a2-pagehead-row">
        <div>
          <h1 className="aws2-h1">Job History</h1>
          <div className="a2-pagehead-sub">412 completed · {totalFail} failed in the last 7 days (sacct)</div>
        </div>
        <div className="a2-pagehead-actions"><button className="aws2-btn aws2-btn--outline aws2-btn--sm" onClick={() => emitToast('info', 'History export queued (simulated)')}><Lucide.Download size={13} />Export</button></div>
      </div>
      <div className="a2-filterbar">
        <div className="aws2-searchbox-main">
          <Lucide.Search size={13} />
          <input placeholder="Filter by job ID, name or user" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
      </div>
      <div className="aws2-table-wrap">
        <table className="aws2-table">
          <thead><tr>
            <SortableTh label="Job ID" col="id" sort={sort} onSort={onSort} />
            <SortableTh label="Name" col="name" sort={sort} onSort={onSort} />
            <SortableTh label="User" col="user" sort={sort} onSort={onSort} />
            <th>Partition</th>
            <SortableTh label="State" col="state" sort={sort} onSort={onSort} />
            <th>Elapsed</th>
            <SortableTh label="Submitted" col="submit" sort={sort} onSort={onSort} />
            <th />
          </tr></thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id}>
                <td className="mono">{j.id}</td>
                <td>{j.name}</td>
                <td>{j.user}</td>
                <td>{j.partition}</td>
                <td><JobStateChip state={j.state} /></td>
                <td className="sub">{j.elapsedStr}</td>
                <td className="sub">{j.submitStr}</td>
                <td className="a2-c">
                  <MenuWrap
                    align="right"
                    button={<button className="aws2-iconbtn aws2-iconbtn--sm" aria-label="Actions"><Lucide.MoreHorizontal size={14} /></button>}
                    items={[
                      { label: 'Resubmit job', icon: 'RotateCcw', onClick: () => navTo({ page: 'submit-job' }) },
                      { label: 'Copy job ID', icon: 'Copy', onClick: () => emitToast('success', `${j.id} copied`) },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="a2-empty">No historical jobs match.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={cur} pages={pages} onPage={setPage} total={filtered.length} showing={`Showing ${(cur - 1) * PER + 1}–${Math.min(cur * PER, filtered.length)} of ${filtered.length}`} />
    </>
  )
}
