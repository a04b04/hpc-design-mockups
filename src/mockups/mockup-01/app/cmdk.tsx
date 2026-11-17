import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, Kbd } from '../components/ui'
import { cs } from '../../../lib/format'
import { useApp, setCmdk, setPage, openNode, setCmdkQuery } from '../../../lib/store'
import { ALL_NODES, ALL_JOBS, ALL_USERS } from '../../../data/cluster-data'
import type { PageId } from '../../../data/cluster-data'

interface Cmd {
  id: string
  label: string
  hint?: string
  icon: string
  group: string
  run: () => void
}

export function CommandK() {
  const { cmdkOpen, cmdkQuery, role } = useApp()
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cmdkOpen) {
      setSel(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [cmdkOpen])

  const cmds = useMemo<Cmd[]>(() => {
    const out: Cmd[] = []
    const pages: Array<[PageId, string, string]> = [
      ['dashboard', 'Go to Dashboard', 'layout-dashboard'],
      ['nodes', 'Go to Nodes', 'nodes'],
      ['jobs', 'Go to Jobs', 'jobs'],
      ['storage', 'Go to Storage', 'storage'],
      ['terminal', 'Go to Terminal', 'terminal'],
    ]
    if (role === 'admin') {
      pages.push(['monitoring', 'Go to Monitoring', 'monitoring'])
      pages.push(['administration', 'Go to Administration', 'admin'])
    }
    for (const [id, label, icon] of pages) out.push({ id: `page-${id}`, label, icon, group: 'Navigate', run: () => setPage(id) })

    for (const n of ALL_NODES.slice(0, 60)) {
      if (n.kind === 'service' || n.kind === 'login' ? false : true) {
        out.push({ id: `node-${n.id}`, label: n.id, hint: `${n.kind} · ${n.partition}`, icon: 'nodes', group: 'Nodes', run: () => openNode(n.id) })
      }
    }
    for (const j of ALL_JOBS.slice(0, 30)) {
      out.push({ id: `job-${j.id}`, label: j.name, hint: `#${j.id} · ${j.state}`, icon: 'jobs', group: 'Jobs', run: () => setPage('jobs') })
    }
    if (role === 'admin') {
      for (const u of ALL_USERS.slice(0, 12)) {
        out.push({ id: `user-${u.id}`, label: u.name, hint: u.group, icon: 'user', group: 'Users', run: () => setPage('administration') })
      }
    }
    return out
  }, [role])

  const filtered = useMemo(() => {
    const q = cmdkQuery.trim().toLowerCase()
    if (!q) return cmds.slice(0, 14)
    return cmds.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q)).slice(0, 14)
  }, [cmds, cmdkQuery])

  if (!cmdkOpen) return null
  const groups: string[] = []
  for (const c of filtered) if (!groups.includes(c.group)) groups.push(c.group)

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[16vh]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-void/70 backdrop-blur-[2px]" onClick={() => setCmdk(false)} />
      <div className="panel anim-panel-in relative w-[560px] max-w-[92vw] overflow-hidden rounded-[16px] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2.5 border-b border-edge px-4">
          <Icon n="search" size={14} className="text-ghost" />
          <input
            ref={inputRef}
            value={cmdkQuery}
            onChange={(e) => {
              setCmdkQuery(e.target.value)
              setSel(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSel((s) => Math.min(filtered.length - 1, s + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSel((s) => Math.max(0, s - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                filtered[sel]?.run()
                setCmdk(false)
              } else if (e.key === 'Escape') {
                setCmdk(false)
              }
            }}
            placeholder="Search nodes, jobs, users or jump to a page…"
            className="h-11 flex-1 bg-transparent text-[13px] text-frost outline-none placeholder:text-ghost"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {filtered.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-ghost">No matches for “{cmdkQuery}”</div>}
          {groups.map((g) => (
            <div key={g}>
              <div className="px-2.5 pt-2 pb-1 text-[9.5px] font-semibold tracking-[0.08em] text-ghost uppercase">{g}</div>
              {filtered
                .filter((c) => c.group === g)
                .map((c) => {
                  const idx = filtered.indexOf(c)
                  const active = idx === sel
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => {
                        c.run()
                        setCmdk(false)
                      }}
                      className={cs(
                        'flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-left',
                        active ? 'chip-solid' : 'hover:bg-transparent',
                      )}
                    >
                      <Icon n={c.icon} size={13} className={active ? 'text-accent-bright' : 'text-quill'} />
                      <span className={cs('text-[12px]', active ? 'font-medium text-frost' : 'text-steam')}>{c.label}</span>
                      {c.hint ? <span className="ml-auto font-mono text-[10px] text-ghost">{c.hint}</span> : null}
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-edge px-4 py-2 text-[10px] text-ghost">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto">Helios · ⌘K</span>
        </div>
      </div>
    </div>
  )
}
