import { useMemo } from 'react';
import { Panel, Icon, Gauge, Spark, Bar } from '../components/ui';
import { NODES, PARTITIONS, SPARKS, STATE_COUNTS, CORES_TOTAL, CORES_USED, CLUSTER, fmt } from '../data';

export function MonitoringPage() {
  const stats = useMemo(() => {
    const cpu = NODES.reduce((s, n) => s + n.cpuPct, 0) / NODES.length;
    const mem = NODES.reduce((s, n) => s + n.memPct, 0) / NODES.length;
    const gpus = NODES.reduce((s, n) => s + n.gpus, 0);
    const gpusUsed = NODES.reduce((s, n) => s + n.gpusUsed, 0);
    const power = NODES.reduce((s, n) => s + n.powerW, 0) / 1e9;
    const temp = NODES.reduce((s, n) => s + n.tempC, 0) / NODES.length;
    return { cpu, mem, gpus, gpusUsed, power, temp };
  }, []);

  const tiles = [
    { k: 'CPU LOAD', v: fmt.pct(CLUSTER.cpuLoad), tone: 'grn' },
    { k: 'MEMORY', v: fmt.pct(stats.mem), tone: 'teal' },
    { k: 'GPU OCCUPANCY', v: fmt.pct((stats.gpusUsed / Math.max(1, stats.gpus)) * 100), tone: 'vio' },
    { k: 'AGGREGATE POWER', v: `${stats.power.toFixed(2)} MW`, tone: 'mag' },
  ];

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {tiles.map((s) => (
          <div className="t3-stat" key={s.k}>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className={`t3-stat-v ${s.tone}`}>{s.v}</span>
                <span className="t3-stat-s">TITAN-02 LIVE TELEMETRY</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-mongrid">
        <Panel title="24H UTILISATION HISTORY" icon="chart" tone="grn" nopad>
          <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(
              [
                ['CPU CORE LOAD', SPARKS.cpu, '#3af087'],
                ['MEMORY', SPARKS.mem, '#22d3ee'],
                ['GPU OCCUPANCY', SPARKS.gpu, '#8b5cf6'],
              ] as const
            ).map(([k, d, c]) => (
              <div className="t3-sparkrow" key={k}>
                <span className="k">{k}</span>
                <div>
                  <Spark data={d as unknown as number[]} color={c} h={52} />
                  <div className="t3-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="t3-stack">
          <Panel title="CLUSTER GAUGES" icon="cpu" tone="grn">
            <div className="t3-gaugegrid">
              <Gauge v={CLUSTER.cpuLoad} max={100} color="var(--t3-green)" label="CPU · 64C/NODE AVG" unit="%" />
              <Gauge v={stats.mem} max={100} color="var(--t3-teal)" label="MEM · DDR5 POOL" unit="%" />
              <Gauge v={(stats.gpusUsed / Math.max(1, stats.gpus)) * 100} max={100} color="var(--t3-green)" label="GPU · A100 SXM" unit="%" />
              <Gauge v={stats.temp} max={50} color="var(--t3-amber)" label="INLET AVG" unit="°C" />
              <Gauge v={56} max={100} color="var(--t3-teal)" label="NET · 200G IB" unit="%" />
              <Gauge v={74} max={100} color="var(--t3-magenta)" label="FS · LUSTRE" unit="%" />
            </div>
          </Panel>

          <Panel title="PARTITION UTILISATION" icon="grid" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PARTITIONS.map((p) => {
                const pn = NODES.filter((n) => n.partition === p.code);
                const used = pn.reduce((s, n) => s + n.coresUsed, 0);
                const tot = pn.reduce((s, n) => s + n.cores, 0);
                return (
                  <div className="t3-utilrow" key={p.code}>
                    <span style={{ letterSpacing: 1 }}>{p.code}</span>
                    <Bar pct={(used / Math.max(1, tot)) * 100} tone={p.kind === 'gpu' ? 'vio' : p.kind === 'himem' ? 'teal' : 'grn'} />
                    <span className="v">{used}/{tot}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="INTERCONNECT &amp; STORAGE" icon="net" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="t3-utilrow"><span className="iconw"><Icon n="net" s={11} /></span><span>INFINIBAND HDR</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">56.4 TB/s</span></div></div>
              <div className="t3-utilrow"><span className="iconw"><Icon n="net" s={11} /></span><span>ETH MANAGMENT</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">4.2 GB/s</span></div></div>
              <div className="t3-utilrow"><span className="iconw"><Icon n="disk" s={11} /></span><span>LUSTRE CAPACITY</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">38 PB / 74 PB</span></div></div>
              <div className="t3-utilrow"><span className="iconw"><Icon n="power" s={11} /></span><span>ALLOCATED CORES</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{fmt.int(CORES_USED)} / {fmt.int(CORES_TOTAL)}</span></div></div>
            </div>
          </Panel>
        </div>

        <div className="t3-stack">
          <Panel title="NODE STATE MIX" icon="cpu" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(Object.keys(STATE_COUNTS) as Array<keyof typeof STATE_COUNTS>).map((k) => (
                <div className="t3-utilrow" key={k} style={{ gridTemplateColumns: '84px minmax(0,1fr) 58px' }}>
                  <span style={{ letterSpacing: 1 }}>{k}</span>
                  <Bar pct={(STATE_COUNTS[k] / 8192) * 100} tone={k === 'IDLE' ? 'grn' : k === 'ALLOCATED' ? 'teal' : k === 'MIXED' ? 'vio' : k === 'DRAINING' ? 'amb' : 'red'} />
                  <span className="v">{fmt.int(STATE_COUNTS[k])}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="TOP CONSUMERS" icon="memory" tone="grn" nopad>
            <div className="t3-body" style={{ gap: 0 }}>
              {NODES.filter((n) => n.state === 'ALLOCATED')
                .sort((a, b) => b.cpuPct - a.cpuPct)
                .slice(0, 7)
                .map((n) => (
                  <div className="t3-utilrow" key={n.id} style={{ height: 25 }}>
                    <span style={{ fontFamily: 'var(--t3-mono)', letterSpacing: 0.5 }}>{n.name}</span>
                    <Bar pct={n.cpuPct} tone="grn" />
                    <span className="v">{n.cpuPct}%</span>
                  </div>
                ))}
            </div>
          </Panel>

          <Panel title="TELEMETRY FEED" icon="waves" tone="grn" nopad>
            <div className="t3-log">
              {[
                ['INFO', 'collectd flush: 8,192 node samples (2.1s)'],
                ['INFO', 'gpu telemetry: 8,192 A100 sensors nominal'],
                ['WARN', 'host titan-std-1187 clock skew 3.2ms'],
                ['INFO', 'ib switch 12/16 re-normalised'],
                ['ERROR', 'ipmi timeout titan-gpu-0409 (retry 2/5)'],
                ['INFO', 'power telemetry: PDU-A 96%, PDU-B 91%'],
              ].map(([tag, msg], i) => (
                <div className={`line ${tag}`} key={i}>
                  <span className="t">{String(14 - i * 2).padStart(2, '0')}:12:0{i}</span>
                  <span className="msg">{msg}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
