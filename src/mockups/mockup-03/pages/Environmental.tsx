import { useMemo, useState } from 'react';
import { Panel, Icon, Btn, Gauge, Spark, Bar } from '../components/ui';
import {
  CLUSTER, RACKS, nodesInRack, tempClass, POWER_HIST, ALERTS, fmt, type T3Node,
} from '../data';

const SHOW_RACKS = 12;

export function EnvironmentalPage() {
  const [hover, setHover] = useState<T3Node | null>(null);
  const [rackSel, setRackSel] = useState<string | null>(null);
  const selNode = hover;
  const racks = useMemo(() => RACKS.slice(0, SHOW_RACKS), []);

  const rackDetail = useMemo(() => (rackSel ? nodesInRack(rackSel) : null), [rackSel]);

  const thermalAlerts = ALERTS.filter((a) => /thermal|cooling|cooler|fan|power/i.test(a.src + a.msg));

  function pick(n: T3Node) {
    setHover(n);
  }

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {[
          { k: 'AVG INLET TEMP', v: fmt.temp(CLUSTER.avgTemp), tone: 'ok' },
          { k: 'TOTAL POWER', v: `${CLUSTER.powerMW} MW`, tone: 'mag' },
          { k: 'PUE', v: CLUSTER.pue.toFixed(2), tone: 'vio' },
          { k: 'COOLING FLOOR', v: 'HOT-AISLE CONTAIN', tone: undefined },
        ].map((s) => (
          <div className="t3-stat" key={s.k}>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className={`t3-stat-v${s.tone ? ` ${s.tone}` : ''}`}>{s.v}</span>
                <span className="t3-stat-s">FACILITY SENSORS NOMINAL</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-mongrid">
        <Panel title="RACK TEMPERATURE HEATMAP · ROOM 1–3" icon="env" tone="grn" nopad>
          <div style={{ padding: 9 }}>
            <div className="t3-hmgrid">
              {racks.map((r) => {
                const ns = nodesInRack(r);
                const inrack = ns.filter((n) => tempClass(n.tempC, n.health) === 'critical').length;
                return (
                  <div className="t3-hmrack" key={r}>
                    <div
                      className={`t3-hmrackname${rackSel === r ? ' on' : ''}`}
                      onClick={() => setRackSel(rackSel === r ? null : r)}
                    >
                      {r}
                      {inrack > 0 && <span className="t3-sev CRIT" style={{ marginLeft: 4 }}>{inrack} CRIT</span>}
                    </div>
                    {ns.map((n) => {
                      const tc = tempClass(n.tempC, n.health);
                      return (
                        <div
                          key={n.id}
                          className={`t3-srv tp-${tc}`}
                          title={`${n.name} — ${n.tempC.toFixed(1)}°C · cpu ${n.cpuPct}% · ${n.powerW}W`}
                          onMouseEnter={() => setHover(n)}
                          onMouseLeave={() => setHover((h) => (h === n ? null : h))}
                          onClick={() => pick(n)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="t3-hmlegend">
              <span><span className="t3-srv tp-normal" style={{ display: 'inline-block', verticalAlign: 'middle', width: 10, height: 8 }} /> NORMAL &lt;34°</span>
              <span><span className="t3-srv tp-elevated" style={{ display: 'inline-block', verticalAlign: 'middle', width: 10, height: 8 }} /> ELEVATED 34–40°</span>
              <span><span className="t3-srv tp-high" style={{ display: 'inline-block', verticalAlign: 'middle', width: 10, height: 8 }} /> HIGH 40–46°</span>
              <span><span className="t3-srv tp-critical" style={{ display: 'inline-block', verticalAlign: 'middle', width: 10, height: 8 }} /> CRITICAL &gt;46°</span>
              <span><span className="t3-srv tp-offline" style={{ display: 'inline-block', verticalAlign: 'middle', width: 10, height: 8 }} /> OFFLINE</span>
            </div>
          </div>
        </Panel>

        <div className="t3-stack">
          <Panel title="FACILITY GAUGES" icon="env" tone="grn">
            <div className="t3-gaugegrid">
              <Gauge v={CLUSTER.avgTemp} max={50} color="var(--t3-green)" label="AVG INLET" unit="°C" />
              <Gauge v={CLUSTER.powerMW} max={2} color="var(--t3-teal)" label="TOTAL DRAW" unit="MW" />
              <Gauge v={CLUSTER.pue} max={2} color="var(--t3-purple)" label="PUE" unit="" />
              <Gauge v={88} max={100} color="var(--t3-green)" label="CDU ARRAY" unit="%" />
              <Gauge v={62} max={100} color="var(--t3-teal)" label="AVG FANS" unit="%" />
              <Gauge v={41} max={100} color="var(--t3-purple)" label="REL %RH" unit="%" />
            </div>
          </Panel>

          <Panel title="COOLING LOOP" icon="drop" tone="grn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="t3-utilrow"><span>COOLANT FLOW</span><Bar pct={78} tone="teal" /><span className="v">78 l/min</span></div>
              <div className="t3-utilrow"><span>SUPPLY TEMP</span><Bar pct={36} tone="grn" /><span className="v">18.2°C</span></div>
              <div className="t3-utilrow"><span>RETURN TEMP</span><Bar pct={52} tone="vio" /><span className="v">26.4°C</span></div>
              <div className="t3-utilrow"><span>CDU-1 PUMPS</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v t3-dot-ok">● DUAL ACTIVE</span></div></div>
              <div className="t3-utilrow"><span>CDU-2 PUMPS</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v t3-dot-ok">● DUAL ACTIVE</span></div></div>
              <div className="t3-utilrow"><span>FAN WALL F1–F4</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">62 / 64 / 58 / 61%</span></div></div>
            </div>
          </Panel>

          <Panel title="POWER CONSUMPTION · 24H" icon="power" tone="grn" nopad>
            <div style={{ padding: 8 }}>
              <Spark data={POWER_HIST.grid as unknown as number[]} color="#3af087" h={44} />
              <div className="t3-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
              <Spark data={POWER_HIST.cooling as unknown as number[]} color="#8b5cf6" h={30} />
              <div className="t3-axis"><span style={{ color: '#3af087' }}>■ IT LOAD</span><span /><span style={{ color: '#8b5cf6' }}>■ COOLING</span><span /><span /></div>
              <div style={{ fontSize: 8.5, color: 'var(--t3-ink3)', marginTop: 4, letterSpacing: 1 }}>
                IT {CLUSTER.powerMW} MW · COOLING 0.34 MW · FACILITY {fmt.pct(96.4)}
              </div>
            </div>
          </Panel>

          <Panel title="THERMAL ALERTS" icon="bell" tone="red" nopad>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {thermalAlerts.slice(0, 7).map((a, i) => (
                <div className="t3-alrow" key={i} style={{ gridTemplateColumns: '46px 44px 92px minmax(0,1fr)' }}>
                  <span className="at">{a.at.slice(0, 5)}</span>
                  <span><span className={`t3-sev ${a.sev}`}>{a.sev}</span></span>
                  <span className="src">{a.src}</span>
                  <span className="msg" title={a.msg}>{a.msg}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {selNode && (
          <div
            className="t3-modal"
            onMouseEnter={() => undefined}
            onMouseLeave={() => setHover(null)}
          >
            <div>
              <div className="t3-sec-t" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  <Icon n="cluster" s={11} /> {selNode.name} · THERMAL
                </span>
                <Btn small tone="gh" icon="x" onClick={() => setHover(null)} />
              </div>
              <div className="t3-mini">
                <Bar pct={Math.min(100, (selNode.tempC / 55) * 100)} tone={selNode.tempC > 46 ? 'red' : selNode.tempC > 40 ? 'mag' : 'grn'} />
                <div className="t3-utilrow"><span>INLET</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{selNode.tempC.toFixed(1)}°C</span></div></div>
                <div className="t3-utilrow"><span>CPU</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{selNode.cpuPct}%</span></div></div>
                <div className="t3-utilrow"><span>POWER</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{selNode.powerW} W</span></div></div>
                <div className="t3-utilrow"><span>HEALTH</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{selNode.health.toUpperCase()}</span></div></div>
                <div className="t3-utilrow"><span>RACK</span><div style={{ flex: 1, textAlign: 'right' }}><span className="v">{selNode.rack}</span></div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {rackDetail && (
        <Panel title={`RACK ${rackSel} · ${rackDetail.length} SERVERS`} icon="grid" tone="grn" nopad>
          <div style={{ padding: 9, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
            {rackDetail.slice(0, 48).map((n) => (
              <div key={n.id}>
                <div className="t3-cfgrow">
                  <span className="k" style={{ letterSpacing: 0.5 }}>{n.name}</span>
                  <span className="e">{n.tempC.toFixed(1)}°C · {n.cpuPct}% · {n.powerW}W</span>
                </div>
                <div style={{ height: 4 }}><Bar pct={n.cpuPct} tone={n.tempC > 46 ? 'red' : 'grn'} /></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

    </div>
  );
}
