import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useSatellites } from '../../context/SatelliteContext'
import { playBlip } from '../../utils/audio'
import type { SatelliteItem } from '../../services/satelliteData'

export default function SatelliteDetailDrawer() {
  const { selectedSat, satellites, setSelectedSat, triggerRecenter, triggerResetView } = useSatellites()
  const drawerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [displaySat, setDisplaySat] = useState<SatelliteItem | null>(selectedSat)

  // Drawer open / close animation
  useEffect(() => {
    if (!drawerRef.current) return

    if (selectedSat) {
      setDisplaySat(selectedSat)
      gsap.to(drawerRef.current, {
        x: '0%',
        duration: 0.42,
        ease: 'power3.out',
      })
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0.35, y: 6 },
          { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }
        )
      }
    } else {
      // Close drawer
      gsap.to(drawerRef.current, {
        x: '105%',
        duration: 0.32,
        ease: 'power3.in',
        onComplete: () => {
          setDisplaySat(null)
        },
      })
    }
  }, [selectedSat])

  const handleClose = () => {
    playBlip(750, 0.02)
    triggerResetView()
  }

  const sat = selectedSat || displaySat
  if (!sat) {
    return (
      <aside className="sat-drawer" ref={drawerRef} style={{ transform: 'translateX(105%)' }} aria-hidden="true" />
    )
  }

  const currentIndex = satellites.findIndex((s) => s.id === sat?.id)

  const handlePrev = () => {
    if (satellites.length === 0) return
    playBlip(1400, 0.02)
    const prevIdx = (currentIndex - 1 + satellites.length) % satellites.length
    setSelectedSat(satellites[prevIdx])
  }

  const handleNext = () => {
    if (satellites.length === 0) return
    playBlip(1400, 0.02)
    const nextIdx = (currentIndex + 1) % satellites.length
    setSelectedSat(satellites[nextIdx])
  }

  const isDebris = sat.type === 'debris'
  const isAboveHorizon = sat.elevationDeg > 0

  return (
    <aside
      className="sat-drawer"
      ref={drawerRef}
      style={{ transform: 'translateX(105%)' }}
      aria-label="Satellite Detailed Telemetry Drawer"
    >
      <div className="sat-drawer__inner" ref={contentRef}>
        {/* Multi-satellite Quick Switcher Carousel */}
        <div className="sat-drawer__switcher hud-text">
          <button
            type="button"
            className="sat-drawer__switcher-btn"
            onClick={handlePrev}
            title="Fly camera to previous satellite"
          >
            ◀ PREV SATELLITE
          </button>
          <span className="sat-drawer__switcher-index">
            {currentIndex >= 0 ? `${currentIndex + 1} OF ${satellites.length}` : '—'}
          </span>
          <button
            type="button"
            className="sat-drawer__switcher-btn"
            onClick={handleNext}
            title="Fly camera to next satellite"
          >
            NEXT SATELLITE ▶
          </button>
        </div>

        {/* Header */}
        <div className="sat-drawer__head">
          <div className="sat-drawer__badge-row">
            <span
              className={`sat-drawer__badge ${
                isDebris ? 'sat-drawer__badge--debris' : 'sat-drawer__badge--payload'
              }`}
            >
              {isDebris ? 'TRACKED DEBRIS FRAGMENT' : 'ACTIVE ORBITAL PAYLOAD'}
            </span>
            <span className="sat-drawer__regime-badge">{sat?.orbitClass || 'LEO'}</span>
          </div>

          <button
            className="sat-drawer__close-btn"
            onClick={handleClose}
            aria-label="Close telemetry drawer"
            title="Close Drawer (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div className="sat-drawer__title-block">
          <h2 className="sat-drawer__name">{sat?.name || 'SATELLITE TELEMETRY'}</h2>
          <div className="sat-drawer__norad hud-text">
            <span>NORAD CAT ID: {sat?.noradId || '—'}</span>
            <span className="sat-drawer__sep">•</span>
            <span>OPERATOR: {sat?.operator || 'ISRO'}</span>
          </div>
        </div>

        {/* Quick Conjunction Risk Meter */}
        <div className="sat-drawer__risk-card">
          <div className="sat-drawer__risk-head hud-text">
            <span>CONJUNCTION RISK (24H)</span>
            <span
              style={{
                color: isDebris ? 'var(--status-warning)' : 'var(--status-active)',
                fontWeight: 700,
              }}
            >
              {isDebris ? 'ELEVATED (MONITORED)' : 'NOMINAL (Pc < 1E-06)'}
            </span>
          </div>
          <div className="sat-drawer__risk-bar">
            <div
              className="sat-drawer__risk-fill"
              style={{
                width: isDebris ? '68%' : '14%',
                background: isDebris ? 'var(--status-warning)' : 'var(--status-active)',
              }}
            />
          </div>
        </div>

        {/* Live Kinematics Grid */}
        <div className="sat-drawer__section-title hud-text">REAL-TIME KINEMATICS (SGP4)</div>
        <div className="sat-drawer__grid">
          <div className="sat-drawer__metric">
            <span className="sat-drawer__metric-label hud-text">ALTITUDE</span>
            <div className="sat-drawer__metric-val">
              <span className="sat-drawer__metric-num">{sat ? sat.altKm.toFixed(1) : '—'}</span>
              <span className="sat-drawer__metric-unit">KM</span>
            </div>
          </div>

          <div className="sat-drawer__metric">
            <span className="sat-drawer__metric-label hud-text">ORBITAL VELOCITY</span>
            <div className="sat-drawer__metric-val">
              <span className="sat-drawer__metric-num">{sat ? sat.speedKmS.toFixed(2) : '—'}</span>
              <span className="sat-drawer__metric-unit">KM/S</span>
            </div>
          </div>

          <div className="sat-drawer__metric">
            <span className="sat-drawer__metric-label hud-text">INCLINATION</span>
            <div className="sat-drawer__metric-val">
              <span className="sat-drawer__metric-num">{sat ? sat.inclinationDeg.toFixed(2) : '—'}</span>
              <span className="sat-drawer__metric-unit">DEG</span>
            </div>
          </div>

          <div className="sat-drawer__metric">
            <span className="sat-drawer__metric-label hud-text">ORBITAL PERIOD</span>
            <div className="sat-drawer__metric-val">
              <span className="sat-drawer__metric-num">{sat ? sat.periodMin.toFixed(1) : '—'}</span>
              <span className="sat-drawer__metric-unit">MIN</span>
            </div>
          </div>
        </div>

        {/* Sub-Satellite Ground Track */}
        <div className="sat-drawer__section-title hud-text">SUB-SATELLITE GROUND POINT</div>
        <div className="sat-drawer__geo-card hud-text">
          <div className="sat-drawer__geo-row">
            <span className="hud__faint">LATITUDE:</span>
            <span className="sat-drawer__geo-val">
              {sat ? `${Math.abs(sat.lat).toFixed(3)}° ${sat.lat >= 0 ? 'N' : 'S'}` : '—'}
            </span>
          </div>
          <div className="sat-drawer__geo-row">
            <span className="hud__faint">LONGITUDE:</span>
            <span className="sat-drawer__geo-val">
              {sat ? `${Math.abs(sat.lng).toFixed(3)}° ${sat.lng >= 0 ? 'E' : 'W'}` : '—'}
            </span>
          </div>
        </div>

        {/* Bengaluru ISTRAC Antenna Look Angles */}
        <div className="sat-drawer__section-title hud-text">ISTRAC BENGALURU SENSOR LOOK-ANGLES</div>
        <div className="sat-drawer__antenna-card">
          <div className="sat-drawer__antenna-row hud-text">
            <span>AZIMUTH:</span>
            <span style={{ color: 'var(--accent-cyan)' }}>
              {sat ? `${sat.azimuthDeg.toFixed(1)}°` : '—'}
            </span>
          </div>
          <div className="sat-drawer__antenna-row hud-text">
            <span>ELEVATION:</span>
            <span style={{ color: isAboveHorizon ? 'var(--status-active)' : 'var(--text-tertiary)' }}>
              {sat ? `${sat.elevationDeg.toFixed(1)}°` : '—'}
            </span>
          </div>
          <div className="sat-drawer__antenna-row hud-text">
            <span>SLANT RANGE:</span>
            <span>{sat ? `${Math.round(sat.rangeKm)} KM` : '—'}</span>
          </div>
          <div className="sat-drawer__antenna-status hud-text">
            <span className={`sat-drawer__ant-dot ${isAboveHorizon ? 'sat-drawer__ant-dot--active' : ''}`} />
            <span>{isAboveHorizon ? '● SATELLITE VISIBLE ABOVE ISTRAC HORIZON' : '○ SATELLITE BELOW LOCAL HORIZON'}</span>
          </div>
        </div>

        {/* Raw Two-Line Element (TLE) Ephemeris */}
        <div className="sat-drawer__section-title hud-text">CELESTRAK TWO-LINE ELEMENT (TLE)</div>
        <div className="sat-drawer__tle-box hud-text">
          <code>{sat?.tle1 || 'NO TLE DATA AVAILABLE'}</code>
          <code>{sat?.tle2 || ''}</code>
        </div>

        {/* Action Buttons */}
        <div className="sat-drawer__actions">
          <button
            className="sat-drawer__btn sat-drawer__btn--secondary"
            onClick={() => {
              playBlip(1300, 0.03)
              triggerRecenter()
            }}
            title="Fly camera to focus closely on this object in 3D"
          >
            ⊙ RECENTER SATELLITE
          </button>
          <button
            className="sat-drawer__btn sat-drawer__btn--primary"
            onClick={() => {
              playBlip(900, 0.02)
              triggerResetView()
            }}
            title="Unfocus and zoom back out to center the Earth"
          >
            RESET TO CENTER EARTH
          </button>
        </div>
      </div>
    </aside>
  )
}
