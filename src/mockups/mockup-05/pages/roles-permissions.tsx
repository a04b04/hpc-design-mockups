import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, StateChipText, emitToast } from '../components/ui'
import type { Role } from '../data'
import { USERS } from '../data'
import {
  A5_ROLES, FEATURE_CATEGORY_ORDER, FEATURE_REGISTRY, countRoleUsers, featureActor,
  getFeatureAudit, loadFeatureConfig, pushFeatureAudit, roleActions, saveFeatureConfig,
} from './feature-flags'
import type { A5RoleDef, A5RoleKey } from './feature-flags'
import type { FeatureAuditEvent, FeatureState } from './feature-flags'

type Tone = 'blue' | 'amber' | 'purple' | 'grey' | 'red' | 'green'

const CATEGORY_TONES: Record<string, Tone> = {
  Compute: 'blue', Workloads: 'purple', Storage: 'green', Monitoring: 'amber', Access: 'blue', Administration: 'red',
}

/** Simulated feature policies for the non-persona roles (prototype only; not persisted). */
const RESEARCHER_VISIBLE: ReadonlySet<string> = new Set([
  'dashboard', 'nodes', 'partitions', 'reservations', 'submit-job', 'job-templates', 'file-browser',
  'quotas', 'cluster-health', 'resource-utilisation', 'alerts', 'terminal', 'remote-desktop',
])
const GUEST_VISIBLE: ReadonlySet<string> = new Set(['dashboard', 'quotas', 'cluster-health', 'resource-utilisation', 'alerts', 'file-browser'])

/** Matrix rows: a representative permission set derived from the feature registry. */
const MATRIX: Array<{ label: string; fid: string; action: string }> = [
  { label: 'Access Feature Management', fid: 'admin', action: 'manage' },
  { label: 'View all jobs', fid: 'jobs', action: 'view' },
  { label: 'Manage jobs (hold, release, cancel any)', fid: 'jobs', action: 'manage' },
  { label: 'Submit jobs', fid: 'submit-job', action: 'submit' },
  { label: 'Open SSH terminal', fid: 'terminal', action: 'use' },
  { label: 'Launch remote desktop', fid: 'remote-desktop', action: 'use' },
  { label: 'Browse files', fid: 'file-browser', action: 'view' },
  { label: 'Download files', fid: 'file-browser', action: 'download' },
  { label: 'Upload files', fid: 'file-browser', action: 'upload' },
  { label: 'Delete files', fid: 'file-browser', action: 'delete' },
  { label: 'Manage reservations', fid: 'reservations', action: 'manage' },
  { label: 'Manage nodes (drain, reboot)', fid: 'nodes', action: 'manage' },
  { label: 'Manage partitions', fid: 'partitions', action: 'manage' },
]

/** Simulated membership counts for the non-persona roles. */
const STATIC_USERS: Record<'researcher' | 'guest', number> = { researcher: 14, guest: 3 }

function staticMembers(id: 'researcher' | 'guest'): string[] {
  if (id === 'researcher') {
    const excluded = new Set(['arun.bhatti', 's.chen', 'l.patel', 'r.oconnell'])
    return [...USERS.filter((u) => !excluded.has(u.uid) && u.role === 'Standard user').map((u) => u.name), '+ 6 more (simulated)']
  }
  return ['visitor-01 (simulated)', 'auditor-02 (simulated)', 'vendor-03 (simulated)']
}

/** Users attached to a role as displayed in the details view. */
function membersOf(rd: A5RoleDef): string {
  if (rd.persona === null) return staticMembers(rd.id === 'researcher' ? 'researcher' : 'guest').join(', ')
  return USERS.filter((u) => u.role === (rd.persona === 'admin' ? 'Administrator' : 'Standard user')).map((u) => u.name).join(', ')
}

/** Whether a role can open a feature under the simulated policy (detail view). */
function roleCanSee(rd: A5RoleDef, fid: string, cfg: Record<string, FeatureState>): boolean {
  if (rd.persona === null) return (rd.id === 'researcher' ? RESEARCHER_VISIBLE : GUEST_VISIBLE).has(fid)
  const st = cfg[fid]
  return st.enabled && st.access[rd.persona].visible
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

function AuditList({ audit }: { audit: FeatureAuditEvent[] }) {
  if (audit.length === 0) {
    return (
      <div className="a5-empty" style={{ padding: '10px 2px' }}>
        <b>No changes this session yet.</b> Edits made on this page or Feature Management appear here (in-memory, last 8 entries).
      </div>
    )
  }
  return (
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
  )
}

/** Action chips offered on a role-editor row: the union of the feature's admin/user action sets. */
function editorActionsFor(def: (typeof FEATURE_REGISTRY)[number]): string[] {
  const all = [...def.access.admin.actions]
  for (const a of def.access.user.actions) if (!all.includes(a)) all.push(a)
  return all.length > 0 ? all : ['view']
}

function RoleEditorModal({ rd, cfg, role, onClose, onSaved }: {
  rd: A5RoleDef
  cfg: Record<string, FeatureState>
  role: Role
  onClose: () => void
  onSaved: (audit: FeatureAuditEvent[]) => void
}) {
  const [form, setForm] = useState<Record<string, FeatureState>>(() => {
    const out: Record<string, FeatureState> = {}
    for (const def of FEATURE_REGISTRY) {
      out[def.id] = {
        enabled: cfg[def.id].enabled,
        access: {
          admin: { ...cfg[def.id].access.admin, actions: [...cfg[def.id].access.admin.actions] },
          user: { ...cfg[def.id].access.user, actions: [...cfg[def.id].access.user.actions] },
        },
      }
    }
    return out
  })

  const dirty = useMemo(
    () => FEATURE_REGISTRY.some((def) =>
      form[def.id].access.user.visible !== cfg[def.id].access.user.visible ||
      form[def.id].access.user.actions.join(',') !== cfg[def.id].access.user.actions.join(',')),
    [form, cfg],
  )

  const toggleVis = (fid: string) => {
    setForm((prev) => {
      const st = prev[fid]
      const nextVis = !st.access.user.visible
      const actions = nextVis && st.access.user.actions.length === 0 ? ['view'] : st.access.user.actions
      return { ...prev, [fid]: { ...st, access: { ...st.access, user: { visible: nextVis, actions } } } }
    })
  }

  const toggleAction = (fid: string, a: string) => {
    setForm((prev) => {
      const st = prev[fid]
      const actions = st.access.user.actions.includes(a)
        ? st.access.user.actions.filter((x) => x !== a)
        : [...st.access.user.actions, a]
      return { ...prev, [fid]: { ...st, access: { ...st.access, user: { ...st.access.user, actions } } } }
    })
  }

  const resetRow = (fid: string) => {
    setForm((prev) => ({
      ...prev,
      [fid]: {
        ...prev[fid],
        access: { ...prev[fid].access, user: { visible: cfg[fid].access.user.visible, actions: [...cfg[fid].access.user.actions] } },
      },
    }))
  }

  const doSave = () => {
    const actor = featureActor(role)
    const next = { ...loadFeatureConfig() }
    let changed = 0
    for (const def of FEATURE_REGISTRY) {
      if (
        form[def.id].access.user.visible !== cfg[def.id].access.user.visible ||
        form[def.id].access.user.actions.join(',') !== cfg[def.id].access.user.actions.join(',')
      ) {
        next[def.id] = form[def.id]
        pushFeatureAudit(def.name, `${rd.name} permissions updated`, actor)
        changed++
      }
    }
    saveFeatureConfig(next)
    emitToast('success', `${rd.name} role updated — ${changed} feature${changed === 1 ? '' : 's'} changed.`)
    onSaved(getFeatureAudit())
    onClose()
  }

  return (
    <div className="a5-fm-veil" role="dialog" aria-modal="true" aria-label={`Edit ${rd.name} permissions`}>
      <div className="a5-fm-card a5-rp-card">
        <div className="a5-fm-head">
          <div className="a5-fm-titlewrap">
            <div className="a5-fm-title">Edit role — {rd.name}</div>
            <div className="a5-fm-sub mono">backed by the live standard-user feature configuration</div>
          </div>
          <button className="a5-iconbtn" onClick={onClose} aria-label="Close panel"><Lucide.X size={15} /></button>
        </div>
        <div className="a5-fm-body">
          <div className="a5-fm-note">
            <Lucide.Info size={14} />
            <span>
              This role is backed by the live standard-user configuration the rest of the console reads — the same configuration
              Feature Management edits. Visibility and permission changes apply immediately to navigation, pages and simulated
              action checks for the standard-user persona.
            </span>
          </div>
          {FEATURE_CATEGORY_ORDER.map((cat) => (
            <div key={cat} className="a5-fm-role">
              <div className="a5-fm-row"><span className="a5-f-lbl">{cat}</span></div>
              {FEATURE_REGISTRY.filter((d) => d.category === cat).map((def) => (
                <div className="a5-rp-editrow" key={def.id}>
                  <div className="a5-rp-editrow-main">
                    <div className="a5-fm-featname">{def.name}</div>
                    <div className="a5-fm-featdesc">{def.description}</div>
                  </div>
                  <div className="a5-rp-editrow-ctl">
                    <button className="aws5-btn aws5-btn--sm" aria-pressed={form[def.id].access.user.visible} onClick={() => toggleVis(def.id)}>
                      {form[def.id].access.user.visible ? 'Visible' : 'Hidden'}
                    </button>
                    <div className="a5-chipgrid">
                      {editorActionsFor(def).map((a) => (
                        <button
                          key={a}
                          className="a5-permchip a5-permchip--on"
                          data-off={String(!form[def.id].access.user.actions.includes(a))}
                          aria-pressed={form[def.id].access.user.actions.includes(a)}
                          disabled={!form[def.id].access.user.visible}
                          onClick={() => toggleAction(def.id, a)}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="a5-iconbtn a5-rp-reset" title="Revert row to saved configuration" onClick={() => resetRow(def.id)} disabled={!dirty}>
                    <Lucide.RotateCcw size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="a5-fm-foot">
          <button className="aws5-btn" onClick={onClose}>Cancel</button>
          <button className="aws5-btn aws5-btn--primary" disabled={!dirty} onClick={doSave}>Save changes</button>
        </div>
      </div>
    </div>
  )
}

function RoleDetailModal({ rd, cfg, onClose, onEdit }: {
  rd: A5RoleDef
  cfg: Record<string, FeatureState>
  onClose: () => void
  onEdit: () => void
}) {
  const rows = useMemo(() => FEATURE_REGISTRY.map((def) => ({
    def, accessible: roleCanSee(rd, def.id, cfg),
  })), [rd, cfg])

  const matrixHas = (m: { fid: string; action: string }): boolean => {
    if (rd.persona === 'admin') return true
    if (rd.persona !== null) return roleActions(rd.persona, m.fid, cfg).includes(m.action)
    return (rd.id === 'researcher' ? RESEARCHER_VISIBLE : GUEST_VISIBLE).has(m.fid) && m.action !== 'manage'
  }

  const visibleCount = rows.filter((r) => r.accessible).length

  return (
    <div className="a5-fm-veil" role="dialog" aria-modal="true" aria-label={`${rd.name} details`}>
      <div className="a5-fm-card a5-rp-card">
        <div className="a5-fm-head">
          <div className="a5-fm-titlewrap">
            <div className="a5-fm-title">{rd.name} — role details</div>
            <div className="a5-fm-sub mono">
              {rd.persona === 'admin' ? 'protected system role · simulated'
                : rd.persona === 'user' ? 'live feature-managed configuration'
                  : 'simulated role policy (prototype)'}
            </div>
          </div>
          <button className="a5-iconbtn" onClick={onClose} aria-label="Close panel"><Lucide.X size={15} /></button>
        </div>
        <div className="a5-fm-body">
          <div className="aws5-kv">
            <div className="aws5-kv-row"><div className="k">Role name</div><div className="v">{rd.name}</div></div>
            <div className="aws5-kv-row"><div className="k">Description</div><div className="v">{rd.description}</div></div>
            <div className="aws5-kv-row"><div className="k">Assigned users</div><div className="v">{membersOf(rd)}</div></div>
            <div className="aws5-kv-row">
              <div className="k">Permission summary</div>
              <div className="v">
                {rd.persona === 'admin' ? `All actions on all ${FEATURE_REGISTRY.length} features · protected`
                  : rd.persona === 'user' ? `${visibleCount} of ${FEATURE_REGISTRY.length} features · feature-managed`
                    : `${visibleCount} of ${FEATURE_REGISTRY.length} features · fixed policy`}
              </div>
            </div>
          </div>

          <div className="a5-fm-role">
            <div className="a5-fm-row"><span className="a5-f-lbl">Feature access</span></div>
            {rows.map(({ def, accessible }) => (
              <div className="a5-rp-featline" key={def.id} data-off={String(!accessible)}>
                <StateChipText text={def.name} kind={accessible ? (CATEGORY_TONES[def.category] ?? 'grey') : 'grey'} />
                <span className="a5-fm-featdesc">{def.category}</span>
                <span className="a5-rp-featmeta">
                  {accessible ? roleActions(rd.id, def.id, cfg).join(', ') || '—' : 'restricted'}
                </span>
              </div>
            ))}
          </div>

          <div className="a5-fm-role">
            <div className="a5-fm-row"><span className="a5-f-lbl">Action permissions</span></div>
            <div className="a5-chipgrid a5-rp-matrixgrid">
              {MATRIX.map((m) => (
                <span key={m.label} className="a5-permchip a5-permchip--on" data-off={String(!matrixHas(m))}>{m.label}</span>
              ))}
            </div>
            {rd.persona === 'user' && (
              <div>
                <button className="aws5-btn aws5-btn--sm" onClick={onEdit}>Edit permissions in matrix</button>
              </div>
            )}
          </div>
        </div>
        <div className="a5-fm-foot">
          {rd.persona === 'admin' && (
            <span className="a5-fm-note a5-rp-footnote">
              <Lucide.Lock size={13} />
              <span>Protected role — core administrative access cannot be removed.</span>
            </span>
          )}
          <button className="aws5-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export function RolesPermissionsPage({ role }: { role: Role }) {
  const [cfg, setCfg] = useState<Record<string, FeatureState>>(() => loadFeatureConfig())
  const [editing, setEditing] = useState<A5RoleKey | null>(null)
  const [detail, setDetail] = useState<A5RoleKey | null>(null)
  const [audit, setAudit] = useState<FeatureAuditEvent[]>(() => getFeatureAudit())

  const counts = {
    total: A5_ROLES.length,
    assigned: countRoleUsers('admin', USERS) + countRoleUsers('user', USERS),
    simulated: A5_ROLES.filter((r) => r.persona === null).length,
    matrixPerms: MATRIX.length,
  }

  const close = () => {
    setCfg({ ...loadFeatureConfig() })
    setEditing(null)
    setDetail(null)
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Administration', onClick: () => { window.location.hash = '#/mockup-05/configuration' } }, { label: 'Roles & Permissions' }]} />
      <div className="a5-pagehead-row" style={{ marginBottom: 12 }}>
        <div className="a5-fm-titlewrap">
          <h1 className="aws5-h1"><Lucide.ShieldCheck size={18} /> Roles &amp; Permissions</h1>
          <div className="a5-pagehead-sub">Simulated console roles mapping features and actions to the people who use them. The Administrator role is protected.</div>
        </div>
      </div>

      <div className="a5-four a5-fm-stats">
        <StatCard label="Roles" value={counts.total} tone="blue" />
        <StatCard label="Users with roles" value={counts.assigned} tone="green" />
        <StatCard label="Simulated roles" value={counts.simulated} tone="amber" />
        <StatCard label="Matrix permissions" value={counts.matrixPerms} tone="purple" />
      </div>

      <div className="aws5-table-wrap" style={{ marginTop: 14 }}>
        <table className="aws5-table">
          <thead>
            <tr>
              <th>Role name</th><th>Description</th><th>Users</th><th>Enabled features</th><th>Permissions</th><th className="a5-c">Actions</th>
            </tr>
          </thead>
          <tbody>
            {A5_ROLES.map((rd) => (
              <tr key={rd.id} className={rd.persona === 'admin' ? 'a5-fm-row-prot' : undefined}>
                <td>
                  <button className="a5-name-link a5-rp-rolelink" onClick={() => setDetail(rd.id)}>
                    {rd.name}
                    {rd.persona === 'admin' && <Lucide.Lock size={11} />}
                    {rd.persona === 'user' && <span className="a5-rp-pill">Live</span>}
                  </button>
                  <div className="a5-fm-featdesc">
                    {rd.persona === 'admin' ? 'Protected system role' : rd.persona === 'user' ? 'Feature-managed live configuration' : 'Simulated role (prototype)'}
                  </div>
                </td>
                <td className="a5-rp-desc">{rd.description}</td>
                <td>{rd.persona === null ? STATIC_USERS[rd.id === 'researcher' ? 'researcher' : 'guest'] : countRoleUsers(rd.id, USERS)}</td>
                <td><span className="a5-fm-cell a5-rp-cellmono">
                  {rd.persona === 'admin' ? `all ${FEATURE_REGISTRY.length}`
                    : rd.persona === 'user' ? `${FEATURE_REGISTRY.filter((d) => cfg[d.id].access.user.visible).length} of ${FEATURE_REGISTRY.length}`
                      : `${(rd.id === 'researcher' ? RESEARCHER_VISIBLE : GUEST_VISIBLE).size} of ${FEATURE_REGISTRY.length}`}
                </span></td>
                <td><span className="a5-fm-cell a5-rp-cellmono">{rd.persona === 'admin' ? 'All actions' : rd.persona === 'user' ? 'Feature-managed' : 'Fixed policy'}</span></td>
                <td className="a5-c">
                  <button className="a5-name-link" onClick={() => setDetail(rd.id)}>View</button>
                  {rd.persona === 'user' && <button className="a5-name-link a5-rp-gap" onClick={() => setEditing(rd.id)}>Edit</button>}
                  {rd.persona === 'admin' && <span className="a5-fm-cell a5-rp-prot" title="Protected role — core administrative permissions cannot be removed">Protected</span>}
                  {rd.persona === null && <span className="a5-fm-cell a5-rp-prot" title="Simulated example policy — not editable in the prototype">Example policy</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card>
          <CardH right={<span className="a5-f-sub">In-memory (last 8 of this session)</span>}>Recent role configuration changes</CardH>
          <CardB>
            <AuditList audit={audit} />
          </CardB>
        </Card>
      </div>

      {detail && (
        <RoleDetailModal
          rd={A5_ROLES.find((r) => r.id === detail)!}
          cfg={cfg}
          onClose={close}
          onEdit={() => { setDetail(null); setEditing(detail) }}
        />
      )}
      {editing && (
        <RoleEditorModal
          rd={A5_ROLES.find((r) => r.id === editing)!}
          cfg={cfg}
          role={role}
          onClose={close}
          onSaved={(a) => { setCfg({ ...loadFeatureConfig() }); setAudit(a) }}
        />
      )}
    </>
  )
}
