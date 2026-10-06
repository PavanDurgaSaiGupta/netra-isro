import { useState, useMemo, useEffect, useRef } from 'react'
import { useSatellites } from '../context/SatelliteContext'
import SatelliteDetailDrawer from '../components/console/SatelliteDetailDrawer'
import DataSkeleton from '../components/shell/DataSkeleton'
import { DUR, EASE, gsap, prefersReducedMotion, stagger, useGSAP } from '../lib/motion'

type SortField = 'name' | 'noradId' | 'altKm' | 'speedKmS' | 'inclinationDeg'
type SortDir = 'asc' | 'desc'
type ViewMode = 'auto' | 'table' | 'cards'

/**
 * Sort-control reset: each sortable <th> holds a real <button> (keyboard + SR access;
 * aria-sort stays on the th). Inline styles restore plain-text visuals and stretch the
 * button across the cell — index.css is not owned here. minHeight: 24 is the WCAG 2.2
 * AA 2.5.8 floor (header cells render ~44px tall as a result).
 */
const SORT_BUTTON_RESET: React.CSSProperties = {
  background: 'none',
  border: 'none',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'inherit',
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  padding: 0,
  minHeight: 24,
}

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

  const showCards = viewMode === 'cards' || (viewMode === 'auto' && isMobile)

  const contentRef = useRef<HTMLDivElement>(null)
  const sortedOnceRef = useRef(false)

  // Sort change choreography (contract §4): rows/cards settle with a 240ms
  // opacity/shift stagger. `stagger(n)` compresses the 60ms step so the total
  // spread never exceeds the 500ms budget at any list size.
  useGSAP(
    () => {
      if (!sortedOnceRef.current) {
        sortedOnceRef.current = true
        return
      }
      if (prefersReducedMotion()) return
      const root = contentRef.current
      if (!root) return
      const targets = root.querySelectorAll<HTMLElement>(
        showCards ? '.catalog-card' : '.catalog-table__row',
      )
      if (!targets.length) return
      gsap.fromTo(
        targets,
        { opacity: 0.3, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: DUR.FAST,
          ease: EASE.ENTRANCE,
          stagger: stagger(targets.length),
          overwrite: 'auto',
        },
      )
    },
    { scope: contentRef, dependencies: [sortField, sortDir] },
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSort = (field: SortField) => {
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

  return (
    <div className="catalog-view">
      <header className="catalog-view__header">
        <span className="hud-text kicker">FLEET INVENTORY & TELEMETRY</span>
        <h1 className="display" style={{ fontSize: '20px', margin: '4px 0 12px' }}>
          SPACE OBJECT CATALOG - LIVE ORBITAL INVENTORY
        </h1>
      </header>
      {/* Control Strip */}
      <div className="catalog-view__toolbar">
        <div className="catalog-view__search-wrap">
          <span className="catalog-view__search-icon">⌕</span>
          <input
            type="text"
            className="catalog-view__search-input hud-text"
            placeholder="FILTER CATALOG BY NAME, NORAD ID, OPERATOR..."
            aria-label="Filter catalog by name, NORAD ID, or operator"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
          />
          {searchQuery && (
            <button
              className="catalog-view__clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear Search"
              /* Hit-area fix (2.5.8): glyph box is ~12x12px. Symmetric padding + negative
                 margin grows the target to >=24x24 with zero layout shift; the box grows
                 right into the wrap's own 12px padding, never leftward over the input. */
              style={{ padding: '6px 16px 6px 0', margin: '-6px -16px -6px 0', minWidth: 24, minHeight: 24 }}
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
              aria-pressed={filterRegime === tag}
              onClick={() => {
                setFilterRegime(tag)
              }}
              /* Hit-area fix (2.5.8): CSS padding 5px 12px yields ~22px height */
              style={{ minHeight: 24 }}
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
              aria-pressed={!showCards}
              onClick={() => setViewMode('table')}
              title="Table View"
              /* Hit-area fix (2.5.8): CSS padding 5px 9px yields ~20px height */
              style={{ minHeight: 24 }}
            >
              TABLE
            </button>
            <button
              type="button"
              className={`catalog-view__toggle-btn ${showCards ? 'catalog-view__toggle-btn--active' : ''}`}
              aria-pressed={showCards}
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              style={{ minHeight: 24 }}
            >
              CARDS
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="catalog-view__content" ref={contentRef}>
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
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${sat.name}, ${sat.orbitClass}, altitude ${sat.altKm.toFixed(1)} kilometers`}
                  className={`catalog-card ${isSelected ? 'catalog-card--selected' : ''}`}
                  onClick={() => {
                    setSelectedSat(sat)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedSat(sat)
                    }
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
                        <h2 className="catalog-card__name">{sat.name}</h2>
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
                        setSelectedSat(sat)
                      }}
                      /* Hit-area fix (2.5.8): CSS padding 0 yields ~11px height */
                      style={{ minHeight: 24 }}
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
            <table className="catalog-table" aria-label="Satellite catalog with live orbital telemetry">
              <thead>
                <tr className="hud-text">
                  <th style={{ width: '40px' }}>STAT</th>
                  <th
                    className="catalog-table__sortable"
                    aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" onClick={() => handleSort('name')} style={SORT_BUTTON_RESET}>
                      OBJECT NAME{' '}
                      {sortField === 'name' && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th
                    className="catalog-table__sortable"
                    aria-sort={sortField === 'noradId' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" onClick={() => handleSort('noradId')} style={SORT_BUTTON_RESET}>
                      NORAD ID{' '}
                      {sortField === 'noradId' && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th>OPERATOR / MISSION</th>
                  <th>REGIME</th>
                  <th
                    className="catalog-table__sortable catalog-table__num"
                    aria-sort={sortField === 'altKm' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" onClick={() => handleSort('altKm')} style={SORT_BUTTON_RESET}>
                      ALTITUDE (KM){' '}
                      {sortField === 'altKm' && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th
                    className="catalog-table__sortable catalog-table__num"
                    aria-sort={sortField === 'speedKmS' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" onClick={() => handleSort('speedKmS')} style={SORT_BUTTON_RESET}>
                      VELOCITY (KM/S){' '}
                      {sortField === 'speedKmS' && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th
                    className="catalog-table__sortable catalog-table__num"
                    aria-sort={sortField === 'inclinationDeg' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" onClick={() => handleSort('inclinationDeg')} style={SORT_BUTTON_RESET}>
                      INCLINATION{' '}
                      {sortField === 'inclinationDeg' && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
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
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedSat(sat)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedSat(sat)
                        }
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
                            setSelectedSat(sat)
                          }}
                          /* Hit-area fix (2.5.8): CSS padding 4px 8px yields ~19px height */
                          style={{ minHeight: 24 }}
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
