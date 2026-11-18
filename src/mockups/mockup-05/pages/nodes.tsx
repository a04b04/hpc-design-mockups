import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, CountCard, MenuWrap, Pagination, SortableTh, StateChipText, StateDotChip, emitToast, navTo,
} from '../components/ui'
import { NODES, PARTITIONS } from '../data'
import type { EnNode, Role, SlurmState } from '../data'

type SortCol = 'name' | 'state' | 'partition' | 'cores' | 'memGB' | 'jobs' | 'uptime'

const STATE_FILTERS: Array<SlurmState | 'all'> = ['all', 'IDLE', 'ALLOCATED', 'DRAINING', 'DOWN']

export function NodesPage({ role }: { role: Role }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState<SlurmState | 'all'>('all')
  const [partition, setPartition] = useState<string>('all')
  const [sort, setSort] = useState<{ col: SortCol; asc: boolean }>({ col: 'name', asc: true })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const PER = 12

  const filtered = useMemo(() => {
    let rows = NODES
    if (state !== 'all') rows = rows.filter((n) => n.state === state)
    if (partition !== 'all') rows = rows.filter((n) => n.partition === partition)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      rows = rows.filter((n) => n.name.toLowerCase().includes(needle) || n.cpuModel.toLowerCase().includes(needle) || n.rack.toLowerCase().includes(needle))
    }
    const dir = sort.asc ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sort.col) {
        case 'cores': return (a.cores - b.cores) * dir
        case 'memGB': return (a.memGB - b.memGB) * dir
        case 'jobs': return (a.jobs - b.jobs) * dir
        case 'uptime': return (a.uptimeStr.localeCompare(b.uptimeStr, undefined, { numeric: true })) * dir
        case 'state': return a.state.localeCompare(b.state) * dir
        case 'partition': return a.partition.localeCompare(b.partition) * dir
        default: return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir
      }
    })
  }, [q, state, partition, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const cur = Math.min(page, pages)
  const rows = filtered.slice((cur - 1) * PER, cur * PER)
  const tally = (s: SlurmState) => NODES.filter((n) => n.state === s).length

  const toggleSel = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const onSort = (col: string) => {
    setSort((prev) => (prev.col === col ? { col: col as SortCol, asc: !prev.asc } : { col: col as SortCol, asc: true }))
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Nodes' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">Nodes</h1>
          <div className="a5-pagehead-sub">{NODES.length} nodes across {PARTITIONS.length} partitions</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('info', 'Node list refreshed (simulated)')}><Lucide.RefreshCw size={13} />Refresh</button>
          {role === 'admin' && (
            <MenuWrap
              label="Actions"
              items={[
                { label: 'Drain selected nodes', icon: 'Ban', kind: 'warn', disabled: selected.size === 0, onClick: () => emitToast('warn', `Drain requested for ${selected.size} node(s) — simulated`) },
                { label: 'Resume selected nodes', icon: 'Power', disabled: selected.size === 0, onClick: () => emitToast('success', `Resume requested for ${selected.size} node(s) — simulated`) },
                { label: 'Export node inventory', icon: 'Download', onClick: () => emitToast('success', 'Node inventory exported (simulated)') },
              ]}
            />
          )}
        </div>
      </div>

      <div className="aws5-grid5">
        <CountCard icon="Server" tint="navy" count={NODES.length} label="Total nodes" />
        <CountCard icon="CircleDot" tint="green" count={tally('IDLE')} label="Idle" />
        <CountCard icon="Play" tint="blue" count={tally('ALLOCATED')} label="Allocated" />
        <CountCard icon="Hourglass" tint="purple" count={tally('DRAINING')} label="Draining" />
        <CountCard icon="CircleX" tint="red" count={tally('DOWN')} label="Down" />
      </div>

      <div className="a5-filterbar">
        <div className="aws5-searchbox-main">
          <Lucide.Search size={13} />
          <input placeholder="Search node name, CPU model or rack" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
        <div className="aws5-selectwrap">
          <select value={state} onChange={(e) => { setState(e.target.value as SlurmState | 'all'); setPage(1) }}>
            {STATE_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All states' : s}</option>)}
          </select>
          <Lucide.ChevronDown size={13} />
        </div>
        <div className="aws5-selectwrap">
          <select value={partition} onChange={(e) => { setPartition(e.target.value); setPage(1) }}>
            <option value="all">All partitions</option>
            {PARTITIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <Lucide.ChevronDown size={13} />
        </div>
        {selected.size > 0 && (
          <span className="a5-selbar">{selected.size} selected <button onClick={() => setSelected(new Set())}>Clear</button></span>
        )}
      </div>

      <div className="aws5-table-wrap">
        <table className="aws5-table">
          <thead>
            <tr>
              <th className="a5-cb-col"><input type="checkbox" aria-label="Select all on page" checked={rows.every((n) => selected.has(n.name)) && rows.length > 0} onChange={() => {
                const all = rows.every((n) => selected.has(n.name))
                setSelected((prev) => {
                  const next = new Set(prev)
                  rows.forEach((n) => (all ? next.delete(n.name) : next.add(n.name)))
                  return next
                })
              }} /></th>
              <SortableTh label="Node name" col="name" sort={sort} onSort={onSort} />
              <SortableTh label="State" col="state" sort={sort} onSort={onSort} />
              <SortableTh label="Partition" col="partition" sort={sort} onSort={onSort} />
              <SortableTh label="Cores" col="cores" sort={sort} onSort={onSort} />
              <SortableTh label="Memory" col="memGB" sort={sort} onSort={onSort} />
              <th>GPU</th>
              <SortableTh label="Jobs" col="jobs" sort={sort} onSort={onSort} center />
              <SortableTh label="Uptime" col="uptime" sort={sort} onSort={onSort} />
              <th className="a5-c">Health</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((n: EnNode) => (
              <tr key={n.name} className={selected.has(n.name) ? 'a5-selrow' : ''}>
                <td className="a5-c"><input type="checkbox" aria-label={`Select ${n.name}`} checked={selected.has(n.name)} onChange={() => toggleSel(n.name)} /></td>
                <td className="mono"><span className="a5-name-link" onClick={() => navTo({ page: 'node', node: n.name })}>{n.name}</span></td>
                <td><StateDotChip state={n.state} /></td>
                <td>{n.partition}</td>
                <td className="mono">{n.cores}</td>
                <td className="mono">{n.memStr}</td>
                <td className="sub">{n.gpuCount ? n.gpuStr : '—'}</td>
                <td className="a5-c">{n.jobs}</td>
                <td className="sub">{n.uptimeStr}</td>
                <td className="a5-c"><StateChipText text={n.health} kind={n.health === 'Healthy' ? 'green' : n.health === 'Degraded' ? 'amber' : 'red'} /></td>
                <td className="a5-c">
                  <MenuWrap
                    align="right"
                    button={<button className="aws5-iconbtn aws5-iconbtn--sm" aria-label={`${n.name} actions`}><Lucide.MoreHorizontal size={14} /></button>}
                    items={[
                      { label: 'View details', icon: 'Eye', onClick: () => navTo({ page: 'node', node: n.name }) },
                      { label: 'Connect via SSH', icon: 'SquareTerminal', onClick: () => emitToast('info', `Opening terminal to ${n.name}… — simulated`) },
                      { label: 'Copy node name', icon: 'Copy', onClick: () => emitToast('success', `${n.name} copied`) },
                      { label: 'Drain node', icon: 'Ban', kind: 'warn', disabled: role !== 'admin', onClick: () => emitToast('warn', `Drain requested for ${n.name} — simulated`) },
                      { label: 'Power off node', icon: 'Power', kind: 'danger', disabled: role !== 'admin', onClick: () => emitToast('error', `Power off rejected in demo mode`) },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={11} className="a5-empty">No nodes match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={cur}
        pages={pages}
        onPage={setPage}
        total={filtered.length}
        showing={`Showing ${(cur - 1) * PER + 1}–${Math.min(cur * PER, filtered.length)} of ${filtered.length}`}
      />
    </>
  )
}
