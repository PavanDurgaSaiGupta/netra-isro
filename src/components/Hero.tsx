import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { DUR, EASE, gsap, stagger, useGSAP } from '../lib/motion'

const BRACKET_LINE = ['SPACE', 'IS', 'BHARAT’S', 'NEXT', 'FRONTIER']

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // Reduced motion: no JS at all — the default DOM (visible words, still cue)
      // IS the end-state; gsap.matchMedia re-evaluates if the OS setting changes.
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Word-by-word assemble — stagger 90ms, entrance deceleration (contract §4)
        gsap.fromTo(
          '.hero-word',
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: DUR.slow,
            ease: EASE.entrance,
            delay: 0.35,
            stagger: stagger(BRACKET_LINE.length, 0.09),
          },
        )

        // Bouncing scroll cue (ambient loop)
        gsap.to(cueRef.current, {
          y: 8,
          repeat: -1,
          yoyo: true,
          duration: 0.9,
          ease: 'power1.inOut',
        })
      })
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [] },
  )

  return (
    <section className="hero" ref={rootRef} id="top">
      {/* Photorealistic Authentic Earth Imagery Backdrop */}
      <div className="hero__earth-backdrop">
        <img
          src={`${import.meta.env.BASE_URL}earth_orbit_cinematic.jpg`}
          alt="Planet Earth from orbit showing the Indian subcontinent and atmospheric blue corona"
          className="hero__earth-img"
        />
        <div className="hero__earth-overlay" />
      </div>

      {/* Technical HUD corner reticles */}
      <span className="hero__corner hero__corner--tl" aria-hidden="true" />
      <span className="hero__corner hero__corner--tr" aria-hidden="true" />

      {/* Telemetry coordinate watermark */}
      <div className="hero__telemetry-tag hud-text" aria-hidden="true">
        <span>TRACKING RADAR: 12.9716° N, 77.5946° E</span>
        <span>DSSAM ISTRAC BENGALURU • APOGEE 35,786 KM</span>
      </div>

      <div className="hero__inner">
        <p className="hud-text hero__bracket-line" aria-label={BRACKET_LINE.join(' ')}>
          <span className="bracket" aria-hidden="true">[</span>
          {BRACKET_LINE.map((w) => (
            <span key={w} className="word hero-word" aria-hidden="true">
              {w}&nbsp;
            </span>
          ))}
          <span className="bracket" aria-hidden="true">]</span>
        </p>

        <h1 className="display hero__title">
          BHARAT'S EYES
          <br />
          IN <span className="accent">ORBIT</span>
        </h1>

        <p className="hero__sub">
          Project NETRA (Network for space object Tracking and Analysis) continuously tracks space debris and active orbital payloads across Low Earth, Medium Earth, and Geostationary orbits — protecting India's space assets 24×7.
        </p>

        <div className="hero__cta-row">
          <Link
            to="/tracking"
            className="btn-primary"
          >
            ENTER 3D COCKPIT ↗
          </Link>
          <Link
            to="/catalog"
            className="u-link hud-text"
          >
            VIEW SATELLITE CATALOG →
          </Link>
        </div>
      </div>

      <div className="hero__scroll-cue hud-text" ref={cueRef} aria-hidden="true">
        <span>SCROLL</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  )
}
