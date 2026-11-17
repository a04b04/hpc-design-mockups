// Resizable/draggable floating terminal windows (max 3 open at once).

import { useSyncExternalStore } from 'react'

export type WinKind = 'ssh' | 'panel' | 'login' | 'gpu' | 'compute'

export type WinItem = {
  id: number
  host: string
  user: string
  nodeId?: string
  kind: WinKind
  z: number
  x: number
  y: number
  w: number
  h: number
  maximized?: boolean
  prev?: { x: number; y: number; w: number; h: number }
}

const MAX_WINDOWS = 3
export { MAX_WINDOWS }

let wins: WinItem[] = []
let nextId = 1
let topZ = 10
const subs = new Set<() => void>()

function emit() {
  subs.forEach((l) => l())
}

export function subscribeWin(fn: () => void): () => void {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function useWindows(): WinItem[] {
  return useSyncExternalStore(subscribeWin, () => wins)
}

export function openWindow(w: Omit<WinItem, 'id' | 'z'>): WinItem {
  if (wins.length >= MAX_WINDOWS) {
    // replace the oldest non-maximized window so the cap stays visible
    const oldest = [...wins].sort((a, b) => a.z - b.z).find((x) => !x.maximized) ?? wins[0]
    closeWindow(oldest.id)
  }
  const item: WinItem = { ...w, id: nextId++, z: ++topZ }
  wins = [wins, item].flat() as WinItem[]
  emit()
  return item
}

export function closeWindow(id: number): void {
  wins = wins.filter((w) => w.id !== id)
  emit()
}

export function focusWindow(id: number): void {
  const w = wins.find((x) => x.id === id)
  if (!w) return
  wins = wins.map((x) => (x.id === id ? { ...x, z: ++topZ } : x))
  emit()
}

export function toggleMaxWindow(id: number): void {
  wins = wins.map((w) => {
    if (w.id !== id) return w
    if (w.maximized && w.prev) {
      const { x, y, w: width, h } = w.prev
      return { ...w, maximized: false, x, y, w: width, h, prev: undefined }
    }
    return {
      ...w,
      maximized: true,
      prev: { x: w.x, y: w.y, w: w.w, h: w.h },
      x: 260, y: 90, w: window.innerWidth - 300, h: window.innerHeight - 130,
    }
  })
  emit()
}

export function setWindowPos(id: number, x: number, y: number): void {
  wins = wins.map((w) => (w.id === id ? { ...w, x, y } : w))
  emit()
}
