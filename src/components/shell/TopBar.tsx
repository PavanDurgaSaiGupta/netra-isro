import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { isSoundEnabled, toggleSound, playBlip } from '../../utils/audio'
import { useSatellites } from '../../context/SatelliteContext'

const istFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const ROUTE_TITLES: Record<string, { title: string; tag: string; shortTitle: string }> = {
  '/overview': { title: 'MISSION OVERVIEW // BRIEFING', tag: 'BHARAT SSA', shortTitle: 'OVERVIEW' },
  '/tracking': { title: 'ORBITAL SURVEILLANCE COCKPIT', tag: 'SGP4 REAL-TIME', shortTitle: '3D COCKPIT' },
  '/catalog': { title: 'SPACE OBJECT INVENTORY & TELEMETRY', tag: 'FLEET CATALOG', shortTitle: 'CATALOG' },
  '/debris': { title: 'DEBRIS ENVIRONMENT & RISKS', tag: 'KESSLER ANALYSIS', shortTitle: 'DEBRIS' },
  '/alerts': { title: 'MISSION LOGS & CONJUNCTIONS', tag: 'DSSAM STREAM', shortTitle: 'ALERTS' },
  '/about': { title: 'PROJECT NETRA // SPECIFICATION', tag: 'ISRO SSA', shortTitle: 'ABOUT' },
}

interface TopBarProps {
  mobileMenuOpen?: boolean
  onToggleMobileMenu?: () => void
}

export default function TopBar({ mobileMenuOpen = false, onToggleMobileMenu }: TopBarProps) {
  const location = useLocation()
  const { satellites, loading } = useSatellites()
  const [time, setTime] = useState(() => istFormatter.format(new Date()))
  const [cycle, setCycle] = useState(2486)
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(istFormatter.format(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCycle((c) => c + 1)
    }, 90000)
    return () => clearInterval(timer)
  }, [])

  const currentInfo = ROUTE_TITLES[location.pathname] || {
    title: 'MISSION OPERATIONS CONSOLE',
    tag: 'ISRO DSSAM SENSORS',
    shortTitle: 'NETRA CONSOLE',
  }

  const handleAudioToggle = () => {
    const next = toggleSound()
    setSoundActive(next)
    playBlip(next ? 1400 : 700, 0.04)
  }

  return (
    <header className="app-topbar" aria-label="Operations Status Bar">
      {/* Mobile Hamburger Menu Toggle Button */}
      <button
        type="button"
        className="app-topbar__hamburger-btn"
        onClick={() => {
          playBlip(1100, 0.03)
          onToggleMobileMenu?.()
        }}
        aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        aria-expanded={mobileMenuOpen}
      >
        <span className="app-topbar__hamburger-icon">
          {mobileMenuOpen ? '✕' : '☰'}
        </span>
        <span className="app-topbar__hamburger-text hud-text">MENU</span>
      </button>

      {/* Left title & context — single h1, mobile text switches via CSS */}
      <div className="app-topbar__left">
        <span className="app-topbar__kicker hud-text">{currentInfo.tag}</span>
        <h1 className="app-topbar__title">
          <span className="app-topbar__title--desktop">{currentInfo.title}</span>
          <span className="app-topbar__title--mobile" aria-hidden="true">{currentInfo.shortTitle}</span>
        </h1>
      </div>

      {/* Center live clock & orbital cycle */}
      <div className="app-topbar__center hud-text">
        <div className="app-topbar__clock">
          <span className="hud__faint">IST:</span>
          <span className="app-topbar__time">{time}</span>
        </div>
        <span className="app-topbar__divider">/</span>
        <div className="app-topbar__cycle">
          <span className="hud__faint">CYCLE:</span>
          <span style={{ color: 'var(--accent-orange)' }}>{cycle}</span>
        </div>
      </div>

      {/* Right controls and fleet count */}
      <div className="app-topbar__right hud-text">
        {/* Mode Segment Switcher (Desktop) */}
        <div className="app-topbar__mode-segment">
          <Link
            to="/overview"
            className={`app-topbar__mode-tab ${location.pathname === '/overview' ? 'app-topbar__mode-tab--active' : ''}`}
            onClick={() => playBlip(1100, 0.02)}
          >
            OVERVIEW
          </Link>
          <Link
            to="/tracking"
            className={`app-topbar__mode-tab ${location.pathname !== '/overview' ? 'app-topbar__mode-tab--active' : ''}`}
            onClick={() => playBlip(1300, 0.02)}
          >
            COCKPIT
          </Link>
        </div>

        {/* Tracked count pill */}
        <div className="app-topbar__stat-pill">
          <span className="app-topbar__status-dot" />
          <span className="app-topbar__stat-text">
            {loading ? 'SYNCING...' : `${satellites.length} OBJECTS`}
          </span>
        </div>

        {/* Audio Synthesizer toggle */}
        <button
          className="app-topbar__audio-btn u-link"
          onClick={handleAudioToggle}
          title="Toggle Web Audio Mission Control sounds"
          aria-label="Toggle Mission Control Audio"
        >
          <span className="app-topbar__audio-label--desktop">
            {soundActive ? '🔊 AUDIO: ON' : '🔈 AUDIO: MUTED'}
          </span>
          <span className="app-topbar__audio-label--mobile">
            {soundActive ? '🔊' : '🔈'}
          </span>
        </button>

        {/* Defense classification */}
        <div className="app-topbar__security-badge">
          SEC: <span style={{ color: 'var(--status-active)' }}>NOMINAL</span>
        </div>
      </div>
    </header>
  )
}
