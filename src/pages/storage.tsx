import { useState } from 'react'
import { Icon, Chip, Stat, Panel, PanelHead, SegTabs, StatusDot, ProgressBar } from '../mockups/mockup-01/components/ui'
import { StorageBar, QuotaMeter } from '../mockups/mockup-01/components/charts/charts'
import { fmtBytes } from '../lib/format'
import { useApp } from '../lib/store'
import { ALL_FILESYSTEMS, ALL_USERS, CLUSTER_CFG } from '../data/cluster-data'

type View = 'filesystems' | 'quotas'

const statusChip: Record<string, string> = {
  ok: 'border-green/30 bg-green/10 text-green',
  degraded: 'border-amber/30 bg-amber/10 text-amber',
  rebuilding: 'border-cyan/30 bg-cyan/10 text-cyan',
}

function TiB(bytes: number): number {
  return bytes / 1024 ** 4
}

export function StoragePage() {
  const { role } = useApp()
  const me = ALL_USERS.find((u) => u.username === 'ada')!
  const [view, setView] = useState<View>('filesystems')

  const totalBytes = ALL_FILESYSTEMS.reduce((a, f) => a + f.sizeB, 0)
  const usedBytes = ALL_FILESYSTEMS.reduce((a, f) => a + f.usedB, 0)
  const iops = ALL_FILESYSTEMS.reduce((a, f) => a + f.iopsRw, 0)
  const thru = ALL_FILESYSTEMS.reduce((a, f) => a + f.aggThroughput, 0)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Storage</h1>
          <p className="mt-1 text-[12.5px] text-quill">
            {ALL_FILESYSTEMS.length} filesystems · {fmtBytes(totalBytes)} provisioned · {fmtBytes(thru)}/s aggregate throughput
          </p>
        </div>
        <SegTabs
          tabs={[
            { id: 'filesystems', label: 'Filesystems' },
            { id: 'quotas', label: role === 'admin' ? 'Quotas' : 'My quota' },
          ]}
          active={view}
          onChange={setView}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Used" value={fmtBytes(usedBytes)} sub={`of ${fmtBytes(totalBytes)}`} icon="database" color="var(--color-accent-bright)" progress={(usedBytes / totalBytes) * 100} />
        <Stat label="Aggregate IOPS" value={`${(iops / 1000).toFixed(0)}k`} sub="read + write" icon="zap" color="var(--color-cyan)" />
        <Stat label="Throughput" value={`${fmtBytes(thru)}/s`} sub="cluster-wide" icon="trend-up" color="var(--color-green)" />
        <Stat label="Degraded targets" value={String(ALL_FILESYSTEMS.filter((f) => f.status !== 'ok').length)} sub="need attention" icon="warn" color="var(--color-amber)" />
      </div>

      {view === 'filesystems' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ALL_FILESYSTEMS.map((fs) => {
            const pct = (fs.usedB / fs.sizeB) * 100
            return (
              <Panel key={fs.id} className="anim-fade-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={fs.status === 'ok' ? 'online' : fs.status === 'degraded' ? 'drain' : 'offline'} pulse={fs.status === 'rebuilding'} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono text-[13px] font-semibold text-frost">/dev/{fs.id}</h3>
                        <span className={`rounded-md border px-1.5 py-[1px] text-[9.5px] font-medium ${statusChip[fs.status] ?? ''}`}>{fs.status}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-quill">{fs.desc}</p>
                    </div>
                  </div>
                  <Chip className="shrink-0 font-mono">{fs.proto}</Chip>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-[11.5px] text-steam">
                      {fmtBytes(fs.usedB)} <span className="text-ghost">of</span> {fmtBytes(fs.sizeB)}
                    </span>
                    <span className={`font-mono text-[11.5px] ${pct > 80 ? 'text-amber' : 'text-quill'}`}>{pct.toFixed(1)}%</span>
                  </div>
                  <StorageBar usedPct={pct} color={pct > 85 ? 'var(--color-amber)' : pct > 70 ? 'var(--color-accent)' : 'var(--color-green)'} />
                  <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-ghost">
                    <span>mount: {fs.mount}</span>
                    <span>inodes {fs.inodePct.toFixed(0)}% · IOPS {(fs.iopsRw / 1000).toFixed(0)}k · {fmtBytes(fs.aggThroughput)}/s</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-edge pt-3.5 dark:border-dusk">
                  <div>
                    <div className="text-[10px] tracking-wide text-quill uppercase">User quota</div>
                    <div className="mt-1 font-mono text-[11px] text-steam">
                      soft {fmtBytes(fs.quotaSoftB, 0)} · hard {fmtBytes(fs.quotaHardB, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-quill uppercase">Servers</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {fs.servers.map((s) => (
                        <span key={s} className="rounded-md bg-steel px-1.5 py-[1px] font-mono text-[9.5px] text-quill dark:bg-dusk">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel className="anim-fade-up lg:col-span-2">
            <PanelHead title="Home directory quota" icon="folder" right={<Chip className="font-mono">/home/{me.username}</Chip>} />
            <div className="mt-4 flex items-center gap-6">
              <QuotaMeter usedPct={(me.storageUsed / me.diskQuota) * 100} className="h-[112px] w-[112px]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-quill">Used</span>
                    <span className="font-mono text-frost">{fmtBytes(me.storageUsed)}</span>
                  </div>
                  <ProgressBar value={(me.storageUsed / me.diskQuota) * 100} color="var(--color-accent)" height={5} />
                </div>
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-quill">Soft limit</span>
                    <span className="font-mono text-steam">{fmtBytes(me.diskQuota * 0.8, 0)}</span>
                  </div>
                  <ProgressBar value={80} color="var(--color-amber)" height={3} />
                </div>
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-quill">Hard limit</span>
                    <span className="font-mono text-steam">{fmtBytes(me.diskQuota, 0)}</span>
                  </div>
                  <ProgressBar value={100} color="var(--color-red)" height={3} />
                </div>
              </div>
            </div>
          </Panel>
          <Panel className="anim-fade-up">
            <PanelHead title="Scratch quota" icon="database" />
            <div className="mt-4 space-y-3 text-[11.5px]">
              <Row k="Group" v={CLUSTER_CFG.name.toLowerCase() + '/' + me.defaultAccount} />
              <Row k="Wall of purge" v="36 hours" />
              <Row k="Burst allowed" v="1.4× for 24h" />
              <Row k="Policy" v="purged at 60 days idle" />
            </div>
            <div className="mt-4 rounded-[10px] border border-amber/25 bg-amber/5 px-3 py-2.5 text-[11px] leading-snug text-amber">
              <Icon n="info" size={12} className="mr-1.5 inline" /> Scratch files older than 60 days are purged automatically.
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

function Row(props: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-quill">{props.k}</span>
      <span className="truncate font-mono text-steam">{props.v}</span>
    </div>
  )
}

/* keep TiB helper referenced for potential MiB/TiB display tuning */
void TiB
