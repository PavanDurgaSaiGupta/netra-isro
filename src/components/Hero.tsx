import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import gsap from 'gsap'
import { playBlip, playLockSound } from '../utils/audio'

const BRACKET_LINE = ['SPACE', 'IS', 'BHARAT’S', 'NEXT', 'FRONTIER']

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Word-by-word reveal using anime.js
    if (rootRef.current) {
      const words = rootRef.current.querySelectorAll('.hero-word')
      if (words.length > 0) {
        animate(Array.from(words), {
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 700,
          delay: stagger(90, { start: 350 }),
          ease: 'outQuad',
        })
      }
    }

    // Bouncing scroll cue (GSAP)
    const bounce = gsap.to(cueRef.current, {
      y: 8,
      repeat: -1,
      yoyo: true,
      duration: 0.9,
      ease: 'power1.inOut',
    })

    return () => {
      bounce.kill()
    }
  }, [])

  return (
    <section className="hero" ref={rootRef} id="top">
      {/* Photorealistic Authentic Earth Imagery Backdrop */}
      <div className="hero__earth-backdrop">
        <img
          src="/earth_orbit_cinematic.jpg"
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
            onClick={() => playLockSound()}
          >
            ENTER 3D COCKPIT ↗
          </Link>
          <Link
            to="/catalog"
            className="u-link hud-text"
            onClick={() => playBlip(1100, 0.02)}
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
