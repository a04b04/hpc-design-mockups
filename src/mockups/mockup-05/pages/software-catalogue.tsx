/* HPC Console — Software & Modules (stage 1: catalogue page)
 * Single page for both roles (gated by the 'software' feature). Table and
 * compact card views, search plus category/availability filters and derived
 * overview stats. Selection is simulated only — detail tabs arrive stage 2. */

import { useEffect, useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, SortableTh, emitToast } from '../components/ui'
import type { Role } from '../data'
import {
  SOFTWARE_CATEGORIES, filterSoftware, softwareCounts, sortSoftware, swDateString,
} from './software'
import type { Availability, SoftwareApp, SoftwareCategory } from './software'

const SW_VIEW_KEY = 'enucc5.softwareView'

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

type AvailTone = 'green' | 'amber' | 'red'
const AVAIL_META: Record<Availability, { label: string; tone: AvailTone }> = {
  available: { label: 'Available', tone: 'green' },
  restricted: { label: 'Restricted', tone: 'amber' },
  unavailable: { label: 'Unavailable', tone: 'red' },
}

function AvailChip({ value }: { value: Availability }) {
  const m = AVAIL_META[value]
  return <span className={`aws5-chip aws5-chip--${m.tone}`}><span className="a5-dot" />{m.label}</span>
}

// ---------------------------------------------------------------- header --

function SwHeader({ view, setView, onRefresh }: {
  view: 'table' | 'cards'
  setView: (v: 'table' | 'cards') => void
  onRefresh: () => void
}) {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Software & Modules' }]} />
      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1"><Lucide.Package size={19} /> Software &amp; Modules</h1>
          <div className="a5-pagehead-sub">Discover installed software, explore available versions and find environment modules for your workloads.</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={onRefresh}>
            <Lucide.RefreshCw size={13} />Refresh
          </button>
          <div className="a5-seg" role="tablist" aria-label="Software view">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
            <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ----------------------------------------------------------------- stats --

function SwStats({ counts }: { counts: { apps: number; modules: number; categories: number; recent: number } }) {
  const dot: Record<string, string> = {
    blue: 'var(--a5-blue)', green: 'var(--a5-green)', amber: 'var(--a5-amber)', purple: 'var(--a5-purple)',
  }
  const cards: Array<{ label: string; value: number; tone: keyof typeof dot }> = [
    { label: 'Installed applications', value: counts.apps, tone: 'blue' },
    { label: 'Available modules', value: counts.modules, tone: 'green' },
    { label: 'Software categories', value: counts.categories, tone: 'amber' },
    { label: 'Recently updated', value: counts.recent, tone: 'purple' },
  ]
  return (
    <div className="a5-four a5-sw-stats">
      {cards.map((c) => (
        <div key={c.label} className="aws5-card a5-fm-stat">
          <div className="a5-fm-stat-h"><span className="aws5-kpi-label">{c.label}</span><span className="a5-dot" style={{ background: dot[c.tone], width: 7, height: 7 }} /></div>
          <div className="aws5-kpi-val" style={{ marginTop: 6 }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

// --------------------------------------------------------------- filters --

function SwFilters({ q, setQ, cat, setCat, avail, setAvail, onClear, count, total }: {
  q: string; setQ: (v: string) => void
  cat: string; setCat: (v: SoftwareCategory | 'ALL') => void
  avail: string; setAvail: (v: Availability | 'ALL') => void
  onClear: () => void
  count: number; total: number
}) {
  const dirty = Boolean(q.trim()) || cat !== 'ALL' || avail !== 'ALL'
  return (
    <div className="a5-filterbar">
      <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search software, modules…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="aws5-selectwrap">
        <select value={cat} onChange={(e) => setCat(e.target.value as SoftwareCategory | 'ALL')} aria-label="Category filter">
          <option value="ALL">Category: ALL</option>
          {SOFTWARE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <div className="aws5-selectwrap">
        <select value={avail} onChange={(e) => setAvail(e.target.value as Availability | 'ALL')} aria-label="Availability filter">
          <option value="ALL">Availability: ALL</option>
          <option value="available">Available</option>
          <option value="restricted">Restricted</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <button className={`a5-clearbtn${dirty ? '' : ' a5-clearbtn--off'}`} onClick={onClear} disabled={!dirty}>
        <Lucide.ListFilter size={12} />Clear filters
      </button>
      <span className="a5-filtercount">{count} of {total}</span>
    </div>
  )
}

// ----------------------------------------------------------------- table --

function SwVersionCell({ app }: { app: SoftwareApp }) {
  return <span className="a5-sw-vercell mono">{app.defaultVersion}<span className="a5-sw-vercount">{app.versions.length}</span></span>
}

function SwTable({ rows, total, sort, onSort, onDetails }: {
  rows: SoftwareApp[]
  total: number
  sort: { col: string; asc: boolean }
  onSort: (c: string) => void
  onDetails: (app: SoftwareApp) => void
}) {
  return (
    <Card>
      <div className="aws5-table-wrap a5-tableflush">
        <table className="aws5-table a5-sw-tbl">
          <thead>
            <tr>
              <SortableTh label="Software" col="name" sort={sort} onSort={onSort} width={230} />
              <SortableTh label="Category" col="category" sort={sort} onSort={onSort} width={168} />
              <SortableTh label="Default version" col="defaultVersion" sort={sort} onSort={onSort} width={128} />
              <SortableTh label="Versions" col="versions" sort={sort} onSort={onSort} width={98} center />
              <SortableTh label="Module system" col="moduleSystem" sort={sort} onSort={onSort} width={168} />
              <SortableTh label="Availability" col="availability" sort={sort} onSort={onSort} width={128} />
              <SortableTh label="Last updated" col="lastUpdated" sort={sort} onSort={onSort} width={124} />
              <th className="a5-c" style={{ width: 108 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="a5-sw-name">{s.name}<span className="a5-sw-desc">{s.description}</span></div>
                </td>
                <td><span className="a5-sw-cat">{s.category}</span></td>
                <td><SwVersionCell app={s} /></td>
                <td className="a5-c mono">{s.versions.length} record{s.versions.length === 1 ? '' : 's'}</td>
                <td className="sub">{s.moduleSystem}</td>
                <td><AvailChip value={s.availability} /></td>
                <td className="sub a5-sw-date">{swDateString(s.lastUpdatedMs)}</td>
                <td className="a5-c"><button className="a5-name-link" onClick={() => onDetails(s)}>View Details</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="a5-empty">No software matches the current filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="a5-sw-foot">
        <span className="sub">Simulated module listing — no real <code>module avail</code> is executed.</span>
        <span className="sub">{rows.length} of {total} applications</span>
      </div>
    </Card>
  )
}

// ----------------------------------------------------------------- cards --

function SwCards({ rows, onDetails }: { rows: SoftwareApp[]; onDetails: (app: SoftwareApp) => void }) {
  return (
    <div className="res-cardgrid">
      {rows.map((s) => (
        <Card key={s.id}>
          <CardB>
            <div className="res-chead">
              <span className="a5-sw-cardname">{s.name}</span>
              <AvailChip value={s.availability} />
            </div>
            <div className="a5-sw-carddesc">{s.description}</div>
            <div className="res-rows">
              <span className="res-k">Category</span><span><span className="a5-sw-cat">{s.category}</span></span>
              <span className="res-k">Default</span><span className="mono">{s.defaultVersion}</span>
              <span className="res-k">Versions</span><span className="mono">{s.versions.length} records</span>
              <span className="res-k">Modules</span><span className="sub a5-sw-mods">{s.versions[0]?.module ?? '—'}</span>
              <span className="res-k">System</span><span className="sub">{s.moduleSystem}</span>
              <span className="res-k">Updated</span><span className="sub">{swDateString(s.lastUpdatedMs)}</span>
            </div>
            <div className="res-cfoot">
              <span className="sub">{s.moduleSystem} module</span>
              <button className="a5-name-link" onClick={() => onDetails(s)}>View Details</button>
            </div>
          </CardB>
        </Card>
      ))}
      {rows.length === 0 && <p className="a5-empty">No software matches the current filters.</p>}
    </div>
  )
}

// ------------------------------------------------------------------ page --

export function SoftwarePage(_props: { role: Role }) {
  const [view, setView] = useState<'table' | 'cards'>(() => (safeGet(SW_VIEW_KEY) === 'cards' ? 'cards' : 'table'))
  useEffect(() => { safeSet(SW_VIEW_KEY, view) }, [view])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<SoftwareCategory | 'ALL'>('ALL')
  const [avail, setAvail] = useState<Availability | 'ALL'>('ALL')

  const [sort, setSort] = useState({ col: 'name', asc: true })
  const onSort = (c: string) => setSort((s) => ({ col: c, asc: s.col === c ? !s.asc : true }))

  const counts = useMemo(() => softwareCounts(), [])
  const filtered = useMemo(() => filterSoftware({ q, category: cat, availability: avail }), [q, cat, avail])
  const sorted = useMemo(() => sortSoftware(filtered, sort.col, sort.asc), [filtered, sort])

  return (
    <>
      <SwHeader
        view={view}
        setView={setView}
        onRefresh={() => emitToast('info', 'Software catalogue refreshed (simulated)')}
      />
      <div className="a5-stack a5-stack-lg">
        <SwStats counts={counts} />
        <SwFilters
          q={q} setQ={setQ}
          cat={cat} setCat={setCat}
          avail={avail} setAvail={setAvail}
          onClear={() => { setQ(''); setCat('ALL'); setAvail('ALL') }}
          count={sorted.length} total={counts.apps}
        />
        {view === 'table'
          ? <SwTable rows={sorted} total={counts.apps} sort={sort} onSort={onSort} onDetails={() => emitToast('info', 'Software details arrive in stage 2 — simulated selection.')} />
          : <SwCards rows={sorted} onDetails={() => emitToast('info', 'Software details arrive in stage 2 — simulated selection.')} />}
      </div>
    </>
  )
}
