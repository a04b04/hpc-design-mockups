// Central simulation store (page, role, theme, node panel, notifications, cmdk).

import { useSyncExternalStore } from 'react'
import type { PageId, Role, PanelTab } from '../data/cluster-data'
import { openWindow } from './store-win'

export type St = {
  page: PageId
  role: Role
  theme: 'dark' | 'light'
  panel: { nodeId: string | null; tab: PanelTab }
  notifOpen: boolean
  cmdkOpen: boolean
  cmdkQuery: string
}

let st: St = {
  page: 'dashboard',
  role: 'admin',
  theme: 'dark',
  panel: { nodeId: null, tab: 'overview' },
  notifOpen: false,
  cmdkOpen: false,
  cmdkQuery: '',
}

const subs = new Set<() => void>()
function emit() {
  subs.forEach((l) => l())
}

export function subscribe(fn: () => void): () => void {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function getSt(): St {
  return st
}

export function useApp(): St {
  return useSyncExternalStore(subscribe, getSt)
}

// Admin-only pages force the demo user back to the dashboard when leaving admin role.
export const ADMIN_ONLY: PageId[] = ['monitoring', 'administration']

export function setSt(patch: Partial<St>): void {
  st = { ...st, ...patch }
  emit()
}

export function setTheme(theme: 'dark' | 'light'): void {
  st = { ...st, theme }
  try {
    localStorage.setItem('helios-theme', theme)
  } catch {
    /* private mode */
  }
  emit()
}

export function toggleTheme(): void {
  setTheme(st.theme === 'dark' ? 'light' : 'dark')
}

export function setRole(role: Role): void {
  st = {
    ...st,
    role,
    // standard users cannot be left on admin-only pages
    page: role === 'user' && ADMIN_ONLY.includes(st.page) ? 'dashboard' : st.page,
  }
  emit()
}

export function setPage(page: PageId): void {
  st = { ...st, page, panel: { nodeId: null, tab: 'overview' }, notifOpen: false, cmdkOpen: false, cmdkQuery: '' }
  emit()
}

export function openNode(nodeId: string, tab: PanelTab = 'overview'): void {
  st = { ...st, panel: { nodeId, tab }, notifOpen: false, cmdkOpen: false }
  emit()
}

export function closePanel(): void {
  st = { ...st, panel: { nodeId: null, tab: 'overview' } }
  emit()
}

export function setPanelTab(tab: PanelTab): void {
  st = { ...st, panel: { ...st.panel, tab } }
  emit()
}

export function toggleNotif(): void {
  st = { ...st, notifOpen: !st.notifOpen }
  emit()
}

export function setCmdk(open: boolean): void {
  st = { ...st, cmdkOpen: open, cmdkQuery: open ? st.cmdkQuery : '' }
  emit()
}

export function setCmdkQuery(q: string): void {
  st = { ...st, cmdkQuery: q }
  emit()
}

let winSeq = 0
export function openTerminal(host: string, user = 'ada'): void {
  const n = winSeq++
  const kind = host.includes('gpu') ? 'gpu' : host.includes('login') ? 'login' : 'compute'
  openWindow({
    host,
    user,
    nodeId: host,
    kind,
    x: 96 + (n % 3) * 34,
    y: 96 + (n % 3) * 30,
    w: 640,
    h: 400,
  })
}
