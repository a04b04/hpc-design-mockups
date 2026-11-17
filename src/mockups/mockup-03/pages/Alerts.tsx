import { useState } from 'react';
import { Panel, Btn, emitToast } from '../components/ui';
import { ALERTS } from '../data';

const SEVS = ['ALL', 'CRIT', 'ALERT', 'WARN', 'INFO'];

export function AlertsPage() {
  const [sev, setSev] = useState('ALL');
  const [onlyUn, setOnlyUn] = useState(false);
  const [acked, setAcked] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    ALERTS.forEach((a, i) => (m[i] = a.ack));
    return m;
  });

  const rows = ALERTS.map((a, i) => ({ ...a, idx: i, acked: acked[i] })).filter(
    (a) => (sev === 'ALL' || a.sev === sev) && (!onlyUn || !a.acked),
  );

  function ack(a: (typeof rows)[number]) {
    if (a.acked) {
      emitToast('alert already acknowledged', 'ok');
      return;
    }
    setAcked((m) => ({ ...m, [a.idx]: true }));
    emitToast('alert acknowledged — simulated', 'ok');
  }

  function ackAll() {
    const m: Record<number, boolean> = {};
    ALERTS.forEach((_, i) => (m[i] = true));
    setAcked(m);
    emitToast('all alerts acknowledged — simulated', 'ok');
  }

  return (
    <div className="t3-col">
      <div className="t3-stats">
        {[
          { k: 'OPEN ALERTS', v: String(ALERTS.filter((_, i) => !acked[i]).length), tone: 'red' },
          { k: 'CRITICAL', v: String(ALERTS.filter((a, i) => a.sev === 'CRIT' && !acked[i]).length), tone: 'red' },
          { k: 'WARNINGS', v: String(ALERTS.filter((a, i) => a.sev === 'WARN' && !acked[i]).length), tone: 'amb' },
          { k: 'ACKNOWLEDGED', v: String(ALERTS.filter((_, i) => acked[i]).length), tone: 'grn' },
        ].map((s) => (
          <div className="t3-stat" key={s.k}>
            <div>
              <div className="t3-stat-k">{s.k}</div>
              <div className="t3-stat-v-row">
                <span className={`t3-stat-v ${s.tone}`}>{s.v}</span>
                <span className="t3-stat-s">TITAN-02 ALERT BUS</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="t3-grid-matrix">
        <Panel
          title="ALERT STREAM"
          icon="bell"
          tone="grn"
          right={
            <div className="t3-filterrow" style={{ gap: 5 }}>
              <select className="t3-inp" value={sev} onChange={(e) => setSev(e.target.value)} style={{ width: 96 }}>
                {SEVS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Btn small active={onlyUn} onClick={() => setOnlyUn((v) => !v)}>UNACKED ONLY</Btn>
              <Btn small tone="grn" onClick={ackAll}>ACK ALL</Btn>
            </div>
          }
          nopad
        >
          <div className="t3-body" style={{ gap: 0 }}>
            {rows.map((a) => (
              <div className={`t3-alrow${a.acked ? ' ack' : ' un'}`} key={a.idx} style={{ gridTemplateColumns: '56px 44px 110px minmax(0,1fr) 90px' }}>
                <span className="at">{a.at}</span>
                <span><span className={`t3-sev ${a.sev}`}>{a.sev}</span></span>
                <span className="src">{a.src}</span>
                <span className="msg" title={a.msg}>{a.msg}</span>
                <span>
                  {a.acked ? (
                    <span className="t3-st IDLE" style={{ fontSize: 8 }}>ACK</span>
                  ) : (
                    <Btn small onClick={() => ack(a)}>ACK</Btn>
                  )}
                </span>
              </div>
            ))}
            {rows.length === 0 && <div className="t3-empty">NO ALERTS MATCH THE FILTER</div>}
          </div>
        </Panel>

        <aside className="t3-stack" style={{ gap: 8 }}>
          <Panel title="SEVERITY MAP" icon="ok" tone="grn">
            {SEVS.filter((s) => s !== 'ALL').map((s) => (
              <div className="t3-utilrow" key={s}>
                <span><span className={`t3-sev ${s}`}>{s}</span></span>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <span className="v">{ALERTS.filter((a, i) => a.sev === s && !acked[i]).length} OPEN</span>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="ESCALATION POLICY" icon="shield" tone="grn">
            <div className="t3-cfgrow"><span className="k">CRIT → PAGER</span><span className="e">immediate, ops rotation A</span></div>
            <div className="t3-cfgrow"><span className="k">ALERT → SLURM OPS</span><span className="e">5 min, auto-ticket</span></div>
            <div className="t3-cfgrow"><span className="k">WARN → BOARD</span><span className="e">digest hourly</span></div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
