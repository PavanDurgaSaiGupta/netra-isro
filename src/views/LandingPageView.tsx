import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import OrbitalLiftSection from '../components/landing/OrbitalLiftSection'
import SatelliteShowcase from '../components/landing/SatelliteShowcase'
import OdometerNumber from '../components/shell/OdometerNumber'
import { useSatelliteStats } from '../context/SatelliteContext'
import { DUR, EASE, prefersReducedMotion } from '../lib/motion'

gsap.registerPlugin(ScrollTrigger, SplitText)

/** Portal card mouse-parallax range at data-depth="1" (contract §4: ±8px). */
const PARALLAX_RANGE_PX = 8
/** Mission cards: rise + light-sweep fire once as each card enters the viewport. */
const CARD_ENTER = 'top 82%'
/** Safety net: start the hero intro even if the boot overlay never reports removal. */
const INTRO_FALLBACK_MS = 8000

export default function LandingPageView() {
  // T07: Consume static stats context instead of useSatellites to avoid 1.5s tick re-renders
  const { total, isroCount, debrisCount, apiStatus } = useSatelliteStats()

  const viewRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const earthBackdropRef = useRef<HTMLDivElement>(null)
  const earthRotatorRef = useRef<HTMLDivElement>(null)
  const earthRingRef = useRef<HTMLDivElement>(null)

  // T09: Prefetch LiveTrackingView chunk after page hydrates and enters idle
  useEffect(() => {
    const prefetchTracking = () => {
      import('./LiveTrackingView').catch(() => {})
    }
    const timer = setTimeout(prefetchTracking, 2200)
    return () => clearTimeout(timer)
  }, [])

  useGSAP(
    () => {
      const view = viewRef.current
      const portal = portalRef.current
      if (!view) return

      const reduced = prefersReducedMotion()
      const cleanups: Array<() => void> = []

      const title = view.querySelector<HTMLElement>('.hero__title')
      const scanline = view.querySelector<HTMLElement>('.landing-hero__scanline')
      const subEls = ['.hero__sub', '.hero__cta-row']
        .map((selector) => view.querySelector<HTMLElement>(selector))
        .filter((el): el is HTMLElement => el !== null)

      // Decorative sweep layers are hidden outright under reduced motion
      if (reduced && scanline) gsap.set(scanline, { autoAlpha: 0 })

      // Hero intro assembly
      let introStarted = false
      let introPlayed = false

      const startIntro = () => {
        if (introStarted || reduced) return
        introStarted = true

        if (title) {
          const split = SplitText.create(title, {
            type: 'words,lines',
            mask: 'lines',
            linesClass: 'landing-hero__line',
            autoSplit: true,
            onSplit: (self) => {
              if (introPlayed) return undefined
              introPlayed = true
              return gsap.from(self.words, {
                yPercent: 120,
                autoAlpha: 0,
                duration: DUR.slow,
                ease: EASE.entrance,
                stagger: 0.09,
                delay: 0.12,
              })
            },
          })
          cleanups.push(() => split.revert())
        }

        if (title && scanline) {
          const viewBox = view.getBoundingClientRect()
          const titleBox = title.getBoundingClientRect()
          gsap.set(scanline, {
            position: 'absolute',
            left: titleBox.left - viewBox.left,
            top: titleBox.top - viewBox.top - 12,
            width: titleBox.width,
            height: 2,
            zIndex: 2,
            pointerEvents: 'none',
            autoAlpha: 0,
          })
          gsap
            .timeline({ delay: 0.92 })
            .to(scanline, { autoAlpha: 0.9, duration: 0.12, ease: 'none' }, 0)
            .to(scanline, { y: titleBox.height + 24, duration: DUR.slow, ease: 'none' }, 0)
            .to(scanline, { autoAlpha: 0, duration: 0.18, ease: 'none' }, 0.5)
        }

        if (subEls.length) {
          gsap.fromTo(
            subEls,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: DUR.base,
              ease: EASE.entrance,
              stagger: 0.08,
              delay: 1.12,
            },
          )
        }
      }

      if (document.querySelector('.boot')) {
        const observer = new MutationObserver(() => {
          if (!document.querySelector('.boot')) {
            observer.disconnect()
            startIntro()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        cleanups.push(() => observer.disconnect())
        const fallback = window.setTimeout(() => {
          observer.disconnect()
          startIntro()
        }, INTRO_FALLBACK_MS)
        cleanups.push(() => window.clearTimeout(fallback))
      } else {
        startIntro()
      }

      // Mission cards: rise + light-sweep border reveal on enter
      gsap.utils.toArray<HTMLElement>('.mission-summary__card', view).forEach((card) => {
        const sweep = card.querySelector<HTMLElement>('.mission-summary__card-sweep')
        if (reduced) {
          if (sweep) gsap.set(sweep, { autoAlpha: 0 })
          return
        }

        card.style.position = 'relative'
        card.style.overflow = 'hidden'
        card.style.transition = 'none'
        const timeline = gsap.timeline({
          scrollTrigger: { trigger: card, start: CARD_ENTER, once: true },
          onComplete: () => {
            gsap.set(card, { clearProps: 'transform,opacity,visibility' })
            card.style.overflow = ''
            card.style.transition = ''
          },
        })
        timeline.fromTo(
          card,
          { y: 26, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: DUR.slow, ease: EASE.entrance },
          0,
        )
        if (sweep) {
          gsap.set(sweep, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            xPercent: -105,
            autoAlpha: 0,
            pointerEvents: 'none',
            zIndex: 2,
          })
          timeline
            .to(sweep, { autoAlpha: 1, duration: 0.16, ease: 'none' }, 0.14)
            .to(sweep, { xPercent: 105, duration: 0.85, ease: 'none' }, 0.14)
            .to(sweep, { autoAlpha: 0, duration: 0.22, ease: 'none' }, 0.8)
        }
      })

      // Portal card: two-layer mouse parallax via gsap.quickTo
      if (portal && !reduced) {
        const layers = Array.from(portal.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => {
          const parsed = Number.parseFloat(el.dataset.depth ?? '1')
          const depth = Number.isFinite(parsed) ? parsed : 1
          return {
            depth,
            xTo: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }),
            yTo: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }),
          }
        })

        if (layers.length) {
          const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') return
            const box = portal.getBoundingClientRect()
            const nx = gsap.utils.clamp(-1, 1, ((event.clientX - box.left) / box.width) * 2 - 1)
            const ny = gsap.utils.clamp(-1, 1, ((event.clientY - box.top) / box.height) * 2 - 1)
            layers.forEach(({ depth, xTo, yTo }) => {
              xTo(nx * PARALLAX_RANGE_PX * depth)
              yTo(ny * PARALLAX_RANGE_PX * depth)
            })
          }
          const onPointerLeave = () => {
            layers.forEach(({ xTo, yTo }) => {
              xTo(0)
              yTo(0)
            })
          }
          portal.addEventListener('pointermove', onPointerMove)
          portal.addEventListener('pointerleave', onPointerLeave)
          cleanups.push(() => {
            portal.removeEventListener('pointermove', onPointerMove)
            portal.removeEventListener('pointerleave', onPointerLeave)
          })
        }
      }

      // Persistent Cinematic Earth Orbit Backdrop — Scroll-Driven Planetary Rotation (Anime.js Engine Style)
      const scroller = document.querySelector<HTMLElement>('.app-shell__viewport') || document.documentElement
      const rotator = earthRotatorRef.current
      const ring = earthRingRef.current
      const backdrop = earthBackdropRef.current

      if (rotator && !reduced) {
        let targetProgress = 0
        let currentProgress = 0
        let mouseTiltX = 0
        let mouseTiltY = 0
        let rafId: number
        let lastReportedTilt = 23.4

        const MAX_ROTATION_SCROLL = 1450 // Spans Hero through Orbital Lift
        const FADE_START_SCROLL = 1100
        const FADE_END_SCROLL = 1750

        const updateScrollTarget = () => {
          const top = scroller ? scroller.scrollTop : window.scrollY
          targetProgress = Math.min(1, Math.max(0, top / MAX_ROTATION_SCROLL))

          // Dissolve Earth into deep void as user approaches 3D Satellite Anatomy
          if (backdrop) {
            if (top <= FADE_START_SCROLL) {
              backdrop.style.opacity = '1'
            } else if (top >= FADE_END_SCROLL) {
              backdrop.style.opacity = '0'
            } else {
              const fadeRatio = 1 - (top - FADE_START_SCROLL) / (FADE_END_SCROLL - FADE_START_SCROLL)
              backdrop.style.opacity = fadeRatio.toFixed(3)
            }
          }
        }

        const renderLoop = () => {
          // Smooth Anime.js-style kinetic inertia lerp
          const delta = targetProgress - currentProgress
          if (Math.abs(delta) > 0.0003) {
            currentProgress += delta * 0.088
          } else {
            currentProgress = targetProgress
          }

          // Planetary axial rotation along orbital plane (0° -> 34°)
          const rotZ = currentProgress * 34
          const rotY = currentProgress * 14 + mouseTiltX
          const rotX = -currentProgress * 6 + mouseTiltY
          const scale = 1.02 + currentProgress * 0.14
          const yDrift = currentProgress * 42

          rotator.style.transform = `translate3d(0, ${yDrift.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotateZ(${rotZ.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`

          if (ring) {
            const ringRot = -18 - currentProgress * 44
            const ringScale = 1 + currentProgress * 0.18
            const ringAlpha = Math.max(0, 1 - currentProgress * 1.25)
            ring.style.transform = `rotate(${ringRot.toFixed(1)}deg) scale(${ringScale.toFixed(2)})`
            ring.style.opacity = ringAlpha.toFixed(2)
          }

          const currentTilt = Number.parseFloat((23.4 + currentProgress * 14.8).toFixed(1))
          if (Math.abs(currentTilt - lastReportedTilt) >= 0.2) {
            lastReportedTilt = currentTilt
            const tiltEl = document.getElementById('hero-orbital-tilt')
            if (tiltEl) {
              tiltEl.textContent = `DSSAM ISTRAC BENGALURU • ORBITAL TILT: ${currentTilt}°`
            }
          }

          rafId = requestAnimationFrame(renderLoop)
        }

        rafId = requestAnimationFrame(renderLoop)

        const onScroll = () => {
          updateScrollTarget()
        }

        const onPointerMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          const nx = (e.clientX / window.innerWidth - 0.5) * 2
          const ny = (e.clientY / window.innerHeight - 0.5) * 2
          mouseTiltX = nx * 3.6
          mouseTiltY = -ny * 2.8
        }

        scroller.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('pointermove', onPointerMove, { passive: true })
        updateScrollTarget()

        cleanups.push(() => {
          cancelAnimationFrame(rafId)
          scroller.removeEventListener('scroll', onScroll)
          window.removeEventListener('pointermove', onPointerMove)
        })
      }

      return () => {
        cleanups.forEach((fn) => fn())
      }
    },
    { scope: viewRef },
  )

  return (
    <div className="landing-view" ref={viewRef}>
      {/* Persistent Cinematic Earth Orbit Backdrop with Scroll-Driven Planetary Rotation (Anime.js Style) */}
      <div className="landing-bg-earth" ref={earthBackdropRef} aria-hidden="true">
        <div className="landing-bg-earth__rotator" ref={earthRotatorRef}>
          <picture>
            <source srcSet={`${import.meta.env.BASE_URL}earth_orbit_cinematic.webp`} type="image/webp" />
            <img
              src={`${import.meta.env.BASE_URL}earth_orbit_cinematic.jpg`}
              alt=""
              className="landing-bg-earth__img"
              width={1376}
              height={768}
              loading="eager"
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="landing-bg-earth__ring" ref={earthRingRef} />
        <div className="landing-bg-earth__overlay" />
      </div>

      {/* Floating Tactical Quick Launch Bar */}
      <div className="landing-view__quick-bar hud-text">
        <span className="landing-view__quick-status">
          <span className="landing-view__quick-dot" />
          EDUCATIONAL CONSOLE • EPHEMERIS: {apiStatus}
        </span>
        <div className="landing-view__quick-actions">
          <Link
            to="/tracking"
            className="landing-view__quick-btn landing-view__quick-btn--primary"
          >
            ENTER 3D COCKPIT ↗
          </Link>
          <Link
            to="/catalog"
            className="landing-view__quick-btn"
          >
            VIEW SATELLITE CATALOG
          </Link>
        </div>
      </div>

      {/* Scene 1: Cinematic Hero with Earth Orbit Backdrop & Kinetic Typography */}
      <Hero />
      <span className="landing-hero__scanline" aria-hidden="true" />

      {/* Scene 2: Orbital Lift & Ground-to-GEO Altitude Stratification */}
      <OrbitalLiftSection />

      {/* Scene 3: Interactive 3D Satellite Anatomy & Subsystem Explorer */}
      <SatelliteShowcase />

      {/* Scene 4: Mission Telemetry & Data Cards with Animated Odometers */}
      <section className="mission-summary" aria-label="Catalog at a glance">
        <Link to="/catalog" className="mission-summary__card">
          <span className="hud-text">01 / EXPLORE THE CATALOG</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>
            <OdometerNumber value={total || 14} />
            <small>modeled objects</small>
          </strong>
          <span>Search spacecraft and inspect orbital elements <span aria-hidden="true">↗</span></span>
        </Link>
        <Link to="/tracking" className="mission-summary__card">
          <span className="hud-text">02 / FOLLOW THE FLEET</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>
            <OdometerNumber value={isroCount || 8} />
            <small>Indian spacecraft</small>
          </strong>
          <span>Explore the globe from a new perspective <span aria-hidden="true">↗</span></span>
        </Link>
        <Link to="/debris" className="mission-summary__card">
          <span className="hud-text">03 / UNDERSTAND THE ENVIRONMENT</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>
            <OdometerNumber value={debrisCount || 4} />
            <small>debris examples</small>
          </strong>
          <span>Learn about orbital debris and illustrative risks <span aria-hidden="true">↗</span></span>
        </Link>
      </section>
      <p className="mission-disclaimer">Independent educational visualization, not an official ISRO service. Positions are propagated estimates; seed elements, alerts, and risk scenarios are illustrative, not operational guidance.</p>

      {/* Scene 5: 3D Mission Cockpit Launch Portal Banner */}
      <section className="landing-view__portal-section" id="cockpit-portal">
        <div className="portal-card" ref={portalRef}>
          <div className="portal-card__glow-line" />

          <div className="portal-card__header" data-depth="0.4">
            <div className="portal-card__badge-group">
              <span className="portal-card__tag hud-text">DSSAM TACTICAL GRID</span>
              <span className="portal-card__live-pill hud-text">
                <span className="portal-card__live-dot" />
                SGP4 REAL-TIME PROPAGATION
              </span>
            </div>
            <span className="portal-card__coord hud-text">
              ISTRAC BENGALURU: 12.9716° N, 77.5946° E
            </span>
          </div>

          <div className="portal-card__body">
            <div className="portal-card__text-block">
              <h2 className="portal-card__title display">
                ENTER LIVE 3D ORBITAL <span className="accent">COCKPIT</span>
              </h2>
              <p className="portal-card__desc">
                Inspect Bharat’s satellites in real-time. Seamlessly click any payload or debris fragment to zoom into its trajectory, review live coordinates and look-angles, and glide smoothly between satellites in full 3D space.
              </p>

              {/* Quick Telemetry Chips */}
              <div className="portal-card__chips hud-text">
                <div className="portal-card__chip">
                  <span className="portal-card__chip-label">ISRO ACTIVE FLEET:</span>
                  <span className="portal-card__chip-val" style={{ color: 'var(--status-active)' }}>
                    {isroCount || 8} PAYLOADS
                  </span>
                </div>
                <div className="portal-card__chip">
                  <span className="portal-card__chip-label">TRACKED DEBRIS:</span>
                  <span className="portal-card__chip-val" style={{ color: 'var(--status-warning)' }}>
                    {debrisCount || 4} CRITICAL BODIES
                  </span>
                </div>
                <div className="portal-card__chip">
                  <span className="portal-card__chip-label">ORBIT REGIMES:</span>
                  <span className="portal-card__chip-val" style={{ color: 'var(--accent-cyan)' }}>
                    LEO • SSO • MEO • GEO
                  </span>
                </div>
              </div>

              {/* T13: Consistent tactile CTA button */}
              <div className="portal-card__action-row">
                <Link
                  to="/tracking"
                  className="portal-card__launch-btn"
                >
                  <span className="portal-card__launch-icon">◎</span>
                  <span>ENTER 3D COCKPIT ↗</span>
                </Link>
                <Link
                  to="/catalog"
                  className="portal-card__secondary-btn hud-text"
                >
                  BROWSE ALL {total || 14} SATELLITES →
                </Link>
              </div>
            </div>

            {/* Tactical 3D Preview Radar Widget */}
            <div className="portal-card__preview-panel" data-depth="1">
              <div className="portal-card__preview-frame">
                <div className="portal-card__radar-sweep" />
                <div className="portal-card__radar-rings" />
                <div className="portal-card__radar-crosshair" />

                {/* T12: Accessible Earth Ground Station Icon */}
                <div className="portal-card__preview-center">
                  <svg
                    className="portal-card__earth-svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="1.5"
                    aria-label="Earth ground station center at ISTRAC Bengaluru"
                    role="img"
                  >
                    <circle cx="12" cy="12" r="10" stroke="#00f0ff" strokeWidth="1.5" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#00f0ff" opacity="0.75" />
                  </svg>
                  <span className="portal-card__preview-station hud-text">ISTRAC BLR</span>
                </div>

                {/* T19: Accessible Interactive Orbit Nodes */}
                <button
                  type="button"
                  className="portal-card__orbit-node portal-card__orbit-node--1"
                  title="CARTOSAT-3 (LEO 505 km)"
                  aria-label="CARTOSAT-3, Low Earth Orbit at 505 km"
                >
                  <span className="portal-card__node-dot" />
                  <span className="portal-card__node-label hud-text">CARTOSAT-3</span>
                </button>
                <button
                  type="button"
                  className="portal-card__orbit-node portal-card__orbit-node--2"
                  title="RISAT-2B (LEO 556 km)"
                  aria-label="RISAT-2B, Low Earth Orbit at 556 km"
                >
                  <span className="portal-card__node-dot" />
                  <span className="portal-card__node-label hud-text">RISAT-2B</span>
                </button>
                <button
                  type="button"
                  className="portal-card__orbit-node portal-card__orbit-node--3"
                  title="GSAT-7A (GEO 35,786 km)"
                  aria-label="GSAT-7A, Geostationary Orbit at 35,786 km"
                >
                  <span className="portal-card__node-dot" style={{ background: '#3ecf8e' }} />
                  <span className="portal-card__node-label hud-text">GSAT-7A (GEO)</span>
                </button>
                <button
                  type="button"
                  className="portal-card__orbit-node portal-card__orbit-node--4"
                  title="IRIDIUM 33 DEBRIS"
                  aria-label="IRIDIUM 33 DEBRIS, Fragment Body"
                >
                  <span className="portal-card__node-dot" style={{ background: '#ff3b3b' }} />
                  <span className="portal-card__node-label hud-text">IRIDIUM DEB</span>
                </button>
              </div>

              <div className="portal-card__preview-caption hud-text">
                <span>INTERACTIVE 3D GLOBE READY</span>
                <span style={{ color: 'var(--status-active)' }}>● CLICK TO ENTER</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scene 6: Editorial Mission Brief & Footer */}
      <Footer />
    </div>
  )
}
