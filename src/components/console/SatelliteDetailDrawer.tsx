import { useEffect, useMemo, useRef, useState } from 'react'
import { DUR, EASE, gsap, prefersReducedMotion, stagger, useGSAP } from '../../lib/motion'
import { useSatellites } from '../../context/SatelliteContext'
import OdometerNumber from '../shell/OdometerNumber'
import { fetchTransmitters, type RadioTransmitter } from '../../services/satnogs'
import type { SatelliteItem } from '../../services/satelliteData'
import {
  describeNextPass,
  formatCountdown,
  predictPasses,
  type PassPrediction,
} from '../../services/passes'

const SOURCE_LABEL: Record<SatelliteItem['source'], string> = {
  celestrak: 'CELESTRAK LIVE',
  cached: 'CELESTRAK CACHE',
  seed: 'DEMO ELEMENTS',
  wheretheiss: 'LIVE FEED',
}

const RISK_LEVELS: Record<SatelliteItem['conjunctionRisk'], { label: string; width: string; color: string }> = {
  LOW: { label: 'NOMINAL (Pc < 1E-06)', width: '14%', color: 'var(--status-active)' },
  MEDIUM: { label: 'ELEVATED (MONITORED)', width: '52%', color: 'var(--status-warning)' },
  CRITICAL: { label: 'CRITICAL (SCREENED)', width: '82%', color: 'var(--status-critical)' },
}

export default function SatelliteDetailDrawer() {
  const { selectedSat, satellites, setSelectedSat, triggerRecenter, triggerResetView } = useSatellites()
  const drawerRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const selectedId = selectedSat?.id ?? null
  const isOpen = selectedId !== null
  const [displaySat, setDisplaySat] = useState<SatelliteItem | null>(selectedSat)

  // RF profile — SatNOGS DB (fetched once per 24 h service-side cache, filtered per object)
  const [transmitters, setTransmitters] = useState<RadioTransmitter[] | null>(null)
  const noradId = selectedSat?.noradId ?? null
  useEffect(() => {
    let live = true
    if (noradId === null) {
      setTransmitters(null)
      return
    }
    setTransmitters(null)
    fetchTransmitters(noradId)
      .then((rows) => {
        if (live) setTransmitters(rows)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [noradId])

  // NEXT PASS OVER ISTRAC — pass prediction (contract item 4), computed ONLY for the
  // selected satellite, once per selection: memoized on the element-set key (the
  // service caches per noradId for the session, so re-selecting an object is free),
  // never per frame. The 1 Hz interval exists only to move the countdown state and
  // requests one recompute once every predicted pass in the window has set.
  const sat = selectedSat || displaySat
  const tleKey = sat ? `${sat.noradId}|${sat.tle1}|${sat.tle2}` : null
  const [passNonce, setPassNonce] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  // The nonce rides in the memo key: bumping it re-runs prediction from `now`.
  const passKey = tleKey ? `${tleKey}|${passNonce}` : null
  const passes = useMemo<PassPrediction[] | null>(() => {
    if (!passKey) return null
    const [noradStr, tle1, tle2] = passKey.split('|')
    return predictPasses({ noradId: Number(noradStr), tle1, tle2 })
  }, [passKey])
  const lastLosMs = passes && passes.length > 0 ? passes[passes.length - 1].losMs : 0
  useEffect(() => {
    if (!lastLosMs) return
    const id = setInterval(() => {
      if (Date.now() > lastLosMs) {
        setPassNonce((n) => n + 1) // window exhausted — repredict from now
        return
      }
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [lastLosMs])

  // Drawer open / close slide — keyed on the OPEN STATE, not the per-tick object
  // identity from the context (which re-ran the entrance tween every 1.5 s: visible
  // flicker) and not the id (which would re-slide the whole panel on every switch).
  // Selection changes are handled by the restage effect below.
  useGSAP(
    () => {
      const root = drawerRef.current
      if (!root) return
      if (selectedSat) {
        setDisplaySat(selectedSat)
        if (prefersReducedMotion()) {
          gsap.set(root, { xPercent: 0 })
        } else {
          gsap.fromTo(
            root,
            { xPercent: 105 },
            { xPercent: 0, duration: DUR.base, ease: EASE.entrance, overwrite: 'auto' },
          )
        }
        return
      }
      if (!displaySat) return
      if (prefersReducedMotion()) {
        gsap.set(root, { xPercent: 105 })
        setDisplaySat(null)
        return
      }
      gsap.to(root, {
        xPercent: 105,
        duration: DUR.fast,
        ease: EASE.exit,
        overwrite: 'auto',
        onComplete: () => setDisplaySat(null),
      })
    },
    { scope: drawerRef, dependencies: [isOpen] },
  )

  // Dossier restage — the three dossier groups slide in with the 60ms stagger on
  // every selection change. Keyed on the stable id (the flicker fix). The body
  // remounts per id, so groups always restage from their pristine CSS state.
  useGSAP(
    () => {
      if (!selectedId) return
      const body = bodyRef.current
      if (!body || prefersReducedMotion()) return
      const groups = gsap.utils.toArray<HTMLElement>('.sat-drawer__group', body)
      if (groups.length === 0) return
      gsap.fromTo(
        groups,
        { autoAlpha: 0, x: 28 },
        {
          autoAlpha: 1,
          x: 0,
          duration: DUR.base,
          ease: EASE.entrance,
          stagger: stagger(groups.length),
          clearProps: 'opacity,visibility,transform',
        },
      )
    },
    { scope: drawerRef, dependencies: [selectedId] },
  )

  // ESC closes the drawer (contract §4: close via ESC and button)
  useEffect(() => {
    if (!selectedId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      triggerResetView()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, triggerResetView])

  const handleClose = () => {
    triggerResetView()
  }

  // Derive the headline pass + the 2 that follow it (contract: countdown pass, then
  // "the following 2 passes"). passes are ordered by AOS.
  const nextPass = describeNextPass(passes, nowMs)
  const nextIdx = nextPass.pass && passes ? passes.findIndex((p) => p === nextPass.pass) : -1
  const followingPasses = nextIdx >= 0 && passes ? passes.slice(nextIdx + 1, nextIdx + 3) : []

  if (!sat) {
    return (
      <aside className="sat-drawer" ref={drawerRef} style={{ transform: 'translateX(105%)' }} aria-hidden="true" />
    )
  }

  const currentIndex = satellites.findIndex((s) => s.id === sat.id)

  const handlePrev = () => {
    if (satellites.length === 0) return
    const prevIdx = (currentIndex - 1 + satellites.length) % satellites.length
    setSelectedSat(satellites[prevIdx])
  }

  const handleNext = () => {
    if (satellites.length === 0) return
    const nextIdx = (currentIndex + 1) % satellites.length
    setSelectedSat(satellites[nextIdx])
  }

  const isDebris = sat.type === 'debris'
  const isAboveHorizon = sat.elevationDeg > 0
  const risk = RISK_LEVELS[sat.conjunctionRisk]

  return (
    <aside
      className="sat-drawer"
      ref={drawerRef}
      style={{ transform: 'translateX(105%)' }}
      aria-label="Satellite Detailed Telemetry Drawer"
    >
      <div className="sat-drawer__inner">
        {/* Multi-satellite Quick Switcher Carousel (persistent chrome) */}
        <div className="sat-drawer__switcher hud-text">
          <button
            type="button"
            className="sat-drawer__switcher-btn"
            onClick={handlePrev}
            title="Fly camera to previous satellite"
          >
            ◀ PREV SATELLITE
          </button>
          <span className="sat-drawer__switcher-index">
            {currentIndex >= 0 ? `${currentIndex + 1} OF ${satellites.length}` : '—'}
          </span>
          <button
            type="button"
            className="sat-drawer__switcher-btn"
            onClick={handleNext}
            title="Fly camera to next satellite"
          >
            NEXT SATELLITE ▶
          </button>
        </div>

        {/* Header row: type badge + close (persistent) */}
        <div className="sat-drawer__head">
          <div className="sat-drawer__badge-row">
            <span
              className={`sat-drawer__badge ${
                isDebris ? 'sat-drawer__badge--debris' : 'sat-drawer__badge--payload'
              }`}
            >
              {isDebris ? 'TRACKED DEBRIS FRAGMENT' : 'ACTIVE ORBITAL PAYLOAD'}
            </span>
            <span className="sat-drawer__regime-badge">{sat.orbitClass}</span>
          </div>

          <button
            type="button"
            className="sat-drawer__close-btn"
            onClick={handleClose}
            aria-label="Close telemetry drawer"
            title="Close Drawer (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Header row: name in Orbitron + registration line (persistent) */}
        <div className="sat-drawer__title-block">
          <h2 className="sat-drawer__name">{sat.name}</h2>
          <div className="sat-drawer__norad hud-text">
            <span>NORAD CAT ID: {sat.noradId}</span>
            <span className="sat-drawer__sep">•</span>
            <span>OPERATOR: {sat.operator}</span>
          </div>
        </div>

        {/* Staged dossier — three groups restage (60ms stagger) on selection change */}
        <div className="sat-drawer__body" key={sat.id} ref={bodyRef}>
          <section className="sat-drawer__group" data-dossier="identity" aria-label="Identity">
            <div className="sat-drawer__section-title hud-text">IDENTITY</div>
            <div className="sat-drawer__norad hud-text">
              <span>LAUNCH YEAR: {sat.launchYear}</span>
              <span className="sat-drawer__sep">•</span>
              <span>ELEMENTS: {SOURCE_LABEL[sat.source]}</span>
            </div>
            <div className="sat-drawer__tle-box hud-text">
              <code>{sat.tle1 || 'NO TLE DATA AVAILABLE'}</code>
              <code>{sat.tle2 || ''}</code>
            </div>
          </section>

          <section className="sat-drawer__group" data-dossier="kinematics" aria-label="Kinematics">
            <div className="sat-drawer__section-title hud-text">KINEMATICS</div>

            {/* Conjunction Risk Meter — driven by the item's real screening value */}
            <div className="sat-drawer__risk-card">
              <div className="sat-drawer__risk-head hud-text">
                <span>CONJUNCTION RISK (24H)</span>
                <span style={{ color: risk.color, fontWeight: 700 }}>{risk.label}</span>
              </div>
              <div className="sat-drawer__risk-bar">
                <div
                  className="sat-drawer__risk-fill"
                  style={{ width: risk.width, background: risk.color }}
                />
              </div>
            </div>

            {/* Live Kinematics Grid — values roll via OdometerNumber */}
            <div className="sat-drawer__grid">
              <div className="sat-drawer__metric">
                <span className="sat-drawer__metric-label hud-text">ALTITUDE</span>
                <div className="sat-drawer__metric-val">
                  <OdometerNumber
                    className="sat-drawer__metric-num"
                    value={sat.altKm}
                    format={(n) => n.toFixed(1)}
                  />
                  <span className="sat-drawer__metric-unit">KM</span>
                </div>
              </div>

              <div className="sat-drawer__metric">
                <span className="sat-drawer__metric-label hud-text">ORBITAL VELOCITY</span>
                <div className="sat-drawer__metric-val">
                  <OdometerNumber
                    className="sat-drawer__metric-num"
                    value={sat.speedKmS}
                    format={(n) => n.toFixed(2)}
                  />
                  <span className="sat-drawer__metric-unit">KM/S</span>
                </div>
              </div>

              <div className="sat-drawer__metric">
                <span className="sat-drawer__metric-label hud-text">INCLINATION</span>
                <div className="sat-drawer__metric-val">
                  <OdometerNumber
                    className="sat-drawer__metric-num"
                    value={sat.inclinationDeg}
                    format={(n) => n.toFixed(2)}
                  />
                  <span className="sat-drawer__metric-unit">DEG</span>
                </div>
              </div>

              <div className="sat-drawer__metric">
                <span className="sat-drawer__metric-label hud-text">ORBITAL PERIOD</span>
                <div className="sat-drawer__metric-val">
                  <OdometerNumber
                    className="sat-drawer__metric-num"
                    value={sat.periodMin}
                    format={(n) => n.toFixed(1)}
                  />
                  <span className="sat-drawer__metric-unit">MIN</span>
                </div>
              </div>
            </div>

            {/* Sub-Satellite Ground Track */}
            <div className="sat-drawer__geo-card hud-text">
              <div className="sat-drawer__geo-row">
                <span className="hud__faint">LATITUDE:</span>
                <span className="sat-drawer__geo-val">
                  {`${Math.abs(sat.lat).toFixed(3)}° ${sat.lat >= 0 ? 'N' : 'S'}`}
                </span>
              </div>
              <div className="sat-drawer__geo-row">
                <span className="hud__faint">LONGITUDE:</span>
                <span className="sat-drawer__geo-val">
                  {`${Math.abs(sat.lng).toFixed(3)}° ${sat.lng >= 0 ? 'E' : 'W'}`}
                </span>
              </div>
            </div>
          </section>

          <section className="sat-drawer__group" data-dossier="ground-link" aria-label="Ground link">
            <div className="sat-drawer__section-title hud-text">GROUND LINK</div>

            {/* Bengaluru ISTRAC Antenna Look Angles */}
            <div className="sat-drawer__antenna-card">
              <div className="sat-drawer__antenna-row hud-text">
                <span>AZIMUTH:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{`${sat.azimuthDeg.toFixed(1)}°`}</span>
              </div>
              <div className="sat-drawer__antenna-row hud-text">
                <span>ELEVATION:</span>
                <span style={{ color: isAboveHorizon ? 'var(--status-active)' : 'var(--text-tertiary)' }}>
                  {`${sat.elevationDeg.toFixed(1)}°`}
                </span>
              </div>
              <div className="sat-drawer__antenna-row hud-text">
                <span>SLANT RANGE:</span>
                <span>{`${Math.round(sat.rangeKm)} KM`}</span>
              </div>
              <div className="sat-drawer__antenna-status hud-text">
                <span className={`sat-drawer__ant-dot ${isAboveHorizon ? 'sat-drawer__ant-dot--active' : ''}`} />
                <span>{isAboveHorizon ? '● SATELLITE VISIBLE ABOVE ISTRAC HORIZON' : '○ SATELLITE BELOW LOCAL HORIZON'}</span>
              </div>
            </div>

            {/* NEXT PASS OVER ISTRAC — predicted rise/set over the ground station.
                Computed once per selection (session-cached); countdown rolls via
                OdometerNumber, LOS/AOS stated in IST. */}
            <div className="sat-drawer__antenna-card" aria-label="Upcoming passes over ISTRAC Bengaluru within 48 hours">
              <div className="sat-drawer__section-title hud-text">NEXT PASS OVER ISTRAC</div>
              {passes === null ? (
                <div className="sat-drawer__antenna-status hud-text">
                  <span>⟳ PREDICTING PASS WINDOW (48 H)…</span>
                </div>
              ) : nextPass.phase === 'none' || !nextPass.pass ? (
                <div className="sat-drawer__antenna-status hud-text">
                  <span>○ NO PASS OVER ISTRAC WITHIN 48 H</span>
                </div>
              ) : (
                <>
                  {nextPass.phase === 'in-progress' ? (
                    <div className="sat-drawer__antenna-row hud-text">
                      <span>PASS IN PROGRESS:</span>
                      <span style={{ color: 'var(--status-active)' }}>
                        LOS IN {formatCountdown(nextPass.secondsUntilEvent)}
                      </span>
                    </div>
                  ) : (
                    <div className="sat-drawer__metric">
                      <span className="sat-drawer__metric-label hud-text">COUNTDOWN TO AOS</span>
                      <div className="sat-drawer__metric-val">
                        <OdometerNumber
                          className="sat-drawer__metric-num"
                          value={nextPass.secondsUntilEvent}
                          format={formatCountdown}
                        />
                      </div>
                    </div>
                  )}
                  <div className="sat-drawer__antenna-row hud-text">
                    <span>TIME OF AOS:</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{nextPass.pass.aosUtc} IST</span>
                  </div>
                  <div className="sat-drawer__antenna-row hud-text">
                    <span>TIME OF LOS:</span>
                    <span>{nextPass.pass.losUtc} IST</span>
                  </div>
                  <div className="sat-drawer__antenna-row hud-text">
                    <span>MAX ELEVATION:</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{nextPass.pass.maxElevDeg.toFixed(1)}°</span>
                  </div>
                  <div className="sat-drawer__antenna-row hud-text">
                    <span>PASS DURATION:</span>
                    <span>{nextPass.pass.durationMin.toFixed(1)} MIN</span>
                  </div>
                  {followingPasses.map((p, i) => (
                    <div key={p.aosMs} className="sat-drawer__antenna-row hud-text">
                      <span>{`FOLLOWING PASS ${i + 1}:`}</span>
                      <span>
                        {`${p.aosUtc} IST · PEAK ${p.maxElevDeg.toFixed(0)}° · ${p.durationMin.toFixed(0)} MIN`}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Live RF profile — SatNOGS DB transmitter registry */}
            <div className="sat-drawer__antenna-card" aria-label="Registered radio transmitters">
              <div className="sat-drawer__section-title hud-text">RF PROFILE — SATNOGS DB</div>
              {transmitters === null ? (
                <div className="sat-drawer__antenna-status hud-text">
                  <span>⟳ QUERYING TRANSMITTER REGISTRY…</span>
                </div>
              ) : transmitters.length === 0 ? (
                <div className="sat-drawer__antenna-status hud-text">
                  <span>○ NO TRANSMITTER REGISTERED FOR THIS OBJECT</span>
                </div>
              ) : (
                transmitters.slice(0, 4).map((t, i) => (
                  <div key={i} className="sat-drawer__antenna-row hud-text">
                    <span>
                      {t.mode ?? 'RADIO'}
                      {t.baud ? ` · ${t.baud} Bd` : ''}:
                    </span>
                    <span style={{ color: t.alive ? 'var(--status-active)' : 'var(--text-tertiary)' }}>
                      {t.downlinkMhz
                        ? `${t.downlinkMhz.toFixed(3)} MHz`
                        : t.description.toUpperCase().slice(0, 26)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="sat-drawer__actions">
              <button
                type="button"
                className="sat-drawer__btn sat-drawer__btn--secondary"
                onClick={() => {
                  triggerRecenter()
                }}
                title="Fly camera to focus closely on this object in 3D"
              >
                ⊙ RECENTER SATELLITE
              </button>
              <button
                type="button"
                className="sat-drawer__btn sat-drawer__btn--primary"
                onClick={() => {
                  triggerResetView()
                }}
                title="Unfocus and zoom back out to center the Earth"
              >
                RESET TO CENTER EARTH
              </button>
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}
