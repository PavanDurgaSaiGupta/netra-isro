import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { playBlip } from '../../utils/audio'

interface NavItem {
  to: string
  label: string
  subtitle: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/overview',
    label: 'OVERVIEW',
    subtitle: 'MISSION BRIEFING',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/tracking',
    label: '3D COCKPIT',
    subtitle: 'LIVE SURVEILLANCE',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    to: '/catalog',
    label: 'SATELLITE CATALOG',
    subtitle: 'EPHEMERIS FLEET TABLE',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18" />
      </svg>
    ),
  },
  {
    to: '/debris',
    label: 'DEBRIS ANALYTICS',
    subtitle: 'CONJUNCTION & KESSLER',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: 'ALERTS & LOGS',
    subtitle: 'DSSAM EVENT STREAM',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    to: '/about',
    label: 'ABOUT NETRA',
    subtitle: 'ISRO DSSAM MANDATE',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const isCockpit = location.pathname === '/tracking'

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        onCloseMobile?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, onCloseMobile])

  const handleLinkClick = () => {
    playBlip(1200, 0.02)
    onCloseMobile?.()
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="app-sidebar__backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isCockpit ? 'app-sidebar--compact' : ''} ${
          mobileOpen ? 'app-sidebar--mobile-open' : ''
        }`}
        aria-label="Main Application Navigation"
      >
        {/* Brand Header */}
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-row">
            <div className="app-sidebar__logo">
              <span className="app-sidebar__diamond">◆</span>
              <div className="app-sidebar__brand-text">
                <div className="app-sidebar__title">NETRA / नेत्रा</div>
                <div className="app-sidebar__subtitle hud-text">ISRO DSSAM OPERATIONS</div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              className="app-sidebar__mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>

          <div className="app-sidebar__badge hud-text">
            <span className="app-sidebar__status-dot" />
            <span className="app-sidebar__badge-label">DSSAM LIVE</span>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`
              }
              onClick={handleLinkClick}
              title={`${item.label} — ${item.subtitle}`}
            >
              <span className="app-sidebar__icon">{item.icon}</span>
              <div className="app-sidebar__text">
                <span className="app-sidebar__label">{item.label}</span>
                <span className="app-sidebar__sublabel hud-text">{item.subtitle}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Sensor Ground Station Footer */}
        <div className="app-sidebar__footer">
          <div className="app-sidebar__station-card">
            <div className="app-sidebar__station-head hud-text">
              <span>GROUND SENSOR</span>
              <span style={{ color: 'var(--status-active)' }}>CONNECTED</span>
            </div>
            <div className="app-sidebar__station-name">ISTRAC BENGALURU</div>
            <div className="app-sidebar__station-coords hud-text">12.9716° N • 77.5946° E</div>
            <div className="app-sidebar__station-stat">
              <span className="hud-text hud__faint">ACTIVE HORIZON CONE</span>
              <span className="hud-text" style={{ color: 'var(--accent-cyan)' }}>3,200 KM</span>
            </div>
          </div>

          <div className="app-sidebar__meta hud-text hud__dim">
            <span>NETRA MISSION CONSOLE v2.6</span>
            <span>BHARAT ORBITAL SAFETY</span>
          </div>
        </div>
      </aside>
    </>
  )
}
