import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSatellites } from '../../context/SatelliteContext'
import OdometerNumber from './OdometerNumber'

/**
 * Mission clock instrument.
 * - Left: NETRA wordmark + live uplink status dot (pulses when SYNCING, via data-status).
 * - Center: IST clock and orbital cycle rendered through OdometerNumber — the odometer
 *   primitive owns all rolling animation; this component only feeds it 1s / 90s values.
 * - Right: mode segment (aria-current), fleet count, audio toggle, classification.
 * The route h1 intentionally lives in each view, not here (single-h1-per-page rule).
 */

const istClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function istClockValue(date: Date): number {
  const parts = istClockFormatter.formatToParts(date)
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return read('hour') * 10000 + read('minute') * 100 + read('second')
}

/**
 * Formats the rolling HHMMSS integer as clock text. Minute/second fields are clamped
 * to 59 so intermediate frames of the odometer tween never render impossible times.
 */
function formatClockDigits(n: number): string {
  const total = Math.max(0, Math.round(n))
  const h = Math.min(23, Math.floor(total / 10000))
  const m = Math.min(59, Math.floor((total % 10000) / 100))
  const s = Math.min(59, total % 100)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function formatCycleDigits(n: number): string {
  return String(Math.max(0, Math.round(n))).padStart(4, '0')
}

interface TopBarProps {
  mobileMenuOpen?: boolean
  onToggleMobileMenu?: () => void
}

export default function TopBar({ mobileMenuOpen = false, onToggleMobileMenu }: TopBarProps) {
  const location = useLocation()
  const { satellites, loading, apiStatus } = useSatellites()
  const [clockValue, setClockValue] = useState(() => istClockValue(new Date()))
  const [cycle, setCycle] = useState(2486)

  useEffect(() => {
    const timer = setInterval(() => setClockValue(istClockValue(new Date())), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCycle((c) => c + 1), 90000)
    return () => clearInterval(timer)
  }, [])

  const overviewActive = location.pathname === '/overview'
  const trackingActive = location.pathname === '/tracking'

  return (
    <header className="app-topbar" aria-label="Operations Status Bar">
      {/* Mobile hamburger menu toggle */}
      <button
        type="button"
        className="app-topbar__hamburger-btn"
        onClick={() => {
          onToggleMobileMenu?.()
        }}
        aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        aria-expanded={mobileMenuOpen}
        /* Hit-area floor (WCAG 2.2 AA 2.5.8); CSS padding already yields ~26px, this only guards it */
        style={{ minWidth: 24, minHeight: 24 }}
      >
        <span className="app-topbar__hamburger-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
        <span className="app-topbar__hamburger-text hud-text">MENU</span>
      </button>

      {/* Wordmark + uplink status */}
      <div className="app-topbar__left">
        <span className="app-topbar__wordmark">NETRA</span>
        <span className="app-topbar__uplink hud-text" data-status={apiStatus}>
          <span className="app-topbar__status-dot" aria-hidden="true" />
          <span className="app-topbar__uplink-label">UPLINK {apiStatus}</span>
        </span>
      </div>

      {/* Mission clock: odometer digits for IST time and orbital cycle */}
      <div className="app-topbar__center hud-text">
        <div className="app-topbar__clock topbar__clock">
          <span className="hud__faint">IST</span>
          <OdometerNumber value={clockValue} format={formatClockDigits} className="app-topbar__time" />
        </div>
        <span className="app-topbar__divider" aria-hidden="true">
          /
        </span>
        <div className="app-topbar__cycle topbar__cycle">
          <span className="hud__faint">CYCLE</span>
          <OdometerNumber
            value={cycle}
            format={formatCycleDigits}
            className="app-topbar__cycle-value"
          />
        </div>
      </div>

      {/* Right controls and fleet count */}
      <div className="app-topbar__right hud-text">
        {/* Mode segment switcher (desktop) */}
        <div className="app-topbar__mode-segment">
          <Link
            to="/overview"
            aria-current={overviewActive ? 'page' : undefined}
            className={`app-topbar__mode-tab ${overviewActive ? 'app-topbar__mode-tab--active' : ''}`}
            /* Hit-area fix (2.5.8): CSS padding 3px 11px yields ~21px height; inline
               elements ignore min-height, so the anchor is made inline-flex here */
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: 24 }}
          >
            OVERVIEW
          </Link>
          <Link
            to="/tracking"
            aria-current={trackingActive ? 'page' : undefined}
            className={`app-topbar__mode-tab ${trackingActive ? 'app-topbar__mode-tab--active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: 24 }}
          >
            COCKPIT
          </Link>
        </div>

        {/* Tracked count pill */}
        <div className="app-topbar__stat-pill">
          <span className="app-topbar__status-dot" aria-hidden="true" />
          <span className="app-topbar__stat-text">
            {loading ? 'SYNCING...' : `${satellites.length} OBJECTS`}
          </span>
        </div>

        {/* Audio synthesizer toggle removed — audio is gone from the app */}

        {/* Defense classification */}
        <div className="app-topbar__security-badge">
          SEC: <span style={{ color: 'var(--status-active)' }}>NOMINAL</span>
        </div>
      </div>
    </header>
  )
}
