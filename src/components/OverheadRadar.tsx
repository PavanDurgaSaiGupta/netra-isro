import { useEffect, useState } from 'react'
import { fetchLiveISS, type SatelliteItem } from '../services/satelliteData'
import { playBlip, playRadarPing } from '../utils/audio'

interface Props {
  satellites: SatelliteItem[]
  onSelectSat: (sat: SatelliteItem) => void
}

export default function OverheadRadar({ satellites, onSelectSat }: Props) {
  const [issData, setIssData] = useState<{
    lat: number
    lng: number
    altKm: number
    speedKmS: number
    visibility: string
    azimuthDeg: number
    elevationDeg: number
    rangeKm: number
  } | null>(null)

  const [collapsed, setCollapsed] = useState(false)

  // Fetch ISS position every 6 seconds
  useEffect(() => {
    let alive = true
    const updateISS = async () => {
      const data = await fetchLiveISS()
      if (alive && data) setIssData(data)
    }
    updateISS()
    const id = setInterval(updateISS, 6000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // Satellites currently overhead in the Indian radar cone (elevation > -15°)
  const nearSubcontinent = satellites.filter(
    (s) => s.lat > -10 && s.lat < 40 && s.lng > 60 && s.lng < 100,
  )

  return (
    <div className={`radar-widget ${collapsed ? 'radar-widget--collapsed' : ''}`}>
      {/* Widget Header */}
      <div
        className="radar-widget__head hud-text"
        onClick={() => {
          playBlip(900, 0.03)
          setCollapsed(!collapsed)
        }}
      >
        <div className="radar-widget__title">
          <span className="radar-widget__dot" />
          <span>BENGALURU ISTRAC RADAR CONE</span>
        </div>
        <div className="radar-widget__toggle">
          <span>{collapsed ? '▲ EXPAND' : '▼ HIDE'}</span>
        </div>
      </div>

      {!collapsed && (
        <div className="radar-widget__body">
          {/* Radar Sweep & Coordinates */}
          <div className="radar-widget__visual">
            <div className="radar-screen">
              <div className="radar-screen__sweep" />
              <div className="radar-screen__ring radar-screen__ring--1" />
              <div className="radar-screen__ring radar-screen__ring--2" />
              <div className="radar-screen__crosshair radar-screen__crosshair--x" />
              <div className="radar-screen__crosshair radar-screen__crosshair--y" />

              {/* Station center marker */}
              <div className="radar-screen__station" title="ISRO ISTRAC Bengaluru (12.97°N, 77.59°E)" />

              {/* Satellite blips */}
              {nearSubcontinent.map((s) => {
                // Map lat/lng delta to radar percentage
                const dx = ((s.lng - 77.59) / 25) * 40
                const dy = -((s.lat - 12.97) / 25) * 40
                const left = Math.max(10, Math.min(90, 50 + dx))
                const top = Math.max(10, Math.min(90, 50 + dy))
                return (
                  <div
                    key={s.id}
                    className="radar-screen__blip"
                    style={{ left: `${left}%`, top: `${top}%`, background: s.color }}
                    title={`${s.name} (${s.altKm.toFixed(0)} km)`}
                    onClick={() => {
                      playRadarPing()
                      onSelectSat(s)
                    }}
                  />
                )
              })}
            </div>

            <div className="radar-widget__coords hud-text">
              <div>STATION: ISTRAC / DSSAM</div>
              <div>COORD: 12.9716° N, 77.5946° E</div>
              <div>COVERAGE: 3,200 KM RADIUS</div>
            </div>
          </div>

          {/* ISS Live Position Feed (Clickable to Lock Target) */}
          {issData && (
            <div
              className="radar-widget__iss hud-text radar-widget__iss--clickable"
              onClick={() => {
                const issSat = satellites.find((s) => s.id === 'sat-iss' || s.noradId === 25544)
                if (issSat) {
                  playRadarPing()
                  onSelectSat(issSat)
                }
              }}
              title="Click to track International Space Station"
            >
              <div className="radar-widget__iss-header">
                <span style={{ color: '#00f0ff' }}>◆ ISS (ZARYA) • LIVE STREAM</span>
                <span className="radar-widget__iss-badge">⊙ LOCK ISS</span>
              </div>
              <div className="radar-widget__iss-grid">
                <div>ALT: {issData.altKm.toFixed(1)} km</div>
                <div>VEL: {issData.speedKmS.toFixed(2)} km/s</div>
                <div>LAT: {issData.lat.toFixed(2)}°</div>
                <div>LNG: {issData.lng.toFixed(2)}°</div>
              </div>
            </div>
          )}

          {/* List of currently visible objects */}
          <div className="radar-widget__list">
            <div className="radar-widget__list-head hud-text">
              <span>TRACKED OVERHEAD ({nearSubcontinent.length})</span>
              <span>RANGE</span>
            </div>
            {nearSubcontinent.length === 0 ? (
              <div className="radar-widget__empty hud-text">SCANNING ORBITAL HORIZON…</div>
            ) : (
              nearSubcontinent.map((s) => (
                <div
                  key={s.id}
                  className="radar-widget__row"
                  onClick={() => {
                    playRadarPing()
                    onSelectSat(s)
                  }}
                >
                  <div className="radar-widget__row-name">
                    <span className="radar-widget__swatch" style={{ background: s.color }} />
                    <span>{s.name}</span>
                  </div>
                  <div className="radar-widget__row-val hud-text">
                    {s.rangeKm.toFixed(0)} km
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
