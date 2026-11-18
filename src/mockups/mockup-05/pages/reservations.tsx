import { useEffect, useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CountCard, MenuWrap, Pagination, SortableTh, StateChipText,
  emitToast, navTo,
} from '../components/ui'
import { NODES, RESERVATIONS } from '../data'
import type { Role } from '../data'

/** Reservation window flags are derived from the frozen cluster clock, so the
 * numbers stay stable across renders (the rest of the console behaves the
 * same way). */
const NOW_MS = Date.parse('2025-11-18T12:00:00')
const H = 3600_000

/* Derived reservation figures ---------------------------------------------
 * All numbers on this page derive from the shared cluster model: states and
 * node counts from RESERVATIONS, availability from the live NODES dataset.
 *
 * "Overbooked" flags reservations the local scheduler cannot honour today —
 * no reservation ever asks for more nodes than the partition owns, so this
 * measures idle-node headroom against an ACTIVE reservation's full demand.
 * ------------------------------------------------------------------------- */

type ResRow = (typeof RESERVATIONS)[number] & {
  freeInPartition: number
  short: string
}

function resRows(): ResRow[] {
  return RESERVATIONS.map((r) => {
    const freeInPartition = NODES.filter((n) => n.partition === r.partition && n.state === 'IDLE').length
    return { ...r, freeInPartition, short: `${r.start} — ${r.end}` }
  })
}

/** A reservation is overbooked when an active hold asks for more nodes than
 * the partition currently has idle headroom for. */
function overbooked(r: ResRow): boolean {
  return r.state === 'ACTIVE' && r.nodes > r.freeInPartition
}

function startingSoon(r: ResRow): boolean {
  if (r.state !== 'FUTURE') return false
  // Mock data omits the year ("Nov 22 08:00"); anchor to the frozen clock's year.
  const s = Date.parse(`${r.start} 2025`)
  return Number.isFinite(s) ? s - NOW_MS <= 72 * H : false
}

function flags(r: ResRow): Array<'overbooked' | 'soon'> {
  const f: Array<'overbooked' | 'soon'> = []
  if (overbooked(r)) f.push('overbooked')
  if (startingSoon(r)) f.push('soon')
  return f
}

/* Header ------------------------------------------------------------------ */

function ReservationsHeader({ role, view, setView }: { role: Role; view: 'table' | 'cards'; setView: (v: 'table' | 'cards') => void }) {
  const all = resRows()
  const nodeCount = all.reduce((acc, r) => acc + r.nodes, 0)
  const userCount = new Set(RESERVATIONS.flatMap((r) => r.users.split(/,\s*/))).size
  return (
    <>
      <Breadcrumbs items={[{ label: 'Compute' }, { label: 'Reservations' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Lucide.CalendarClock size={19} /> Reservations</h1>
          <div className="a5-pagehead-sub">
            {all.filter((r) => r.state === 'ACTIVE').length} active · {all.filter((r) => r.state === 'FUTURE').length} upcoming ·
            {' '}{nodeCount} nodes held · {userCount} users advanced-booked (scontrol show reservation)
          </div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Reservation list refreshed')}>
            <Lucide.RefreshCw size={13} />Refresh
          </button>
          <div className="a5-seg" role="tablist" aria-label="Reservation view">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
            <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
          </div>
          {role === 'admin' && (
            <MenuWrap
              label="Actions"
              items={[
                { label: 'Create reservation…', icon: 'Plus', onClick: () => emitToast('info', 'Reservation wizard — simulated') },
                { label: 'Export list (CSV)', icon: 'Download', onClick: () => emitToast('success', 'Reservation export queued — simulated') },
              ]}
            />
          )}
        </div>
      </div>
    </>
  )
}

/* KPI cards --------------------------------------------------------------- */

function ReservationsKpis({ role, rows }: { role: Role; rows: ResRow[] }) {
  const c = rows.filter((r) => r.state === 'ACTIVE').length
  const f = rows.filter((r) => r.state !== 'ACTIVE').length
  const held = rows.reduce((acc, r) => acc + r.nodes, 0)
  const parts = new Set(rows.map((r) => r.partition)).size
  return (
    <div className="aws5-grid5">
      <CountCard icon="CalendarClock" tint="navy" count={rows.length} label="Total reservations" />
      <CountCard icon="CircleCheck" tint="green" count={c} label="Active now" />
      <CountCard icon="Hourglass" tint="amber" count={f} label="Upcoming" />
      <CountCard
        icon="Server" tint="blue" count={held} label="Nodes held"
        href={role === 'admin' ? 'partitions' : undefined}
      />
      <CountCard icon="Layers" tint="purple" count={parts} label="Partitions reserved" />
    </div>
  )
}

/* Filters ----------------------------------------------------------------- */

function ReservationsFilters(
  { q, setQ, state, setState, part, setPart, rows }: {
    q: string; setQ: (v: string) => void
    state: string; setState: (v: string) => void
    part: string; setPart: (v: string) => void
    rows: ResRow[]
  },
) {
  const parts = Array.from(new Set(rows.map((r) => r.partition))).sort()
  return (
    <div className="a5-filterbar">
      <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search name, users, partition…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="aws5-selectwrap">
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="ALL">State: ALL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FUTURE">FUTURE</option>
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <div className="aws5-selectwrap">
        <select value={part} onChange={(e) => setPart(e.target.value)}>
          <option value="ALL">Partition: ALL</option>
          {parts.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <span className="a5-filtercount">{rows.length} of {RESERVATIONS.length}</span>
    </div>
  )
}

/* Table view -------------------------------------------------------------- */

const RES_HEADER: Record<string, string> = {
  'chem-survey': 'Chemistry department survey run (Dr Davies, QMUL)',
  'gpu-maintenance': 'GPU firmware & driver maintenance window',
  'sc-course': 'Intro to Supercomputing — student practical',
}

function ReservationRow({ r, role }: { r: ResRow; role: Role }) {
  const fl = flags(r)
  const open = () => navTo({ page: 'resv', resv: r.name })
  return (
    <tr>
      <td className="mono res-tname" onClick={open}>{r.name}</td>
      <td className="mono">{r.partition}</td>
      <td><StateChipText text={r.state} kind={r.state === 'ACTIVE' ? 'green' : 'blue'} /></td>
      <td className="mono a5-c res-tnodes">{r.nodes}×<span className="res-idlesub">{r.freeInPartition} idle</span></td>
      <td className="sub">{r.start}</td>
      <td className="sub">{r.end}</td>
      <td className="sub">{r.users}</td>
      <td>
        {fl.includes('overbooked') && <span className="a5-flagchip a5-flagchip--warn"><Lucide.TriangleAlert size={11} />Tight today</span>}
        {fl.includes('soon') && <span className="a5-flagchip a5-flagchip--info"><Lucide.CalendarClock size={11} />Starts ≤72h</span>}
        {!fl.length && <span className="res-none">—</span>}
      </td>
      <td><span className="sub res-desc">{RES_HEADER[r.name]}</span></td>
      <td className="a5-c">
        <MenuWrap
          align="right"
          button={<button className="aws5-iconbtn aws5-iconbtn--sm" aria-label={`${r.name} actions`}><Lucide.MoreHorizontal size={14} /></button>}
          items={[
            { label: 'Open details', icon: 'Eye', onClick: open },
            { label: 'Copy name', icon: 'Copy', onClick: () => emitToast('success', `${r.name} copied`) },
            { label: 'Extend 24h', icon: 'CalendarClock', kind: 'warn', disabled: role !== 'admin', onClick: () => emitToast('warn', `+24h requested for ${r.name} — simulated`) },
            { label: 'Cancel reservation', icon: 'Ban', kind: 'danger', disabled: role !== 'admin', onClick: () => emitToast('error', 'Cancel rejected in demo mode') },
          ]}
        />
      </td>
    </tr>
  )
}

function ReservationsTable({ role, rows }: { role: Role; rows: ResRow[] }) {
  const [page, setPage] = useState(1)
  const perPage = 8
  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const cur = rows.slice((page - 1) * perPage, page * perPage)
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  const [sort, setSort] = useState({ col: 'start', asc: true })
  const onSort = (c: string) => setSort((s) => ({ col: c, asc: s.col === c ? !s.asc : true }))
  const trows = useMemo(() => {
    const dir = sort.asc ? 1 : -1
    return [...cur].sort((a, b) => {
      let r = 0
      if (sort.col === 'nodes') r = a.nodes - b.nodes
      else if (sort.col === 'state') r = (a.state === 'ACTIVE' ? 0 : 1) - (b.state === 'ACTIVE' ? 0 : 1)
      else if (sort.col === 'name') r = a.name.localeCompare(b.name)
      else if (sort.col === 'partition') r = a.partition.localeCompare(b.partition)
      else r = Date.parse(a.start) - Date.parse(b.start)
      return r * dir
    })
  }, [cur, sort])

  return (
    <Card>
      <div className="aws5-table-wrap a5-tableflush">
        <table className="aws5-table ptx-tight res-tight">
          <thead>
            <tr>
              <SortableTh label="Reservation" col="name" sort={sort} onSort={onSort} width={130} />
              <SortableTh label="Partition" col="partition" sort={sort} onSort={onSort} width={100} />
              <SortableTh label="State" col="state" sort={sort} onSort={onSort} width={98} />
              <SortableTh label="Nodes" col="nodes" sort={sort} onSort={onSort} width={96} center />
              <SortableTh label="Start" col="start" sort={sort} onSort={onSort} width={106} />
              <SortableTh label="End" col="end" sort={sort} onSort={onSort} width={106} />
              <th>Reserving users</th>
              <th style={{ width: 132 }}>Flags</th>
              <th>Notes</th>
              <th style={{ width: 64 }} />
            </tr>
          </thead>
          <tbody>
            {trows.map((r) => <ReservationRow key={r.name} r={r} role={role} />)}
            {trows.length === 0 && <tr><td colSpan={10} className="a5-empty">No reservations match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && <Pagination page={page} pages={pages} onPage={setPage} total={rows.length} showing={`${cur.length} reservations`} />}
    </Card>
  )
}

/* Cards view -------------------------------------------------------------- */

function ReservationCard({ r, role }: { r: ResRow; role: Role }) {
  const fl = flags(r)
  const active = r.state === 'ACTIVE'
  return (
    <Card>
      <CardB>
        <div className="res-chead">
          <button className="a5-name-link mono" onClick={() => navTo({ page: 'resv', resv: r.name })}>{r.name}</button>
          <StateChipText text={r.state} kind={active ? 'green' : 'blue'} />
        </div>
        <div className="res-rows">
          <span className="res-k">Partition</span><span className="mono">{r.partition}</span>
          <span className="res-k">Nodes</span><span className="mono">{r.nodes}×</span>
          <span className="res-k">Window</span><span className="sub">{r.short}</span>
          <span className="res-k">Users</span><span>{r.users}</span>
          <span className="res-k">Notes</span><span className="sub">{RES_HEADER[r.name]}</span>
        </div>
        <div className="res-cfoot">
          {fl.includes('overbooked')
            ? <span className="a5-flagchip a5-flagchip--warn"><Lucide.TriangleAlert size={11} />Tight today</span>
            : <span className="a5-flagchip a5-flagchip--ok"><Lucide.CheckCircle2 size={11} />On track</span>}
          {fl.includes('soon') && <span className="a5-flagchip a5-flagchip--info"><Lucide.Clock size={11} />Soon</span>}
          {role === 'admin'
            ? <button className="a5-name-link" onClick={() => emitToast('warn', `Extend ${r.name} — simulated`)}>Extend</button>
            : <span className="sub">Read-only</span>}
        </div>
      </CardB>
    </Card>
  )
}

function ReservationsCards({ role, rows }: { role: Role; rows: ResRow[] }) {
  return (
    <div className="res-cardgrid">
      {rows.map((r) => <ReservationCard key={r.name} r={r} role={role} />)}
      {rows.length === 0 && <p className="a5-empty">No reservations match.</p>}
    </div>
  )
}

/* Detail page ------------------------------------------------------------- */

export function ReservationDetailPage({ name, role = 'admin' }: { name: string; role?: Role }) {
  const all = resRows()
  const r = all.find((x) => x.name === name)
  return (
    <>
      <Breadcrumbs items={[
        { label: 'Compute', onClick: () => navTo({ page: 'partitions' }) },
        { label: 'Reservations', onClick: () => navTo({ page: 'reservations' }) },
        { label: name },
      ]} />
      {!r ? (
        <p className="a5-empty">Reservation not found.</p>
      ) : (
        <div className="a5-stack a5-stack-lg">
          <div className="a5-pagehead-row">
            <div>
              <h1 className="aws5-h1"><Lucide.CalendarClock size={19} /> <span className="mono">{r.name}</span></h1>
              <div className="a5-pagehead-sub">{r.nodes} nodes on <span className="mono">{r.partition}</span> · {r.start} — {r.end} · {r.users}</div>
            </div>
            <div className="a5-pagehead-actions">
              <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => emitToast('success', 'Copied scontrol snippet')}>
                <Lucide.Copy size={13} />Copy scontrol
              </button>
              {role === 'admin' && (
                <button className="aws5-btn aws5-btn--sm" onClick={() => emitToast('warn', 'Extend requested — simulated')}>
                  <Lucide.CalendarClock size={13} />Extend 24h
                </button>
              )}
            </div>
          </div>
          <Card className="res-detail-card">
            <pre className="res-pre mono">scontrol show reservation {r.name}</pre>
            <div className="res-rows res-detail">
              <span className="res-k">Partition</span><span className="mono">{r.partition}</span>
              <span className="res-k">State</span><span><StateChipText text={r.state} kind={r.state === 'ACTIVE' ? 'green' : 'blue'} /></span>
              <span className="res-k">Nodes</span><span className="mono">{r.nodes}×</span>
              <span className="res-k">Start</span><span className="sub">{r.start}</span>
              <span className="res-k">End</span><span className="sub">{r.end}</span>
              <span className="res-k">Users</span><span>{r.users}</span>
              <span className="res-k">Notes</span><span className="sub">{RES_HEADER[r.name]}</span>
            </div>
          </Card>
          <p className="a5-footnote"><Lucide.TriangleAlert size={13} /> Simulated Slurm response. Availability figures come from the live node dataset; only administrators may change reservations.</p>
        </div>
      )}
    </>
  )
}

/* Page -------------------------------------------------------------------- */

const VIEW_KEY = 'enucc5.resView'

export function ReservationsPage({ role }: { role: Role }) {
  const [view, setView] = useState<'table' | 'cards'>(() => {
    const saved = safeGet(VIEW_KEY)
    return saved === 'cards' ? 'cards' : 'table'
  })
  const [q, setQ] = useState('')
  const [state, setState] = useState('ALL')
  const [part, setPart] = useState('ALL')

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view) } catch { /* storage unavailable */ } }, [view])

  const all = useMemo(resRows, [])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((r) =>
      (!needle || r.name.includes(needle) || r.users.includes(needle) || r.partition.includes(needle)) &&
      (state === 'ALL' || r.state === state) &&
      (part === 'ALL' || r.partition === part))
  }, [all, q, state, part])

  return (
    <>
      <ReservationsHeader role={role} view={view} setView={setView} />
      <div className="a5-stack a5-stack-lg">
        <ReservationsKpis role={role} rows={all} />
        <ReservationsFilters q={q} setQ={setQ} state={state} setState={setState} part={part} setPart={setPart} rows={rows} />
        {view === 'table' ? <ReservationsTable role={role} rows={rows} /> : <ReservationsCards role={role} rows={rows} />}
      </div>
    </>
  )
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
