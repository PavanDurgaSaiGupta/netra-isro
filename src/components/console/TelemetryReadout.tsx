import { useEffect, useRef, useState } from 'react'
import { useSatellites } from '../../context/SatelliteContext'
import OdometerNumber from '../shell/OdometerNumber'

type VelocityUnit = 'KM/S' | 'KM/H' | 'MPH'
type AltitudeUnit = 'KM' | 'MI' | 'NM'
type InclinationUnit = 'DEG' | 'RAD'
type SignalUnit = 'DBM' | 'QUAL'

export default function TelemetryReadout() {
  const { selectedSat, satellites } = useSatellites()

  // Interactive unit toggles
  const [velUnit, setVelUnit] = useState<VelocityUnit>('KM/S')
  const [altUnit, setAltUnit] = useState<AltitudeUnit>('KM')
  const [incUnit, setIncUnit] = useState<InclinationUnit>('DEG')
  const [sigUnit, setSigUnit] = useState<SignalUnit>('DBM')

  // Base telemetry targets
  const baseVelocity = selectedSat ? selectedSat.speedKmS : 7.66
  const baseAltitude = selectedSat ? selectedSat.altKm : 504.2
  const baseInclination = selectedSat ? selectedSat.inclinationDeg : 97.46
  const baseSignal = selectedSat ? -84 : -88

  // Live targets handed to the four OdometerNumbers. React state updates land only on
  // satellite changes and the 2.4s heartbeat — the per-frame roll happens inside
  // OdometerNumber via ref writes (no setState per frame).
  const [live, setLive] = useState({
    velocity: baseVelocity,
    altitude: baseAltitude,
    inclination: baseInclination,
    signal: baseSignal,
  })

  // Latest bases without restarting the jitter interval on every tick
  const baseRef = useRef({ baseVelocity, baseAltitude, baseInclination, baseSignal })
  useEffect(() => {
    baseRef.current = { baseVelocity, baseAltitude, baseInclination, baseSignal }
  })

  // Roll to the selected satellite's bases
  useEffect(() => {
    setLive({
      velocity: baseVelocity,
      altitude: baseAltitude,
      inclination: baseInclination,
      signal: baseSignal,
    })
  }, [baseVelocity, baseAltitude, baseInclination, baseSignal])

  // Realistic micro sensor fluctuation every 2.4 seconds — reads the live bases through a
  // ref so the interval survives the per-tick dep churn, and hands the jittered targets
  // to the odometers (inclination is base-stable, as before).
  useEffect(() => {
    const timer = setInterval(() => {
      const { baseVelocity, baseAltitude, baseSignal } = baseRef.current
      const vDelta = (Math.random() - 0.5) * 0.04
      const aDelta = (Math.random() - 0.5) * 0.8
      const sDelta = Math.round((Math.random() - 0.5) * 3)

      setLive((prev) => ({
        ...prev,
        velocity: Number((baseVelocity + vDelta).toFixed(2)),
        altitude: Number((baseAltitude + aDelta).toFixed(1)),
        signal: Math.round(baseSignal + sDelta),
      }))
    }, 2400)

    return () => clearInterval(timer)
  }, [])

  // Unit conversions — passed as formatters; OdometerNumber re-maps the SAME live value
  // instantly when these change (unit toggles don't restart a roll).
  const fmtVelocity = (n: number) => {
    if (velUnit === 'KM/H') return (n * 3600).toFixed(0)
    if (velUnit === 'MPH') return (n * 2236.94).toFixed(0)
    return n.toFixed(2)
  }

  const fmtAltitude = (n: number) => {
    if (altUnit === 'MI') return (n * 0.621371).toFixed(1)
    if (altUnit === 'NM') return (n * 0.539957).toFixed(1)
    return n.toFixed(1)
  }

  const fmtInclination = (n: number) => {
    if (incUnit === 'RAD') return ((n * Math.PI) / 180).toFixed(3)
    return n.toFixed(2)
  }

  const fmtSignal = (n: number) => {
    if (sigUnit === 'QUAL') {
      const q = Math.max(20, Math.min(99, Math.round((n + 120) * 1.8)))
      return `${q}%`
    }
    return String(Math.round(n))
  }

  return (
    <div className="telemetry-readout" aria-label="High precision orbital kinematics readout">
      <div className="telemetry-readout__head hud-text">
        <div className="telemetry-readout__target-wrap">
          <span className="telemetry-readout__pulse-dot" />
          <span className="telemetry-readout__target">
            {selectedSat ? selectedSat.name : 'FLEET AGGREGATE SENSORS'}
          </span>
        </div>
        <span className="telemetry-readout__tag hud__dim">
          {selectedSat ? `NORAD ${selectedSat.noradId}` : `${satellites.length} TARGETS`}
        </span>
      </div>

      <div className="telemetry-readout__grid">
        {/* Velocity Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            setVelUnit((u) => (u === 'KM/S' ? 'KM/H' : u === 'KM/H' ? 'MPH' : 'KM/S'))
          }}
          title="Click to toggle velocity units (KM/S ↔ KM/H ↔ MPH)"
        >
          <span className="telemetry-readout__label hud-text">
            ORBITAL VELOCITY <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <OdometerNumber
              className="telemetry-readout__num"
              value={live.velocity}
              format={fmtVelocity}
            />
            <span className="telemetry-readout__unit">{velUnit}</span>
          </div>
        </div>

        {/* Altitude Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            setAltUnit((u) => (u === 'KM' ? 'MI' : u === 'MI' ? 'NM' : 'KM'))
          }}
          title="Click to toggle altitude units (KM ↔ MI ↔ NM)"
        >
          <span className="telemetry-readout__label hud-text">
            ALTITUDE (APOGEE) <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <OdometerNumber
              className="telemetry-readout__num"
              value={live.altitude}
              format={fmtAltitude}
            />
            <span className="telemetry-readout__unit">{altUnit}</span>
          </div>
        </div>

        {/* Inclination Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            setIncUnit((u) => (u === 'DEG' ? 'RAD' : 'DEG'))
          }}
          title="Click to toggle angle units (DEG ↔ RAD)"
        >
          <span className="telemetry-readout__label hud-text">
            INCLINATION <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <OdometerNumber
              className="telemetry-readout__num"
              value={live.inclination}
              format={fmtInclination}
            />
            <span className="telemetry-readout__unit">{incUnit}</span>
          </div>
        </div>

        {/* Signal Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            setSigUnit((u) => (u === 'DBM' ? 'QUAL' : 'DBM'))
          }}
          title="Click to toggle signal units (DBM ↔ QUALITY %)"
        >
          <span className="telemetry-readout__label hud-text">
            SIGNAL STRENGTH <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <OdometerNumber
              className="telemetry-readout__num"
              value={live.signal}
              format={fmtSignal}
            />
            <span className="telemetry-readout__unit">{sigUnit}</span>
          </div>
        </div>
      </div>

      <div className="telemetry-readout__foot hud-text hud__faint">
        <span>SGP4 KINEMATICS ENGINE</span>
        <span style={{ color: 'var(--accent-cyan)' }}>S-BAND CARRIER: LOCKED</span>
      </div>
    </div>
  )
}
