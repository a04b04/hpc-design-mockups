/* HPC Console — Software & Modules (stage 1: catalogue page)
 * Single page for both roles (gated by the 'software' feature). Table and
 * compact card views, search plus category/availability filters and derived
 * overview stats. Selection is simulated only — detail tabs arrive stage 2. */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, SortableTh, emitToast, navTo } from '../components/ui'
import type { Role } from '../data'
import {
  SOFTWARE, SOFTWARE_CATEGORIES, filterSoftware, softwareCounts, sortSoftware, swDateString,
  softwareRecord, licenceText,
  swModuleLine,
} from './software'
import type { SoftwareApp, SoftwareRecord, SoftwareCategory, Availability, SoftwareDep, SoftwareUsageNote } from './software'

function copyText(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
  emitToast('success', 'Copied to clipboard')
}

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
  cat: string; setCat: (v: string) => void
  avail: string; setAvail: (v: string) => void
  onClear: () => void
  count: number; total: number
}) {
  const dirty = Boolean(q.trim()) || cat !== 'ALL' || avail !== 'ALL'
  return (
    <div className="a5-filterbar">
      <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search software, modules…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="aws5-selectwrap">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category filter">
          <option value="ALL">Category: ALL</option>
          {SOFTWARE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Lucide.ChevronDown size={12} />
      </div>
      <div className="aws5-selectwrap">
        <select value={avail} onChange={(e) => setAvail(e.target.value)} aria-label="Availability filter">
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

export function SoftwarePage(props: { role: Role }) {
  const [view, setView] = useState<'table' | 'cards'>(() => (safeGet(SW_VIEW_KEY) === 'cards' ? 'cards' : 'table'))
  useEffect(() => { safeSet(SW_VIEW_KEY, view) }, [view])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('ALL')
  const [avail, setAvail] = useState('ALL')

  const [sort, setSort] = useState({ col: 'name', asc: true })
  const onSort = (c: string) => setSort((s) => ({ col: c, asc: s.col === c ? !s.asc : true }))

  const counts = useMemo(() => softwareCounts(), [])
  const filtered = useMemo(
    () => filterSoftware({
      q,
      category: cat === 'ALL' ? 'ALL' : (cat as SoftwareCategory),
      availability: avail === 'ALL' ? 'ALL' : (avail as Availability),
    }),
    [q, cat, avail],
  )
  const sorted = useMemo(() => sortSoftware(filtered, sort.col, sort.asc), [filtered, sort])

  const list = (
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
          ? <SwTable rows={sorted} total={counts.apps} sort={sort} onSort={onSort} onDetails={navToDetail} />
          : <SwCards rows={sorted} onDetails={navToDetail} />}
      </div>
    </>
  )
  return <SoftwareRoutes role={props.role} list={list} />
}

function navToDetail(app: SoftwareApp): void {
  navTo({ page: 'software', swId: app.id })
}

const SW_HANDOFF_KEY = 'enucc5.swHandoff'

/** Stage 3: hand the app + exact module version to the Submit Job page. */
export function useInJob(appId: string, version?: string): void {
  const app = SOFTWARE.find((s) => s.id === appId)
  const mod = swModuleLine(appId, version ?? app?.defaultVersion)
  if (!app || mod == null) return
  const handoff = { appId: app.id, module: mod }
  try { sessionStorage.setItem(SW_HANDOFF_KEY, JSON.stringify(handoff)) } catch { /* storage unavailable */ }
  // If the Submit Job page is already mounted live, its mount-effect will not re-run;
  // notify it via a window event so the handoff (and merge modal) still lands.
  try {
    window.dispatchEvent(new CustomEvent('a5-handoff', { detail: handoff }))
  } catch { /* legacy browsers */ }
  navTo({ page: 'submit-job' })
}

/* ================================================================ detail = */

const SW_TABS = ['Overview', 'Versions', 'Dependencies', 'Usage'] as const

function SwDetailStats({ rec, app }: { rec: SoftwareRecord; app: SoftwareApp }) {
  const stats: Array<{ label: string; value: string }> = [
    { label: 'Loaded in jobs', value: `${rec.loadedJobs.total}` },
    { label: 'Job share', value: `${rec.loadedJobs.sharePct}%` },
    { label: 'Versions', value: `${app.versions.length}` },
    {
      label: 'Licence seats free', value:
        rec.licenceFree != null ? `${rec.licenceFree}` : '—',
    },
  ]
  return (
    <div className="a5-four a5-swd-stats">
      {stats.map((s) => (
        <div key={s.label} className="aws5-card a5-fm-stat">
          <div className="a5-fm-stat-h"><span className="aws5-kpi-label">{s.label}</span></div>
          <div className="aws5-kpi-val" style={{ marginTop: 6 }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}

function SwDepRow({ dep }: { dep: SoftwareDep }) {
  const target = SOFTWARE.find((s) => s.id === dep.appId)
  return (
    <div className="a5-swd-dep">
      <button className="a5-swd-dep-name" onClick={() => target && navToDetail(target)}>
        {target?.name ?? dep.appId}
      </button>
      <span className="a5-swd-dep-ver mono">{dep.constraint}</span>
      <span className={`aws5-chip a5-swd-relation a5-swd-rel--${dep.relation}`}>{dep.relation}</span>
      <span className={`aws5-chip ${dep.mandatory ? 'aws5-chip--blue' : 'aws5-chip--grey'}`}>
        {dep.mandatory ? 'Mandatory' : 'Optional'}
      </span>
      <span className="a5-swd-dep-desc sub">{target?.description ?? ''}</span>
    </div>
  )
}

function SwDetailTab({ app, rec, tab }: { app: SoftwareApp; rec: SoftwareRecord; tab: string }) {
  if (tab === 'Overview') {
    return (
      <>
        <div className="a5-pair">
          <Card>
            <CardH right={<span className="a5-note mono">{app.moduleSystem}</span>}>Module information</CardH>
            <CardB>
              <div className="a5-swd-kvlist">
                {([
                  ['Homepage', <span className="mono">{rec.homepage}</span>],
                  ['Maintainer', <span>{rec.maintainer}</span>],
                  ['Default module', <span className="mono">{app.versions.find((v) => v.version === app.defaultVersion)?.module ?? app.defaultVersion}</span>],
                  ['Install prefix', <span className="mono">{rec.installPrefix}</span>],
                  ['Licence', <span className="mono">{licenceText(rec)}</span>],
                  ['Licence server', <span className="mono">{rec.licenceServer ?? '—'}</span>],
                ] as Array<[string, ReactNode]>).map(([k, v]) => (
                  <div key={k} className="a5-kvrow"><div className="a5-kv-k">{k}</div><div className="a5-kv-v">{v}</div></div>
                ))}
              </div>
            </CardB>
          </Card>
          <Card>
            <CardH right={<AvailChip value={app.availability} />}>Module commands</CardH>
            <CardB>
              <div className="a5-swd-cmd">
                <code className="mono">module load {app.versions.find((v) => v.version === app.defaultVersion)?.module ?? `${app.name.toLowerCase()}/${app.defaultVersion}`}</code>
                <button
                  className="a5-swd-copy"
                  aria-label="Copy module load command"
                  onClick={() => copyText(`module load ${app.versions.find((v) => v.version === app.defaultVersion)?.module ?? `${app.name.toLowerCase()}/${app.defaultVersion}`}`)}
                >
                  <Lucide.Copy size={13} />
                </button>
              </div>
              <button
                className="a5-swd-cmduse"
                onClick={() => useInJob(app.id)}
              >
                <Lucide.Wand2 size={13} />Use in Job
                <span className="a5-swd-cmduse-arrow"><Lucide.ArrowRight size={13} /></span>
              </button>
              <p className="a5-note a5-swd-cmdnote">Loaded with the default version. Pin a specific release on the Versions tab and copy from there instead.</p>
            </CardB>
          </Card>
        </div>
        {rec.usage.length > 0 && (
          <Card>
            <CardH right={<span className="a5-note">{rec.usage.length} guidelines</span>}>Usage notes</CardH>
            <CardB>
              <div className="a5-swd-usagelist">
                {rec.usage.map((u) => <SwUsageRow key={u.title} note={u} />)}
              </div>
            </CardB>
          </Card>
        )}
      </>
    )
  }

  if (tab === 'Versions') {
    const defaultVersion = app.defaultVersion
    return (
      <Card>
        <CardH right={<span className="a5-note">{app.versions.length} module records</span>}>
          Version history
        </CardH>
        <CardB>
          <div className="a5-swd-verlist">
            {app.versions.map((v, i) => (
              <div key={`${v.module || v.version}-${i}`} className="a5-swd-ver">
                <div className="a5-swd-ver-main">
                  <span className="a5-swd-vername mono">{v.version}</span>
                  {v.version === defaultVersion && <span className="aws5-chip aws5-chip--blue">Default</span>}
                  {v.module.includes('legacy') && <span className="a5-swd-verlegacy">legacy build</span>}
                </div>
                <code className="a5-swd-vermodule mono">{v.module}</code>
              </div>
            ))}
            {app.versions.length === 0 && <span className="a5-empty">No module records for this application.</span>}
          </div>
        </CardB>
      </Card>
    )
  }

  if (tab === 'Dependencies') {
    const counts = {
      build: rec.deps.filter((d) => d.relation === 'build').length,
      runtime: rec.deps.filter((d) => d.relation === 'runtime').length,
      recommended: rec.deps.filter((d) => d.relation === 'recommended').length,
    }
    return (
      <Card>
        <CardH right={<span className="a5-note">{rec.deps.length} dependencies tracked</span>}>
          Build &amp; runtime dependencies
        </CardH>
        <CardB className="a5-swd-depsbody">
          <div className="a5-swd-depsummary">
            <span className="aws5-chip aws5-chip--grey">{counts.build} build</span>
            <span className="aws5-chip aws5-chip--grey">{counts.runtime} runtime</span>
            {counts.recommended > 0 && <span className="aws5-chip aws5-chip--grey">{counts.recommended} recommended</span>}
          </div>
          <div className="a5-swd-deplist">
            {rec.deps.map((d) => <SwDepRow key={`${d.appId}-${d.constraint}`} dep={d} />)}
            {rec.deps.length === 0 && (
              <div className="a5-empty">No dependencies are tracked for this application — it is self-contained in its module.</div>
            )}
          </div>
        </CardB>
      </Card>
    )
  }

  return (
    <Card>
      <CardH right={<span className="a5-note">{rec.usage.length} guidelines</span>}>Usage notes</CardH>
      <CardB>
        <div className="a5-swd-usagelist">
          {rec.usage.map((u) => <SwUsageRow key={u.title} note={u} />)}
          {rec.usage.length === 0 && <div className="a5-empty">No usage guidelines published for this application yet.</div>}
        </div>
      </CardB>
    </Card>
  )
}

function SwUsageRow({ note }: { note: SoftwareUsageNote }) {
  return (
    <div className="a5-swd-usenote">
      <div className="a5-swd-usenote-h"><Lucide.Info size={13} />{note.title}</div>
      <div className="a5-swd-usenote-b">{note.detail}</div>
    </div>
  )
}

function SwDetailPage({ app, role: _role }: { app: SoftwareApp; role: Role }) {
  const rec = softwareRecord(app.id)
  const [tab, setTab] = useState<(typeof SW_TABS)[number]>('Overview')
  if (!rec) return null
  return (
    <div className="a5-page">
      <Breadcrumbs items={[
        { label: 'Workloads' },
        { label: 'Software & Modules', onClick: () => navTo({ page: 'software' }) },
        { label: app.name },
      ]} />
      <div className="a5-pagehead">
        <div className="a5-pagehead-row">
          <div>
            <h1 className="aws5-h1"><Lucide.Package size={19} /> {app.name}</h1>
            <div className="a5-pagehead-sub">{rec.tagline}</div>
          </div>
          <div className="a5-pagehead-actions">
            <button
              className="aws5-btn aws5-btn--primary"
              title="Open this module in the Submit Job workflow"
              onClick={() => useInJob(app.id)}
            >
              <Lucide.Wand2 size={13} />Use in Job{app.versions.length > 1 ? ` — ${app.defaultVersion}` : ''}
            </button>
            <AvailChip value={app.availability} />
          </div>
        </div>
      </div>
      <SwDetailStats rec={rec} app={app} />
      <div className="a5-tabs-row"><div className="aws5-tabs">
        {SW_TABS.map((t) => (
          <button key={t} className={`aws5-tab${t === tab ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div></div>
      {tab === 'Overview' && <SwDetailTab app={app} rec={rec} tab="Overview" />}
      {tab === 'Versions' && <SwDetailTab app={app} rec={rec} tab="Versions" />}
      {tab === 'Dependencies' && <SwDetailTab app={app} rec={rec} tab="Dependencies" />}
      {tab === 'Usage' && <SwDetailTab app={app} rec={rec} tab="Usage" />}
    </div>
  )
}

/** Stage 2: the software route resolves to either the list or a detail page. */
export function SoftwareRoutes({ role, list }: { role: Role; list: ReactNode }) {
  const app = SOFTWARE.find((s) => window.location.hash.endsWith(`/software/${s.id}`))
  if (!app) return <>{list}</>
  return <SwDetailPage app={app} role={role} />
}
