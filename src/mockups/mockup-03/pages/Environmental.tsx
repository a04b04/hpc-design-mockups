import { useMemo, useState } from 'react';
import { Panel, Icon, Btn, Spark, Gauge } from '../components/ui';
import {
  CLUSTER, RACKS, POWER_HIST, ALERTS, fmt,
} from '../data';

const SHOW_RACKS = 11;

/* deterministic per-rack sensor bars — mostly green with a few hot spots */
function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rackBars(rack: string): number[] {
  const r = rand(Number(rack.slice(1)) * 7919 + 13);
  const count = 16 + Math.floor(r() * 24);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    if (r() > 0.94) out.push(44 + r() * 9);
    else if (r() > 0.87) out.push(35 + r() * 5);
    else out.push(25 + r() * 9);
  }
  return out;
}

/* deterministic sensor id + reading for the legend */
function sensorName(rack: string, slot: number): string {
  const r = Number(rack.slice(1));
  return `13 temp ${((r * 7 + slot * 3) % 13) + 1}`;
}

type TClass = 'normal' | 'elevated' | 'high' | 'critical';
function tcls(t: number): TClass {
  if (t > 46) return 'critical';
  if (t > 40) return 'high';
  if (t > 34) return 'elevated';
  return 'normal';
}

export function EnvironmentalPage() {
  const [rackSel, setRackSel] = useState<string | null>(null);
  const [series, setSeries] = useState({ grid: true, cooling: true, pdu: false, pue: false });
  const racks = useMemo(() => RACKS.slice(0, SHOW_RACKS), []);
  const grid = useMemo(
    () => racks.map((rk) => ({ rack: rk, bars: rackBars(rk) })),
    [racks],
  );
  const rackDetail = rackSel
    ? grid.find((c) => c.rack === rackSel)?.bars ?? null
    : null;

  const thermalAlerts = ALERTS.filter((a) => /thermal|cooling|cooler|fan|power/i.test(a.src + a.msg));

  /* legend rows — one reading per rack slot, 11 sensors to match the columns */
  const legendRows = useMemo(
    () => grid.map(({ rack, bars }) => ({ name: sensorName(rack, 0), temp: bars[Math.floor(bars.length / 2)], cls: tcls(bars[Math.floor(bars.length / 2)]) })),
    [grid],
  );

  function toggle(s: 'grid' | 'cooling' | 'pdu' | 'pue') {
    setSeries((cur) => ({ ...cur, [s]: !cur[s] }));
  }

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {[
          { i: 'cluster', tone: 'vio', k: 'TOTAL NODES', v: CLUSTER.totalNodes.toLocaleString('en-US') },
          { i: 'env', tone: 'ok', k: 'AVG TEMP', v: fmt.temp(CLUSTER.avgTemp) },
          { i: 'power', tone: 'mag', k: 'POWER DRAW', v: `${CLUSTER.powerMW} MW` },
          { i: 'shield', tone: 'ok2', k: 'PUE', v: `${CLUSTER.pue.toFixed(2)} [OPTIMAL]` },
        ].map((s) => (
          <div className="t3-stat" key={s.k}>
            <div className={`t3-stat-ico ${s.tone === 'ok2' ? 'vio' : s.tone}`}>
              <Icon n={s.i} s={12} />
            </div>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className="t3-stat-v" style={{ color: s.tone === 'mag' ? 'var(--t3-magenta)' : s.tone === 'ok' ? 'var(--t3-green)' : 'var(--t3-ink)' }}>{s.v}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-env2col">
        <div className="t3-stack">
          <Panel
            title="GRID TEMPERATURE HEATMAP"
            icon="env"
            tone="grn"
            nopad
            className="t3-panel--hero"
            right={<Btn small tone="gh" icon="search" title="Search sensors" />}
          >
            <div style={{ padding: 9 }}>
              <div className="t3-rackwrap" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: 6 }}>
                {grid.map(({ rack, bars }) => {
                  const crit = bars.filter((t) => tcls(t) === 'critical').length;
                  return (
                    <div
                      className={`t3-rack${rackSel === rack ? ' sel' : ''}`}
                      key={rack}
                      onClick={() => setRackSel(rackSel === rack ? null : rack)}
                    >
                      <div className="t3-rlbl" title={rack}>
                        {rack}
                        {crit > 0 && <span className="t3-hmcrit">{crit} CRIT</span>}
                      </div>
                      {bars.map((t, idx) => {
                        const tc = tcls(t);
                        return (
                          <div
                            key={idx}
                            className={`t3-srv tp-${tc}`}
                            title={`${rack} · sensor ${sensorName(rack, idx)} — ${t.toFixed(1)}°C`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="t3-hmsensors">
                {legendRows.map((row) => (
                  <span key={row.name} title={`SENSOR READ (${row.cls.toUpperCase()})`}>
                    <i className={`tp-${row.cls}`} style={{ width: 10, height: 8, borderRadius: 2, display: 'inline-block' }} />
                    <span className="nm">{row.name}</span>
                    <span className="tv">{row.temp.toFixed(2)}°C</span>
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="POWER CONSUMPTION HISTORY" icon="power" tone="grn" nopad>
            <div style={{ padding: '8px 10px 10px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 170px', gap: 12 }}>
              <div>
                {series.grid && <Spark data={POWER_HIST.grid as unknown as number[]} color="var(--t3-green)" h={78} fillArea />}
                {series.cooling && <Spark data={POWER_HIST.cooling as unknown as number[]} color="var(--t3-magenta)" h={54} fillArea={false} />}
                {!series.grid && !series.cooling && (
                  <div style={{ height: 74, display: 'grid', placeItems: 'center', color: 'var(--t3-ink3)', fontSize: 12 }}>
                    NO SERIES SELECTED
                  </div>
                )}
                <div className="t3-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
              </div>
              <div className="t3-phhistkeys">
                {[
                  { k: 'Grid Power MW', s: 'grid' as const },
                  { k: 'Cooling Power MW', s: 'cooling' as const },
                  { k: 'Cooling Power', s: 'pdu' as const },
                  { k: 'Cooling Praw', s: 'pue' as const },
                  { k: 'PUE Metrics', s: 'pue' as const },
                ].map((row) => (
                  <span key={row.k} className={`tglrow${series[row.s] ? ' on' : ''}`} onClick={() => toggle(row.s)}>
                    {row.k}
                    <i className={`t3-sw${series[row.s] ? ' checked' : ''}`} />
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="t3-stack">
          <Panel title="PDU & ENVIRONMENTAL MONITOR" icon="power" tone="grn">
            <div className="t3-phgaugegrid">
              <Gauge v={89.2} max={100} color="var(--t3-green)" label="Load" unit="%" />
              <Gauge v={CLUSTER.avgTemp} max={50} color="var(--t3-green)" label="Capacity" unit="°C" />
              <Gauge v={CLUSTER.powerMW} max={2} color="var(--t3-vio2)" label="Draw" unit="MW" />
              <Gauge v={82.5} max={100} color="var(--t3-green)" label="Load" unit="%" />
              <Gauge v={32.4} max={50} color="var(--t3-vio2)" label="Capacity" unit="°C" />
              <Gauge v={38} max={100} color="var(--t3-purple)" label="Draw" unit="%" />
            </div>
            <div className="t3-minirows">
              <div><span className="k">Fan Speed:</span><span className="v t3-val-ok">82.5%</span></div>
              <div><span className="k">Coolant:</span><span className="v t3-val-cy">142 L/m</span></div>
              <div><span className="k">Humidity:</span><span className="v t3-val-cy">38%</span></div>
              <div><span className="k">Fan Speed:</span><span className="v t3-val-ok">82.5%</span></div>
              <div><span className="k">Coolant:</span><span className="v t3-val-cy">142 L/m</span></div>
              <div><span className="k">Humidity:</span><span className="v t3-val-cy">38%</span></div>
            </div>
          </Panel>

          <Panel title="THERMAL ALERTS & EVENTS" icon="bell" tone="red" nopad>
            <div className="t3-tlog">
              {thermalAlerts.slice(0, 9).map((a, i) => (
                <div className="t3-logline" key={i}>
                  <span className={`tag ${a.sev}`}>[{a.sev}]</span>
                  <span className="msg" title={a.msg}>{a.msg}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {rackSel && rackDetail && (
        <Panel title={`RACK ${rackSel.toUpperCase()} · ${rackDetail.length} SENSORS`} icon="grid" tone="grn" nopad>
          <div style={{ padding: 9, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px 14px' }}>
            {rackDetail.map((t, idx) => (
              <div key={idx} className="t3-ckrow">
                <span className="nm">{sensorName(rackSel, idx)}</span>
                <span className={`e tp-t_${tcls(t)}`}>{t.toFixed(1)}°C</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

    </div>
  );
}
