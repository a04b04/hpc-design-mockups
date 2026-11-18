import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { TerminalWindow, type TermTab } from './terminal/TerminalWindow'
import { A5_NAV_PERMISSIONS, ToastHost, emitToast, navTo, parseHash } from './ui'
import type { A5Route } from './ui'
import { DEMO_USER, NODES } from '../data'
import type { Role } from '../data'
import { DashboardPage } from '../pages/dashboard'
import { NodesPage } from '../pages/nodes'
import { NodeDetailPage } from '../pages/node-detail'
import { JobsPage } from '../pages/jobs'
import { JobHistoryPage } from '../pages/job-history'
import { JobTemplatesPage } from '../pages/job-templates'
import { PartitionsPage, ReservationsPage, SlurmAccountsPage, UsersPage } from '../pages/cluster-pages'
import { FilesystemsPage, QuotasPage, SubmitJobPage } from '../pages/storage-pages'
import {
  AlertsPage, ClusterHealthPage, ConfigurationPage, FileBrowserPage, NodeManagementPage,
  QosPage, RemoteDesktopPage, ResourceUtilisationPage, TerminalPage,
} from '../pages/monitoring-pages'

import '../styles/styles.css'

let TERM_SEQ = 1

export default function ConsoleApp() {
  const [hash, setHash] = useState(() => window.location.hash)
  const [role, setRole] = useState<Role>('admin')
  const [collapsed, setCollapsed] = useState(false)
  const [termTabs, setTermTabs] = useState<TermTab[]>([])
  const [termActive, setTermActive] = useState<number | null>(null)
  const [dark, setDark] = useState(() => window.localStorage.getItem('enucc5.theme') === 'dark')

  useEffect(() => {
    window.localStorage.setItem('enucc5.theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const route: A5Route | null = useMemo(() => parseHash(hash), [hash])

  // Redirect standard users away from admin-only pages.
  useEffect(() => {
    if (route && role === 'user' && A5_NAV_PERMISSIONS[route.page] === 'admin') {
      emitToast('warn', 'Standard users do not have access to this area.')
      navTo({ page: 'dashboard' })
    }
  }, [route, role])

  const navigate = useCallback((p: string) => {
    navTo({ page: p } as A5Route)
  }, [])

  const openSession = useCallback((nodeName: string) => {
    const node = NODES.find((n) => n.name === nodeName)
    if (!node) return
    setTermTabs((prev) => {
      const existing = prev.find((t) => t.node === nodeName)
      if (existing) {
        setTermActive(existing.id)
        return prev
      }
      const id = TERM_SEQ++
      setTermActive(id)
      return [...prev, { id, host: nodeName, node: nodeName }]
    })
  }, [])

  const newTab = useCallback(() => {
    const host = termTabs.find((t) => t.id === termActive)?.host ?? DEMO_USER.permittedNodes[0]
    openSession(host)
  }, [termTabs, termActive, openSession])

  // First terminal open: initialise default position.
  const openFirstSession = useCallback(() => {
    openSession('enucc-login-01')
  }, [openSession])

  const pageName = route?.page ?? 'dashboard'

  const body = (() => {
    if (!route) return <DashboardPage role={role} />
    switch (route.page) {
      case 'dashboard': return <DashboardPage role={role} />
      case 'nodes': return <NodesPage role={role} />
      case 'node': return 'node' in route ? <NodeDetailPage nodeName={route.node} role={role} onOpenSession={openSession} /> : null
      case 'partitions': return <PartitionsPage />
      case 'reservations': return <ReservationsPage />
      case 'jobs': return <JobsPage />
      case 'submit-job': return <SubmitJobPage />
      case 'job-templates': return <JobTemplatesPage />
      case 'job-history': return <JobHistoryPage />
      case 'filesystems': return <FilesystemsPage />
      case 'file-browser': return <FileBrowserPage />
      case 'quotas': return <QuotasPage role={role} />
      case 'cluster-health': return <ClusterHealthPage />
      case 'resource-utilisation': return <ResourceUtilisationPage />
      case 'alerts': return <AlertsPage />
      case 'terminal': return <TerminalPage role={role} onOpenSession={openSession} />
      case 'remote-desktop': return <RemoteDesktopPage role={role} />
      case 'users': return <UsersPage />
      case 'slurm-accounts': return <SlurmAccountsPage />
      case 'qos': return <QosPage />
      case 'node-mgmt': return <NodeManagementPage />
      case 'configuration': return <ConfigurationPage />
      default: return <DashboardPage role={role} />
    }
  })()

  return (
    <div className={`aws5${dark ? ' aws5-dark' : ''}`} data-page={pageName}>
      <Header role={role} onRole={setRole} onNavigate={navigate} onOpenTerminal={openFirstSession} dark={dark} onToggleDark={() => setDark((d) => !d)} />
      <div className="aws5-shell">
        <Sidebar page={route ?? { page: 'dashboard' }} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onNavigate={navigate} />
        <main className="aws5-main">{body}</main>
      </div>
      <ToastHost />
      <TerminalWindow
        tabs={termTabs}
        activeTab={termActive}
        onCloseTab={(id) => {
          setTermTabs((prev) => {
            const next = prev.filter((t) => t.id !== id)
            if (termActive === id) setTermActive(next.length ? next[next.length - 1].id : null)
            return next
          })
        }}
        onFocusTab={setTermActive}
        onNewTab={newTab}
        onCloseAll={() => { setTermTabs([]); setTermActive(null) }}
        nodes={NODES}
        role={role}
      />
    </div>
  )
}
