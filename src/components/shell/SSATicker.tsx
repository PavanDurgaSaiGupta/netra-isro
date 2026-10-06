import { useSatellites } from '../../context/SatelliteContext'

/**
 * Orbit band — the SSA ticker re-imagined as a full-width marquee instrument.
 * One leading live-dot (bound to the real uplink status) and a scrolling track
 * whose content is duplicated for a seamless loop; the duplicate is aria-hidden.
 * Marquee scroll + pause-on-hover live in CSS (`.orbit-band__track`).
 */

const ORBIT_BAND_ITEMS = [
  'ISRO DSSAM SSA STATUS: NOMINAL',
  'SOLAR FLUX INDEX (F10.7): 146 SFU',
  'GEOMAGNETIC AP-INDEX: 4 (QUIET FIELD)',
  'CONJUNCTION SCREENINGS EXECUTED: 1,482',
  'ORBIT DISPOSAL PASSIVATION RULE: 100% COMPLIANT',
  'SPACE-TRACK.ORG VERIFIED FRAGMENTS: 72,419 OBJECTS (>10CM)',
  'CELESTRAK EPHEMERIS SYNC: REAL-TIME ONLINE',
]

export default function SSATicker() {
  const { apiStatus } = useSatellites()
  const items = [...ORBIT_BAND_ITEMS, ...ORBIT_BAND_ITEMS]

  return (
    <div className="orbit-band" role="region" aria-label="Orbit environment live status">
      <span className="orbit-band__dot" data-status={apiStatus} aria-hidden="true" />
      <div className="orbit-band__track">
        {items.map((msg, i) => {
          const isDuplicate = i >= ORBIT_BAND_ITEMS.length
          return (
            <span
              key={`${msg}-${i}`}
              className="orbit-band__item hud-text"
              aria-hidden={isDuplicate || undefined}
            >
              {msg}
              <span className="orbit-band__sep" aria-hidden="true">
                ·
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
