import { useState } from 'react'
import { useSatellites } from '../context/SatelliteContext'
import OrbitScene from '../components/OrbitScene'
import SystemStatusPanel from '../components/console/SystemStatusPanel'
import TelemetryReadout from '../components/console/TelemetryReadout'
import SatelliteDetailDrawer from '../components/console/SatelliteDetailDrawer'
import OverheadRadar from '../components/OverheadRadar'
import { playBlip, playLockSound } from '../utils/audio'
import type { SatelliteItem } from '../services/satelliteData'

const REGIMES = ['ALL', 'ISRO', 'DEBRIS', 'LEO', 'GEO'] as const

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

  // Handle clicking or pressing Enter on a search result
  const handleSelectSatellite = (sat: SatelliteItem) => {
    playLockSound()
    setSelectedSat(sat)
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
    }
  }

  return (
    <div className="tracking-view">
      {/* 3D Orbit Scene fills the entire background workspace with Centered Earth */}
      <div className="tracking-view__scene-container">
        <OrbitScene />
      </div>

      {/* Search and Quick Filters HUD (Top-Left) */}
      <div className="tracking-view__controls hud-text">
        <div className="tracking-view__search-wrapper">
          <div className="tracking-view__search-box">
            <span className="tracking-view__search-icon">⌕</span>
            <input
              type="text"
              className="tracking-view__search-input"
              placeholder="SEARCH SATELLITE / NORAD / ISRO (PRESS ↵)..."
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
              className={`tracking-view__pill ${filterRegime === regime ? 'tracking-view__pill--active' : ''}`}
              onClick={() => {
                playBlip(1100, 0.02)
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
      <div className="tracking-view__top-right-overlay">
        <div className="tracking-view__api-badge hud-text">
          <span className="tracking-view__api-dot" />
          <span>API: CELESTRAK / SGP4 ({apiStatus})</span>
          <span className="hud__faint">• {lastSyncTime}</span>
        </div>
        <SystemStatusPanel />
      </div>

      {/* Telemetry Readout (Bottom-Left overlay) */}
      <div className="tracking-view__bottom-left-overlay">
        <TelemetryReadout />
      </div>

      {/* Overhead Radar (Bottom-Right overlay) */}
      <div className="tracking-view__bottom-right-overlay">
        <OverheadRadar
          satellites={satellites}
          onSelectSat={(sat) => {
            playLockSound()
            setSelectedSat(sat)
          }}
        />
      </div>

      {/* Floating Center-Bottom Tactical Quick-Action Pill */}
      <div className="tracking-view__center-bottom-pill hud-text">
        {selectedSat ? (
          <div className="tracking-view__target-info">
            <span className="tracking-view__target-dot" style={{ background: selectedSat.color }} />
            <span>TRACKING: {selectedSat.name}</span>
            <span className="hud__faint">({selectedSat.altKm.toFixed(0)} KM)</span>
            <button
              className="tracking-view__reset-btn"
              onClick={() => {
                playBlip(800, 0.02)
                triggerResetView()
              }}
              title="Release camera lock and re-center the Earth"
            >
              ⊙ RESET VIEW / CENTER EARTH
            </button>
          </div>
        ) : (
          <button
            className="tracking-view__recenter-earth-btn"
            onClick={() => {
              playBlip(950, 0.02)
              triggerResetView()
            }}
            title="Recenter camera on Earth globe"
          >
            ⊙ CENTER EARTH VIEW
          </button>
        )}
      </div>

      {/* Slide-in Detailed Telemetry Drawer */}
      <SatelliteDetailDrawer />
    </div>
  )
}
