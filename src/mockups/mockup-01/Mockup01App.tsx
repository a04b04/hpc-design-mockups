import { useApp } from '../../lib/store'
import { useAppEffects } from './effects'
import { Shell } from './app/shell'
import { DashboardPage } from '../../pages/dashboard'
import { NodesPage } from '../../pages/nodes'
import { JobsPage } from '../../pages/jobs'
import { StoragePage } from '../../pages/storage'
import { TerminalPage } from '../../pages/terminal'
import { MonitoringPage } from '../../pages/monitoring'
import { AdministrationPage } from '../../pages/administration'
import { NodePanel } from './components/terminal/node-panel'
import { TerminalWindows } from './components/terminal/term-window'
import { ADMIN_ONLY } from '../../lib/store'

export default function Mockup01App() {
  const st = useApp()
  useAppEffects(st.theme, !!st.panel.nodeId)

  return (
    <>
      <Shell>
        {st.page === 'dashboard' && <DashboardPage />}
        {st.page === 'nodes' && <NodesPage />}
        {st.page === 'jobs' && <JobsPage />}
        {st.page === 'storage' && <StoragePage />}
        {st.page === 'terminal' && <TerminalPage />}
        {ADMIN_ONLY.includes(st.page) && st.role === 'admin' && <MonitoringPage />}
        {st.page === 'administration' && st.role === 'admin' && <AdministrationPage />}
      </Shell>
      {!!st.panel.nodeId && <NodePanel />}
      <TerminalWindows />
    </>
  )
}
