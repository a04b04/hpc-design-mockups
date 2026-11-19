import * as Lucide from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Icon } from './ui'
import type { A5Route } from './ui'
import type { Role } from '../data'
import { PAGE_FEATURE, canAccessFeature, isFeatureEnabled } from '../pages/feature-flags'

type NavItem = { label: string; page: A5Route['page']; icon: string }
type NavGroup = { label: string; admin?: boolean; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { label: 'Cluster Overview', items: [{ label: 'Dashboard', page: 'dashboard', icon: 'LayoutDashboard' }] },
  { label: 'Compute', items: [
    { label: 'Nodes', page: 'nodes', icon: 'Server' },
    { label: 'Partitions', page: 'partitions', icon: 'Layers' },
    { label: 'Reservations', page: 'reservations', icon: 'CalendarClock' },
  ] },
  { label: 'Workloads', items: [
    { label: 'Slurm Jobs', page: 'jobs', icon: 'ListChecks' },
    { label: 'Submit Job', page: 'submit-job', icon: 'Plus' },
    { label: 'Job Templates', page: 'job-templates', icon: 'Files' },
    { label: 'Job History', page: 'job-history', icon: 'CalendarDays' },
  ] },
  { label: 'Storage', items: [
    { label: 'Filesystems', page: 'filesystems', icon: 'Database' },
    { label: 'File Browser', page: 'file-browser', icon: 'FolderTree' },
    { label: 'Quotas', page: 'quotas', icon: 'PieChart' },
  ] },
  { label: 'Monitoring', items: [
    { label: 'Cluster Health', page: 'cluster-health', icon: 'HeartPulse' },
    { label: 'Resource Utilisation', page: 'resource-utilisation', icon: 'Activity' },
    { label: 'Alerts', page: 'alerts', icon: 'TriangleAlert' },
  ] },
  { label: 'Access', items: [
    { label: 'Terminal (SSH)', page: 'terminal', icon: 'SquareTerminal' },
    { label: 'Remote Desktop', page: 'remote-desktop', icon: 'Monitor' },
  ] },
  { label: 'Administration', admin: true, items: [
    { label: 'Feature Management', page: 'feature-mgmt', icon: 'ToggleRight' },
    { label: 'Roles & Permissions', page: 'roles', icon: 'ShieldCheck' },
    { label: 'Users & Groups', page: 'users', icon: 'Users' },
    { label: 'Slurm Accounts', page: 'slurm-accounts', icon: 'Landmark' },
    { label: 'Quality of Service (QoS)', page: 'qos', icon: 'SlidersHorizontal' },
    { label: 'Node Management', page: 'node-mgmt', icon: 'ServerCog' },
    { label: 'Configuration', page: 'configuration', icon: 'Settings' },
  ] },
]

export function Sidebar({ page, role, collapsed, onToggle, onNavigate }: {
  page: A5Route
  role: Role
  collapsed: boolean
  onToggle: () => void
  onNavigate: (p: A5Route['page']) => void
}) {
  const isAdmin = role === 'admin'
  // Stage 2: per-feature navigation. Hide a nav item when its governing
  // feature is disabled or hidden from this role; drop groups that end up
  // empty. The Administration group additionally requires the admin persona.
  const navItemAllowed = useMemo(() => {
    const allowed = (it: NavItem): boolean => {
      const fid = PAGE_FEATURE[it.page] ?? 'jobs'
      return it.page === 'dashboard' || (fid === 'jobs'
        ? (isAdmin || isFeatureEnabled('jobs'))
        : canAccessFeature(fid, role))
    }
    return (it: NavItem) => allowed(it)
  }, [role, isAdmin])
  const visibleGroups = useMemo(
    () => GROUPS
      .filter((g) => !g.admin || isAdmin)
      .map((g) => ({ ...g, items: g.items.filter(navItemAllowed) }))
      .filter((g) => g.items.length > 0),
    [isAdmin, navItemAllowed],
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of visibleGroups) init[g.label] = false
    init['Cluster Overview'] = true
    return init
  })

  const activeGroup = useMemo(() => {
    const g = visibleGroups.find((g) => g.items.some((it) => it.page === page.page))
    return g ? g.label : null
  }, [visibleGroups, page.page])

  // keep the category containing the active page expanded
  useEffect(() => {
    if (activeGroup) setExpanded((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }))
  }, [activeGroup])

  const toggle = (label: string) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside className={`aws5-side${collapsed ? ' collapsed' : ''}`}>
      <div className="aws5-side-head">
        <div>
          {!collapsed && (<><div className="a5-side-title">Enucc cluster</div><div className="a5-side-sub">Production HPC</div></>)}
        </div>
        <button className="aws5-side-collapse" onClick={onToggle} aria-label="Collapse navigation">
          {collapsed ? <Lucide.PanelLeftOpen size={15} /> : <Lucide.PanelLeftClose size={15} />}
        </button>
      </div>
      <nav className="aws5-side-nav">
        {visibleGroups.map((g) => {
          const isOpen = !!expanded[g.label] || collapsed
          return (
            <div key={g.label} className="aws5-nav-group">
              {!collapsed && (
                <button
                  type="button"
                  className="aws5-side-label aws5-side-label--toggle"
                  onClick={() => toggle(g.label)}
                  aria-expanded={isOpen}
                >
                  <span>{g.label}</span>
                  <Lucide.ChevronDown size={12} className={`aws5-side-chev${isOpen ? ' open' : ''}`} />
                </button>
              )}
              <div className="aws5-nav-items" data-open={String(isOpen)}>
                <div className="aws5-nav-items-in">
                  {g.items.map((it) => (
                    <button
                      key={it.page}
                      className={`aws5-nav-item${page.page === it.page ? ' active' : ''}`}
                      onClick={() => onNavigate(it.page)}
                      title={collapsed ? it.label : undefined}
                    >
                      <Icon name={it.icon} size={15} />
                      {!collapsed && <span>{it.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>
      <div className="aws5-side-foot">
        {!collapsed && (
          <>
            <a className="aws5-side-link" href="https://slurm.schedmd.com" target="_blank" rel="noreferrer"><Icon name="BookOpen" size={14} /><span>Documentation</span><Lucide.ExternalLink size={11} /></a>
            <a className="aws5-side-link" href="https://aws.amazon.com/support" target="_blank" rel="noreferrer"><Icon name="CircleHelp" size={14} /><span>Support</span><Lucide.ExternalLink size={11} /></a>
          </>
        )}
      </div>
    </aside>
  )
}
