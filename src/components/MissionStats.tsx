import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PROGRAMS = [
  { pct: 96, name: 'NETRA — Debris Tracking', desc: 'Collision warnings issued to Indian fleet operators within hours of a conjunction alert.' },
  { pct: 88, name: 'PSLV / GSLV — Launch Vehicles', desc: 'Post-launch disposal burns and passivation on every mission since 2019.' },
  { pct: 74, name: 'Chandrayaan — Lunar Missions', desc: 'End-of-life lunar orbit disposal for long-lived orbiter hardware.' },
  { pct: 65, name: 'Aditya-L1 — Solar Observation', desc: 'Halo-orbit station-keeping planned around the debris environment at L1.' },
  { pct: 100, name: 'Gaganyaan — Human Spaceflight', desc: 'Every crewed window screened against the live debris catalogue.' },
]

export default function MissionStats() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>('.stat-row').forEach((row, i) => {
        const numEl = row.querySelector<HTMLElement>('.stat-row__num')!
        const target = Number(numEl.dataset.target)
        const counter = { v: 0 }

        gsap.from(row, {
          opacity: 0,
          y: 32,
          duration: 0.9,
          ease: 'power3.out',
          delay: i * 0.08,
          scrollTrigger: { trigger: row, start: 'top 85%' },
        })
        gsap.to(counter, {
          v: target,
          duration: 1.4,
          ease: 'power4.out',
          scrollTrigger: { trigger: row, start: 'top 85%' },
          onUpdate: () => (numEl.textContent = String(Math.round(counter.v))),
        })
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section className="stats section-pad" ref={rootRef}>
      <span className="kicker hud-text">MISSION PROGRAM INDEX</span>
      <h2 className="display">PROGRAMMES UNDER WATCH</h2>

      {PROGRAMS.map((p) => (
        <article className="stat-row" key={p.name}>
          <div className="stat-row__pct">
            <span className="stat-row__num" data-target={p.pct}>
              0
            </span>
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
