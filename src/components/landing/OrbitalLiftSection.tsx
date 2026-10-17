import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap, prefersReducedMotion } from '../../lib/motion'

gsap.registerPlugin(ScrollTrigger)

interface OrbitLayer {
  id: string
  name: string
  regime: string
  altitude: string
  velocity: string
  density: 'LOW' | 'VERY HIGH' | 'CRITICAL' | 'MODERATE'
  description: string
  objects: string
  isroPresence: string
}

const ORBIT_LAYERS: OrbitLayer[] = [
  {
    id: 'karman',
    name: 'KÁRMÁN BOUNDARY // MESOSPHERE EXIT',
    regime: 'SUB-ORBITAL',
    altitude: '100 KM',
    velocity: '1,420 M/S',
    density: 'LOW',
    description: 'The internationally accepted boundary of outer space. Atmospheric aerodynamic lift vanishes; centrifugal orbital velocity takes over.',
    objects: 'Sounding rockets, re-entry vehicles, upper atmospheric research payloads.',
    isroPresence: 'RH-560 Sounding Rockets, Gaganyaan atmospheric abort profile.',
  },
  {
    id: 'leo',
    name: 'LOW EARTH ORBIT // HIGH-RES RECON',
    regime: 'LEO / SSO',
    altitude: '450 - 650 KM',
    velocity: '7,650 M/S',
    density: 'CRITICAL',
    description: 'Prime orbital corridor for optical imaging, synthetic aperture radar, and Earth observation. High satellite concentration requires continuous 24×7 collision screening.',
    objects: 'Active Earth observation orbiters, commercial constellations, spent rocket bodies.',
    isroPresence: 'CARTOSAT-3, RISAT-2BR1, EOS-04, OCEANSAT-3.',
  },
  {
    id: 'debris-belt',
    name: 'DEBRIS ACCUMULATION CORRIDOR',
    regime: 'LEO APOGEE',
    altitude: '780 - 1,000 KM',
    velocity: '7,430 M/S',
    density: 'CRITICAL',
    description: 'The most hazard-dense region of near-Earth space. Remnants of historical fragmentation events, ASAT intercepts, and spent upper stages with orbital lifespans exceeding centuries.',
    objects: 'Over 28,000 trackable fragments >10cm; millions of untracked millimetric particulates.',
    isroPresence: 'Monitored 24×7 by ISRO SSA Directorate via NETRA radar network.',
  },
  {
    id: 'meo',
    name: 'MEDIUM EARTH ORBIT // NAVIGATION',
    regime: 'MEO',
    altitude: '20,200 KM',
    velocity: '3,870 M/S',
    density: 'MODERATE',
    description: 'Semisynchronous orbits with 12-hour orbital periods. Low atmospheric drag and stable gravitational perturbations ideal for global positioning.',
    objects: 'GPS, Galileo, GLONASS constellations, NavIC auxiliary orbits.',
    isroPresence: 'NavIC (IRNSS) ground monitoring integration.',
  },
  {
    id: 'geo',
    name: 'GEOSTATIONARY BELT // STRATEGIC COMMS',
    regime: 'GEO / GSO',
    altitude: '35,786 KM',
    velocity: '3,074 M/S',
    density: 'VERY HIGH',
    description: 'The circular equatorial ring where orbital period exactly matches Earth’s rotation (23h 56m 4s). Satellites remain stationary relative to Indian ground receivers.',
    objects: 'High-power broadcast satellites, weather observatories, military communications.',
    isroPresence: 'GSAT-7A, GSAT-31, INSAT-3DR, CMS-01.',
  },
]

export default function OrbitalLiftSection() {
  const [selectedLayer, setSelectedLayer] = useState<OrbitLayer>(ORBIT_LAYERS[1])
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.fromTo(
          '.orbital-lift__level',
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out', overwrite: 'auto' },
        )

        // The fill's resting state lives in CSS (translateX(-100%) hidden →
        // `.is-selected` reveals it) — clear the inline transform when the sweep
        // finishes so the CSS selection pattern regains control. (The anime.js
        // version left inline styles behind and froze every bar visible.)
        gsap.fromTo(
          '.orbital-lift__level-fill',
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.8,
            delay: 0.2,
            stagger: 0.08,
            ease: 'expo.out',
            clearProps: 'transform',
            overwrite: 'auto',
          },
        )
      },
    })

    return () => {
      trigger.kill()
    }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    gsap.fromTo(
      '.orbital-lift__intel-deck',
      { y: 12, opacity: 0.5 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' },
    )
  }, [selectedLayer, reducedMotion])

  return (
    <section className="orbital-lift" ref={sectionRef} aria-label="Orbital Altitude & Regime Stratification">
      <div className="orbital-lift__header">
        <div className="orbital-lift__badge-row">
          <span className="orbital-lift__tag hud-text">STRATIFICATION RADAR</span>
          <span className="orbital-lift__pill hud-text">
            <span className="orbital-lift__dot" />
            GROUND-TO-GEO ELEVATION MAP
          </span>
        </div>
        <h2 className="orbital-lift__title display">
          FROM GROUND HORIZON <span className="accent">TO GEOSTATIONARY VOID</span>
        </h2>
        <p className="orbital-lift__sub">
          Explore orbital regimes monitored by Project NETRA. Each corridor poses distinct aerodynamic decay rates, collision risks, and surveillance imperatives for Indian space assets.
        </p>
      </div>

      <div className="orbital-lift__container">
        {/* Left: Altitude Ladder / Visual Tower */}
        <div className="orbital-lift__ladder" role="tablist" aria-label="Orbital regime altitude levels">
          {ORBIT_LAYERS.map((layer) => {
            const isSelected = layer.id === selectedLayer.id
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`orbital-lift__level ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedLayer(layer)}
              >
                <div className="orbital-lift__level-meta">
                  <span className="orbital-lift__level-alt hud-text">{layer.altitude}</span>
                  <span className="orbital-lift__level-tag hud-text">{layer.regime}</span>
                </div>
                <div className="orbital-lift__level-bar">
                  <div className="orbital-lift__level-fill" />
                </div>
                <span className="orbital-lift__level-name">{layer.name.split('//')[0]?.trim()}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Detailed Regime Intelligence Deck */}
        <div className="orbital-lift__intel-deck" role="tabpanel">
          <div className="orbital-lift__intel-header">
            <div>
              <span className="orbital-lift__intel-eyebrow hud-text">REGIME INTELLIGENCE // {selectedLayer.regime}</span>
              <h3 className="orbital-lift__intel-name">{selectedLayer.name}</h3>
            </div>
            <div className="orbital-lift__intel-badge hud-text" data-density={selectedLayer.density}>
              <span>CONGESTION: {selectedLayer.density}</span>
            </div>
          </div>

          <p className="orbital-lift__intel-desc">{selectedLayer.description}</p>

          <div className="orbital-lift__metrics-row">
            <div className="orbital-lift__metric">
              <span className="hud-text">NOMINAL ALTITUDE</span>
              <strong>{selectedLayer.altitude}</strong>
            </div>
            <div className="orbital-lift__metric">
              <span className="hud-text">ORBITAL VELOCITY</span>
              <strong>{selectedLayer.velocity}</strong>
            </div>
            <div className="orbital-lift__metric">
              <span className="hud-text">TRACKING PRIORITY</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>NETRA TIER-1</strong>
            </div>
          </div>

          <div className="orbital-lift__intel-boxes">
            <div className="orbital-lift__intel-box">
              <span className="orbital-lift__box-label hud-text">KEY SATELLITE POPULATION</span>
              <p>{selectedLayer.objects}</p>
            </div>
            <div className="orbital-lift__intel-box">
              <span className="orbital-lift__box-label hud-text">BHARAT (ISRO) FLEET ASSETS</span>
              <p>{selectedLayer.isroPresence}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
