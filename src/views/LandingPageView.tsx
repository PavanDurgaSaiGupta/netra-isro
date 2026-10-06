import { useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import { useSatellites } from '../context/SatelliteContext'
import { DUR, EASE, prefersReducedMotion } from '../lib/motion'

gsap.registerPlugin(ScrollTrigger, SplitText)

/** Portal card mouse-parallax range at data-depth="1" (contract §4: ±8px). */
const PARALLAX_RANGE_PX = 8
/** Mission cards: rise + light-sweep fire once as each card enters the viewport. */
const CARD_ENTER = 'top 82%'
/** Safety net: start the hero intro even if the boot overlay never reports removal. */
const INTRO_FALLBACK_MS = 8000

export default function LandingPageView() {
  const { satellites, apiStatus } = useSatellites()

  const isroSats = satellites.filter((s) => s.operator.includes('ISRO'))
  const debrisSats = satellites.filter((s) => s.type === 'debris')

  const viewRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

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

      // Decorative sweep layers are hidden outright under reduced motion, whatever
      // default visibility the stylesheet gives them.
      if (reduced && scanline) gsap.set(scanline, { autoAlpha: 0 })

      // §4 hero intro. The MissionPreloader covers the screen with an opaque .boot
      // overlay until ENTER (click / any key / auto-continue), then removes it from
      // the DOM, so the kinetic reveal starts the moment that element is gone and
      // is never spent behind the boot screen. An 8s timeout guards the edge case.
      let introStarted = false
      let introPlayed = false

      const startIntro = () => {
        if (introStarted || reduced) return
        introStarted = true

        // Kinetic headline: word-by-word assembly inside masked lines
        // (stagger 90ms, --ease-entrance, hero moment ≤ 640ms).
        if (title) {
          const split = SplitText.create(title, {
            type: 'words,lines',
            mask: 'lines',
            linesClass: 'landing-hero__line',
            autoSplit: true,
            onSplit: (self) => {
              // Re-splits (late font swap, resize) after the intro stay settled.
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

        // One cyan scanline pass over the assembled headline.
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

        // Sub-copy and CTAs fade up once the headline has been scanned.
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

      // Mission cards: rise + light-sweep border reveal on enter (§4).
      gsap.utils.toArray<HTMLElement>('.mission-summary__card', view).forEach((card) => {
        const sweep = card.querySelector<HTMLElement>('.mission-summary__card-sweep')
        if (reduced) {
          if (sweep) gsap.set(sweep, { autoAlpha: 0 })
          return
        }

        // The stylesheet transitions transform/background for hover-lift; suspend it
        // while GSAP drives the card, and restore the stylesheet on completion.
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

      // Portal card: two-layer mouse parallax via gsap.quickTo, ±8px at depth 1,
      // depth read from data-depth attributes, lerped by quickTo's tween pursuit.
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

      return () => {
        cleanups.forEach((fn) => fn())
      }
    },
    { scope: viewRef },
  )

  return (
    <div className="landing-view" ref={viewRef}>
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

      {/* Hero: headline, scanline and sub-copy are choreographed in useGSAP above */}
      <Hero />
      <span className="landing-hero__scanline" aria-hidden="true" />

      <section className="mission-summary" aria-label="Catalog at a glance">
        <Link to="/catalog" className="mission-summary__card">
          <span className="hud-text">01 / EXPLORE THE CATALOG</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>{satellites.length}<small>modeled objects</small></strong>
          <span>Search spacecraft and inspect orbital elements <span aria-hidden="true">↗</span></span>
        </Link>
        <Link to="/tracking" className="mission-summary__card">
          <span className="hud-text">02 / FOLLOW THE FLEET</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>{isroSats.length}<small>Indian spacecraft</small></strong>
          <span>Explore the globe from a new perspective <span aria-hidden="true">↗</span></span>
        </Link>
        <Link to="/debris" className="mission-summary__card">
          <span className="hud-text">03 / UNDERSTAND THE ENVIRONMENT</span>
          <span className="mission-summary__card-sweep" aria-hidden="true" />
          <strong>{debrisSats.length}<small>debris examples</small></strong>
          <span>Learn about orbital debris and illustrative risks <span aria-hidden="true">↗</span></span>
        </Link>
      </section>
      <p className="mission-disclaimer">Independent educational visualization, not an official ISRO service. Positions are propagated estimates; seed elements, alerts, and risk scenarios are illustrative, not operational guidance.</p>

      {/* 3D Mission Cockpit Launch Portal Banner */}
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
                    {isroSats.length} PAYLOADS
                  </span>
                </div>
                <div className="portal-card__chip">
                  <span className="portal-card__chip-label">TRACKED DEBRIS:</span>
                  <span className="portal-card__chip-val" style={{ color: 'var(--status-warning)' }}>
                    {debrisSats.length || 4} CRITICAL BODIES
                  </span>
                </div>
                <div className="portal-card__chip">
                  <span className="portal-card__chip-label">ORBIT REGIMES:</span>
                  <span className="portal-card__chip-val" style={{ color: 'var(--accent-cyan)' }}>
                    LEO • SSO • MEO • GEO
                  </span>
                </div>
              </div>

              {/* Huge tactile CTA button */}
              <div className="portal-card__action-row">
                <Link
                  to="/tracking"
                  className="portal-card__launch-btn"
                >
                  <span className="portal-card__launch-icon">◎</span>
                  <span>LAUNCH 3D SURVEILLANCE COCKPIT ↗</span>
                </Link>
                <Link
                  to="/catalog"
                  className="portal-card__secondary-btn hud-text"
                >
                  BROWSE ALL {satellites.length || 14} SATELLITES →
                </Link>
              </div>
            </div>

            {/* Tactical 3D Preview Radar Widget */}
            <div className="portal-card__preview-panel" data-depth="1">
              <div className="portal-card__preview-frame">
                <div className="portal-card__radar-sweep" />
                <div className="portal-card__radar-rings" />
                <div className="portal-card__radar-crosshair" />

                <div className="portal-card__preview-center">
                  <span className="portal-card__preview-icon">🌍</span>
                  <span className="portal-card__preview-station hud-text">ISTRAC BLR</span>
                </div>

                {/* Floating Orbit Nodes */}
                <div className="portal-card__orbit-node portal-card__orbit-node--1" title="CARTOSAT-3 (LEO 505 km)">
                  <span className="portal-card__node-dot" />
                  <span className="portal-card__node-label hud-text">CARTOSAT-3</span>
                </div>
                <div className="portal-card__orbit-node portal-card__orbit-node--2" title="RISAT-2B (LEO 556 km)">
                  <span className="portal-card__node-dot" />
                  <span className="portal-card__node-label hud-text">RISAT-2B</span>
                </div>
                <div className="portal-card__orbit-node portal-card__orbit-node--3" title="GSAT-7A (GEO 35,786 km)">
                  <span className="portal-card__node-dot" style={{ background: '#3ecf8e' }} />
                  <span className="portal-card__node-label hud-text">GSAT-7A (GEO)</span>
                </div>
                <div className="portal-card__orbit-node portal-card__orbit-node--4" title="IRIDIUM 33 DEBRIS">
                  <span className="portal-card__node-dot" style={{ background: '#ff3b3b' }} />
                  <span className="portal-card__node-label hud-text">IRIDIUM DEB</span>
                </div>
              </div>

              <div className="portal-card__preview-caption hud-text">
                <span>INTERACTIVE 3D GLOBE READY</span>
                <span style={{ color: 'var(--status-active)' }}>● CLICK TO ENTER</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <Footer />
    </div>
  )
}
