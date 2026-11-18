import { useEffect, useRef, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Icon } from './ui'
import type { Role } from '../data'

const A2_GROUPS: Array<{ label: string; items: Array<[string, string, string]> }> = [
  { label: 'Compute', items: [['Nodes', 'nodes', 'Server'], ['Partitions', 'partitions', 'Layers'], ['Reservations', 'reservations', 'CalendarClock']] },
  { label: 'Workloads', items: [['Slurm Jobs', 'jobs', 'ListChecks'], ['Submit Job', 'submit-job', 'Plus'], ['Cluster Health', 'cluster-health', 'HeartPulse'], ['Resource Utilisation', 'resource-utilisation', 'Activity'], ['Terminal (SSH)', 'terminal', 'SquareTerminal'], ['Filesystems', 'filesystems', 'Database'], ['Users & Groups', 'users', 'Users']] },
  { label: 'Storage', items: [['File Browser', 'file-browser', 'FolderOpen'], ['Quotas', 'quotas', 'PieChart']] },
  { label: 'Administration', items: [['Node Management', 'node-mgmt', 'ServerCog'], ['Configuration', 'configuration', 'Settings']] },
]

export function Header({ role, onRole, onNavigate, onOpenTerminal }: { role: Role; onRole: (r: Role) => void; onNavigate: (page: string) => void; onOpenTerminal: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const close = (e: Event) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false)
    }
    document.addEventListener('mousedown', close)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') { setMenuOpen(false); setServicesOpen(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey) }
  }, [])

  const roleLabel = role === 'admin' ? 'Administrator' : 'Standard user'

  return (
    <header className="aws4-head">
      <button className="aws4-head-logo" onClick={() => onNavigate('dashboard')}>
        <span className="aws4-logo-mark"><Icon name="Cpu" size={17} /></span>
        <span className="a4-logo-text">HPC Console</span>
      </button>

      <div className="aws4-menuwrap a4-services" ref={servicesRef}>
        <button className="aws4-head-item" onClick={() => setServicesOpen(!servicesOpen)}>Services <Lucide.ChevronDown size={12} /></button>
        {servicesOpen && (
          <div className="aws4-menu a4-services-menu">
            {A2_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="a4-menu-label">{g.label}</div>
                {g.items.map(([label, page, icon]) => (
                  <button key={page} className="a4-mi" onClick={() => { setServicesOpen(false); onNavigate(page) }}>
                    <Icon name={icon} size={14} />{label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="aws4-searchbox">
        <Lucide.Search size={13} />
        <input ref={searchRef} placeholder="Search for nodes, jobs, partitions, users and more..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="a4-head-spacer" />

      <button className="aws4-iconbtn" title="Notifications"><Lucide.Bell size={16} /><span className="a4-dot-badge" /></button>
      <button className="aws4-iconbtn" title="Support"><Lucide.CircleHelp size={16} /></button>
      <button className="aws4-iconbtn" title="Open terminal" onClick={onOpenTerminal}><Lucide.SquareTerminal size={16} /></button>

      <div className="aws4-menuwrap" ref={userRef}>
        <button className="aws4-head-user" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="a4-avatar">AB</span>
          <span className="a4-user-meta">
            <b>arun.bhatti</b>
            <small>{roleLabel}</small>
          </span>
          <Lucide.ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="aws4-menu right a4-user-menu">
            <div className="a4-menu-label">Demo persona</div>
            <button className={`a4-mi${role === 'admin' ? ' active' : ''}`} onClick={() => { onRole('admin'); setMenuOpen(false) }}>
              <Lucide.ShieldCheck size={14} />Administrator{role === 'admin' && <Lucide.Check size={13} className="a4-checkmark" />}
            </button>
            <button className={`a4-mi${role === 'user' ? ' active' : ''}`} onClick={() => { onRole('user'); setMenuOpen(false) }}>
              <Lucide.User size={14} />Standard user{role === 'user' && <Lucide.Check size={13} className="a4-checkmark" />}
            </button>
            <div className="a4-menu-sep" />
            <div className="a4-menu-note">Switch persona to preview{role === 'admin' ? ' user-restricted' : ' administrator'} console.</div>
          </div>
        )}
      </div>
    </header>
  )
}
