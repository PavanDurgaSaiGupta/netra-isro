import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

/**
 * Radar-first navigation — the sidebar as a live polar instrument.
 *
 - `.radar-nav__scope` holds an SVG graticule (range rings + crosshairs), a rotating
   conic sweep (4s linear infinite, CSS) and the six routes plotted as contacts.
 - Each contact carries `--sweep-delay` (= angle / 360 × 4s) so its CSS pulse fires
   exactly when the sweep crosses it. The sweep must start pointing north and rotate
   clockwise for that sync to hold.
 - Hover/focus on a contact or its label = acquiring (artifact ring + bright label,
   `--ease-capture` in CSS). The active route stays locked.
 - Interactive elements are the labels; contacts are aria-hidden visuals that remain
   clickable for pointer users.
 */

interface NavContact {
  to: string
  label: string
  subtitle: string
  /** Polar placement on the scope: degrees clockwise from north, radius 0..1. */
  angle: number
  radius: number
}

const NAV_CONTACTS: NavContact[] = [
  { to: '/overview', label: 'OVERVIEW', subtitle: 'MISSION BRIEFING', angle: 0, radius: 0.88 },
  { to: '/tracking', label: '3D COCKPIT', subtitle: 'LIVE SURVEILLANCE', angle: 56, radius: 0.52 },
  { to: '/catalog', label: 'CATALOG', subtitle: 'EPHEMERIS FLEET TABLE', angle: 124, radius: 0.8 },
  { to: '/debris', label: 'DEBRIS', subtitle: 'CONJUNCTION & KESSLER', angle: 188, radius: 0.93 },
  { to: '/alerts', label: 'ALERTS', subtitle: 'DSSAM EVENT STREAM', angle: 246, radius: 0.6 },
  { to: '/about', label: 'ABOUT', subtitle: 'ISRO DSSAM MANDATE', angle: 304, radius: 0.78 },
]

const SWEEP_PERIOD_S = 4

function contactPosition(contact: NavContact): { left: string; top: string } {
  const rad = (contact.angle * Math.PI) / 180
  const x = 50 + Math.sin(rad) * contact.radius * 50
  const y = 50 - Math.cos(rad) * contact.radius * 50
  return { left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` }
}

/** Delay that syncs a contact's CSS pulse to the moment the sweep crosses its angle. */
function sweepDelay(angle: number): string {
  return `${((angle / 360) * SWEEP_PERIOD_S).toFixed(2)}s`
}

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isCockpit = location.pathname === '/tracking'
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

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
    onCloseMobile?.()
  }

  const handleContactClick = (to: string) => {
    onCloseMobile?.()
    navigate(to)
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div className="radar-nav__backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        className={`radar-nav ${isCockpit ? 'radar-nav--compact' : ''} ${
          mobileOpen ? 'radar-nav--mobile-open' : ''
        }`}
        aria-label="Main Application Navigation"
      >
        {/* Mobile close button */}
        <button
          type="button"
          className="radar-nav__close"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        >
          ✕
        </button>

        {/* Polar scope */}
        <div className="radar-nav__scope" aria-hidden="true">
          <svg viewBox="0 0 220 220" focusable="false">
            <circle className="radar-nav__ring" cx="110" cy="110" r="36" />
            <circle className="radar-nav__ring" cx="110" cy="110" r="72" />
            <circle className="radar-nav__ring" cx="110" cy="110" r="104" />
            <circle className="radar-nav__ring radar-nav__ring--outer" cx="110" cy="110" r="109" />
            <line className="radar-nav__crosshair" x1="110" y1="6" x2="110" y2="214" />
            <line className="radar-nav__crosshair" x1="6" y1="110" x2="214" y2="110" />
          </svg>
          <div className="radar-nav__sweep" />
          {NAV_CONTACTS.map((contact, i) => {
            const locked = location.pathname === contact.to
            const acquiring = hoverIndex === i
            return (
              <span
                key={contact.to}
                className={`radar-nav__contact ${locked ? 'radar-nav__contact--locked' : ''} ${
                  acquiring ? 'radar-nav__contact--acquiring' : ''
                }`}
                style={
                  {
                    ...contactPosition(contact),
                    '--sweep-delay': sweepDelay(contact.angle),
                  } as CSSProperties
                }
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => handleContactClick(contact.to)}
              />
            )
          })}
        </div>

        {/* Vertical mono labels — the interactive navigation */}
        <ul className="radar-nav__labels">
          {NAV_CONTACTS.map((contact, i) => (
            <li key={contact.to}>
              <NavLink
                to={contact.to}
                className={({ isActive }) =>
                  `radar-nav__label hud-text${isActive ? ' radar-nav__label--locked' : ''}${
                    hoverIndex === i ? ' radar-nav__label--acquiring' : ''
                  }`
                }
                aria-label={`${contact.label} - ${contact.subtitle}`}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex(null)}
                onClick={handleLinkClick}
              >
                {contact.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Version / org id */}
        <footer className="radar-nav__meta hud-text hud__dim">
          <span>NETRA CONSOLE v2.6</span>
          <span>ISRO / ISTRAC</span>
        </footer>
      </aside>
    </>
  )
}
