import { useState, useEffect } from 'react'
import { useSatellites } from '../context/SatelliteContext'
import OrbitScene from '../components/OrbitScene'
import SystemStatusPanel from '../components/console/SystemStatusPanel'
import TelemetryReadout from '../components/console/TelemetryReadout'
import SatelliteDetailDrawer from '../components/console/SatelliteDetailDrawer'
import OverheadRadar from '../components/OverheadRadar'
import TimeControls from '../components/console/TimeControls'
import LiveDateline from '../components/console/LiveDateline'
import type { SatelliteItem } from '../services/satelliteData'

const REGIMES = ['ALL', 'ISRO', 'DEBRIS', 'LEO', 'GEO'] as const

type MobilePanel = 'none' | 'search' | 'telemetry' | 'radar' | 'status'

export default function LiveTrackingView() {
  const {
    searchQuery,
    setSearchQuery,
    filterRegime,
    setFilterRegime,
    filteredSatellites,
    satellites,
    selectedSat,
    setSelectedSat,
    triggerResetView,
    apiStatus,
    lastSyncTime,
  } = useSatellites()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('none')
  const [isMobile, setIsMobile] = useState(false)

  // Detect small screens
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle clicking or pressing Enter on a search result
  const handleSelectSatellite = (sat: SatelliteItem) => {
    setSelectedSat(sat)
    if (isMobile) {
      setMobilePanel('none')
    }
  }

  // Keyboard navigation inside search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredSatellites.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredSatellites.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filteredSatellites.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredSatellites.length) % filteredSatellites.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSatellites.length > 0) {
        const chosen = filteredSatellites[selectedIndex] || filteredSatellites[0]
        handleSelectSatellite(chosen)
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('')
      if (isMobile) setMobilePanel('none')
    }
  }

  const toggleMobilePanel = (panel: MobilePanel) => {
    setMobilePanel((curr) => (curr === panel ? 'none' : panel))
  }

  return (
    <div className="tracking-view">
      {/* This view owns the page h1 (moved out of TopBar per contract §4) */}
      <h1 className="sr-only">Live Orbital Tracking</h1>

      {/* 3D Orbit Scene fills the entire background workspace with Centered Earth */}
      <div className="tracking-view__scene-container">
        <OrbitScene />
      </div>

      {/* Mobile Backdrop when a HUD modal is open */}
      {isMobile && mobilePanel !== 'none' && (
        <div
          className="tracking-view__mobile-backdrop"
          onClick={() => setMobilePanel('none')}
          aria-hidden="true"
        />
      )}

      {/* Mobile Tactical Floating Action Bar (< 1024px) */}
      <div className="tracking-view__mobile-hud-tray hud-text">
        <button
          type="button"
          className={`tracking-view__hud-btn ${mobilePanel === 'search' ? 'tracking-view__hud-btn--active' : ''}`}
          onClick={() => toggleMobilePanel('search')}
          title="Toggle Search & Filters"
        >
          ⌕ SEARCH
        </button>
        <button
          type="button"
          className={`tracking-view__hud-btn ${mobilePanel === 'telemetry' ? 'tracking-view__hud-btn--active' : ''}`}
          onClick={() => toggleMobilePanel('telemetry')}
          title="Toggle Telemetry Panel"
        >
          ⚡ TELEMETRY
        </button>
        <button
          type="button"
          className={`tracking-view__hud-btn ${mobilePanel === 'radar' ? 'tracking-view__hud-btn--active' : ''}`}
          onClick={() => toggleMobilePanel('radar')}
          title="Toggle Overhead Radar"
        >
          📡 RADAR
        </button>
        <button
          type="button"
          className={`tracking-view__hud-btn ${mobilePanel === 'status' ? 'tracking-view__hud-btn--active' : ''}`}
          onClick={() => toggleMobilePanel('status')}
          title="Toggle Sensor Grid Status"
        >
          ⚙ STATUS
        </button>
      </div>

      {/* Search and Quick Filters HUD (Top-Left on Desktop, Drawer on Mobile) */}
      <div
        className={`tracking-view__controls hud-text ${
          isMobile
            ? mobilePanel === 'search'
              ? 'tracking-view__panel--mobile-open'
              : 'tracking-view__panel--mobile-hidden'
            : ''
        }`}
      >
        <div className="tracking-view__panel-mobile-header">
          <span>⌕ SATELLITE SEARCH & REGIMES</span>
          <button
            type="button"
            className="tracking-view__panel-mobile-close"
            onClick={() => setMobilePanel('none')}
          >
            ✕
          </button>
        </div>

        <div className="tracking-view__search-wrapper">
          <div className="tracking-view__search-box">
            <span className="tracking-view__search-icon">⌕</span>
            <input
              type="text"
              className="tracking-view__search-input"
              placeholder="SEARCH SATELLITE / NORAD / ISRO..."
              aria-label="Search satellites by name, NORAD ID, or operator"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                className="tracking-view__search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Interactive Search Results Dropdown Panel */}
          {searchQuery.trim().length > 0 && (
            <div className="search-results-panel" role="listbox">
              <div className="search-results-panel__header">
                <span>FOUND {filteredSatellites.length} MATCH{filteredSatellites.length === 1 ? '' : 'ES'}</span>
                <span className="hud__faint">PRESS ↵ OR CLICK TO FLY</span>
              </div>

              <div className="search-results-panel__list">
                {filteredSatellites.length > 0 ? (
                  filteredSatellites.map((sat, idx) => {
                    const isCurrent = selectedSat?.id === sat.id
                    const isHighlighted = idx === selectedIndex
                    return (
                      <div
                        key={sat.id}
                        role="option"
                        aria-selected={isHighlighted}
                        className={`search-results-panel__item ${
                          isHighlighted ? 'search-results-panel__item--highlighted' : ''
                        } ${isCurrent ? 'search-results-panel__item--selected' : ''}`}
                        onClick={() => handleSelectSatellite(sat)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="search-results-panel__item-main">
                          <span
                            className="search-results-panel__dot"
                            style={{ background: sat.color, boxShadow: `0 0 6px ${sat.color}` }}
                          />
                          <div className="search-results-panel__names">
                            <span className="search-results-panel__name">{sat.name}</span>
                            <span className="search-results-panel__meta hud__faint">
                              NORAD {sat.noradId} • ALT {sat.altKm.toFixed(0)} KM • INC {sat.inclinationDeg.toFixed(1)}°
                            </span>
                          </div>
                        </div>

                        <div className="search-results-panel__actions">
                          <span className={`search-results-panel__badge search-results-panel__badge--${sat.orbitClass.toLowerCase()}`}>
                            {sat.orbitClass}
                          </span>
                          <button
                            type="button"
                            className="search-results-panel__fly-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectSatellite(sat)
                            }}
                            title="Fly 3D camera to this satellite"
                          >
                            FLY TO ↗
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="search-results-panel__empty">
                    <span>NO OBJECTS FOUND MATCHING "{searchQuery}"</span>
                    <button
                      type="button"
                      className="search-results-panel__reset-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      RESET SEARCH
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="tracking-view__pills">
          {REGIMES.map((regime) => (
            <button
              key={regime}
              type="button"
              className={`tracking-view__pill ${filterRegime === regime ? 'tracking-view__pill--active' : ''}`}
              aria-pressed={filterRegime === regime}
              onClick={() => {
                setFilterRegime(regime)
              }}
            >
              {regime}
            </button>
          ))}
          <span className="tracking-view__count hud__faint">
            SHOWING {filteredSatellites.length} OF {satellites.length}
          </span>
        </div>
      </div>

      {/* Top-Right Sensor & API Status Panel Overlay */}
      <div
        className={`tracking-view__top-right-overlay ${
          isMobile
            ? mobilePanel === 'status'
              ? 'tracking-view__panel--mobile-open'
              : 'tracking-view__panel--mobile-hidden'
            : ''
        }`}
      >
        <div className="tracking-view__panel-mobile-header">
          <span>⚙ SENSOR & SGP4 STATUS</span>
          <button
            type="button"
            className="tracking-view__panel-mobile-close"
            onClick={() => setMobilePanel('none')}
          >
            ✕
          </button>
        </div>
        <div className="tracking-view__api-badge hud-text">
          <span className="tracking-view__api-dot" />
          <span>API: CELESTRAK / SGP4 ({apiStatus})</span>
          <span className="hud__faint">• {lastSyncTime}</span>
        </div>
        <SystemStatusPanel />
      </div>

      {/* Telemetry Readout Overlay (Bottom-Left on Desktop, Drawer on Mobile) */}
      <div
        className={`tracking-view__bottom-left-overlay ${
          isMobile
            ? mobilePanel === 'telemetry'
              ? 'tracking-view__panel--mobile-open'
              : 'tracking-view__panel--mobile-hidden'
            : ''
        }`}
      >
        <div className="tracking-view__panel-mobile-header">
          <span>⚡ LIVE TELEMETRY</span>
          <button
            type="button"
            className="tracking-view__panel-mobile-close"
            onClick={() => setMobilePanel('none')}
          >
            ✕
          </button>
        </div>
        <TelemetryReadout />
      </div>

      {/* Overhead Radar Overlay (Bottom-Right on Desktop, Drawer on Mobile) */}
      <div
        className={`tracking-view__bottom-right-overlay ${
          isMobile
            ? mobilePanel === 'radar'
              ? 'tracking-view__panel--mobile-open'
              : 'tracking-view__panel--mobile-hidden'
            : ''
        }`}
      >
        <div className="tracking-view__panel-mobile-header">
          <span>📡 ISTRAC RADAR HORIZON</span>
          <button
            type="button"
            className="tracking-view__panel-mobile-close"
            onClick={() => setMobilePanel('none')}
          >
            ✕
          </button>
        </div>
        <OverheadRadar
          satellites={satellites}
          onSelectSat={(sat) => {
            setSelectedSat(sat)
            if (isMobile) setMobilePanel('none')
          }}
        />
      </div>

      {/* Mission dateline (item 8) — full-width timeline along the bottom edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          pointerEvents: 'auto',
        }}
      >
        <LiveDateline />
      </div>

      {/* Floating Center-Bottom Tactical Quick-Action Pill (raised above the dateline) */}
      <div className="tracking-view__center-bottom-pill hud-text" style={{ bottom: 52 }}>
        {selectedSat ? (
          <div className="tracking-view__target-info">
            <span className="tracking-view__target-dot" style={{ background: selectedSat.color }} />
            <span>TRACKING: {selectedSat.name}</span>
            <span className="hud__faint">({selectedSat.altKm.toFixed(0)} KM)</span>
            <button
              className="tracking-view__reset-btn"
              onClick={() => {
                triggerResetView()
              }}
              title="Release camera lock and re-center the Earth"
            >
              ⊙ CENTER EARTH
            </button>
          </div>
        ) : (
          <button
            className="tracking-view__recenter-earth-btn"
            onClick={() => {
              triggerResetView()
            }}
            title="Recenter camera on Earth globe"
          >
            ⊙ CENTER EARTH VIEW
          </button>
        )}
      </div>

      {/* Mission-time cockpit HUD (item 7) — docked just above the action pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 92,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 70,
          pointerEvents: 'auto',
          maxWidth: 'min(94vw, 680px)',
        }}
      >
        <TimeControls />
      </div>

      {/* Slide-in Detailed Telemetry Drawer */}
      <SatelliteDetailDrawer />
    </div>
  )
}
