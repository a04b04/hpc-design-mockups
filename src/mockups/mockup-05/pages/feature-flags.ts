// Feature Management (Stages 1–2) — feature flag model, registry and persistence.
//
// This module is the single source of truth for feature availability on the
// mock cluster. Stage 2 consumes the helpers below app-wide: nav hiding,
// direct-route blocking and simulated action gating:
//   isFeatureEnabled / canViewFeature / canAccessFeature / canPerformAction /
//   getEffectivePermissions
// Helpers always read the live configuration (never a stale snapshot) and
// subscribeFeatureConfig lets React re-render the moment a feature is changed.
// Nothing outside Mockup 05 imports from this file.

import type { Role } from '../data'

export type FeatureAccess = { visible: boolean; actions: string[] }
export type FeatureState = { enabled: boolean; access: { admin: FeatureAccess; user: FeatureAccess } }

export type FeatureCategory = 'Compute' | 'Workloads' | 'Storage' | 'Monitoring' | 'Access' | 'Administration'

export interface FeatureDef {
  id: string
  name: string
  description: string
  category: FeatureCategory
  /** Per-role access that may be edited from the Feature Management page. */
  access: { admin: FeatureAccess; user: FeatureAccess }
  /** Locks the record: the Configure panel only edits metadata on a global toggle. */
  protected?: boolean
  /** Optional default global availability on first run (defaults to enabled). */
  enabled?: boolean
  /** Simulated rollout note shown in the Configure panel. */
  rollout?: string
}

export const FEATURE_ACTIONS = ['view', 'use', 'submit', 'download', 'upload', 'delete', 'manage'] as const

export const FEATURE_REGISTRY: FeatureDef[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'Cluster health and utilisation overview.', category: 'Compute', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'nodes', name: 'Nodes', description: 'Explore compute, GPU and login nodes.', category: 'Compute', access: { admin: { visible: true, actions: ['view', 'manage'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'partitions', name: 'Partitions', description: 'Partition and queue definitions with live availability.', category: 'Compute', access: { admin: { visible: true, actions: ['view', 'manage'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'reservations', name: 'Reservations', description: 'View cluster reservations and maintenance windows.', category: 'Compute', access: { admin: { visible: true, actions: ['view', 'manage'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'jobs', name: 'View All Jobs', description: 'Read access to every job in the scheduler, including other accounts.', category: 'Workloads', access: { admin: { visible: true, actions: ['view', 'manage'] }, user: { visible: false, actions: [] } } },
  { id: 'submit-job', name: 'Submit Jobs', description: 'slurm batch submission from the Submit Job page.', category: 'Workloads', access: { admin: { visible: true, actions: ['submit', 'use'] }, user: { visible: true, actions: ['submit', 'use'] } } },
  { id: 'job-templates', name: 'Job Templates', description: 'Reusable submission templates.', category: 'Workloads', access: { admin: { visible: true, actions: ['view', 'use'] }, user: { visible: true, actions: ['view', 'use'] } } },
  { id: 'file-browser', name: 'File Browser', description: 'Browse files on filesystems and take basic file actions.', category: 'Storage', access: { admin: { visible: true, actions: ['view', 'download', 'upload', 'delete'] }, user: { visible: true, actions: ['view', 'download', 'upload', 'delete'] } } },
  { id: 'software', name: 'Software & Modules', description: 'Browse installed software and environment modules for workloads.', category: 'Workloads', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'file-uploads', name: 'File Uploads', description: 'Allow uploads through the File Browser. Controlled separately so uploads can be frozen during an incident without disabling the browser.', enabled: false, category: 'Storage', access: { admin: { visible: true, actions: ['upload'] }, user: { visible: false, actions: [] } } },
  { id: 'quotas', name: 'Storage Quotas', description: 'Per-project and per-user quota reporting.', category: 'Storage', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'cluster-health', name: 'Cluster Health', description: 'Service and infrastructure health overview.', category: 'Monitoring', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'resource-utilisation', name: 'Resource Utilisation', description: 'CPU, memory, GPU and network utilisation charts.', category: 'Monitoring', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'alerts', name: 'Alerts', description: 'Cluster alert feed.', category: 'Monitoring', access: { admin: { visible: true, actions: ['view'] }, user: { visible: true, actions: ['view'] } } },
  { id: 'terminal', name: 'Web Terminal (SSH)', description: 'Browser-based SSH terminal to permitted nodes.', category: 'Access', access: { admin: { visible: true, actions: ['view', 'use'] }, user: { visible: false, actions: [] } } },
  { id: 'remote-desktop', name: 'Remote Desktop', description: 'Remote desktop sessions to visualisation nodes.', category: 'Access', access: { admin: { visible: true, actions: ['view', 'use'] }, user: { visible: false, actions: [] } } },
  { id: 'admin', name: 'Administration', description: 'Administrative console: users, accounts, QoS, node draining and configuration.', category: 'Administration', protected: true, access: { admin: { visible: true, actions: ['view', 'manage'] }, user: { visible: false, actions: [] } } },
]

export const FEATURE_CATEGORY_ORDER: FeatureCategory[] = ['Compute', 'Workloads', 'Storage', 'Monitoring', 'Access', 'Administration']

const VALID_ACTION_SET = new Set<string>(FEATURE_ACTIONS)

function isFeatureAccess(v: unknown): v is FeatureAccess {
  return (
    typeof v === 'object' && v !== null && typeof (v as FeatureAccess).visible === 'boolean' &&
    Array.isArray((v as FeatureAccess).actions) && (v as FeatureAccess).actions.every((a) => typeof a === 'string')
  )
}

function isFeatureState(v: unknown): v is FeatureState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as FeatureState
  return (
    typeof s.enabled === 'boolean' &&
    typeof s.access === 'object' && s.access !== null &&
    isFeatureAccess(s.access.admin) && isFeatureAccess(s.access.user)
  )
}

function sanitiseState(_def: FeatureDef, raw: unknown): FeatureState | null {
  if (!isFeatureState(raw)) return null
  return {
    enabled: raw.enabled,
    access: {
      admin: { visible: raw.access.admin.visible, actions: raw.access.admin.actions.filter((a) => VALID_ACTION_SET.has(a)) },
      user: { visible: raw.access.user.visible, actions: raw.access.user.actions.filter((a) => VALID_ACTION_SET.has(a)) },
    },
  }
}

// Simulated audit trail of configuration changes (newest first).
export interface FeatureAuditEvent { ts: string; actor: string; feature: string; detail: string }

const AUDIT_CAP = 8
let featureAudit: FeatureAuditEvent[] = []

export function getFeatureAudit(): FeatureAuditEvent[] {
  return [...featureAudit]
}

function nowTs(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function featureActor(role: Role): string {
  return role === 'admin' ? 'arun.bhatti' : 's.chen'
}

export function pushFeatureAudit(feature: string, detail: string, actor: string = 'arun.bhatti'): FeatureAuditEvent[] {
  featureAudit = [{ ts: nowTs(), actor, feature, detail }, ...featureAudit].slice(0, AUDIT_CAP)
  return getFeatureAudit()
}

// Persistence ----------------------------------------------------------------

// Persistence ----------------------------------------------------------------

export const FEAT_VERSION = 1
const FEATURE_CFG_KEY = 'enucc5.features.v1'
let configCache: Record<string, FeatureState> | null = null

function defaultState(def: FeatureDef): FeatureState {
  return {
    enabled: def.enabled ?? true,
    access: {
      admin: { visible: def.access.admin.visible, actions: [...def.access.admin.actions] },
      user: { visible: def.access.user.visible, actions: [...def.access.user.actions] },
    },
  }
}

export function loadFeatureConfig(): Record<string, FeatureState> {
  if (configCache) return configCache
  let fromStore: Record<string, FeatureState> = {}
  try {
    const json = window.localStorage.getItem(FEATURE_CFG_KEY)
    if (json) {
      const parsed: unknown = JSON.parse(json)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed as Record<string, unknown>).version === FEAT_VERSION) {
        const rawStates = (parsed as Record<string, unknown>).states
        if (rawStates && typeof rawStates === 'object' && !Array.isArray(rawStates)) fromStore = rawStates as Record<string, FeatureState>
      }
      // Any other shape → treated as no saved config; defaults are merged below.
    }
  } catch {
    // Corrupted JSON → fall back to defaults.
  }
  const out: Record<string, FeatureState> = {}
  for (const def of FEATURE_REGISTRY) out[def.id] = sanitiseState(def, fromStore[def.id]) ?? defaultState(def)
  configCache = out
  return out
}

export function saveFeatureConfig(states: Record<string, FeatureState>): void {
  configCache = { ...states }
  try {
    window.localStorage.setItem(FEATURE_CFG_KEY, JSON.stringify({ version: FEAT_VERSION, states }))
  } catch {
    // Storage unavailable (private mode / quota): mockup keeps in-memory state.
  }
  notifyFeatureListeners()
}

// State model ----------------------------------------------------------------

/** Route ("page") id → governing feature in the registry. Pages missing here are always available. */
export const PAGE_FEATURE: Partial<Record<string, string>> = {
  'dashboard': 'dashboard', 'nodes': 'nodes', 'node': 'nodes',
  'partitions': 'partitions', 'partition': 'partitions',
  'reservations': 'reservations', 'resv': 'reservations',
  'jobs': 'jobs', 'jb': 'jobs', 'submit-job': 'submit-job', 'job-templates': 'job-templates', 'job-history': 'jobs',
  'file-browser': 'file-browser', 'software': 'software', 'quotas': 'quotas',
  'cluster-health': 'cluster-health', 'resource-utilisation': 'resource-utilisation', 'alerts': 'alerts',
  'terminal': 'terminal', 'remote-desktop': 'remote-desktop',
  'users': 'admin', 'slurm-accounts': 'admin', 'qos': 'admin', 'node-mgmt': 'admin', 'configuration': 'admin',
  'feature-mgmt': 'admin',
}

/** Simulated action ids used by page-level gating (Phase 2). */
export const PAGE_ACTIONS: Partial<Record<string, string>> = {
  'submit-job': 'submit', 'file-browser': 'view',
  'terminal': 'use', 'remote-desktop': 'use',
}

type FeatureListener = () => void
const featureListeners = new Set<FeatureListener>()

function notifyFeatureListeners(): void {
  for (const l of featureListeners) l()
}

export function subscribeFeatureConfig(cb: FeatureListener): () => void {
  featureListeners.add(cb)
  return () => featureListeners.delete(cb)
}

export function setFeatureState(featureId: string, next: FeatureState): void {
  const cfg = { ...loadFeatureConfig(), [featureId]: next }
  saveFeatureConfig(cfg)
}

export function isFeatureEnabled(featureId: string): boolean {
  const st = loadFeatureConfig()[featureId]
  return st ? st.enabled : true
}

// Helper API (consumed app-wide by Stage 2: navigation, route gates, actions) --

export function canViewFeature(featureId: string, role: Role): boolean {
  const st = loadFeatureConfig()[featureId]
  return st.enabled && st.access[role].visible
}

export function canAccessFeature(featureId: string, role: Role): boolean {
  const st = loadFeatureConfig()[featureId]
  return st.enabled && st.access[role].visible && st.access[role].actions.length > 0
}

export function canPerformAction(featureId: string, role: Role, action: string): boolean {
  const st = loadFeatureConfig()[featureId]
  return st.enabled && st.access[role].visible && st.access[role].actions.includes(action)
}

export function getEffectivePermissions(featureId: string, role: Role): FeatureAccess {
  const st = loadFeatureConfig()[featureId]
  return { visible: st.enabled && st.access[role].visible, actions: st.enabled ? [...st.access[role].actions] : [] }
}

// -------------------------------------------------------------------------- //
// Stage 3 — Roles & Permissions. Simulated configurable roles layered on top  //
// of the feature registry. Administrator and Standard user are live personas: //
// editing the Standard user role rewrites the persisted feature config, so it //
// changes the console immediately for the standard-user persona. The other    //
// roles map onto that same configuration with a simulated base policy that is //
// not persisted (prototype only). Nothing outside Mockup 05 imports this.     //
// -------------------------------------------------------------------------- //

/** Role keys understood by this console. 'admin'/'user' are the live personas. */
export type A5RoleKey = 'admin' | 'user' | 'researcher' | 'guest'

/** Which Role persona a role is currently simulated by (Stage 4 will move onto real users). */
export type A5RolePersona = 'admin' | 'user' | null

export interface A5RoleDef {
  id: A5RoleKey
  /** Short label used in tables, the matrix and the details view. */
  name: string
  description: string
  persona: A5RolePersona
  /** Member preview for the roles table (Stage 4 derives these from user records). */
  members: string[]
}

export const A5_ROLES: A5RoleDef[] = [
  {
    id: 'admin', name: 'Administrator', persona: 'admin',
    description: 'Cluster support staff with full console access, node management and every administrative feature.',
    members: ['arun.bhatti'],
  },
  {
    id: 'user', name: 'Standard user', persona: 'user',
    description: 'Researcher persona mapped onto the feature-managed standard-user configuration. Permissions below are editable and live.',
    members: ['s.chen', 'j.davies', 'a.khan', 'm.ross', 'l.patel', 'r.oconnell', 't.nakamura', 'e.silva', 'k.dubois'],
  },
  {
    id: 'researcher', name: 'Researcher', persona: null,
    description: 'Project researcher: full access to their own jobs, shared filesystems and interactive sessions, without administrative tooling.',
    members: ['14 users'],
  },
  {
    id: 'guest', name: 'Read-only User', persona: null,
    description: 'Visitor or auditor account: read-level reporting pages only — no jobs, sessions or file changes.',
    members: ['2 users'],
  },
]

/** Editable state for the simulated non-persona roles (prototype: not persisted). */
export interface A5RoleEdit {
  features: Set<string>
  actions: Partial<Record<string, string[]>>
}

export const RESEARCHER_BASE: A5RoleEdit = {
  features: new Set(['dashboard', 'nodes', 'partitions', 'reservations', 'submit-job', 'job-templates', 'file-browser', 'quotas',
    'cluster-health', 'resource-utilisation', 'alerts', 'terminal', 'remote-desktop']),
  actions: {},
}

export const STUDENT_BASE: A5RoleEdit = {
  features: new Set(['dashboard', 'nodes', 'partitions', 'reservations', 'submit-job', 'job-templates', 'quotas',
    'cluster-health', 'resource-utilisation', 'alerts', 'remote-desktop']),
  actions: {},
}

export const GUEST_BASE: A5RoleEdit = {
  features: new Set(['dashboard', 'quotas', 'cluster-health', 'resource-utilisation', 'alerts', 'file-browser']),
  actions: {},
}

/** Whether a role may open (see and enter) a feature under the simulated policy. */
export function roleCanAccess(roleKey: A5RoleKey, fid: string, cfg: Record<string, FeatureState> = loadFeatureConfig()): boolean {
  switch (roleKey) {
    case 'admin': return cfg[fid].access.admin.visible
    case 'user': return cfg[fid].access.user.visible
    case 'researcher': return RESEARCHER_BASE.features.has(fid)
    case 'guest': return GUEST_BASE.features.has(fid)
  }
}

/** Actions a role holds on a feature, mirroring getEffectivePermissions for the live personas. */
export function roleActions(roleKey: A5RoleKey, fid: string, cfg: Record<string, FeatureState> = loadFeatureConfig()): string[] {
  const st = cfg[fid]
  switch (roleKey) {
    case 'admin': return st.enabled ? [...st.access.admin.actions] : []
    case 'user': return st.enabled ? [...st.access.user.actions] : []
    case 'researcher': return st.enabled && RESEARCHER_BASE.features.has(fid) ? ['view', 'use'] : []
    case 'guest': return st.enabled && GUEST_BASE.features.has(fid) ? ['view'] : []
  }
}

/** Convenience for the permission matrix: whether a role holds one simulated action. */
export function roleHasAction(roleKey: A5RoleKey, fid: string, action: string, cfg: Record<string, FeatureState> = loadFeatureConfig()): boolean {
  return roleActions(roleKey, fid, cfg).includes(action)
}

/** Simulated member counts. Live personas derive from USERS; static roles are indicative. */
type UsersLike = ReadonlyArray<{ role: string }>
export function countRoleUsers(roleKey: A5RoleKey, users: UsersLike): number {
  if (roleKey === 'admin') return users.filter((u) => u.role === 'Administrator').length
  if (roleKey === 'user') return users.filter((u) => u.role === 'Standard user').length
  const def = A5_ROLES.find((r) => r.id === roleKey)
  const preview = def?.members[0] ?? '0 users'
  return Number.parseInt(preview, 10) || 0
}
