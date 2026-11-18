import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import * as Lucide from 'lucide-react'
import {
  Breadcrumbs, Card, CardB, CardH, emitToast, navTo,
} from '../components/ui'
import { FILESYSTEMS, USER_QUOTA } from '../data'

// ---------------------------------------------------------------- types --

type FsKind = 'User' | 'Group' | 'Project'

interface FsEntry {
  name: string
  kind: 'dir' | 'file'
  ext?: string
  sizeGB?: number
  mtime?: string
  owner?: string
  children?: FsEntry[]
  quotaGroup?: FsKind
}

interface FsDir {
  entries: FsEntry[]
}

// ------------------------------------------------------------- file data --

const HOME_TREE: FsDir = {
  entries: [
    { name: 'projects', kind: 'dir', children: [
      { name: 'slurm-logs', kind: 'dir', children: [
        { name: 'job-489347.out', kind: 'file', ext: 'out', sizeGB: 0.000042, mtime: 'Today, 10:31:07', owner: 'arun.bhatti' },
        { name: 'job-489347.err', kind: 'file', ext: 'err', sizeGB: 0.000001, mtime: 'Today, 10:33:24', owner: 'arun.bhatti' },
        { name: 'job-489254.out', kind: 'file', ext: 'out', sizeGB: 0.000018, mtime: 'Today, 09:59:44', owner: 'arun.bhatti' },
      ] },
      { name: 'datasets', kind: 'dir', children: [
        { name: 'mnli_train.h5', kind: 'file', ext: 'h5', sizeGB: 24.6, mtime: 'Yesterday, 18:04:51', owner: 'arun.bhatti' },
        { name: 'mnli_val.h5', kind: 'file', ext: 'h5', sizeGB: 2.9, mtime: 'Yesterday, 18:04:51', owner: 'arun.bhatti' },
        { name: 'tokenised_shards', kind: 'dir', children: [
          { name: 'shard-0000.npy', kind: 'file', ext: 'npy', sizeGB: 1.8, mtime: '10 Nov 2026, 21:12:03', owner: 'arun.bhatti' },
          { name: 'shard-0001.npy', kind: 'file', ext: 'npy', sizeGB: 1.8, mtime: '10 Nov 2026, 21:12:03', owner: 'arun.bhatti' },
          { name: 'shard-0002.npy', kind: 'file', ext: 'npy', sizeGB: 1.7, mtime: '10 Nov 2026, 21:12:03', owner: 'arun.bhatti' },
          { name: 'shard-0003.npy', kind: 'file', ext: 'npy', sizeGB: 1.8, mtime: '10 Nov 2026, 21:12:03', owner: 'arun.bhatti' },
          { name: 'shard-0004.npy', kind: 'file', ext: 'npy', sizeGB: 1.9, mtime: '10 Nov 2026, 21:12:03', owner: 'arun.bhatti' },
        ] },
      ] },
      { name: 'train_llm.py', kind: 'file', ext: 'py', sizeGB: 0.000031, mtime: 'Yesterday, 16:22:40', owner: 'arun.bhatti' },
      { name: 'submit.sbatch', kind: 'file', ext: 'sbatch', sizeGB: 0.000002, mtime: 'Yesterday, 16:24:12', owner: 'arun.bhatti' },
      { name: 'README.md', kind: 'file', ext: 'md', sizeGB: 0.000004, mtime: '05 Nov 2026, 09:30:18', owner: 'arun.bhatti' },
    ] },
    { name: 'checkpoints', kind: 'dir', children: [
      { name: 'run-1128-epoch14.pt', kind: 'file', ext: 'pt', sizeGB: 41.2, mtime: 'Today, 10:28:47', owner: 'arun.bhatti' },
      { name: 'run-1128-epoch13.pt', kind: 'file', ext: 'pt', sizeGB: 41.2, mtime: 'Today, 06:14:09', owner: 'arun.bhatti' },
      { name: 'run-1128-epoch12.pt', kind: 'file', ext: 'pt', sizeGB: 41.1, mtime: 'Today, 02:03:56', owner: 'arun.bhatti' },
    ] },
    { name: '.ssh', kind: 'dir', children: [
      { name: 'authorized_keys', kind: 'file', ext: 'keys', sizeGB: 0.000002, mtime: '14 Oct 2026, 11:02:31', owner: 'arun.bhatti' },
      { name: 'id_ed25519.pub', kind: 'file', ext: 'pub', sizeGB: 0.0000001, mtime: '14 Oct 2026, 11:02:31', owner: 'arun.bhatti' },
      { name: 'known_hosts', kind: 'file', ext: 'hosts', sizeGB: 0.000011, mtime: '12 Nov 2026, 08:15:22', owner: 'arun.bhatti' },
    ] },
    { name: '.bashrc', kind: 'file', ext: 'bashrc', sizeGB: 0.000003, mtime: '02 Nov 2026, 14:55:09', owner: 'arun.bhatti' },
    { name: '.profile', kind: 'file', ext: 'profile', sizeGB: 0.000001, mtime: '02 Nov 2026, 14:55:09', owner: 'arun.bhatti' },
  ],
}

const SCRATCH_TREE: FsDir = {
  entries: [
    { name: 'arun.bhatti', kind: 'dir', quotaGroup: 'User', children: [
      { name: 'md_simulation', kind: 'dir', children: [
        { name: 'traj_compact.dcd', kind: 'file', ext: 'dcd', sizeGB: 612.4, mtime: 'Today, 10:52:18', owner: 'arun.bhatti' },
        { name: 'topology.psf', kind: 'file', ext: 'psf', sizeGB: 0.9, mtime: 'Today, 09:41:02', owner: 'arun.bhatti' },
        { name: 'prod-frames', kind: 'dir', children: [
          { name: 'frame-1040000.dcd', kind: 'file', ext: 'dcd', sizeGB: 96.2, mtime: 'Today, 10:50:33', owner: 'arun.bhatti' },
          { name: 'frame-1042000.dcd', kind: 'file', ext: 'dcd', sizeGB: 96.2, mtime: 'Today, 10:52:10', owner: 'arun.bhatti' },
        ] },
      ] },
      { name: 'tmp-mnli-eval', kind: 'dir', children: [
        { name: 'eval_scores.csv', kind: 'file', ext: 'csv', sizeGB: 0.02, mtime: 'Yesterday, 22:40:11', owner: 'arun.bhatti' },
        { name: 'confusion.npz', kind: 'file', ext: 'npz', sizeGB: 0.4, mtime: 'Yesterday, 22:40:11', owner: 'arun.bhatti' },
      ] },
      { name: 'purge-note.txt', kind: 'file', ext: 'txt', sizeGB: 0.000002, mtime: '12 Nov 2026, 08:00:00', owner: 'root' },
    ] },
    { name: 's.chen', kind: 'dir', quotaGroup: 'User', children: [
      { name: 'cnn_training', kind: 'dir', children: [
        { name: 'mnli_batch.shuf', kind: 'file', ext: 'shuf', sizeGB: 121.8, mtime: 'Today, 10:26:40', owner: 's.chen' },
      ] },
    ] },
    { name: 'j.davies', kind: 'dir', quotaGroup: 'User', children: [
      { name: 'md_production', kind: 'dir', children: [
        { name: 'prod_04.dcd', kind: 'file', ext: 'dcd', sizeGB: 204.6, mtime: 'Today, 10:22:55', owner: 'j.davies' },
      ] },
    ] },
  ],
}

const SHARED_TREE: FsDir = {
  entries: [
    { name: 'projects', kind: 'dir', quotaGroup: 'Project', children: [
      { name: 'bio-informatics_cnn', kind: 'dir', quotaGroup: 'Project', children: [
        { name: 'results', kind: 'dir', children: [
          { name: 'epoch_metrics.csv', kind: 'file', ext: 'csv', sizeGB: 0.03, mtime: 'Today, 10:15:30', owner: 's.chen' },
          { name: 'test_predictions.h5', kind: 'file', ext: 'h5', sizeGB: 12.4, mtime: 'Today, 10:15:30', owner: 's.chen' },
        ] },
        { name: 'shared_scripts', kind: 'dir', children: [
          { name: 'preprocess.py', kind: 'file', ext: 'py', sizeGB: 0.000022, mtime: '08 Nov 2026, 13:44:00', owner: 's.chen' },
          { name: 'submit.sbatch', kind: 'file', ext: 'sbatch', sizeGB: 0.000002, mtime: '08 Nov 2026, 13:46:12', owner: 's.chen' },
        ] },
      ] },
      { name: 'eng-vis_cfd', kind: 'dir', quotaGroup: 'Project', children: [
        { name: 'mesh_v9.case', kind: 'file', ext: 'case', sizeGB: 3.1, mtime: 'Yesterday, 15:09:47', owner: 'r.oconnell' },
      ] },
      { name: 'physics_qcd', kind: 'dir', quotaGroup: 'Project', children: [
        { name: 'cfgs-24c', kind: 'dir', children: [
          { name: 'cfg-0012.lime', kind: 'file', ext: 'lime', sizeGB: 88.4, mtime: '12 Nov 2026, 19:31:20', owner: 'a.khan' },
          { name: 'cfg-0013.lime', kind: 'file', ext: 'lime', sizeGB: 88.4, mtime: '12 Nov 2026, 19:31:20', owner: 'a.khan' },
        ] },
      ] },
      { name: 'math-modelling_climate', kind: 'dir', quotaGroup: 'Project', children: [
        { name: 'hadgem3_202605.nc', kind: 'file', ext: 'nc', sizeGB: 64.2, mtime: '04 Nov 2026, 10:20:00', owner: 't.nakamura' },
      ] },
    ] },
    { name: 'groups', kind: 'dir', quotaGroup: 'Group', children: [
      { name: 'eng-vis', kind: 'dir', quotaGroup: 'Group', children: [
        { name: 'render_queue', kind: 'dir', children: [
          { name: 'out_v12.exr', kind: 'file', ext: 'exr', sizeGB: 4.8, mtime: 'Today, 09:12:04', owner: 'm.ross' },
        ] },
      ] },
      { name: 'bio-informatics', kind: 'dir', quotaGroup: 'Group', children: [
        { name: 'refs', kind: 'dir', children: [
          { name: 'hg38.fa', kind: 'file', ext: 'fa', sizeGB: 28.4, mtime: '21 Oct 2026, 08:00:00', owner: 'l.patel' },
        ] },
      ] },
    ] },
  ],
}

const ARCHIVE_TREE: FsDir = {
  entries: [
    { name: 'groups', kind: 'dir', quotaGroup: 'Group', children: [
      { name: 'eng-vis', kind: 'dir', quotaGroup: 'Group', children: [
        { name: '2019-2021_campaign', kind: 'dir', children: [
          { name: 'raw_frames_p0021.tar', kind: 'file', ext: 'tar', sizeGB: 1184.0, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
          { name: 'raw_frames_p0022.tar', kind: 'file', ext: 'tar', sizeGB: 1212.6, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
          { name: 'MANIFEST.json', kind: 'file', ext: 'json', sizeGB: 0.00004, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
        ] },
      ] },
      { name: 'physics', kind: 'dir', quotaGroup: 'Group', children: [
        { name: 'qcd_2025_production', kind: 'dir', children: [
          { name: 'cfgs-16c.tar.zst', kind: 'file', ext: 'zst', sizeGB: 640.2, mtime: '02 Apr 2026, 04:00:00', owner: 'archive' },
        ] },
      ] },
    ] },
    { name: 'migrated-checkpoints', kind: 'dir', children: [
      { name: 'run-0914-epoch40.pt', kind: 'file', ext: 'pt', sizeGB: 96.8, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
      { name: 'run-0914-epoch39.pt', kind: 'file', ext: 'pt', sizeGB: 96.8, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
      { name: 'README.recall', kind: 'file', ext: 'readme', sizeGB: 0.000002, mtime: '18 Aug 2026, 06:00:00', owner: 'archive' },
    ] },
  ],
}

const TREES: Record<string, FsDir> = {
  '/home': HOME_TREE,
  '/scratch': SCRATCH_TREE,
  '/shared': SHARED_TREE,
  '/archive': ARCHIVE_TREE,
}

const FS_SELECT = FILESYSTEMS.map((f) => ({
  mount: f.name, type: f.type, server: f.server, totalTB: f.totalTB, usedTB: f.usedTB, health: f.health as string,
}))

const QUOTA_VIEW: Record<string, { text: string }> = {
  '/home': { text: `${USER_QUOTA.home.usedGB.toLocaleString()} of ${USER_QUOTA.home.quotaGB.toLocaleString()} GB (40%)` },
  '/scratch': { text: `${USER_QUOTA.scratch.usedGB.toLocaleString()} of ${USER_QUOTA.scratch.quotaGB.toLocaleString()} GB (36%)` },
  '/shared': { text: `${USER_QUOTA.shared.usedGB.toLocaleString()} of ${USER_QUOTA.shared.quotaGB.toLocaleString()} GB (19%)` },
  '/archive': { text: `${USER_QUOTA.archive.usedGB.toLocaleString()} of ${USER_QUOTA.archive.quotaGB.toLocaleString()} GB (2%)` },
}

// ------------------------------------------------------------- helpers --

function fmtSize(file: FsEntry): string {
  const gb = file.sizeGB ?? 0
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  if (gb >= 100) return `${gb.toFixed(0)} GB`
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  if (gb >= 0.001) return `${(gb * 1024).toFixed(0)} MB`
  if (gb === 0) return '—'
  return `${(gb * 1024 * 1024).toFixed(0)} KB`
}

function fileIcon(f: FsEntry, ext: string): { icon: string; tint: string } {
  if (f.kind === 'dir') {
    if (f.name.startsWith('.')) return { icon: 'FolderLock', tint: 'muted' }
    if ((f.quotaGroup === 'Project') || f.name.includes('_cnn') || f.name.includes('_cfd')) return { icon: 'FolderKanban', tint: 'blue' }
    if (f.quotaGroup === 'Group') return { icon: 'Users', tint: 'amber' }
    return { icon: 'Folder', tint: 'blue' }
  }
  if (['sbatch', 'sh', 'bashrc', 'profile'].includes(ext)) return { icon: 'FileTerminal', tint: 'green' }
  if (['py', 'ipynb'].includes(ext)) return { icon: 'FileCode', tint: 'blue' }
  if (['out', 'err', 'log', 'csv'].includes(ext)) return { icon: 'FileText', tint: 'amber' }
  if (['h5', 'npy', 'npz', 'nc', 'dcd', 'pt', 'lime', 'shuf', 'tar', 'zst', 'exr', 'case'].includes(ext)) return { icon: 'Database', tint: 'blue' }
  if (['keys', 'pub', 'hosts'].includes(ext)) return { icon: 'KeyRound', tint: 'amber' }
  return { icon: 'File', tint: 'muted' }
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

// ------------------------------------------------------------ component --

export function FileBrowserPage() {
  const [mount, setMount] = useState<string>('/home')
  const [path, setPath] = useState<string[]>(['home'])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: 'name' | 'size' | 'mtime'; dir: 1 | -1 }>({ key: 'name', dir: 1 })

  const dir = useMemo(() => {
    let node: FsDir = TREES[mount] ?? TREES['/home']
    const rel = path.slice(1) // drop root segment
    for (const seg of rel) {
      const next = node.entries.find((e) => e.kind === 'dir' && e.name === seg)
      if (next && next.kind === 'dir' && next.children) node = { entries: next.children }
      else break
    }
    return node
  }, [mount, path])

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase()
    const rows = dir.entries.map((e) => ({ e, ext: extOf(e.name) }))
      .filter(({ e }) => !query || e.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.e.kind !== b.e.kind) return a.e.kind === 'dir' ? -1 : 1
        const va = sort.key === 'size' ? (a.e.sizeGB ?? 0) : sort.key === 'mtime' ? 1 : 0
        const vb = sort.key === 'size' ? (b.e.sizeGB ?? 0) : sort.key === 'mtime' ? 1 : 0
        if (sort.key === 'size' && va !== vb) return (va - vb) * sort.dir
        if (sort.key === 'mtime') return 0 // same frozen timestamp groups; keep name order
        return a.e.name.localeCompare(b.e.name) * sort.dir
      })
    return rows
  }, [dir, q, sort])

  const counts = useMemo(() => {
    const dirs = dir.entries.filter((e) => e.kind === 'dir').length
    const files = dir.entries.filter((e) => e.kind === 'file').length
    const bytesVisible = shown.reduce((s, r) => s + (r.e.kind === 'file' ? (r.e.sizeGB ?? 0) : 0), 0)
    return { dirs, files, bytesVisible }
  }, [dir, shown])

  const selectedFs = FS_SELECT.find((f) => f.mount === mount) ?? FS_SELECT[0]

  const goMount = (next: string): void => {
    setMount(next)
    setPath(next === '/home' ? ['home'] : [next.slice(1)])
    setQ('')
  }

  const goPath = (next: string[]): void => {
    setPath(next.length ? next : [mount.slice(1)])
    setQ('')
  }

  const up = (): void => {
    goPath(path.length > 1 ? path.slice(0, -1) : path)
  }

  const open = (e: FsEntry): void => {
    if (e.kind === 'dir') goPath([...path, e.name])
    else emitToast('info', `Download simulated — downloading ${e.name} from ${mount}`)
  }

  const toggleSort = (key: 'name' | 'size' | 'mtime'): void => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }))
  }

  const freeTB = Math.max(0, Math.round((selectedFs.totalTB - selectedFs.usedTB) * 10) / 10)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Storage', onClick: () => navTo({ page: 'filesystems' }) }, { label: 'File Browser' }]} />

      <div className="a5-pagehead-row">
        <div>
          <h1 className="aws5-h1">File Browser</h1>
          <div className="a5-pagehead-sub">Read-only, simulated view of the cluster filesystems · no real I/O</div>
        </div>
        <div className="a5-pagehead-actions">
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'quotas' })}><Lucide.Gauge size={13} />Quotas</button>
          <button className="aws5-btn aws5-btn--outline aws5-btn--sm" onClick={() => navTo({ page: 'terminal' })}><Lucide.Terminal size={13} />Open terminal</button>
        </div>
      </div>

      <div className="fb-summary3">
        {FS_SELECT.map((f) => {
          const pct = Math.round((f.usedTB / f.totalTB) * 100)
          const cls = f.health === 'Degraded' ? 'amber' : 'green'
          return (
            <button key={f.mount} className={`fb-fscard${mount === f.mount ? ' is-active' : ''}`} onClick={() => goMount(f.mount)}>
              <div className="fb-fscard-top">
                <span className="fb-fsmount mono">{f.mount}</span>
                <span className={`aws5-chip aws5-chip--${cls}`}><span className="a5-dot" />{f.health}</span>
              </div>
              <div className="fb-fscard-meta">{f.type} · {f.server}</div>
              <div className="fb-bar"><span style={{ width: `${Math.max(3, pct)}%` }} className={pct > 85 ? 'is-warn' : undefined} /></div>
              <div className="fb-fscard-foot"><span>{pct}% used · {freeTB} TB free</span><span>{f.totalTB} TB</span></div>
            </button>
          )
        })}
      </div>

      <div className="fb-toolbar">
        <div className="aws5-searchbox-main">
          <Lucide.Search size={13} />
          <input placeholder="Filter entries in this directory" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="fb-qclear" aria-label="Clear filter" onClick={() => setQ('')}><Lucide.X size={12} /></button>}
        </div>
        <div className="aws5-selectwrap">
          <select value={sort.key === 'name' ? `name-${sort.dir}` : sort.key} onChange={(e) => {
            const v = e.target.value
            if (v.startsWith('name-')) setSort({ key: 'name', dir: v.endsWith('1') ? 1 : -1 })
            else setSort({ key: v as 'size' | 'mtime', dir: 1 })
          }}>
            <option value="name-1">Name (A–Z)</option>
            <option value="name--1">Name (Z–A)</option>
            <option value="size">Largest first</option>
            <option value="mtime">Modified</option>
          </select>
          <Lucide.ChevronDown size={13} />
        </div>
        <div className="fb-counts">
          <span>{counts.dirs} directories</span><span className="fb-counts-sep">·</span>
          <span>{counts.files} files</span>
          {q && (<><span className="fb-counts-sep">·</span><span>{shown.length} shown</span></>)}
        </div>
      </div>

      <div className="aws5-card">
        <div className="aws5-card-body">
          <div className="fb-pathrow">
            <button className="fb-pathbtn" title="Up one level" onClick={up} disabled={path.length <= 1}>
              <Lucide.ArrowUp size={13} />
            </button>
            <div className="fb-pathcrumbs">
              <Lucide.HardDrive size={12} className="fb-pathhd" />
              <button className="fb-pathlink" onClick={() => goPath([])}>{mount}</button>
              {path.slice(1).map((seg, i) => (
                <span key={`${seg}-${i}`} className="fb-pathtok">
                  <span className="fb-pathsep">/</span>
                  <button className="fb-pathlink" onClick={() => goPath(path.slice(0, i + 2))}>{seg}</button>
                </span>
              ))}
              {path.slice(1).length === 0 && <span className="fb-pathcur">/</span>}
            </div>
            <span className={`aws5-chip aws5-chip--${selectedFs.health === 'Degraded' ? 'amber' : 'green'} fb-fsname`}>
              <span className="a5-dot" />{selectedFs.type} · ready
            </span>
          </div>

          <div className="aws5-table-wrap fb-tablewrap">
            <table className="aws5-table">
              <thead>
                <tr>
                  <th className="fb-th-name"><button className="fb-thbtn" onClick={() => toggleSort('name')}>Name{sort.key === 'name' && <Lucide.ChevronDown size={11} className={sort.dir === 1 ? 'fb-sorticon up' : 'fb-sorticon'} />}</button></th>
                  <th className="fb-th-type">Type</th>
                  <th className="fb-th-size"><button className="fb-thbtn" onClick={() => toggleSort('size')}>Size{sort.key === 'size' && <Lucide.ChevronDown size={11} className="fb-sorticon" />}</button></th>
                  <th className="fb-th-mtime">Last modified</th>
                  <th className="fb-th-owner">Owner</th>
                </tr>
              </thead>
              <tbody>
                {path.length > 1 && (
                  <tr className="fb-uprow" onClick={up}>
                    <td colSpan={5}><span className="fb-uptxt"><Lucide.CornerLeftUp size={13} className="fb-upicon" />..</span></td>
                  </tr>
                )}
                {shown.length === 0 && q.trim() === '' && (
                  <tr><td colSpan={5} className="a5-empty">This directory is empty.</td></tr>
                )}
                {shown.map(({ e, ext }) => {
                  const ic = fileIcon(e, ext)
                  const Icon = (Lucide as unknown as Record<string, ComponentType<{ size?: number; className?: string }>>)[ic.icon]
                  const isDir = e.kind === 'dir'
                  const mtime = e.mtime ?? `—`
                  const owner = e.owner ?? (e.quotaGroup === 'Group' ? 'group' : '—')
                  return (
                    <tr
                      key={e.name}
                      className={`fb-row${isDir ? ' is-dir' : ' is-file'}`}
                      onClick={() => open(e)}
                      title={isDir ? `Open directory ${e.name}` : `Download ${e.name} (simulated)`}
                    >
                      <td className="fb-td-name">
                        <span className={`fb-ico fb-ico--${ic.tint}`}><Icon size={14} /></span>
                        <span className="fb-name">{e.name}</span>
                      </td>
                      <td className="fb-td-type">{isDir ? 'Directory' : ext ? `${ext.toUpperCase()} file` : 'File'}</td>
                      <td className="fb-td-size mono">{isDir ? '—' : fmtSize(e)}</td>
                      <td className="fb-td-mtime">{mtime}</td>
                      <td className="fb-td-owner mono">{owner}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fb-bottom3">
        <div className="fb-bottom2">
          <Card>
            <CardH>Current path</CardH>
            <CardB className="fb-kvbody">
              <div className="fs-kv2col">
                <div className="a5-kvrow"><span className="a5-kv-k">Contents</span><span className="a5-kv-v"><b>{counts.dirs}</b>&nbsp;directories · <b>{counts.files}</b>&nbsp;files</span></div>
                <div className="a5-kvrow"><span className="a5-kv-k">Visible size (files)</span><span className="a5-kv-v mono">{fmtSize({ name: '', kind: 'file', sizeGB: counts.bytesVisible, mtime: '', owner: '' })}</span></div>
                <div className="a5-kvrow"><span className="a5-kv-k">Filter</span><span className="a5-kv-v">{q.trim() ? `name contains “${q.trim()}”` : '— (showing all)'}</span></div>
                <div className="a5-kvrow"><span className="a5-kv-k">Browser access</span><span className="a5-kv-v">{mount === '/home' ? 'Home directory (user-owned)' : `${mount.slice(1)} workspace · read-only browse`}</span></div>
              </div>
            </CardB>
          </Card>

          <Card>
            <CardH>My storage usage</CardH>
            <CardB>
              <div className="fb-quota">
                <span className="fb-quota-label">{mount}{mount === '/shared' ? ' (project quota)' : mount === '/archive' ? ' (group quota)' : ' (user quota)'}</span>
                <span className="fb-quota-val mono">{QUOTA_VIEW[mount].text}</span>
              </div>
              <div className="fb-quota">
                <span className="fb-quota-label">All filesystems (total)</span>
                <span className="fb-quota-val mono">
                  {USER_QUOTA.home.usedGB + USER_QUOTA.scratch.usedGB + USER_QUOTA.shared.usedGB + USER_QUOTA.archive.usedGB} of 12,288 GB
                </span>
              </div>
            </CardB>
          </Card>
        </div>

        <Card>
          <CardH>Cluster filesystems</CardH>
          <CardB className="fb-fsrows">
            {FS_SELECT.map((f) => {
              const pct = Math.round((f.usedTB / f.totalTB) * 100)
              const cls = f.health === 'Degraded' ? 'amber' : 'green'
              return (
                <div key={f.mount} className="fb-fsrow">
                  <div className="fb-fsrow-top">
                    <button className={`fb-fslink${mount === f.mount ? ' is-active' : ''}`} onClick={() => goMount(f.mount)}>{f.mount}</button>
                    <span className={`aws5-chip aws5-chip--${cls}`}><span className="a5-dot" />{f.health}</span>
                  </div>
                  <div className="fb-fsrow-meta mono">{f.type} · fs server {f.server}</div>
                  <div className="fb-bar"><span style={{ width: `${Math.max(3, pct)}%` }} className={pct > 85 ? 'is-warn' : undefined} /></div>
                  <div className="fb-fsrow-foot"><span>{pct}% used</span><span>{f.usedTB} TB of {f.totalTB} TB</span></div>
                </div>
              )
            })}
          </CardB>
        </Card>
      </div>
    </>
  )
}
