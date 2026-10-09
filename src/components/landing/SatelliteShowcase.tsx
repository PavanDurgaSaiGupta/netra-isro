import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DUR, EASE, gsap, prefersReducedMotion } from '../../lib/motion'

gsap.registerPlugin(ScrollTrigger)

interface Subsystem {
  id: string
  code: string
  name: string
  description: string
  specs: string[]
  rotY: number
  rotX: number
}

const SUBSYSTEMS: Subsystem[] = [
  {
    id: 'solar',
    code: 'SUBSYS-01 // PWR',
    name: 'GaAs Triple-Junction Solar Arrays',
    description: 'Dual multi-panel wings deploying Gallium-Arsenide photovoltaic cells with 30.5% conversion efficiency. Provides 3.4 kW continuous bus power across sunlit orbital passes.',
    specs: ['Output: 3,400 Watts BOL', 'Deployment: Dual 3-Panel Wings', 'Gimbal: 1-Axis Sun-Tracking Drive', 'Battery: 90 Ah Li-Ion Buffer'],
    rotY: -45,
    rotX: 12,
  },
  {
    id: 'dish',
    code: 'SUBSYS-02 // COMM',
    name: 'Steerable High-Gain Telemetry Reflector',
    description: 'Carbon-fiber parabolic reflector dish providing dual-frequency X/S-band data downlink directly to ISTRAC ground antennas in Bengaluru and Port Blair.',
    specs: ['Frequencies: S-Band / X-Band', 'Downlink Rate: 650 Mbps', 'Pointing Accuracy: 0.05°', 'Target: ISTRAC Bengaluru'],
    rotY: 25,
    rotX: -10,
  },
  {
    id: 'sar',
    code: 'SUBSYS-03 // PAYLOAD',
    name: 'C-Band Synthetic Aperture Radar (SAR)',
    description: 'All-weather, day-and-night active phased-array radar payload capable of penetrating cloud cover, dense foliage, and atmospheric precipitation with sub-meter ground resolution.',
    specs: ['Frequency: 5.35 GHz (C-Band)', 'Resolution: 0.75m Spotlight Mode', 'Swath Width: 10 km to 240 km', 'Polarization: Quad-Pol (HH/HV/VH/VV)'],
    rotY: 15,
    rotX: 28,
  },
  {
    id: 'aocs',
    code: 'SUBSYS-04 // AOCS',
    name: 'Attitude Orbit Control & Star Trackers',
    description: 'Autonomous stellar orientation system backed by monopropellant hydrazine thruster blocks and 4 reaction wheels for 3-axis stabilization and orbital collision avoidance burns.',
    specs: ['Stabilization: 3-Axis Zero-Momentum', 'Actuators: 4x Reaction Wheels (20 Nms)', 'Sensors: Dual Star Trackers + FSS', 'Propulsion: 8x 1N Hydrazine RCS'],
    rotY: -135,
    rotX: 18,
  },
]

interface MissionPreset {
  name: string
  designation: string
  orbit: string
  altitude: string
  velocity: string
  inclination: string
  period: string
  status: string
}

const MISSION_PRESETS: MissionPreset[] = [
  {
    name: 'EOS-04 // RADAR SENTINEL',
    designation: 'RISAT-1A HERITAGE // ISRO',
    orbit: 'SSO (Sun-Synchronous)',
    altitude: '529 KM',
    velocity: '7,612 M/S',
    inclination: '97.5°',
    period: '95.2 MIN',
    status: 'ACTIVE SURVEILLANCE',
  },
  {
    name: 'GSAT-7A // MILITARY RELAY',
    designation: 'INDIAN AIR FORCE SECURE COMMS',
    orbit: 'GEO (Geostationary)',
    altitude: '35,786 KM',
    velocity: '3,074 M/S',
    inclination: '0.04°',
    period: '1,436 MIN',
    status: 'ORBITAL STATIONARY',
  },
  {
    name: 'NETRA-SAT // DEBRIS RADAR',
    designation: 'PROJECT NETRA EARLY WARNING',
    orbit: 'POLAR LEO // OPTICAL & RF',
    altitude: '650 KM',
    velocity: '7,530 M/S',
    inclination: '98.2°',
    period: '97.8 MIN',
    status: 'REAL-TIME TRACKING',
  },
]

export default function SatelliteShowcase() {
  const [activeSubsys, setActiveSubsys] = useState<Subsystem>(SUBSYSTEMS[0])
  const [activePresetIndex, setActivePresetIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(true)

  const rotationRef = useRef({ x: 12, y: -35 })
  const isAutoRotatingRef = useRef(isAutoRotating)
  const isDraggingRef = useRef(isDragging)

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating
    isDraggingRef.current = isDragging
  }, [isAutoRotating, isDragging])

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ startX: number; startY: number; initRotX: number; initRotY: number } | null>(null)
  const satellite3DRef = useRef<HTMLDivElement>(null)
  const rotXBadgeRef = useRef<HTMLSpanElement>(null)
  const rotYBadgeRef = useRef<HTMLSpanElement>(null)

  const currentPreset = MISSION_PRESETS[activePresetIndex]
  const reducedMotion = prefersReducedMotion()

  const updateTransform = useCallback(() => {
    if (!satellite3DRef.current) return
    if (reducedMotion) {
      satellite3DRef.current.style.transform = 'rotateX(10deg) rotateY(-30deg)'
      return
    }
    const { x, y } = rotationRef.current
    satellite3DRef.current.style.transform = `rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`
    if (rotXBadgeRef.current) {
      rotXBadgeRef.current.textContent = `ROT_X: ${Math.round(x)}°`
    }
    if (rotYBadgeRef.current) {
      const normY = Math.round(((y % 360) + 360) % 360)
      rotYBadgeRef.current.textContent = `ROT_Y: ${normY}°`
    }
  }, [reducedMotion])

  // Initial transform setup
  useEffect(() => {
    updateTransform()
  }, [updateTransform])

  // Scroll-driven Y-axis rotation scrub with GSAP ScrollTrigger (zero React state re-renders)
  useEffect(() => {
    if (reducedMotion || !containerRef.current) return

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.2,
      onUpdate: (self) => {
        if (!isDraggingRef.current && isAutoRotatingRef.current) {
          rotationRef.current.y = -55 + self.progress * 360
          updateTransform()
        }
      },
    })

    return () => {
      trigger.kill()
    }
  }, [reducedMotion, updateTransform])

  // Anime.js mechanical deployment & telemetry entrance
  useEffect(() => {
    if (reducedMotion || !containerRef.current) return

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        // Anime.js staggered deployment of solar array panels
        animate('.sat-wing__panel', {
          scaleX: [0, 1],
          opacity: [0, 1],
          delay: stagger(120, { start: 200 }),
          duration: 900,
          ease: 'outElastic(1, .7)',
        })

        // Anime.js parabolic reflector deployment
        animate('.sat-dish__parabola', {
          scale: [0.35, 1],
          opacity: [0, 1],
          duration: 750,
          ease: 'outBack',
        })

        // Anime.js staggered hotspot button entrance
        animate('.sat-showcase__hotspot-btn', {
          translateY: [16, 0],
          opacity: [0, 1],
          delay: stagger(90, { start: 400 }),
          duration: 600,
          ease: 'outQuad',
        })
      },
    })

    return () => {
      trigger.kill()
    }
  }, [reducedMotion])

  // Anime.js kinetic transition when active subsystem changes
  useEffect(() => {
    if (reducedMotion) return
    animate('.sat-showcase__detail-card', {
      translateX: [16, 0],
      opacity: [0.4, 1],
      duration: 380,
      ease: 'outCubic',
    })
  }, [activeSubsys, reducedMotion])

  // Anime.js kinetic gauge stagger on preset change
  useEffect(() => {
    if (reducedMotion) return
    animate('.sat-showcase__gauge', {
      translateY: [10, 0],
      opacity: [0.3, 1],
      delay: stagger(50),
      duration: 400,
      ease: 'outQuad',
    })
  }, [activePresetIndex, reducedMotion])

  // Ambient auto-rotation when user isn't interacting and not scrolling heavily (rAF-driven)
  useEffect(() => {
    if (reducedMotion) return

    let rafId: number
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(64, now - lastTime)
      lastTime = now

      if (isAutoRotatingRef.current && !isDraggingRef.current) {
        rotationRef.current.y = (rotationRef.current.y + 0.02 * dt) % 360
        updateTransform()
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [reducedMotion, updateTransform])

  // Drag interaction handlers (zero React re-renders during mousemove)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    setIsAutoRotating(false)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initRotX: rotationRef.current.x,
      initRotY: rotationRef.current.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY

    // Sensitivity factors: horizontal rotates Y; vertical rotates X (clamped)
    const nextY = dragStartRef.current.initRotY + dx * 0.5
    const nextX = Math.max(-55, Math.min(55, dragStartRef.current.initRotX - dy * 0.35))

    rotationRef.current.x = nextX
    rotationRef.current.y = nextY
    updateTransform()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    setIsDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    dragStartRef.current = null
  }

  const handleSubsysSelect = useCallback((subsys: Subsystem) => {
    setActiveSubsys(subsys)
    setIsAutoRotating(false)
    gsap.to(rotationRef.current, {
      x: subsys.rotX,
      y: subsys.rotY,
      duration: DUR.base,
      ease: EASE.standard,
      onUpdate: updateTransform,
      overwrite: 'auto',
    })
  }, [updateTransform])

  return (
    <section className="sat-showcase" ref={containerRef} aria-label="Interactive Satellite Technology Showcase">
      {/* Background Reticle Grid & Glow */}
      <div className="sat-showcase__bg-glow" aria-hidden="true" />
      <div className="sat-showcase__grid" aria-hidden="true" />

      {/* Header telemetry band */}
      <div className="sat-showcase__header">
        <div className="sat-showcase__badge-row">
          <span className="sat-showcase__tag hud-text">ISRO PAYLOAD EXPLORER</span>
          <span className="sat-showcase__pill hud-text">
            <span className="sat-showcase__dot" />
            3D ANATOMY INSPECTION
          </span>
        </div>
        <h2 className="sat-showcase__title display">
          ORBITAL ANATOMY & <span className="accent">SPACECRAFT ARCHITECTURE</span>
        </h2>
        <p className="sat-showcase__subtitle">
          Rotate and examine the core subsystems powering India's space situational awareness and Earth observation orbiters. Drag in any direction to explore 360° or select a module to focus.
        </p>
      </div>

      <div className="sat-showcase__stage-layout">
        {/* Left: 3D Interactive Satellite Canvas */}
        <div
          className={`sat-showcase__interactive-box ${isDragging ? 'is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          role="region"
          aria-label="Interactive 3D model of satellite. Drag to rotate 360 degrees."
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              rotationRef.current.y -= 15
              setIsAutoRotating(false)
              updateTransform()
            } else if (e.key === 'ArrowRight') {
              rotationRef.current.y += 15
              setIsAutoRotating(false)
              updateTransform()
            } else if (e.key === 'ArrowUp') {
              rotationRef.current.x = Math.max(-55, rotationRef.current.x - 10)
              setIsAutoRotating(false)
              updateTransform()
            } else if (e.key === 'ArrowDown') {
              rotationRef.current.x = Math.min(55, rotationRef.current.x + 10)
              setIsAutoRotating(false)
              updateTransform()
            }
          }}
        >
          {/* Tactical HUD overlays on viewport */}
          <div className="sat-showcase__hud-angles hud-text" aria-hidden="true">
            <span ref={rotXBadgeRef}>ROT_X: 12°</span>
            <span ref={rotYBadgeRef}>ROT_Y: 325°</span>
            <span>FOI: 45° STEREO</span>
          </div>

          <div className="sat-showcase__drag-hint hud-text" aria-hidden="true">
            <span className="sat-showcase__drag-icon">⤾</span>
            <span>DRAG TO ROTATE 360°</span>
          </div>

          {/* 3D Model Perspective Stage */}
          <div className="sat-model-stage" aria-hidden="true">
            <div className="sat-model-world" ref={satellite3DRef}>
              {/* Central Satellite Body (Avionics Bus) */}
              <div className="sat-bus">
                <div className="sat-bus__face sat-bus__face--front">
                  <div className="sat-bus__foil" />
                  <div className="sat-bus__logo">ISRO</div>
                  <div className="sat-bus__label hud-text">NETRA-01</div>
                </div>
                <div className="sat-bus__face sat-bus__face--back">
                  <div className="sat-bus__foil" />
                </div>
                <div className="sat-bus__face sat-bus__face--left">
                  <div className="sat-bus__radiator" />
                </div>
                <div className="sat-bus__face sat-bus__face--right">
                  <div className="sat-bus__radiator" />
                </div>
                <div className="sat-bus__face sat-bus__face--top">
                  <div className="sat-bus__top-deck" />
                </div>
                <div className="sat-bus__face sat-bus__face--bottom">
                  <div className="sat-bus__bottom-deck" />
                </div>
              </div>

              {/* Left Solar Array Wing */}
              <div className={`sat-wing sat-wing--left ${activeSubsys.id === 'solar' ? 'is-active-subsys' : ''}`}>
                <div className="sat-wing__boom" />
                <div className="sat-wing__panel sat-wing__panel--1">
                  <div className="sat-wing__cells" />
                </div>
                <div className="sat-wing__panel sat-wing__panel--2">
                  <div className="sat-wing__cells" />
                </div>
                <div className="sat-wing__panel sat-wing__panel--3">
                  <div className="sat-wing__cells" />
                </div>
              </div>

              {/* Right Solar Array Wing */}
              <div className={`sat-wing sat-wing--right ${activeSubsys.id === 'solar' ? 'is-active-subsys' : ''}`}>
                <div className="sat-wing__boom" />
                <div className="sat-wing__panel sat-wing__panel--1">
                  <div className="sat-wing__cells" />
                </div>
                <div className="sat-wing__panel sat-wing__panel--2">
                  <div className="sat-wing__cells" />
                </div>
                <div className="sat-wing__panel sat-wing__panel--3">
                  <div className="sat-wing__cells" />
                </div>
              </div>

              {/* High-Gain Parabolic Communications Dish */}
              <div className={`sat-dish ${activeSubsys.id === 'dish' ? 'is-active-subsys' : ''}`}>
                <div className="sat-dish__mast" />
                <div className="sat-dish__parabola">
                  <div className="sat-dish__mesh" />
                  <div className="sat-dish__feed" />
                </div>
              </div>

              {/* Synthetic Aperture Radar (SAR) Antenna Deck */}
              <div className={`sat-sar ${activeSubsys.id === 'sar' ? 'is-active-subsys' : ''}`}>
                <div className="sat-sar__array">
                  <div className="sat-sar__grid" />
                  <div className="sat-sar__beam" />
                </div>
              </div>

              {/* RCS Thrusters / AOCS Sensor Nodes */}
              <div className={`sat-thrusters ${activeSubsys.id === 'aocs' ? 'is-active-subsys' : ''}`}>
                <span className="sat-nozzle sat-nozzle--tl" />
                <span className="sat-nozzle sat-nozzle--tr" />
                <span className="sat-nozzle sat-nozzle--bl" />
                <span className="sat-nozzle sat-nozzle--br" />
                <span className="sat-star-tracker" />
              </div>
            </div>
          </div>

          {/* Quick Subsystem Hotspot Buttons on Canvas */}
          <div className="sat-showcase__hotspots">
            {SUBSYSTEMS.map((sys) => {
              const isSelected = sys.id === activeSubsys.id
              return (
                <button
                  key={sys.id}
                  type="button"
                  className={`sat-showcase__hotspot-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSubsysSelect(sys)
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Inspect subsystem: ${sys.name}`}
                >
                  <span className="sat-showcase__hotspot-dot" />
                  <span className="sat-showcase__hotspot-name hud-text">{sys.code.split('//')[1]?.trim()}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="sat-showcase__autorotate-btn hud-text"
            onClick={(e) => {
              e.stopPropagation()
              setIsAutoRotating((v) => !v)
            }}
          >
            {isAutoRotating ? 'PAUSE AUTO-ROTATE ⏸' : 'RESUME AUTO-ROTATE ▶'}
          </button>
        </div>

        {/* Right: Subsystem Telemetry Spec Inspector */}
        <div className="sat-showcase__inspector">
          {/* Mission Orbit Profile Selector */}
          <div className="sat-showcase__preset-selector">
            <span className="sat-showcase__section-eyebrow hud-text">MISSION CONFIGURATION</span>
            <div className="sat-showcase__preset-tabs">
              {MISSION_PRESETS.map((p, idx) => (
                <button
                  key={p.name}
                  type="button"
                  className={`sat-showcase__preset-tab ${idx === activePresetIndex ? 'is-active' : ''}`}
                  onClick={() => setActivePresetIndex(idx)}
                >
                  <span className="hud-text">{p.name.split('//')[0]?.trim()}</span>
                  <small className="hud-text">{p.orbit.split(' ')[0]}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Subsystem Detail Card */}
          <div className="sat-showcase__detail-card">
            <div className="sat-showcase__detail-header">
              <span className="sat-showcase__code-pill hud-text">{activeSubsys.code}</span>
              <span className="sat-showcase__status-pill hud-text">
                <span className="sat-showcase__dot" />
                TELEMETRY NOMINAL
              </span>
            </div>

            <h3 className="sat-showcase__subsys-name">{activeSubsys.name}</h3>
            <p className="sat-showcase__subsys-desc">{activeSubsys.description}</p>

            <div className="sat-showcase__spec-list">
              {activeSubsys.specs.map((spec, i) => (
                <div key={i} className="sat-showcase__spec-row hud-text">
                  <span className="sat-showcase__spec-bullet">▸</span>
                  <span>{spec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Flight Dynamics Gauges */}
          <div className="sat-showcase__dynamics-panel">
            <div className="sat-showcase__dynamics-header hud-text">
              <span>{currentPreset.designation}</span>
              <span style={{ color: 'var(--status-active)' }}>● {currentPreset.status}</span>
            </div>

            <div className="sat-showcase__gauge-grid">
              <div className="sat-showcase__gauge">
                <span className="sat-showcase__gauge-label hud-text">ALTITUDE</span>
                <strong className="sat-showcase__gauge-val">{currentPreset.altitude}</strong>
                <span className="sat-showcase__gauge-sub hud-text">{currentPreset.orbit}</span>
              </div>
              <div className="sat-showcase__gauge">
                <span className="sat-showcase__gauge-label hud-text">VELOCITY</span>
                <strong className="sat-showcase__gauge-val">{currentPreset.velocity}</strong>
                <span className="sat-showcase__gauge-sub hud-text">CIRCULAR VELOCITY</span>
              </div>
              <div className="sat-showcase__gauge">
                <span className="sat-showcase__gauge-label hud-text">INCLINATION</span>
                <strong className="sat-showcase__gauge-val">{currentPreset.inclination}</strong>
                <span className="sat-showcase__gauge-sub hud-text">EQUATORIAL OFFSET</span>
              </div>
              <div className="sat-showcase__gauge">
                <span className="sat-showcase__gauge-label hud-text">PERIOD</span>
                <strong className="sat-showcase__gauge-val">{currentPreset.period}</strong>
                <span className="sat-showcase__gauge-sub hud-text">ORBITAL DURATION</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
