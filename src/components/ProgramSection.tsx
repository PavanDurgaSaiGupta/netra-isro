import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '../lib/motion'

gsap.registerPlugin(ScrollTrigger)

const NAV = [
  { id: '01', title: 'HOME', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '02', title: 'NEWS & EVENTS', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '03', title: 'MULTIMEDIA', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '04', title: 'ISRO+', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '05', title: 'MISSIONS', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '06', title: 'GAGANYAAN', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '07', title: 'AERONAUTICS', pct: '100%', status: 'ACTIVE', link: '#top' },
  { id: '08', title: 'ABOUT ISRO', pct: '100%', status: 'ACTIVE', link: '#top' },
]

export default function ProgramSection() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const wash = root.querySelector<HTMLElement>('.program__wash')
      const content = root.querySelector<HTMLElement>('.program__content')
      if (!wash || !content) return

      if (prefersReducedMotion()) {
        // Static composition: the scrub's end state (orange flooded, copy flipped dark).
        gsap.set(wash, { '--wedge': '0%' })
        gsap.set(content, { color: '#05070A' })
        return
      }

      // Diagonal orange wash widens with scroll (slight lag reads more cinematic than 1:1)
      gsap.fromTo(
        wash,
        { '--wedge': '100%' },
        {
          '--wedge': '0%',
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 80%',
            end: 'center center',
            scrub: 0.6,
          },
        },
      )

      // Text flips dark as the orange floods in
      gsap.fromTo(
        content,
        { color: '#f3f4f1' },
        {
          color: '#05070A',
          scrollTrigger: {
            trigger: root,
            start: 'top 55%',
            end: 'center 40%',
            scrub: 0.6,
          },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section className="program" id="program" ref={rootRef}>
      <div className="program__wash" aria-hidden="true" />

      <div className="program__content">
        <div className="program__header-block">
          <span className="kicker hud-text">JOIN THE MISSION</span>
          <h2 className="display">
            BECOME PART
            <br />
            OF THE MISSION
          </h2>
          <p className="program__lead">
            India's approach to orbital stewardship pairs indigenous tracking radar and optical
            facilities under NETRA with aggressive debris-mitigation rules for every new launch.
            From passivation of spent stages to de-orbiting within 25 years (and far sooner for
            missions launched after 2025), the goal is a sustainable orbital environment for the
            next century of spaceflight.
          </p>
        </div>

        <div className="program__sub-banner hud-text">
          <span>- JOIN THE PROGRAMS -</span>
        </div>

        <ul className="program__nav" role="list">
          {NAV.map((item) => (
            <li key={item.id} className="program__nav-item">
              <a
                href={item.link}
                onClick={(e) => {
                  if (item.link === '#top') {
                    e.preventDefault()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="program__nav-link"
              >
                <div className="program__nav-left">
                  <span className="program__nav-num hud-text">{item.id}</span>
                  <span className="program__nav-title">{item.title}</span>
                </div>

                <div className="program__nav-right hud-text">
                  <span className="program__nav-pct">{item.pct}</span>
                  <span className="program__nav-status">
                    {item.status} <i className="program__cursor" aria-hidden="true">▍</i>
                  </span>
                  <span className="program__nav-action">FOLLOW THE LINK →</span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="program__meta-row hud-text">
          <div>PAGE LAST UPDATED: 26/08/2026 IST</div>
          <div>SITEMAP</div>
          <div>DIRECTORATE OF SPACE SITUATION AWARENESS &amp; MANAGEMENT (DSSAM)</div>
          <div>ISTRAC BANGALORE</div>
        </div>

        <div className="program__wordmark display" aria-hidden="true">
          ISRO
        </div>
      </div>
    </section>
  )
}
