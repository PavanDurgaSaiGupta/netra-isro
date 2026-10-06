import { useRef, useState } from 'react'
import OdometerNumber from './shell/OdometerNumber'
import { DUR, EASE, gsap, prefersReducedMotion, stagger, useGSAP } from '../lib/motion'

const PROGRAMS = [
  { pct: 96, name: 'NETRA - Debris Tracking', desc: 'Collision warnings issued to Indian fleet operators within hours of a conjunction alert.' },
  { pct: 88, name: 'PSLV / GSLV - Launch Vehicles', desc: 'Post-launch disposal burns and passivation on every mission since 2019.' },
  { pct: 74, name: 'Chandrayaan - Lunar Missions', desc: 'End-of-life lunar orbit disposal for long-lived orbiter hardware.' },
  { pct: 65, name: 'Aditya-L1 - Solar Observation', desc: 'Halo-orbit station-keeping planned around the debris environment at L1.' },
  { pct: 100, name: 'Gaganyaan - Human Spaceflight', desc: 'Every crewed window screened against the live debris catalogue.' },
]

export default function MissionStats() {
  const rootRef = useRef<HTMLElement>(null)
  // Flips once when the section enters the viewport; OdometerNumber then rolls
  // each numeral from 0 to its target. One setState on enter, never per-frame.
  const [live, setLive] = useState(false)

  // Queries are scoped to rootRef (no document.querySelectorAll leakage).
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      if (prefersReducedMotion()) {
        setLive(true)
        return
      }
      const rows = root.querySelectorAll<HTMLElement>('.stat-row')
      if (!rows.length) return
      gsap.from(rows, {
        opacity: 0,
        y: 32,
        duration: DUR.BASE,
        ease: EASE.ENTRANCE,
        stagger: stagger(rows.length),
        scrollTrigger: {
          trigger: root,
          start: 'top 82%',
          once: true,
          onEnter: () => setLive(true),
        },
      })
    },
    { scope: rootRef },
  )

  return (
    <section className="stats section-pad" ref={rootRef}>
      <span className="kicker hud-text">MISSION PROGRAM INDEX</span>
      <h2 className="display">PROGRAMMES UNDER WATCH</h2>

      {PROGRAMS.map((p) => (
        <article className="stat-row" key={p.name}>
          <div className="stat-row__pct">
            <OdometerNumber value={live ? p.pct : 0} className="stat-row__num" />
            <small>%</small>
          </div>
          <div className="stat-row__name">
            <strong>{p.name}</strong>
            {p.desc}
          </div>
          <div className="stat-row__status hud-text">
            <span className="stat-row__dot" aria-hidden="true" />
            <span>ACTIVE</span>
          </div>
          <a className="u-link hud-text" href="#program" style={{ color: 'var(--accent-orange)' }}>
            FOLLOW THE LINK →
          </a>
        </article>
      ))}
    </section>
  )
}
