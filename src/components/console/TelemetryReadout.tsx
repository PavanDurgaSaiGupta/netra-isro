import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { useSatellites } from '../../context/SatelliteContext'
import { playBlip } from '../../utils/audio'

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

  // Display states
  const [displayValues, setDisplayValues] = useState({
    velocity: baseVelocity,
    altitude: baseAltitude,
    inclination: baseInclination,
    signal: baseSignal,
  })

  // Proxy object for anime.js smooth interpolation
  const proxyRef = useRef({
    velocity: baseVelocity,
    altitude: baseAltitude,
    inclination: baseInclination,
    signal: baseSignal,
  })

  // Smooth animation when selected satellite changes
  useEffect(() => {
    animate(proxyRef.current, {
      velocity: baseVelocity,
      altitude: baseAltitude,
      inclination: baseInclination,
      signal: baseSignal,
      duration: 650,
      ease: 'outQuad',
      onUpdate: () => {
        setDisplayValues({
          velocity: proxyRef.current.velocity,
          altitude: proxyRef.current.altitude,
          inclination: proxyRef.current.inclination,
          signal: proxyRef.current.signal,
        })
      },
    })
  }, [baseVelocity, baseAltitude, baseInclination, baseSignal])

  // Realistic micro sensor fluctuation every 2.4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const vDelta = (Math.random() - 0.5) * 0.04
      const aDelta = (Math.random() - 0.5) * 0.8
      const sDelta = Math.round((Math.random() - 0.5) * 3)

      const targetV = Number((baseVelocity + vDelta).toFixed(2))
      const targetA = Number((baseAltitude + aDelta).toFixed(1))
      const targetS = Math.round(baseSignal + sDelta)

      animate(proxyRef.current, {
        velocity: targetV,
        altitude: targetA,
        signal: targetS,
        duration: 900,
        ease: 'outQuad',
        onUpdate: () => {
          setDisplayValues((prev) => ({
            ...prev,
            velocity: proxyRef.current.velocity,
            altitude: proxyRef.current.altitude,
            signal: proxyRef.current.signal,
          }))
        },
      })
    }, 2400)

    return () => clearInterval(timer)
  }, [baseVelocity, baseAltitude, baseSignal])

  // Unit conversions
  const formattedVelocity = () => {
    if (velUnit === 'KM/H') return (displayValues.velocity * 3600).toFixed(0)
    if (velUnit === 'MPH') return (displayValues.velocity * 2236.94).toFixed(0)
    return displayValues.velocity.toFixed(2)
  }

  const formattedAltitude = () => {
    if (altUnit === 'MI') return (displayValues.altitude * 0.621371).toFixed(1)
    if (altUnit === 'NM') return (displayValues.altitude * 0.539957).toFixed(1)
    return displayValues.altitude.toFixed(1)
  }

  const formattedInclination = () => {
    if (incUnit === 'RAD') return ((displayValues.inclination * Math.PI) / 180).toFixed(3)
    return displayValues.inclination.toFixed(2)
  }

  const formattedSignal = () => {
    if (sigUnit === 'QUAL') {
      const q = Math.max(20, Math.min(99, Math.round((displayValues.signal + 120) * 1.8)))
      return `${q}%`
    }
    return String(Math.round(displayValues.signal))
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
            playBlip(1200, 0.02)
            setVelUnit((u) => (u === 'KM/S' ? 'KM/H' : u === 'KM/H' ? 'MPH' : 'KM/S'))
          }}
          title="Click to toggle velocity units (KM/S ↔ KM/H ↔ MPH)"
        >
          <span className="telemetry-readout__label hud-text">
            ORBITAL VELOCITY <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <span className="telemetry-readout__num">{formattedVelocity()}</span>
            <span className="telemetry-readout__unit">{velUnit}</span>
          </div>
        </div>

        {/* Altitude Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            playBlip(1200, 0.02)
            setAltUnit((u) => (u === 'KM' ? 'MI' : u === 'MI' ? 'NM' : 'KM'))
          }}
          title="Click to toggle altitude units (KM ↔ MI ↔ NM)"
        >
          <span className="telemetry-readout__label hud-text">
            ALTITUDE (APOGEE) <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <span className="telemetry-readout__num">{formattedAltitude()}</span>
            <span className="telemetry-readout__unit">{altUnit}</span>
          </div>
        </div>

        {/* Inclination Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            playBlip(1200, 0.02)
            setIncUnit((u) => (u === 'DEG' ? 'RAD' : 'DEG'))
          }}
          title="Click to toggle angle units (DEG ↔ RAD)"
        >
          <span className="telemetry-readout__label hud-text">
            INCLINATION <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <span className="telemetry-readout__num">{formattedInclination()}</span>
            <span className="telemetry-readout__unit">{incUnit}</span>
          </div>
        </div>

        {/* Signal Item (Clickable Unit Toggle) */}
        <div
          className="telemetry-readout__item telemetry-readout__item--clickable"
          onClick={() => {
            playBlip(1200, 0.02)
            setSigUnit((u) => (u === 'DBM' ? 'QUAL' : 'DBM'))
          }}
          title="Click to toggle signal units (DBM ↔ QUALITY %)"
        >
          <span className="telemetry-readout__label hud-text">
            SIGNAL STRENGTH <span className="telemetry-readout__toggle-hint">⇄</span>
          </span>
          <div className="telemetry-readout__val-wrap">
            <span className="telemetry-readout__num">{formattedSignal()}</span>
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
