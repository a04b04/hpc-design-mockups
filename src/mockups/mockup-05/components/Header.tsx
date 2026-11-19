import { useEffect, useRef, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Icon } from './ui'
import { USER_DISPLAY, ROLE_LABELS } from '../data'
import type { Role } from '../data'

const A5_GROUPS: Array<{ label: string; items: Array<[string, string, string]> }> = [
  { label: 'Compute', items: [['Nodes', 'nodes', 'Server'], ['Partitions', 'partitions', 'Layers'], ['Reservations', 'reservations', 'CalendarClock']] },
  { label: 'Workloads', items: [['Slurm Jobs', 'jobs', 'ListChecks'], ['Submit Job', 'submit-job', 'Plus'], ['Cluster Health', 'cluster-health', 'HeartPulse'], ['Resource Utilisation', 'resource-utilisation', 'Activity'], ['Terminal (SSH)', 'terminal', 'SquareTerminal'], ['Filesystems', 'filesystems', 'Database'], ['Users & Groups', 'users', 'Users']] },
  { label: 'Storage', items: [['File Browser', 'file-browser', 'FolderOpen'], ['Quotas', 'quotas', 'PieChart']] },
  { label: 'Administration', items: [['Node Management', 'node-mgmt', 'ServerCog'], ['Configuration', 'configuration', 'Settings']] },
]

export function Header({ role, onRole, onNavigate, onOpenTerminal, dark, onToggleDark }: { role: Role; onRole: (r: Role) => void; onNavigate: (page: string) => void; onOpenTerminal: () => void; dark: boolean; onToggleDark: () => void }) {
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
  const me = USER_DISPLAY[role]

  return (
    <header className="aws5-head">
      <button className="aws5-head-logo" onClick={() => onNavigate('dashboard')}>
        <span className="aws5-logo-mark"><Icon name="Cpu" size={17} /></span>
        <span className="a5-logo-text">HPC Console</span>
      </button>

      <div className="aws5-menuwrap a5-services" ref={servicesRef}>
        <button className="aws5-head-item" onClick={() => setServicesOpen(!servicesOpen)}>Services <Lucide.ChevronDown size={12} /></button>
        {servicesOpen && (
          <div className="aws5-menu a5-services-menu">
            {A5_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="a5-menu-label">{g.label}</div>
                {g.items.map(([label, page, icon]) => (
                  <button key={page} className="a5-mi" onClick={() => { setServicesOpen(false); onNavigate(page) }}>
                    <Icon name={icon} size={14} />{label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="aws5-searchbox">
        <Lucide.Search size={13} />
        <input ref={searchRef} placeholder="Search for nodes, jobs, partitions, users and more..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="a5-head-spacer" />

      <button className="aws5-iconbtn" title="Notifications"><Lucide.Bell size={16} /><span className="a5-dot-badge" /></button>
      <button className="aws5-iconbtn" title="Support"><Lucide.CircleHelp size={16} /></button>
      <button className="aws5-iconbtn" title="Open terminal" onClick={onOpenTerminal}><Lucide.SquareTerminal size={16} /></button>
      <button className="aws5-iconbtn" title="Toggle dark mode" aria-pressed={dark} onClick={onToggleDark}>{dark ? <Lucide.Sun size={16} /> : <Lucide.Moon size={16} />}</button>

      <div className="aws5-menuwrap" ref={userRef}>
        <button className="aws5-head-user" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="a5-avatar">{me.initials}</span>
          <span className="a5-user-meta">
            <b>{me.uid}</b>
            <small>{roleLabel}</small>
          </span>
          <Lucide.ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="aws5-menu right a5-user-menu">
            <div className="a5-menu-label">Simulated role switcher</div>
            <button className={`a5-mi${role === 'admin' ? ' active' : ''}`} onClick={() => { onRole('admin'); setMenuOpen(false) }}>
              <Lucide.ShieldCheck size={14} />Administrator — {USER_DISPLAY.admin.uid}{role === 'admin' && <Lucide.Check size={13} className="a5-checkmark" />}
            </button>
            <button className={`a5-mi${role === 'user' ? ' active' : ''}`} onClick={() => { onRole('user'); setMenuOpen(false) }}>
              <Lucide.User size={14} />Standard user — {USER_DISPLAY.user.uid}{role === 'user' && <Lucide.Check size={13} className="a5-checkmark" />}
            </button>
            <div className="a5-menu-sep" />
            <div className="a5-menu-note">Simulated persona — no login or real permissions. Switching only changes what this console shows.</div>
            <div className="a5-menu-note a5-menu-note-sub">
              Signed in as <b>{me.uid}</b> ({ROLE_LABELS[role]}){me.account ? ` · Slurm account ${me.account}` : ''}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
