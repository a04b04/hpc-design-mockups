import { useMemo, useState } from 'react'
import { Icon, Chip, Panel, PanelHead, Stat, SegTabs, StatusDot } from '../mockups/mockup-01/components/ui'
import { LiveChart, Donut, CellMeter, GpuArray, Bars } from '../mockups/mockup-01/components/charts/charts'
import { cs, SERIES_COLORS } from '../lib/format'
import { ALL_NODES, GPU_NODES, AGG_CPU, AGG_MEM, AGG_GPU, AGG_NET, AGG_IO, CLUSTER_AGGR, ALERTS, CLUSTER_CFG } from '../data/cluster-data'

type Win = '1h' | '6h' | '24h'
const SPAN: Record<Win, number> = { '1h': 36, '6h': 60, '24h': 72 }

export function MonitoringPage() {
  const [win, setWin] = useState<Win>('6h')
  const n = SPAN[win]

  const cpu = useMemo(() => AGG_CPU.slice(-n), [n])
  const mem = useMemo(() => AGG_MEM.slice(-n), [n])
  const gpu = useMemo(() => AGG_GPU.slice(-n), [n])
  const net = useMemo(() => AGG_NET.slice(-n), [n])
  const io = useMemo(() => AGG_IO.slice(-n), [n])

  const busyGpus = GPU_NODES.filter((g) => g.status === 'online')
  const gpuBusyCells = busyGpus.flatMap((g) => g.gpuUtils)

  const topCpu = useMemo(
    () => [...ALL_NODES].sort((a, b) => b.cpuLoad - a.cpuLoad).slice(0, 6),
    [],
  )
  const alertNodes = ALL_NODES.filter((nd) => nd.status !== 'online' || nd.cpuLoad > 92)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-frost">Monitoring</h1>
          <p className="mt-1 text-[12.5px] text-quill">Cluster-wide telemetry · 10s scrape · {CLUSTER_CFG.scheduler}</p>
        </div>
        <SegTabs
          tabs={[{ id: '1h', label: '1H' }, { id: '6h', label: '6H' }, { id: '24h', label: '24H' }]}
          active={win}
          onChange={setWin}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="CPU" value={`${CLUSTER_AGGR.cpu}%`} icon="cpu" color="var(--color-cyan)" progress={CLUSTER_AGGR.cpu} sub="mean across fleet" />
        <Stat label="Memory" value={`${CLUSTER_AGGR.mem}%`} icon="memory" color="var(--color-green)" progress={CLUSTER_AGGR.mem} sub="mean across fleet" />
        <Stat label="GPU" value={`${CLUSTER_AGGR.gpu}%`} icon="gpu" color="var(--color-accent-bright)" progress={CLUSTER_AGGR.gpu} sub="streaming multiprocessors" />
        <Stat label="Network" value={`${CLUSTER_AGGR.net}%`} icon="network" color="var(--color-amber)" progress={CLUSTER_AGGR.net} sub="interconnect / ethernet" />
      </div>

      <Panel className="anim-fade-up">
        <PanelHead
          title="Cluster utilisation"
          icon="activity"
          right={
            <div className="flex items-center gap-3 text-[10px]">
              <LegendDot c={SERIES_COLORS[0]} label="CPU" />
              <LegendDot c={SERIES_COLORS[1]} label="Memory" />
              <LegendDot c={SERIES_COLORS[2]} label="GPU" />
              <LegendDot c={SERIES_COLORS[3]} label="Net" />
            </div>
          }
        />
        <div className="mt-3">
          <LiveChart
            series={[
              { label: 'CPU', color: SERIES_COLORS[0], data: cpu },
              { label: 'Memory', color: SERIES_COLORS[1], data: mem },
              { label: 'GPU', color: SERIES_COLORS[2], data: gpu },
              { label: 'Network', color: SERIES_COLORS[3], data: net },
            ]}
            height={190}
            step={win === '1h' ? 60_000 : win === '6h' ? 10 * 60_000 : 30 * 60_000}
            yFmt={(v) => `${Math.round(v)}%`}
            yMax={100}
            yMin={0}
            legendNote={`span ${win} · frozen demo clock`}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel>
          <PanelHead title="Fleet at a glance" icon="pie" />
          <div className="mt-4 flex items-center justify-around">
            <Donut value={CLUSTER_AGGR.cpu} size={92} color="var(--color-cyan)">
              <div className="text-center">
                <div className="font-mono text-[15px] font-medium text-frost">{CLUSTER_AGGR.cpu}%</div>
                <div className="text-[9px] tracking-wide text-ghost uppercase">CPU</div>
              </div>
            </Donut>
            <Donut value={CLUSTER_AGGR.gpu} size={92} color="var(--color-accent-bright)">
              <div className="text-center">
                <div className="font-mono text-[15px] font-medium text-frost">{CLUSTER_AGGR.gpu}%</div>
                <div className="text-[9px] tracking-wide text-ghost uppercase">GPU</div>
              </div>
            </Donut>
          </div>
          <div className="mt-4 border-t border-edge pt-3 dark:border-dusk">
            <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.06em] text-quill uppercase">
              <span>Active scheduler events</span>
              <Chip className="font-mono">{ALERTS.length}</Chip>
            </div>
            <Bars data={io.map((v, i) => (v + (i % 7) * 2) % 100)} height={40} color="var(--color-cyan)" />
            <div className="mt-1 text-center font-mono text-[9px] text-ghost">I/O pressure · last {win}</div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="GPU array heat"
            icon="gpu"
            right={<Chip className="font-mono">{Math.round(gpuBusyCells.reduce((a, b) => a + b, 0) / Math.max(1, gpuBusyCells.length))}% mean</Chip>}
          />
          <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {busyGpus.slice(0, 12).map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <span className="w-[92px] shrink-0 truncate font-mono text-[10px] text-quill">{g.id.replace('helios-', '')}</span>
                <GpuArray utils={g.gpuUtils} cell={7} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Hottest nodes" icon="flame" right={<Chip className="font-mono">{alertNodes.length} flagged</Chip>} />
          <div className="mt-4 space-y-2.5">
            {topCpu.map((nd) => (
              <div key={nd.id} className="flex items-center gap-2.5">
                <StatusDot status={nd.status} size={6} />
                <span className="w-[104px] shrink-0 truncate font-mono text-[10.5px] text-steam">{nd.id.replace('helios-', '')}</span>
                <div className="min-w-0 flex-1">
                  <div className="h-[4px] overflow-hidden rounded-full bg-edge/70">
                    <div
                      className={cs('anim-grow-w h-full rounded-full', nd.cpuLoad > 90 ? 'bg-red' : nd.cpuLoad > 80 ? 'bg-amber' : 'bg-cyan')}
                      style={{ width: `${nd.cpuLoad}%` }}
                    />
                  </div>
                </div>
                <span className="w-9 text-right font-mono text-[10px] text-quill">{nd.cpuLoad}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead title="Core activity — login nodes" icon="circuit-board" right={<Chip className="font-mono">64 cores</Chip>} />
        <div className="mt-4 space-y-3">
          {ALL_NODES.filter((nd) => nd.kind === 'login').map((nd) => (
            <div key={nd.id}>
              <div className="mb-1.5 flex justify-between font-mono text-[10px]">
                <span className="text-steam">{nd.id}</span>
                <span className="text-quill">load {nd.cpuLoad}%</span>
              </div>
              <CellMeter data={nd.cpuSeries.slice(-64).map((v, i) => (v + ((i * 13) % 29)) % 100)} cell={16} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex items-start gap-2.5 rounded-[12px] border border-edge px-4 py-3 text-[11px] text-quill dark:border-dusk">
        <Icon n="info" size={13} className="mt-0.5 shrink-0 text-ghost" />
        Telemetry is frozen at the demo clock (2026-11-17 12:34 UTC). Charts replay pre-recorded series so the prototype stays deterministic.
      </div>
    </div>
  )
}

function LegendDot(props: { c: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-quill">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: props.c }} />
      {props.label}
    </span>
  )
}
