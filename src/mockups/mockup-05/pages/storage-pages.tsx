/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo, useState, type ReactNode } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, Bar, navTo, SortableTh } from '../components/ui'
import {
  FILESYSTEMS, FS_INFRA, FS_QUOTAS, FS_ALERTS, FS_PERF_SOURCE, USER_QUOTA,
  FROZEN, fsWalk, fsXLabels,
} from './helper'

import { FSHealthChip, pressureBarKind } from '../components/fs-chips'
import { FsChart, PERF_POINTS, type PERF_KEY, PERF_UNIT } from '../components/fs-chart'

// ---------------------------------------------------------------------------

export function FilesystemsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [health, setHealth] = useState('all')
  const [sort, setSort] = useState<{ col: string; asc: boolean }>({ col: 'mount', asc: true })
  const toggleSort = (c: string) => setSort(sort.col === c ? { col: c, asc: !sort.asc } : { col: c, asc: true })
  const clearable = search.trim() !== '' || type !== 'all' || health !== 'all'

  const counts = (h: string) => FILESYSTEMS.filter((f) => f.health === h).length
  const totalTB = FILESYSTEMS.reduce((s, f) => s + f.totalTB, 0)
  const usedTB = FILESYSTEMS.reduce((s, f) => s + f.usedTB, 0)
  const utilPct = Math.round((usedTB / totalTB) * 1000) / 10

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = FILESYSTEMS.filter((f) =>
      (!q || f.name.toLowerCase().includes(q) || f.server.toLowerCase().includes(q)) &&
      (type === 'all' || f.type === type) &&
      (health === 'all' || f.health === health))
    const byCol = (f: (typeof FILESYSTEMS)[number]): string | number => {
      switch (sort.col) {
        case 'type': return f.type
        case 'total': return f.usedTB
        case 'used': return f.usedTB
        case 'avail': return f.totalTB - f.usedTB
        case 'util': return f.usedTB / f.totalTB
        case 'health': return f.health
        default: return f.name
      }
    }
    return [...list].sort((a, b) => {
      const va = byCol(a)
      const vb = byCol(b)
      const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.asc ? d : -d
    })
  }, [search, type, health, sort])

  const summary = filtered.length === FILESYSTEMS.length
    ? `${FILESYSTEMS.length} filesystems · ${counts('Healthy')} healthy · ${counts('Degraded')} degraded`
    : `${filtered.length} of ${FILESYSTEMS.length} filesystems`

  return (
    <div className="a5-page">
      <div className="a5-pagehead">
        <div className="a5-pagehead-row">
          <div>
            <Breadcrumbs items={[{ label: 'Storage' }, { label: 'Filesystems' }]} />
            <h1 className="aws5-h1">Filesystems</h1>
            <div className="a5-pagehead-sub">4 filesystems · 5.6 PB provisioned · 69% utilised · 3 healthy, 1 degraded</div>
          </div>
        </div>
      </div>
      <div className="a5-four fs-kpi-cards">
        <Card><CardB className="ptx-b">
          <div className="aws5-kpi-top"><div className="aws5-kpi-label">Total Capacity</div><span className="ptx-icoicon aws5-counticon--blue"><Lucide.HardDrive size={16} /></span></div>
          <div className="aws5-kpi-val">{fmtBytesTB(totalTB)}</div>
          <div className="aws5-kpi-sub">across {FILESYSTEMS.length} filesystems</div>
        </CardB></Card>
        <Card><CardB className="ptx-b">
          <div className="aws5-kpi-top"><div className="aws5-kpi-label">Used Storage</div><span className="ptx-icoicon aws5-counticon--purple"><Lucide.DatabaseZap size={16} /></span></div>
          <div className="aws5-kpi-val">{fmtBytesTB(usedTB)}<small> · {utilPct}%</small></div>
          <div className="aws5-kpi-sub">of {fmtBytesTB(totalTB)} provisioned</div>
        </CardB></Card>
        <Card><CardB className="ptx-b">
          <div className="aws5-kpi-top"><div className="aws5-kpi-label">Healthy</div><span className="ptx-icoicon aws5-counticon--green"><Lucide.ShieldCheck size={16} /></span></div>
          <div className="aws5-kpi-val">{counts('Healthy')}<small> / {FILESYSTEMS.length}</small></div>
          <div className="aws5-kpi-sub">/home · /scratch · /shared</div>
        </CardB></Card>
        <Card><CardB className="ptx-b">
          <div className="aws5-kpi-top"><div className="aws5-kpi-label">Degraded</div><span className="ptx-icoicon aws5-counticon--amber"><Lucide.ShieldAlert size={16} /></span></div>
          <div className="aws5-kpi-val">{counts('Degraded')}<small> / {FILESYSTEMS.length}</small></div>
          <div className="aws5-kpi-sub">/archive — degraded NFS export</div>
        </CardB></Card>
      </div>

      <Card>
        <CardH right={<span className="a5-note mono">{summary}</span>}>Storage</CardH>
        <CardB className="ptx-b">
          <div className="a5-filterbar">            <div className="aws5-searchbox-main"><Lucide.Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mount point or server" aria-label="Search filesystems" /></div>
            <div className="aws5-selectwrap">
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filesystem type">
                <option value="all">Type: All</option><option>NFS</option><option>Lustre</option><option>BeeGFS</option><option>GPFS</option>
              </select><Lucide.ChevronDown size={12} />
            </div>
            <div className="aws5-selectwrap">
              <select value={health} onChange={(e) => setHealth(e.target.value)} aria-label="Filesystem health">
                <option value="all">Health: All</option><option>Healthy</option><option>Degraded</option><option>Critical</option><option>Offline</option>
              </select><Lucide.ChevronDown size={12} />
            </div>
            <button className={`a5-clearbtn${clearable ? '' : ' a5-clearbtn--off'}`} onClick={() => { setSearch(''); setType('all'); setHealth('all') }}>Clear filters</button>
          </div>
          <div className="aws5-table-wrap">
            <table className="aws5-table ptx-tight fs-table">
              <thead><tr>
                <SortableTh label="Mount Point" col="mount" sort={sort} onSort={toggleSort} />
                <th>Name · Server</th>
                <SortableTh label="Type" col="type" sort={sort} onSort={toggleSort} />
                <SortableTh label="Total" col="total" sort={sort} onSort={toggleSort} />
                <SortableTh label="Used" col="used" sort={sort} onSort={toggleSort} />
                <SortableTh label="Available" col="avail" sort={sort} onSort={toggleSort} />
                <SortableTh label="Utilisation" col="util" sort={sort} onSort={toggleSort} />
                <th>Quota Policy</th>
                <SortableTh label="Health" col="health" sort={sort} onSort={toggleSort} />
              </tr></thead>
              <tbody>
                {filtered.map((f) => {
                  const free = f.totalTB - f.usedTB
                  const pct = Math.round((f.usedTB / f.totalTB) * 100)
                  const press = pressureBarKind(pct)
                  return (
                    <tr key={f.name} className="s5-rowlink" onClick={() => navTo({ page: 'fs', fs: f.name.slice(1) })}>
                      <td className="mono"><span className="a5-name-link">{f.name}</span></td>
                      <td><div>{f.name}</div><div className="sub mono">{f.server}</div></td>
                      <td>{f.type}</td>
                      <td className="mono">{fmtBytesTB(f.totalTB)}</td>
                      <td className="mono">{fmtBytesTB(f.usedTB)}</td>
                      <td className="mono">{fmtBytesTB(free)}</td>
                      <td><div className="a5-barcell fs-barcell"><Bar pct={pct} kind={press} /><span className="mono">{pct}%</span></div></td>
                      <td className="sub">{f.quota}</td>
                      <td><FSHealthChip health={f.health} /></td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={9}><div className="a5-empty">No filesystems match the current filters.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </CardB>
      </Card>
      <p className="a5-footnote"><Lucide.Info size={13} /> Click a mount point to open the detail view. Degraded status on /archive reflects a degraded NFS export on nfs-archive-01; see <button className="a5-name-link" onClick={() => navTo({ page: 'alerts' })}>Alerts</button>.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filesystem detail (route: #/mockup-05/filesystems/<mount-without-slash>)

export function FilesystemDetailPage({ fsKey, role }: { fsKey: string; role: 'admin' | 'user' }) {
  const fs = FILESYSTEMS.find((f) => f.name === `/${fsKey}`)
  if (!fs) return <FsMissing fsKey={fsKey} />
  return (
    <div className="a5-page">
      <Breadcrumbs items={[
        { label: 'Storage' },
        { label: 'Filesystems', onClick: () => navTo({ page: 'filesystems' }) },
        { label: fs.name },
      ]} />
      <div className="a5-pagehead">
        <div className="a5-pagehead-row">
          <div>
            <h1 className="aws5-h1">{fs.name}</h1>
            <div className="a5-pagehead-sub">{fs.server} · {fs.type} · {fmtBytesTB(fs.totalTB)} · {Math.round((fs.usedTB / fs.totalTB) * 100)}% utilised</div>
          </div>
          <div className="a5-pagehead-actions"><FSHealthChip health={fs.health} large /></div>
        </div>
      </div>
      <FilesystemDetailInner fs={fs} role={role} />
    </div>
  )
}

// Inner component keeps hook order stable across routes within the same page mount.
function FilesystemDetailInner({ fs, role }: { fs: (typeof FILESYSTEMS)[number]; role: 'admin' | 'user' }) {
  const [tab, setTab] = useState('Overview')
  const [range, setRange] = useState('24h')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fsName = fs.name
  const healthSummary = useMemo(() => healthCounts(fsName), [fsName])
  const fsAlerts = FS_ALERTS[fsName] || []
  const quotaRows = FS_QUOTAS[fsName] || []
  const infra = FS_INFRA[fsName] || []
  const alertCount = fsAlertCounts(fsAlerts)
  const utilPct = Math.round((fs.usedTB / fs.totalTB) * 100)

  function applyRange(r: string) { setRange(r); setTab('Performance') }

  return (
    <>
      <div className="a5-tabs-row"><div className="aws5-tabs">
        {['Overview', 'Performance', 'Infrastructure', 'Quotas', 'Alerts'].map((t) => (
          <button key={t} className={`aws5-tab${t === tab ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div></div>

      {tab === 'Overview' && (
        <>
          <div className="a5-pair">
            <Card>
              <CardH>Capacity</CardH>
              <CardB>
                <div className="fs-cap-big mono"><span><b className="fs-cap-used">{fmtBytesTB(fs.usedTB)}</b> used</span><span>{utilPct}%</span></div>
                <Bar pct={utilPct} large kind={pressureBarKind(utilPct)} />
                <div className="fs-cap-legend mono">
                  <span><span className="fs-swatch fs-swatch--used" /> Used {fmtBytesTB(fs.usedTB)}</span>
                  <span><span className="fs-swatch" /> Available {fmtBytesTB(fs.totalTB - fs.usedTB)}</span>
                </div>
              </CardB>
            </Card>
            <Card>
              <CardH right={<span className="a5-note mono">{fs.type} · {fs.server}</span>}>Filesystem info</CardH>
              <CardB>
                <div className="fs-kv2col">
                  {([
                    ['Filesystem name', <span className="mono">{fs.name}</span>],
                    ['Mount point', <span className="mono">{fs.name}</span>],
                    ['Type', <span><span className="aws5-chip aws5-chip--blue">{fs.type}</span></span>],
                    ['Backend', <span className="mono">{fs.backend}</span>],
                    ['Server', <span className="mono">{fs.server}</span>],
                    ['Mount options', <span className="mono">{fs.type === 'Lustre' ? 'rw,relatime,flock' : 'rw,relatime,vers=4.2'}</span>],
                    ['Health', <FSHealthChip health={fs.health} />],
                    ['Last updated', <span className="mono">{new Date(FROZEN).toLocaleString('en-GB')}</span>],
                  ] as Array<[string, ReactNode]>).map(([k, v], i) => (
                    <div key={i} className="a5-kvrow"><div className="a5-kv-k">{k}</div><div className="a5-kv-v">{v}</div></div>
                  ))}
                </div>
              </CardB>
            </Card>
          </div>
          <Card>
            <CardH right={<span className="a5-note mono">{infra.length} components tracked</span>}>Health summary</CardH>
            <CardB>
              <div className="fs-healthcards">
                <div className="fs-healthcard">
                  <div className="fs-healthcard-n green mono">{healthSummary.healthy}</div>
                  <div className="fs-healthcard-l">Healthy</div>
                  <div className="fs-healthcard-s">Operating within expected latency and error thresholds.</div>
                </div>
                <div className="fs-healthcard">
                  <div className="fs-healthcard-n amber mono">{healthSummary.degraded}</div>
                  <div className="fs-healthcard-l">Degraded</div>
                  <div className="fs-healthcard-s">{degradedReason(fsName)}</div>
                </div>
                <div className="fs-healthcard">
                  <div className="fs-healthcard-n grey mono">{healthSummary.offline}</div>
                  <div className="fs-healthcard-l">Offline / inaccessible</div>
                  <div className="fs-healthcard-s">{healthSummary.offline > 0 ? 'Components failing connectivity probes.' : 'No components offline.'}</div>
                </div>
              </div>
              <p className="a5-note fs-healthnote">Status is derived from component health, not capacity — a filesystem can run Healthy while heavily utilised, or Degraded while mostly free.</p>
            </CardB>
          </Card>
        </>
      )}

      {tab === 'Performance' && <FsPerfTab fsName={fsName} range={range} applyRange={applyRange} />}

      {tab === 'Infrastructure' && (
        <Card>
          <CardH right={<span className="a5-note mono">{infra.length} targets</span>}>{fs.type} components</CardH>
          <CardB className="ptx-b">
            {fs.type === 'Lustre' && <p className="a5-note fs-infranote">Click a target for details. Metadata servers (MGS, MDS) and object storage servers (OSS) are hosts; MDTs and OSTs are the targets they serve.</p>}
            <div className="fs-infralist">
              {infra.map((c) => {
                const open = expanded === c.id
                return (
                  <div key={c.id} className="fs-infracard" data-open={open ? '' : undefined}>
                    <button className="fs-infrarow" onClick={() => setExpanded(open ? null : c.id)}>
                      <span>{c.role}</span>
                      <span className="mono">{c.host}{c.index ? ` · ${c.index}` : ''}</span>
                      <span className="mono">{c.capacityTB != null ? fmtBytesTB(c.capacityTB) : '—'}</span>
                      {c.utilPct != null ? <Bar pct={c.utilPct} kind={pressureBarKind(c.utilPct)} /> : <span className="fs-infrabar-empty" />}
                      <span><FSHealthChip health={c.health} /></span>
                      <Lucide.ChevronDown size={14} className={`fs-chevron${open ? ' up' : ''}`} />
                    </button>
                    {open && <div className="fs-infradetail">
                      {([
                        ['Target', <span className="mono">{c.role}{c.index ? ` ${c.index}` : ''}</span>],
                        ['Health', <FSHealthChip health={c.health} />],
                        ['Host / server', <span className="mono">{c.host}</span>],
                        ['Capacity', <span className="mono">{c.capacityTB != null ? fmtBytesTB(c.capacityTB) : '—'}</span>],
                        ['Utilisation', <span className="mono">{c.utilPct != null ? `${c.utilPct}%` : '—'}</span>],
                        ['Active jobs', <span className="mono">{c.jobs != null ? c.jobs.toLocaleString('en-GB') : '—'}</span>],
                        ['Type', <span>{fs.type}</span>],
                      ] as Array<[string, ReactNode]>).map(([k, v], i) => (
                        <div key={i} className="a5-kvrow"><div className="a5-kv-k">{k}</div><div className="a5-kv-v">{v}</div></div>
                      ))}
                    </div>}
                  </div>
                )
              })}
            </div>
          </CardB>
        </Card>
      )}

      {tab === 'Quotas' && (
        fs.type === 'NFS' ? (
          <Card>
            <CardH>Quotas</CardH>
            <CardB>
              <div className="a5-empty">
                <Lucide.Database size={18} />
                <div className="a5-empty-h">Quota tracking not enforced</div>
                <div className="a5-empty-s">{fs.type} mounts in this cluster do not enforce {fs.type === 'NFS' ? 'filesystem quotas' : 'row-level quotas'}; defaults are documented on the Quotas page.</div>
              </div>
              <div className="a5-noteslist" style={{ marginTop: 12 }}>
                <li>Default {fs.name === '/home' ? '1.0 TB' : '10 TB'} per-group policy is documented on the Quotas page.</li>
              </div>
            </CardB>
          </Card>
        ) : (
          <Card>
            <CardH right={<button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'quotas' })}>View all quotas</button>}>{fs.type} quotas</CardH>
            <CardB className="ptx-b">
              <table className="aws5-table ptx-tight">
                <thead><tr>
                  <th>Type</th>
                  <th>{fs.type === 'Lustre' ? 'Principal' : 'Group'}</th>
                  <th>Used</th>
                  <th>Soft limit</th>
                  <th>Hard limit</th>
                  <th>Utilisation</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  {quotaRows.map((q, i) => {
                    const qpct = Math.round((q.usedGB / q.hardGB) * 100)
                    const qkind = pressureBarKind(qpct)
                    return (
                      <tr key={i}>
                        <td className="sub">{q.type}</td>
                        <td className="mono">{q.principal}</td>
                        <td className="mono a5-r">{fmtBytesGB(q.usedGB)}</td>
                        <td className="mono a5-r">{fmtBytesGB(q.softGB)}</td>
                        <td className="mono a5-r">{fmtBytesGB(q.hardGB)}</td>
                        <td><div className="a5-barcell fs-barcell"><Bar pct={qpct} kind={qkind} /><span className="mono">{qpct}%</span></div></td>
                        <td><span className={`aws5-chip aws5-chip--${qkind === 'red' ? 'red' : qkind === 'amber' ? 'amber' : 'green'}`}>{qkind === 'red' ? 'Exceeded' : qkind === 'amber' ? 'Grace period' : 'OK'}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="a5-note fs-quotafoot">User values for arun.bhatti match the {fs.type === 'Lustre' ? 'Quotas' : 'group quota'} page; project rows are illustrative {fs.type} entries within this pool.</p>
            </CardB>
          </Card>
        )
      )}

      {tab === 'Alerts' && (
        <Card>
          <CardH right={<div className="fs-albadge">{alertCount.active > 0 && <span className="fs-albadge-pill">{alertCount.active} active</span>}{alertCount.akg > 0 && <span className="fs-albadge-pill grey">{alertCount.akg} ack</span>}{alertCount.res > 0 && <span className="fs-albadge-pill grey">{alertCount.res} resolved</span>}</div>}>Recent alerts</CardH>
          <CardB className="ptx-b">
            {fsAlerts.length === 0 && (
              <div className="a5-empty">
                <Lucide.CheckCircle2 size={18} />
                <div className="a5-empty-h">No alerts for this filesystem</div>
                <div className="a5-empty-s">All components have reported healthy within the active alerting window.</div>
              </div>
            )}
            {fsAlerts.map((a, i) => (
              <div key={i} className="fs-alrow">
                <div className="fs-alrow-h">
                  <span className={`fs-sev fs-sev--${a.severity.toLowerCase()}`}>{a.severity}</span>
                  <span className="fs-alrow-title">{a.title}</span>
                  <span className="fs-alrow-time mono">{a.timestamp}</span>
                </div>
                {a.description && <div className="fs-alrow-desc">{a.description}</div>}
                <div className="fs-alrow-meta sub mono">{a.component} · {a.status}</div>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'alerts' })}><Lucide.Bell size={13} /> View system alerts</button>
            </div>
          </CardB>
        </Card>
      )}

      <p className="a5-footnote">
        <Lucide.Info size={13} /> Simulated dataset{roleDisplay(role)}; performance traces are illustrative.
        Back to <button className="a5-name-link" onClick={() => navTo({ page: 'filesystems' })}>Filesystems</button>.
      </p>
    </>
  )
}

// --- Performance tab --------------------------------------------------------

function FsPerfTab({ fsName, range, applyRange }: { fsName: string; range: string; applyRange: (r: string) => void }) {
  const metrics: Array<'read' | 'write' | 'iops' | 'meta'> = fsName === '/archive' ? ['read', 'write', 'iops'] : ['read', 'write', 'iops', 'meta']
  return (
    <>
      <div className="a5-tabs-row">
        <div className="aws5-tabs">{['1h', '6h', '24h', '7d'].map((r) => (
          <button key={r} className={`aws5-tab${r === range ? ' active' : ''}`} onClick={() => applyRange(r)}>{r === '1h' ? 'Last hour' : r === '6h' ? 'Last 6 hours' : r === '24h' ? 'Last 24 hours' : 'Last 7 days'}</button>
        ))}</div>
      </div>
      {metrics.map((key) => <PerfCard key={key} fsName={fsName} metric={key} range={range} />)}
    </>
  )
}

// PerfCard intentionally has a stable hook count across renders so switching
// ranges (and even metrics availability) cannot reorder hooks.
function PerfCard({ fsName, metric, range }: { fsName: string; metric: PERF_KEY; range: string }) {
  const seedRow = FS_PERF_SOURCE[fsName] ? FS_PERF_SOURCE[fsName]![metric] : null
  if (seedRow == null) {
    return <PerfUnavailable metric={metric} />
  }
  const rs = range as '1h' | '6h' | '24h' | '7d'
  const cfg = seedRow[rs]
  const n = PERF_POINTS[rs]
  const data = fsWalk(cfg.seed, n, cfg.base, cfg.amp)
  return (
    <Card>
      <CardH>{PERF_UNIT[metric].label}</CardH>
      <CardB>
        <FsChart data={data} metric={metric} labels={fsXLabels(n)} />
      </CardB>
    </Card>
  )
}

function PerfUnavailable({ metric }: { metric: PERF_KEY }) {
  return (
    <Card>
      <CardH right={<span className="a5-note">Not available on this filesystem</span>}>{PERF_UNIT[metric].label}</CardH>
      <CardB>
        <div className="a5-empty">
          <Lucide.CircleSlash2 size={18} />
          <div className="a5-empty-h">{metric === 'meta' ? 'Metadata operation metrics not available' : 'Metric not available'}</div>
          <div className="a5-empty-s">{metric === 'meta' ? `/archive has no metadata target (MDT), so metadata ops/s is not collected.` : `No telemetry is collected for ${PERF_UNIT[metric].label.toLowerCase()} here.`}</div>
        </div>
      </CardB>
    </Card>
  )
}

// --- helpers ----------------------------------------------------------------

function healthCounts(fs: string) {
  const comps = FS_INFRA[fs] || []
  return {
    healthy: comps.filter((c) => c.health === 'Healthy').length,
    degraded: comps.filter((c) => c.health !== 'Healthy').length,
    offline: comps.filter((c) => c.health === 'Down').length,
  }
}

function fsAlertCounts(list: Array<{ status: string }>) {
  return {
    active: list.filter((a) => a.status === 'Active').length,
    akg: list.filter((a) => a.status === 'Acknowledged').length,
    res: list.filter((a) => a.status === 'Resolved').length,
  }
}

function degradedReason(fs: string): string {
  if (fs === '/archive') return 'Export fs-archive:0 failed over to nfs-archive-02 after a backend-path outage on nfs-archive-01; clients retried I/O. See Alerts tab.'
  if (fs === '/scratch') return 'No degraded targets. OST 41 was rebalanced on Nov 15.'
  if (fs === '/shared') return 'No degraded targets. genomics-core project nearing soft limit (RFM notified).'
  return 'No degraded components.'
}

function fmtBytesTB(tb: number): string {
  return tb >= 1024
    ? `${(tb / 1024).toLocaleString('en-GB', { maximumFractionDigits: 2 })} PB`
    : `${tb.toLocaleString('en-GB', { maximumFractionDigits: 1 })} TB`
}

function fmtBytesGB(gb: number): string {
  return gb >= 1024 ? `${(gb / 1024).toLocaleString('en-GB', { maximumFractionDigits: 1 })} TB` : `${gb.toLocaleString('en-GB')} GB`
}

function roleDisplay(role: 'admin' | 'user'): string {
  return role === 'admin' ? ' (administrator view)' : ' (user view)'
}

function FsMissing({ fsKey }: { fsKey: string }) {
  return (
    <div className="a5-page">
      <Breadcrumbs items={[{ label: 'Storage' }, { label: 'Filesystems', onClick: () => navTo({ page: 'filesystems' }) }]} />
      <Card>
        <CardB>
          <div className="a5-empty">
            <Lucide.AlertTriangle size={18} />
            <div className="a5-empty-h">Filesystem not found</div>
            <div className="a5-empty-s">No filesystem named /{fsKey} exists in the simulated cluster.</div>
          </div>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'filesystems' })}>Back to Filesystems</button>
        </CardB>
      </Card>
    </div>
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
