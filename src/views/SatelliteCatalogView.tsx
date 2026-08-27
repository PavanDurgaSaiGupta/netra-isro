import { useState, useMemo, useEffect } from 'react'
import { useSatellites } from '../context/SatelliteContext'
import SatelliteDetailDrawer from '../components/console/SatelliteDetailDrawer'
import DataSkeleton from '../components/shell/DataSkeleton'
import { playBlip, playLockSound } from '../utils/audio'

type SortField = 'name' | 'noradId' | 'altKm' | 'speedKmS' | 'inclinationDeg'
type SortDir = 'asc' | 'desc'
type ViewMode = 'auto' | 'table' | 'cards'

export default function SatelliteCatalogView() {
  const {
    filteredSatellites,
    loading,
    searchQuery,
    setSearchQuery,
    filterRegime,
    setFilterRegime,
    setSelectedSat,
    selectedSat,
  } = useSatellites()

  const [sortField, setSortField] = useState<SortField>('altKm')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('auto')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSort = (field: SortField) => {
    playBlip(1100, 0.02)
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedList = useMemo(() => {
    return [...filteredSatellites].sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
    })
  }, [filteredSatellites, sortField, sortDir])

  const showCards = viewMode === 'cards' || (viewMode === 'auto' && isMobile)

  return (
    <div className="catalog-view">
      {/* Control Strip */}
      <div className="catalog-view__toolbar">
        <div className="catalog-view__search-wrap">
          <span className="catalog-view__search-icon">⌕</span>
          <input
            type="text"
            className="catalog-view__search-input hud-text"
            placeholder="FILTER CATALOG BY NAME, NORAD ID, OPERATOR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
          />
          {searchQuery && (
            <button
              className="catalog-view__clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="catalog-view__pills hud-text">
          {(['ALL', 'ISRO', 'DEBRIS', 'LEO', 'GEO'] as const).map((tag) => (
            <button
              key={tag}
              className={`catalog-view__pill ${filterRegime === tag ? 'catalog-view__pill--active' : ''}`}
              onClick={() => {
                playBlip(1200, 0.02)
                setFilterRegime(tag)
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Stats & View Switcher */}
        <div className="catalog-view__stats-wrap hud-text">
          <div className="catalog-view__stats hud__faint">
            <span>BUFFER: {sortedList.length} OBJECTS</span>
          </div>

          <div className="catalog-view__mode-toggle">
            <button
              type="button"
              className={`catalog-view__toggle-btn ${!showCards ? 'catalog-view__toggle-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              TABLE
            </button>
            <button
              type="button"
              className={`catalog-view__toggle-btn ${showCards ? 'catalog-view__toggle-btn--active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
            >
              CARDS
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="catalog-view__content">
        {loading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <DataSkeleton count={12} height={42} />
          </div>
        ) : showCards ? (
          /* Mobile / Responsive Card Grid View */
          <div className="catalog-view__cards-grid">
            {sortedList.map((sat) => {
              const isSelected = selectedSat?.id === sat.id
              const isDebris = sat.type === 'debris'
              const isAboveHorizon = sat.elevationDeg > 0

              return (
                <div
                  key={sat.id}
                  className={`catalog-card ${isSelected ? 'catalog-card--selected' : ''}`}
                  onClick={() => {
                    playLockSound()
                    setSelectedSat(sat)
                  }}
                >
                  <div className="catalog-card__head">
                    <div className="catalog-card__title-group">
                      <span
                        className="catalog-card__dot"
                        style={{
                          background: isDebris ? 'var(--status-warning)' : 'var(--status-active)',
                          boxShadow: `0 0 8px ${isDebris ? 'var(--status-warning)' : 'var(--status-active)'}`,
                        }}
                      />
                      <div>
                        <h3 className="catalog-card__name">{sat.name}</h3>
                        <span className="catalog-card__operator hud-text">{sat.operator}</span>
                      </div>
                    </div>

                    <span className={`catalog-table__regime-badge catalog-table__regime--${sat.orbitClass.toLowerCase()}`}>
                      {sat.orbitClass}
                    </span>
                  </div>

                  <div className="catalog-card__metrics hud-text">
                    <div className="catalog-card__metric">
                      <span className="catalog-card__metric-label">ALTITUDE</span>
                      <span className="catalog-card__metric-val">{sat.altKm.toFixed(1)} KM</span>
                    </div>
                    <div className="catalog-card__metric">
                      <span className="catalog-card__metric-label">VELOCITY</span>
                      <span className="catalog-card__metric-val">{sat.speedKmS.toFixed(2)} KM/S</span>
                    </div>
                    <div className="catalog-card__metric">
                      <span className="catalog-card__metric-label">INCLINATION</span>
                      <span className="catalog-card__metric-val">{sat.inclinationDeg.toFixed(1)}°</span>
                    </div>
                    <div className="catalog-card__metric">
                      <span className="catalog-card__metric-label">NORAD ID</span>
                      <span className="catalog-card__metric-val">{sat.noradId}</span>
                    </div>
                  </div>

                  <div className="catalog-card__footer hud-text">
                    <span
                      style={{
                        color: isAboveHorizon ? 'var(--status-active)' : 'var(--text-tertiary)',
                        fontSize: '9px',
                      }}
                    >
                      {isAboveHorizon ? '● ISTRAC VISIBLE' : '○ OCCLUDED'}
                    </span>

                    <button
                      type="button"
                      className="catalog-card__btn u-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        playLockSound()
                        setSelectedSat(sat)
                      }}
                    >
                      INSPECT TELEMETRY ↗
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Desktop / Scrollable Table View */
          <div className="catalog-view__table-container">
            <table className="catalog-table">
              <thead>
                <tr className="hud-text">
                  <th style={{ width: '40px' }}>STAT</th>
                  <th onClick={() => handleSort('name')} className="catalog-table__sortable">
                    OBJECT NAME {sortField === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('noradId')} className="catalog-table__sortable">
                    NORAD ID {sortField === 'noradId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>OPERATOR / MISSION</th>
                  <th>REGIME</th>
                  <th onClick={() => handleSort('altKm')} className="catalog-table__sortable catalog-table__num">
                    ALTITUDE (KM) {sortField === 'altKm' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('speedKmS')} className="catalog-table__sortable catalog-table__num">
                    VELOCITY (KM/S) {sortField === 'speedKmS' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('inclinationDeg')} className="catalog-table__sortable catalog-table__num">
                    INCLINATION {sortField === 'inclinationDeg' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>ISTRAC HORIZON</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((sat) => {
                  const isSelected = selectedSat?.id === sat.id
                  const isDebris = sat.type === 'debris'
                  const isAboveHorizon = sat.elevationDeg > 0

                  return (
                    <tr
                      key={sat.id}
                      className={`catalog-table__row ${isSelected ? 'catalog-table__row--selected' : ''}`}
                      onClick={() => {
                        playLockSound()
                        setSelectedSat(sat)
                      }}
                    >
                      <td>
                        <span
                          className="catalog-table__status-dot"
                          style={{
                            background: isDebris ? 'var(--status-warning)' : 'var(--status-active)',
                            boxShadow: `0 0 6px ${isDebris ? 'var(--status-warning)' : 'var(--status-active)'}`,
                          }}
                        />
                      </td>
                      <td className="catalog-table__name-cell">
                        <span className="catalog-table__name">{sat.name}</span>
                      </td>
                      <td className="catalog-table__norad hud-text">{sat.noradId}</td>
                      <td className="catalog-table__operator hud-text">{sat.operator}</td>
                      <td>
                        <span className={`catalog-table__regime-badge catalog-table__regime--${sat.orbitClass.toLowerCase()}`}>
                          {sat.orbitClass}
                        </span>
                      </td>
                      <td className="catalog-table__num hud-text">{sat.altKm.toFixed(1)}</td>
                      <td className="catalog-table__num hud-text">{sat.speedKmS.toFixed(2)}</td>
                      <td className="catalog-table__num hud-text">{sat.inclinationDeg.toFixed(1)}°</td>
                      <td className="hud-text">
                        <span
                          style={{
                            color: isAboveHorizon ? 'var(--status-active)' : 'var(--text-tertiary)',
                            fontSize: '9px',
                          }}
                        >
                          {isAboveHorizon ? '● VISIBLE' : '○ OCCLUDED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="catalog-table__inspect-btn u-link hud-text"
                          onClick={(e) => {
                            e.stopPropagation()
                            playLockSound()
                            setSelectedSat(sat)
                          }}
                        >
                          INSPECT ↗
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared slide-in detail drawer */}
      <SatelliteDetailDrawer />
    </div>
  )
}
