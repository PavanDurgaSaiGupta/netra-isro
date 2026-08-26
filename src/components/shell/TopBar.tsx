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

const ROUTE_TITLES: Record<string, { title: string; tag: string }> = {
  '/overview': { title: 'MISSION OVERVIEW // CINEMATIC BRIEFING', tag: 'BHARAT SPACE SITUATIONAL AWARENESS' },
  '/tracking': { title: 'ORBITAL SURVEILLANCE COCKPIT', tag: '3D EARTH // SGP4 REAL-TIME' },
  '/catalog': { title: 'SPACE OBJECT INVENTORY & TELEMETRY', tag: 'CELESTRAK & ISRO FLEET' },
  '/debris': { title: 'ORBITAL DEBRIS ENVIRONMENT & RISKS', tag: 'KESSLER RUNAWAY ANALYSIS' },
  '/alerts': { title: 'MISSION LOGS & CONJUNCTION NOTICES', tag: 'DSSAM EVENT STREAM' },
  '/about': { title: 'PROJECT NETRA // SYSTEM SPECIFICATION', tag: 'ISRO SSA INITIATIVE' },
}

export default function TopBar() {
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
    tag: 'ISRO DSSAM SENSOR GRID',
  }

  const handleAudioToggle = () => {
    const next = toggleSound()
    setSoundActive(next)
    playBlip(next ? 1400 : 700, 0.04)
  }

  return (
    <header className="app-topbar" aria-label="Operations Status Bar">
      {/* Left title & context */}
      <div className="app-topbar__left">
        <span className="app-topbar__kicker hud-text">{currentInfo.tag}</span>
        <h1 className="app-topbar__title">{currentInfo.title}</h1>
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
        {/* Mode Segment Switcher */}
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
            CONSOLE
          </Link>
        </div>

        {/* Tracked count pill */}
        <div className="app-topbar__stat-pill">
          <span className="app-topbar__status-dot" />
          <span>{loading ? 'CONNECTING...' : `${satellites.length} OBJECTS TRACKED`}</span>
        </div>

        {/* Audio Synthesizer toggle */}
        <button
          className="app-topbar__audio-btn u-link"
          onClick={handleAudioToggle}
          title="Toggle Web Audio Mission Control sounds"
        >
          {soundActive ? '🔊 AUDIO: ON' : '🔈 AUDIO: MUTED'}
        </button>

        {/* Defense classification */}
        <div className="app-topbar__security-badge">
          SEC-LVL: <span style={{ color: 'var(--status-active)' }}>NOMINAL</span>
        </div>
      </div>
    </header>
  )
}
