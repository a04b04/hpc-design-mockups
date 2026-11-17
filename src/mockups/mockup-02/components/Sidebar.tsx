import * as Lucide from 'lucide-react'
import { Icon } from './ui'
import type { A2Route } from './ui'
import type { Role } from '../data'

type NavItem = { label: string; page: A2Route['page']; icon: string }
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
    { label: 'Users & Groups', page: 'users', icon: 'Users' },
    { label: 'Slurm Accounts', page: 'slurm-accounts', icon: 'Landmark' },
    { label: 'Quality of Service (QoS)', page: 'qos', icon: 'SlidersHorizontal' },
    { label: 'Node Management', page: 'node-mgmt', icon: 'ServerCog' },
    { label: 'Configuration', page: 'configuration', icon: 'Settings' },
  ] },
]

export function Sidebar({ page, role, collapsed, onToggle, onNavigate }: {
  page: A2Route
  role: Role
  collapsed: boolean
  onToggle: () => void
  onNavigate: (p: A2Route['page']) => void
}) {
  const isAdmin = role === 'admin'
  return (
    <aside className={`aws2-side${collapsed ? ' collapsed' : ''}`}>
      <div className="aws2-side-head">
        <div>
          {!collapsed && (<><div className="a2-side-title">Enucc cluster</div><div className="a2-side-sub">Production HPC</div></>)}
        </div>
        <button className="aws2-side-collapse" onClick={onToggle} aria-label="Collapse navigation">
          {collapsed ? <Lucide.PanelLeftOpen size={15} /> : <Lucide.PanelLeftClose size={15} />}
        </button>
      </div>
      <nav className="aws2-side-nav">
        {GROUPS.map((g) => {
          if (g.admin && !isAdmin) return null
          return (
            <div key={g.label}>
              {!collapsed && <div className="aws2-side-label">{g.label}</div>}
              {g.items.map((it) => (
                <button
                  key={it.page}
                  className={`aws2-nav-item${page.page === it.page ? ' active' : ''}`}
                  onClick={() => onNavigate(it.page)}
                  title={collapsed ? it.label : undefined}
                >
                  <Icon name={it.icon} size={15} />
                  {!collapsed && <span>{it.label}</span>}
                </button>
              ))}
            </div>
          )
        })}
      </nav>
      <div className="aws2-side-foot">
        {!collapsed && (
          <>
            <a className="aws2-side-link" href="https://slurm.schedmd.com" target="_blank" rel="noreferrer"><Icon name="BookOpen" size={14} /><span>Documentation</span><Lucide.ExternalLink size={11} /></a>
            <a className="aws2-side-link" href="https://aws.amazon.com/support" target="_blank" rel="noreferrer"><Icon name="CircleHelp" size={14} /><span>Support</span><Lucide.ExternalLink size={11} /></a>
          </>
        )}
      </div>
    </aside>
  )
}
