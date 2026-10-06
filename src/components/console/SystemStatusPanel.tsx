import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/motion'

/**
 * Diagnostic row reset styles: the rows are real <button>s (keyboard + SR access)
 * styled inline to restore the plain-div look, since index.css is not owned here.
 * `.sys-panel__row` (flex layout, 3px 0 padding, font-size) keeps applying via class.
 * minHeight: 24 keeps each target at the WCAG 2.2 AA 2.5.8 floor.
 */
const DIAGNOSTIC_ROW_BUTTON_RESET: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 'inherit',
  textAlign: 'left',
  width: '100%',
  minHeight: 24,
  cursor: 'pointer',
}

interface Subsystem {
  id: string
  name: string
  subcode: string
  status: 'nominal' | 'degraded' | 'calibrating'
  statusText: string
}

const INITIAL_SUBSYSTEMS: Subsystem[] = [
  { id: 'rad', name: 'TRACKING RADAR', subcode: 'RAD-01A', status: 'nominal', statusText: 'ACTIVE' },
  { id: 'tel', name: 'TELEMETRY LINK', subcode: 'TLM-XBD', status: 'nominal', statusText: 'LOCKED' },
  { id: 'col', name: 'COLLISION PREDICTOR', subcode: 'SGP4-DSS', status: 'nominal', statusText: 'OPTIMAL' },
  { id: 'gnd', name: 'GROUND STATION SYNC', subcode: 'BLR-04', status: 'nominal', statusText: 'SYNCED' },
  { id: 'pwr', name: 'POWER SYSTEMS', subcode: 'BUS-28V', status: 'nominal', statusText: 'NOMINAL' },
  { id: 'com', name: 'COMMS ARRAY', subcode: 'S-BAND', status: 'nominal', statusText: 'TRANSMITTING' },
]

export default function SystemStatusPanel() {
  const [subsystems, setSubsystems] = useState<Subsystem[]>(INITIAL_SUBSYSTEMS)
  const panelRef = useRef<HTMLDivElement>(null)

  // Stagger reveal on mount (GSAP via useGSAP per contract §3; snaps under reduced motion)
  useGSAP(
    () => {
      if (!panelRef.current) return
      if (prefersReducedMotion()) return
      const rows = panelRef.current.querySelectorAll('.sys-panel__row')
      gsap.fromTo(
        rows,
        { opacity: 0, x: 12 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.09, ease: 'power2.out' }
      )
    },
    { scope: panelRef }
  )

  // Manual subsystem diagnostics on row click
  const handleTestSubsystem = (id: string) => {
    setSubsystems((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: 'calibrating', statusText: 'PINGING...' } : sub))
    )

    setTimeout(() => {
      setSubsystems((prev) =>
        prev.map((sub) =>
          sub.id === id ? { ...sub, status: 'nominal', statusText: 'VERIFIED ✓' } : sub
        )
      )
    }, 1200)
  }

  // Periodic autonomous health calibration
  useEffect(() => {
    const timer = setInterval(() => {
      const targetIdx = Math.floor(Math.random() * INITIAL_SUBSYSTEMS.length)

      setSubsystems((prev) =>
        prev.map((sub, i) =>
          i === targetIdx
            ? { ...sub, status: 'degraded', statusText: 'CALIBRATING' }
            : { ...sub, status: 'nominal', statusText: INITIAL_SUBSYSTEMS[i].statusText }
        )
      )

      setTimeout(() => {
        setSubsystems((prev) =>
          prev.map((sub, i) =>
            i === targetIdx
              ? { ...sub, status: 'nominal', statusText: INITIAL_SUBSYSTEMS[i].statusText }
              : sub
          )
        )
      }, 2400)
    }, 9500)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="sys-panel" ref={panelRef} role="group" aria-label="ISRO Subsystems Telemetry Status">
      <div className="sys-panel__header hud-text">
        <div className="sys-panel__title-wrap">
          <span className="sys-panel__badge-dot" />
          <span className="sys-panel__title">SUBSYSTEM TELEMETRY</span>
        </div>
        <span className="sys-panel__overall hud__dim">6/6 ONLINE</span>
      </div>

      <div className="sys-panel__rows">
        {subsystems.map((sub) => {
          const isDegraded = sub.status === 'degraded'
          const isCalibrating = sub.status === 'calibrating'
          return (
            <button
              key={sub.id}
              type="button"
              className={`sys-panel__row sys-panel__row--interactive ${
                isDegraded ? 'sys-panel__row--degraded' : isCalibrating ? 'sys-panel__row--calibrating' : ''
              }`}
              onClick={() => handleTestSubsystem(sub.id)}
              aria-label={`${sub.name} — run diagnostic test`}
              title={`Run diagnostic test on ${sub.name}`}
              style={DIAGNOSTIC_ROW_BUTTON_RESET}
            >
              <span className="sys-panel__row-left">
                <span
                  className={`sys-panel__dot ${
                    isDegraded
                      ? 'sys-panel__dot--degraded'
                      : isCalibrating
                      ? 'sys-panel__dot--calibrating'
                      : 'sys-panel__dot--nominal'
                  }`}
                />
                <span className="sys-panel__name">{sub.name}</span>
              </span>
              <span className="sys-panel__row-right hud-text">
                <span className="sys-panel__code hud__faint">{sub.subcode}</span>
                <span
                  className={`sys-panel__status-val ${
                    isDegraded ? 'sys-panel__status-val--degraded' : isCalibrating ? 'sys-panel__status-val--calibrating' : ''
                  }`}
                >
                  {sub.statusText}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="sys-panel__footer hud-text hud__faint">
        <span>CLICK ANY ROW TO RUN DIAGNOSTIC</span>
        <span>RATE: 10 HZ</span>
      </div>
    </div>
  )
}
