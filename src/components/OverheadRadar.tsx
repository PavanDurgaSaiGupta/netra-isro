import { useEffect, useMemo, useState } from 'react'
import { fetchLiveISS, type SatelliteItem } from '../services/satelliteData'
import { fetchSubpointRegion } from '../services/issTrack'
import {
  describeNextPass,
  formatCountdown,
  predictPasses,
  type PassPrediction,
} from '../services/passes'

interface Props {
  satellites: SatelliteItem[]
  onSelectSat: (sat: SatelliteItem) => void
}

// Radar cone radius claimed by the coords legend — blips clamp to the scope edge beyond it
const COVERAGE_KM = 3200

const isISS = (sat: SatelliteItem) => sat.noradId === 25544 || sat.id === 'iss-zarya'

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

  // Sub-point region — one small reverse geocode per half-degree of movement
  // (~7 minutes of ISS travel), so the readout updates without hammering the API.
  const [region, setRegion] = useState<string | null>(null)
  const geoKey = issData ? `${(Math.round(issData.lat * 2) / 2).toFixed(2)},${(Math.round(issData.lng * 2) / 2).toFixed(2)}` : ''
  useEffect(() => {
    if (!geoKey) return
    let alive = true
    const [lat, lng] = geoKey.split(',').map(Number)
    fetchSubpointRegion(lat, lng)
      .then((code) => {
        if (alive && code) setRegion(code)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [geoKey])

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

  // NEXT PASS one-liner (contract item 4) — ISS pass prediction over ISTRAC. This
  // component has no selected-object prop, so the tracked object is the ISS
  // (noradId 25544 / iss-zarya), matching the LOCK ISS feed below. Computed once
  // per element set — memoized on the TLE key, session-cached in the service,
  // never per frame; a 1 Hz interval moves the countdown text and repredicts once
  // every predicted pass has set.
  const issSat = satellites.find((s) => isISS(s)) ?? null
  const issTleKey = issSat ? `${issSat.noradId}|${issSat.tle1}|${issSat.tle2}` : null
  const [issPassNonce, setIssPassNonce] = useState(0)
  const [issNowMs, setIssNowMs] = useState(() => Date.now())
  // The nonce rides in the memo key: bumping it re-runs prediction from `now`.
  const issPassKey = issTleKey ? `${issTleKey}|${issPassNonce}` : null
  const issPasses = useMemo<PassPrediction[] | null>(() => {
    if (!issPassKey) return null
    const [noradStr, tle1, tle2] = issPassKey.split('|')
    return predictPasses({ noradId: Number(noradStr), tle1, tle2 })
  }, [issPassKey])
  const issLastLosMs =
    issPasses && issPasses.length > 0 ? issPasses[issPasses.length - 1].losMs : 0
  useEffect(() => {
    if (!issLastLosMs) return
    const id = setInterval(() => {
      if (Date.now() > issLastLosMs) {
        setIssPassNonce((n) => n + 1) // window exhausted — repredict from now
        return
      }
      setIssNowMs(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [issLastLosMs])

  const issNext = describeNextPass(issPasses, issNowMs)
  let issPassLine = 'NEXT PASS: NONE WITHIN 48 H'
  if (!issTleKey) {
    issPassLine = 'NEXT PASS: ISS NOT IN TRACK LIST'
  } else if (!issPasses) {
    issPassLine = 'NEXT PASS: COMPUTING…'
  } else if (issNext.phase === 'in-progress' && issNext.pass) {
    issPassLine = `ISS PASS OVERHEAD · LOS IN ${formatCountdown(issNext.secondsUntilEvent, 'minutes')}`
  } else if (issNext.phase === 'upcoming' && issNext.pass) {
    issPassLine = `NEXT PASS IN ${formatCountdown(issNext.secondsUntilEvent, 'minutes')}`
  }

  // Satellites currently overhead in the Indian radar cone (elevation > -15°)
  const nearSubcontinent = satellites.filter(
    (s) => s.lat > -10 && s.lat < 40 && s.lng > 60 && s.lng < 100,
  )

  // Polar scope plot: true azimuth from ISTRAC + slant range, eased so that
  // near-zenith passes spread out instead of crowding the station marker.
  const plotBlip = (sat: SatelliteItem) => {
    const rangeNorm = Math.min(Math.max(sat.rangeKm / COVERAGE_KM, 0), 1)
    const easedRange = Math.sqrt(rangeNorm)
    const azRad = (sat.azimuthDeg * Math.PI) / 180
    // 0° = North (up), clockwise — 46% keeps blips inside the scope bezel
    const left = 50 + Math.sin(azRad) * easedRange * 46
    const top = 50 - Math.cos(azRad) * easedRange * 46
    return { left, top }
  }

  const activateContact = (sat: SatelliteItem) => {
    onSelectSat(sat)
  }

  const handleRowKeyDown = (e: React.KeyboardEvent, sat: SatelliteItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activateContact(sat)
    }
  }

  return (
    <div className={`radar-widget ${collapsed ? 'radar-widget--collapsed' : ''}`}>
      {/* Widget Header */}
      <button
        type="button"
        className="radar-widget__head hud-text"
        onClick={() => {
          setCollapsed(!collapsed)
        }}
        aria-expanded={!collapsed}
        aria-controls="radar-widget-body"
        title={collapsed ? 'Expand radar cone' : 'Collapse radar cone'}
      >
        <div className="radar-widget__title">
          <span className="radar-widget__dot" aria-hidden="true" />
          <span>BENGALURU ISTRAC RADAR CONE</span>
        </div>
        <div className="radar-widget__toggle">
          <span aria-hidden="true">{collapsed ? '▲ EXPAND' : '▼ HIDE'}</span>
          <span className="sr-only">{collapsed ? 'Expand radar cone' : 'Collapse radar cone'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="radar-widget__body" id="radar-widget-body">
          {/* Radar Sweep & Coordinates */}
          <div className="radar-widget__visual">
            <div className="radar-screen" role="img" aria-label="Radar scope centred on ISTRAC Bengaluru showing overhead contacts by azimuth and range">
              <div className="radar-screen__sweep" aria-hidden="true" />
              <div className="radar-screen__ring radar-screen__ring--1" aria-hidden="true" />
              <div className="radar-screen__ring radar-screen__ring--2" aria-hidden="true" />
              <div className="radar-screen__crosshair radar-screen__crosshair--x" aria-hidden="true" />
              <div className="radar-screen__crosshair radar-screen__crosshair--y" aria-hidden="true" />

              {/* Station center marker */}
              <div className="radar-screen__station" title="ISRO ISTRAC Bengaluru (12.97°N, 77.59°E)" />

              {/* Satellite blips — plotted by live azimuth + range from ISTRAC */}
              {nearSubcontinent.map((s) => {
                const { left, top } = plotBlip(s)
                const iss = isISS(s)
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    className={`radar-screen__blip ${iss ? 'radar-screen__blip--iss' : ''}`}
                    style={{ left: `${left}%`, top: `${top}%`, background: s.color }}
                    title={`${s.name} — AZ ${s.azimuthDeg.toFixed(0)}° / EL ${s.elevationDeg.toFixed(0)}° / ${s.rangeKm.toFixed(0)} km`}
                    aria-label={`Lock contact ${s.name}, azimuth ${s.azimuthDeg.toFixed(0)} degrees, range ${s.rangeKm.toFixed(0)} kilometres`}
                    onClick={() => activateContact(s)}
                    onKeyDown={(e) => handleRowKeyDown(e, s)}
                  />
                )
              })}
            </div>

            <div className="radar-widget__coords hud-text">
              <div>STATION: ISTRAC / DSSAM</div>
              <div>COORD: 12.9716° N, 77.5946° E</div>
              <div>COVERAGE: 3,200 KM RADIUS</div>
              <div title="Predicted time until the ISS next rises above the ISTRAC horizon (from its TLE)">
                {issPassLine}
              </div>
            </div>
          </div>

          {/* ISS Live Position Feed (Clickable to Lock Target) */}
          {issData && (
            <button
              type="button"
              className="radar-widget__iss hud-text radar-widget__iss--clickable"
              onClick={() => {
                const issSat = satellites.find((s) => s.id === 'iss-zarya' || s.noradId === 25544)
                if (issSat) {
                  onSelectSat(issSat)
                }
              }}
              title="Track International Space Station"
            >
              <div className="radar-widget__iss-header">
                <span className="radar-widget__iss-live">◆ ISS (ZARYA) • LIVE STREAM</span>
                <span className="radar-widget__iss-badge">⊙ LOCK ISS</span>
              </div>
              <div className="radar-widget__iss-grid">
                <div>ALT: {issData.altKm.toFixed(1)} km</div>
                <div>VEL: {issData.speedKmS.toFixed(2)} km/s</div>
                <div>LAT: {issData.lat.toFixed(2)}°</div>
                <div>LNG: {issData.lng.toFixed(2)}°</div>
                <div>OVER: {region ?? '···'}</div>
              </div>
            </button>
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
              nearSubcontinent.map((s) => {
                const iss = isISS(s)
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    className={`radar-widget__row ${iss ? 'radar-widget__row--iss' : ''}`}
                    aria-label={`Lock contact ${s.name}, slant range ${s.rangeKm.toFixed(0)} kilometres`}
                    onClick={() => activateContact(s)}
                    onKeyDown={(e) => handleRowKeyDown(e, s)}
                  >
                    <div className="radar-widget__row-name">
                      <span
                        className={`radar-widget__swatch ${iss ? 'radar-widget__swatch--iss' : ''}`}
                        style={{ background: s.color }}
                        aria-hidden="true"
                      />
                      <span>{s.name}</span>
                      {iss && <span className="radar-widget__row-iss-tag">ISS</span>}
                    </div>
                    <div className="radar-widget__row-val hud-text">
                      {s.rangeKm.toFixed(0)} km
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
