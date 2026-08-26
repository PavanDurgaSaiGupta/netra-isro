export default function SSATicker() {
  const alerts = [
    'ISRO DSSAM SSA STATUS: NOMINAL',
    'SOLAR FLUX INDEX (F10.7): 146 SFU',
    'GEOMAGNETIC AP-INDEX: 4 (QUIET FIELD)',
    'CONJUNCTION SCREENINGS EXECUTED: 1,482',
    'ORBIT DISPOSAL PASSIVATION RULE: 100% COMPLIANT',
    'SPACE-TRACK.ORG VERIFIED FRAGMENTS: 72,419 OBJECTS (>10CM)',
    'CELESTRAK EPHEMERIS SYNC: REAL-TIME ONLINE',
  ]

  return (
    <div className="ssa-ticker hud-text" aria-label="Space situational awareness telemetry ticker">
      <div className="ssa-ticker__label">
        <span className="ssa-ticker__dot" />
        <span>ISRO-SSA ALERT FEED:</span>
      </div>

      <div className="ssa-ticker__track">
        <div className="ssa-ticker__content">
          {alerts.map((msg, i) => (
            <span key={i} className="ssa-ticker__item">
              {msg} <span className="ssa-ticker__sep">&bull;</span>
            </span>
          ))}
          {alerts.map((msg, i) => (
            <span key={`dup-${i}`} className="ssa-ticker__item">
              {msg} <span className="ssa-ticker__sep">&bull;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
