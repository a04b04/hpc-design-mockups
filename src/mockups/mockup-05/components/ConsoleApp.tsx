import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { TerminalWindow, type TermTab } from './terminal/TerminalWindow'
import { A5_NAV_PERMISSIONS, ToastHost, emitToast, navTo, parseHash } from './ui'
import type { A5Route } from './ui'
import { DEMO_USER, NODES } from '../data'
import type { Role } from '../data'
import { PAGE_ACTIONS, PAGE_FEATURE, canPerformAction, isFeatureEnabled, subscribeFeatureConfig } from '../pages/feature-flags'
import { DashboardPage } from '../pages/dashboard'
import { NodesPage } from '../pages/nodes'
import { NodeDetailPage } from '../pages/node-detail'
import { JobDetailPage, JobsPage } from '../pages/jobs'
import { JobHistoryPage } from '../pages/job-history'
import { JobTemplatesPage } from '../pages/job-templates'
import { PartitionsPage, PartitionDetailPage } from '../pages/partitions'
import { ReservationsPage, ReservationDetailPage } from '../pages/reservations'
import { SlurmAccountsPage, UsersPage } from '../pages/cluster-pages'
import { FeatureManagementPage } from '../pages/feature-management'
import { RolesPermissionsPage } from '../pages/roles-permissions'
import { FilesystemsPage, FilesystemDetailPage, QuotasPage } from '../pages/storage-pages'
import { SubmitJobPage } from '../pages/submit-job'
import {
  AlertsPage, ClusterHealthPage, ConfigurationPage, NodeManagementPage,
  QosPage, RemoteDesktopPage, ResourceUtilisationPage, TerminalPage,
} from '../pages/monitoring-pages'
import { FileBrowserPage } from '../pages/file-browser'

import '../styles/styles.css'

let TERM_SEQ = 1

const A5_ROLE_KEY = 'enucc5.role'

export default function ConsoleApp() {
  const [hash, setHash] = useState(() => window.location.hash)
  // Stage 1 (role-aware console): the selected persona persists across reloads
  // in localStorage so the role survives navigation and refresh.
  const [role, setRole] = useState<Role>(() => (window.localStorage.getItem(A5_ROLE_KEY) === 'user' ? 'user' : 'admin'))
  const [collapsed, setCollapsed] = useState(false)
  const [termTabs, setTermTabs] = useState<TermTab[]>([])
  const [termActive, setTermActive] = useState<number | null>(null)
  const [dark, setDark] = useState(() => window.localStorage.getItem('enucc5.theme') === 'dark')
  // Stage 2: feature-config subscriber tick — bumping it re-renders the shell
  // immediately when a feature is changed on the Feature Management page.
  const [, setFeatTick] = useState(0)
  useEffect(() => subscribeFeatureConfig(() => setFeatTick((t) => t + 1)), [])

  useEffect(() => {
    window.localStorage.setItem(A5_ROLE_KEY, role)
  }, [role])

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

  // Stage 2: simulated action gating. Terminal/SSH and remote-desktop sessions
  // require the 'use' action on their governing feature; submissions require
  // 'submit' on Submit Jobs. Unauthorised attempts surface a toast only.
  const openSession = useCallback((nodeName: string) => {
    if (!canPerformAction('terminal', role, 'use')) {
      emitToast('warn', 'Web Terminal is not enabled for your account. Contact your cluster administrator if you require access.')
      return
    }
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
  }, [role])

  const newTab = useCallback(() => {
    const host = termTabs.find((t) => t.id === termActive)?.host ?? DEMO_USER.permittedNodes[0]
    openSession(host)
  }, [termTabs, termActive, openSession])

  // First terminal open: initialise default position.
  const openFirstSession = useCallback(() => {
    openSession('enucc-login-01')
  }, [openSession])

  const pageName = route?.page ?? 'dashboard'

  // Stage 2: direct-route protection. A page whose governing feature is
  // disabled (or from which this role lacks the required action) renders a
  // gate panel instead of the page — restricted content is never mounted.
  // The Slurm Jobs list stays reachable for both roles (users always see
  // their own jobs there); it is only blocked when the feature is disabled.
  let gateDenied = false
  if (route && route.page !== 'dashboard') {
    const fid = PAGE_FEATURE[route.page]
    if (fid) gateDenied = fid === 'jobs' ? !isFeatureEnabled('jobs') : !canPerformAction(fid, role, PAGE_ACTIONS[route.page] ?? 'view')
  }

  const body = (() => {
    if (!route) return <DashboardPage role={role} />
    switch (route.page) {
      case 'dashboard': return <DashboardPage role={role} />
      case 'nodes': return 'partition' in route && route.partition ? <NodesPage role={role} initialPartition={route.partition} /> : <NodesPage role={role} />
      case 'node': return 'node' in route ? <NodeDetailPage nodeName={route.node} role={role} onOpenSession={openSession} /> : null
      case 'partitions': return <PartitionsPage role={role} />
      case 'partition': return 'partition' in route ? <PartitionDetailPage name={route.partition} role={role} /> : null
      case 'reservations': return <ReservationsPage role={role} />
      case 'resv': return 'resv' in route ? <ReservationDetailPage name={route.resv} role={role} /> : null
      case 'jobs': return 'partition' in route && route.partition ? <JobsPage role={role} initialPartition={route.partition} /> : <JobsPage role={role} />
      case 'jb': return 'jobId' in route ? <JobDetailPage jobId={route.jobId} role={role} /> : null
      case 'submit-job': return <SubmitJobPage />
      case 'job-templates': return <JobTemplatesPage />
      case 'job-history': return <JobHistoryPage />
      case 'filesystems': return <FilesystemsPage />
      case 'fs': return 'fs' in route ? <FilesystemDetailPage fsKey={route.fs} role={role} /> : null
      case 'file-browser': return <FileBrowserPage role={role} />
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
      case 'feature-mgmt': return <FeatureManagementPage role={role} />
      case 'roles': return <RolesPermissionsPage role={role} />
      default: return <DashboardPage role={role} />
    }
  })()

  return (
    <div className={`aws5${dark ? ' aws5-dark' : ''}`} data-page={pageName}>
      <Header role={role} onRole={setRole} onNavigate={navigate} onOpenTerminal={openFirstSession} dark={dark} onToggleDark={() => setDark((d) => !d)} />
      <div className="aws5-shell">
        <Sidebar page={route ?? { page: 'dashboard' }} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onNavigate={navigate} />
        <main className="aws5-main">
          {gateDenied
            ? (
              <div className="a5-gate">
                <div className="a5-gate-icon"><Lucide.ShieldX size={26} /></div>
                <h1 className="aws5-h1">Feature Unavailable</h1>
                <p className="a5-gate-sub">This feature is not enabled for your account. Contact your cluster administrator if you require access.</p>
                <button className="aws5-btn aws5-btn--outline" onClick={() => navTo({ page: 'dashboard' })}><Lucide.LayoutDashboard size={14} />Back to Dashboard</button>
              </div>
            )
            : body}
        </main>
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
