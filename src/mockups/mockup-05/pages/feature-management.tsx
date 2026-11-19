import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, StateChipText, emitToast } from '../components/ui'
import type { Role } from '../data'
import {
  FEATURE_ACTIONS, FEATURE_CATEGORY_ORDER, FEATURE_REGISTRY,
  featureActor, getFeatureAudit, loadFeatureConfig, pushFeatureAudit, setFeatureState,
} from './feature-flags'
import type { FeatureAuditEvent, FeatureCategory, FeatureDef, FeatureState } from './feature-flags'

type AccessCopy = { visible: boolean; actions: string[] }

const ACTION_LABELS: Record<string, string> = {
  view: 'View', use: 'Use', submit: 'Submit', download: 'Download', upload: 'Upload', delete: 'Delete', manage: 'Manage',
}

function actionsLabel(v: AccessCopy): string {
  if (!v.visible || v.actions.length === 0) return '—'
  return v.actions.map((a) => ACTION_LABELS[a] ?? a).join(', ')
}

const CATEGORY_TONES: Record<FeatureCategory, 'blue' | 'amber' | 'purple' | 'grey' | 'red' | 'green'> = {
  Compute: 'blue', Workloads: 'purple', Storage: 'green', Monitoring: 'amber', Access: 'blue', Administration: 'red',
}

type Tone = 'blue' | 'amber' | 'purple' | 'grey' | 'red' | 'green'

function ConfigurePanel({ def, cfg, role, onClose }: {
  def: FeatureDef
  cfg: Record<string, FeatureState>
  role: Role
  onClose: () => void
}) {
  const roleKeys = useMemo<Array<'admin' | 'user'>>(() => ['admin', 'user'], [])
  const roleNames: Record<'admin' | 'user', string> = { admin: 'Administrator', user: 'Standard user' }
  const [form, setForm] = useState<FeatureState>(() => ({
    enabled: cfg[def.id].enabled,
    access: {
      admin: { ...cfg[def.id].access.admin, actions: [...cfg[def.id].access.admin.actions] },
      user: { ...cfg[def.id].access.user, actions: [...cfg[def.id].access.user.actions] },
    },
  }))
  const [confirmDisable, setConfirmDisable] = useState(false)

  const dirty = useMemo(() => {
    const cur = cfg[def.id]
    if (cur.enabled !== form.enabled) return true
    for (const k of roleKeys) {
      if (cur.access[k].visible !== form.access[k].visible) return true
      if (cur.access[k].actions.join(',') !== form.access[k].actions.join(',')) return true
    }
    return false
  }, [cfg, def.id, form, roleKeys])

  const toggleAction = (k: 'admin' | 'user', a: string) => {
    setConfirmDisable(false)
    setForm((prev) => {
      const actions = prev.access[k].actions.includes(a) ? prev.access[k].actions.filter((x) => x !== a) : [...prev.access[k].actions, a]
      return { ...prev, access: { ...prev.access, [k]: { ...prev.access[k], actions } } }
    })
  }

  const toggleVis = (k: 'admin' | 'user') => {
    setConfirmDisable(false)
    setForm((prev) => {
      const nextVis = !prev.access[k].visible
      const actions = nextVis && prev.access[k].actions.length === 0 ? ['view'] : prev.access[k].actions
      return { ...prev, access: { ...prev.access, [k]: { ...prev.access[k], visible: nextVis, actions } } }
    })
  }

  const doSave = () => {
    const cur = cfg[def.id]
    const diffs: string[] = []
    if (cur.enabled !== form.enabled) diffs.push(form.enabled ? 'Feature enabled' : 'Feature disabled (all roles)')
    for (const k of roleKeys) {
      if (cur.access[k].visible !== form.access[k].visible) diffs.push(`${roleNames[k]} visibility ${form.access[k].visible ? 'granted' : 'revoked'}`)
      if (cur.access[k].actions.join(',') !== form.access[k].actions.join(',')) diffs.push(`${roleNames[k]} permissions updated`)
    }
    setFeatureState(def.id, form)
    for (const d of diffs) pushFeatureAudit(def.name, d, featureActor(role))
    emitToast('success', `Configuration saved for “${def.name}”.`)
    onClose()
  }

  return (
    <div className="a5-fm-veil" role="dialog" aria-modal="true" aria-label={`Configure ${def.name}`}>
      <div className="a5-fm-card">
        <div className="a5-fm-head">
          <div>
            <div className="a5-fm-title">Configure feature</div>
            <div className="a5-fm-sub mono">{def.id}</div>
          </div>
          <button className="a5-iconbtn" onClick={onClose} aria-label="Close panel"><Lucide.X size={15} /></button>
        </div>
        <div className="a5-fm-body">
          <div className={`a5-fm-note${confirmDisable ? '--amber' : ''}`}>
            <Lucide.ShieldAlert size={14} />
            <span>
              {confirmDisable
                ? `Disable “${def.name}” for every role, including administrators?${def.protected ? ' Protected features cannot be disabled.' : ''}`
                : 'Disabling a feature makes it unavailable to every role (including administrators) until it is re-enabled here. Enforcement across pages and navigation activates in Stage 2.'}
            </span>
          </div>
          <div className="a5-fm-row"><span className="a5-f-lbl">Global availability</span>
            {confirmDisable ? (
              <span className="a5-fm-cellact">
                <button className="aws5-btn aws5-btn--sm" onClick={() => { setConfirmDisable(false); setForm((prev) => ({ ...prev, enabled: false })) }}>Confirm disable</button>
                <button className="aws5-btn aws5-btn--sm" onClick={() => setConfirmDisable(false)}>Keep enabled</button>
              </span>
            ) : (
              <button
                className="aws5-btn aws5-btn--sm"
                aria-pressed={form.enabled}
                disabled={def.protected && form.enabled}
                onClick={() => { if (form.enabled) setConfirmDisable(true) }}
              >
                {form.enabled ? 'Enabled' : 'Disabled'}
              </button>
            )}
          </div>
          {form.enabled === false && def.protected && <div className="a5-hintbox">Protected features such as Administration cannot be globally disabled.</div>}
          {form.enabled === false && !def.protected && <div className="a5-hintbox">Globally disabled features are hidden from every role (enforced from Stage 2 — until then the page still loads).</div>}
          {roleKeys.map((k) => (
            <div className="a5-fm-role" key={k}>
              <div className="a5-fm-row">
                <span className="a5-f-lbl">{roleNames[k]} visibility</span>
                <button className="aws5-btn aws5-btn--sm" aria-pressed={form.access[k].visible} onClick={() => toggleVis(k)}>
                  {form.access[k].visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
              <div className="a5-chipgrid">
                {FEATURE_ACTIONS.map((a) => (
                  <button
                    key={a}
                    className="a5-permchip a5-permchip--on"
                    data-off={String(!form.access[k].actions.includes(a))}
                    aria-pressed={form.access[k].actions.includes(a)}
                    onClick={() => toggleAction(k, a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {!form.access[k].visible && <div className="a5-hintbox">Hidden and no permissions — this role cannot open or use this feature (enforced from Stage 2).</div>}
            </div>
          ))}
          {def.rollout && <div className="a5-hintbox">{def.rollout}</div>}
        </div>
        <div className="a5-fm-foot">
          <button className="aws5-btn" onClick={onClose}>Cancel</button>
          <button className="aws5-btn aws5-btn--primary" disabled={!dirty} onClick={doSave}>Save changes</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const dot: Record<Tone, string> = {
    green: 'var(--a5-green)', grey: 'var(--a5-muted)', red: 'var(--a5-red)', blue: 'var(--a5-blue)', amber: 'var(--a5-amber)', purple: 'var(--a5-purple)',
  }
  return (
    <div className="aws5-card a5-fm-stat">
      <div className="a5-fm-stat-h"><span className="aws5-kpi-label">{label}</span><span className="a5-dot" style={{ background: dot[tone], width: 7, height: 7 }} /></div>
      <div className="aws5-kpi-val" style={{ marginTop: 6 }}>{value}</div>
    </div>
  )
}

export function FeatureManagementPage({ role }: { role: Role }) {
  const [cfg, setCfg] = useState<Record<string, FeatureState>>(() => loadFeatureConfig())
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'All' | FeatureCategory>('All')
  const [status, setStatus] = useState<'All' | 'Enabled' | 'Disabled'>('All')
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [audit, setAudit] = useState<FeatureAuditEvent[]>(() => getFeatureAudit())

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return FEATURE_REGISTRY
      .map((def) => ({ def, st: cfg[def.id] }))
      .filter(({ def, st }) => {
        if (cat !== 'All' && def.category !== cat) return false
        if (status !== 'All' && (status === 'Enabled') !== st.enabled) return false
        if (needle && !(`${def.name} ${def.description} ${def.id}`.toLowerCase().includes(needle))) return false
        return true
      })
  }, [cfg, q, cat, status])

  const counts = useMemo(() => {
    const enabled = FEATURE_REGISTRY.filter((d) => cfg[d.id].enabled).length
    const total = FEATURE_REGISTRY.length
    return { total, enabled, disabled: total - enabled, restricted: FEATURE_REGISTRY.filter((d) => !cfg[d.id].access.user.visible).length }
  }, [cfg])

  const updateRow = (id: string, patch: Partial<FeatureState>) => {
    const next: FeatureState = { ...cfg[id], ...patch }
    setFeatureState(id, next)
    setCfg((prev) => ({ ...prev, [id]: next }))
    return next
  }

  const toggleEnable = (def: FeatureDef) => {
    const next = updateRow(def.id, { enabled: !cfg[def.id].enabled })
    pushFeatureAudit(def.name, next.enabled ? 'Feature enabled' : 'Feature disabled (all roles)', featureActor(role))
    setAudit(getFeatureAudit())
    emitToast(next.enabled ? 'success' : 'warn', `“${def.name}” ${next.enabled ? 'enabled' : 'disabled'} for all roles.`)
  }

  const applyAll = (kind: 'enable' | 'disable') => {
    let changed = 0
    let skipped = 0
    const next = { ...cfg }
    for (const d of FEATURE_REGISTRY) {
      if (d.protected && kind === 'disable') { skipped++; continue }
      if (next[d.id].enabled === (kind === 'enable')) { continue }
      next[d.id] = { ...next[d.id], enabled: kind === 'enable' }
      pushFeatureAudit(d.name, kind === 'enable' ? 'Feature enabled' : 'Feature disabled (all roles)', featureActor(role))
      changed++
    }
    if (changed > 0) {
      for (const id of Object.keys(next)) setFeatureState(id, next[id])
      setCfg(next)
      setAudit(getFeatureAudit())
      emitToast('success', `${changed} feature${changed === 1 ? '' : 's'} ${kind === 'enable' ? 'enabled' : 'disabled'}.`)
    }
    if (skipped > 0) emitToast('warn', `${skipped} protected feature${skipped === 1 ? '' : 's'} cannot be disabled.`)
  }

  const editingDef = editing ? FEATURE_REGISTRY.find((d) => d.id === editing) ?? null : null

  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration', onClick: () => { window.location.hash = '#/mockup-05/configuration' } }, { label: 'Feature Management' }]} />
      <div className="a5-pagehead-row" style={{ marginBottom: 12 }}>
        <div className="a5-fm-titlewrap">
          <h1 className="aws5-h1">Feature Management</h1>
          <div className="a5-pagehead-sub">Control which HPC Console features are available to users on this cluster.</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--sm" onClick={() => applyAll('enable')}><Lucide.CheckCircle size={13} />Enable all</button>
          <button className="aws5-btn aws5-btn--sm" onClick={() => applyAll('disable')}><Lucide.Ban size={13} />Disable all</button>
        </div>
      </div>

      <div className="a5-four a5-fm-stats">
        <StatCard label="Total features" value={counts.total} tone="blue" />
        <StatCard label="Enabled" value={counts.enabled} tone="green" />
        <StatCard label="Disabled" value={counts.disabled} tone="red" />
        <StatCard label="Restricted (standard user)" value={counts.restricted} tone="grey" />
      </div>

      <div className="a5-filterbar" style={{ marginTop: 14 }}>
        <div className="aws5-searchbox-main"><Lucide.Search size={13} /><input placeholder="Search by feature name, keyword or id…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="aws5-selectwrap">
          <select className="aws5-select aws5-select--sm" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} aria-label="Filter by category">
            <option value="All">All categories</option>
            {FEATURE_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Lucide.ChevronDown size={13} />
        </div>
        <div className="aws5-selectwrap">
          <select className="aws5-select aws5-select--sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            <option value="Enabled">Enabled</option>
            <option value="Disabled">Disabled</option>
          </select>
          <Lucide.ChevronDown size={13} />
        </div>
      </div>

      <div className="aws5-table-wrap" style={{ marginTop: 10 }}>
        <table className="aws5-table">
          <thead>
            <tr>
              <th>Feature</th><th>Category</th><th>Status</th>
              <th>Standard User Access</th><th>Administrator Access</th><th className="a5-c">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ def, st }) => (
              <tr key={def.id} className={def.protected ? 'a5-fm-row-prot' : undefined}>
                <td>
                  <div className="a5-fm-featname">{def.name}</div>
                  <div className="a5-fm-featdesc">{def.description}</div>
                </td>
                <td><StateChipText text={def.category} kind={CATEGORY_TONES[def.category]} /></td>
                <td>{st.enabled ? <StateChipText text="Enabled" kind="green" /> : <StateChipText text="Disabled" kind="grey" />}</td>
                <td><span className="a5-fm-cell">{actionsLabel(st.access.user)}</span></td>
                <td><span className="a5-fm-cell">{actionsLabel(st.access.admin)}</span></td>
                <td className="a5-c">
                  <span className="a5-fm-cellact">
                    {confirmId === def.id ? (
                      <>
                        <button className="aws5-btn aws5-btn--sm aws5-btn--danger" onClick={() => { toggleEnable(def); setConfirmId(null) }}>Confirm disable</button>
                        <button className="aws5-btn aws5-btn--sm" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : def.protected ? (
                      <>
                        <span className="a5-fm-cell" title="Protected feature — cannot be globally disabled"><StateChipText text="Protected" kind="purple" /></span>
                        <button className="a5-name-link" onClick={() => setEditing(def.id)}>Configure</button>
                      </>
                    ) : (
                      <>
                        <button className="a5-name-link" onClick={() => (st.enabled ? setConfirmId(def.id) : toggleEnable(def))}>{st.enabled ? 'Disable' : 'Enable'}</button>
                        <button className="a5-name-link" onClick={() => setEditing(def.id)}>Configure</button>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="a5-empty">No features match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card>
          <CardH right={<span className="a5-f-sub">In-memory (last 8 of this session)</span>}>Recent configuration changes</CardH>
          <CardB>
            {audit.length === 0 ? (
              <div className="a5-empty" style={{ padding: '10px 2px' }}>
                <b>No configuration changes yet.</b> Enable/disable or edit a feature above — entries appear here. This simulated audit trail will be persisted in Stage 6.
              </div>
            ) : (
              <div className="a5-fm-audit">
                {audit.map((a, i) => (
                  <div className="a5-fm-auditrow" key={i}>
                    <span className="mono">{a.ts}</span>
                    <span className="mono">{a.actor}</span>
                    <span>{a.feature}</span>
                    <span className="sub">{a.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </CardB>
        </Card>
      </div>

      {editingDef && (
        <ConfigurePanel
          def={editingDef}
          cfg={cfg}
          role={role}
          onClose={() => {
            setCfg({ ...loadFeatureConfig() })
            setAudit(getFeatureAudit())
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
