import { useRef } from 'react'
import ProgramSection from '../components/ProgramSection'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'
import { DUR, EASE, gsap, prefersReducedMotion, stagger, useGSAP } from '../lib/motion'

export default function AboutView() {
  const timelineRef = useRef<HTMLDivElement>(null)

  // Contract §4: timeline items reveal on scroll via the shared stagger helper
  // (60ms steps, inside the 500ms budget). Copy is untouched.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const root = timelineRef.current
      if (!root) return
      const items = root.querySelectorAll<HTMLElement>('.about-timeline__item')
      if (!items.length) return
      gsap.from(items, {
        opacity: 0,
        y: 28,
        duration: DUR.BASE,
        ease: EASE.ENTRANCE,
        stagger: stagger(items.length),
        scrollTrigger: { trigger: root, start: 'top 78%', once: true },
      })
    },
    { scope: timelineRef },
  )

  return (
    <div className="about-view">
      <div className="about-view__inner">
        {/* Editorial Mission Statement */}
        <section className="about-view__hero">
          <span className="kicker hud-text">ISRO DSSAM // BHARAT SPACE SITUATIONAL AWARENESS DIRECTORY</span>
          <h1 className="about-view__headline display">
            PROJECT NETRA: GUARDIAN OF BHARAT'S ASSETS IN ORBIT
          </h1>
          <p className="about-view__lead">
            The <strong>Network for space object Tracking and Analysis (NETRA)</strong> operates as the premier nerve center for India’s Space Situational Awareness (SSA). Established under the <strong>Directorate of Space Situational Awareness and Management (DSSAM)</strong> at ISRO Telemetry, Tracking and Command Network (ISTRAC), Bengaluru, NETRA protects national satellite investments valued over ₹50,000 Crore.
          </p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link
              to="/tracking"
              className="btn-primary"
            >
              LAUNCH LIVE 3D TRACKING COCKPIT ↗
            </Link>
          </div>
        </section>

        {/* Pillars Grid */}
        <div className="about-view__pillars">
          <div className="about-view__pillar-card">
            <span className="about-view__pillar-num hud-text">01 // RADAR SURVEILLANCE</span>
            <h2 className="about-view__pillar-title">Multi-Object Tracking Radars (MOTR)</h2>
            <p className="about-view__pillar-desc">
              Dedicated high-power phased array radars capable of spotting and cataloging space debris down to 10 cm size at 1,500 km altitude, feeding precise orbital state vectors to the DSSAM control center.
            </p>
          </div>

          <div className="about-view__pillar-card">
            <span className="about-view__pillar-num hud-text">02 // OPTICAL OBSERVATORIES</span>
            <h2 className="about-view__pillar-title">Deep Space Electro-Optical Telescopes</h2>
            <p className="about-view__pillar-desc">
              High-aperture optical telescopes placed at Mount Abu, Hanle, and Ponmudi monitoring deep space, Geostationary Earth Orbit (GEO) satellites, and orbital graveyard corridors.
            </p>
          </div>

          <div className="about-view__pillar-card">
            <span className="about-view__pillar-num hud-text">03 // COLLISION AVOIDANCE</span>
            <h2 className="about-view__pillar-title">Autonomous Maneuver Planning (CAM)</h2>
            <p className="about-view__pillar-desc">
              Proprietary SGP4 algorithms calculating probability of collision ($P_c$) in real time. If a close approach falls under the 1.0 km threshold, automated avoidance burns are synchronized with satellite bus thrusters.
            </p>
          </div>

          <div className="about-view__pillar-card">
            <span className="about-view__pillar-num hud-text">04 // GLOBAL DATA FEDERATION</span>
            <h2 className="about-view__pillar-title">Inter-Agency Coordination (IADC &amp; UN)</h2>
            <p className="about-view__pillar-desc">
              Active liaison with the Inter-Agency Space Debris Coordination Committee (IADC) and the UN Committee on the Peaceful Uses of Outer Space (UN COPUOS) for cross-verifying close orbital passes.
            </p>
          </div>
        </div>

        {/* Government Operational Milestones */}
        <section className="about-view__milestones">
          <div className="debris-screening-section__head">
            <div>
              <span className="hud-text kicker">STRATEGIC TIMELINE &amp; MANDATE</span>
              <h2 className="display" style={{ fontSize: '20px', margin: '4px 0 0' }}>
                NETRA PROGRAM EVOLUTION
              </h2>
            </div>
          </div>

          <div className="about-timeline" ref={timelineRef}>
            <div className="about-timeline__item">
              <div className="about-timeline__year hud-text">DECEMBER 2020</div>
              <div className="about-timeline__body">
                <h3 className="about-timeline__title">Dedication of NETRA Control Center</h3>
                <p className="about-timeline__text">
                  Dedicated by ISRO Chairman at ISTRAC Bengaluru campus as India’s dedicated SSA nerve center.
                </p>
              </div>
            </div>

            <div className="about-timeline__item">
              <div className="about-timeline__year hud-text">MARCH 2022</div>
              <div className="about-timeline__body">
                <h3 className="about-timeline__title">ISRO System for Safe &amp; Sustainable Operations (IS4OM)</h3>
                <p className="about-timeline__text">
                  Formal integration of multi-sensor fusion including Sriharikota MOTR and Mount Abu deep space telescopes.
                </p>
              </div>
            </div>

            <div className="about-timeline__item">
              <div className="about-timeline__year hud-text">CURRENT — 2026</div>
              <div className="about-timeline__body">
                <h3 className="about-timeline__title">Real-Time Autonomous Conjunction Shield</h3>
                <p className="about-timeline__text">
                  Tracking over 72,000 orbital fragments, executing over 20+ precise collision avoidance maneuvers per year across LEO and GEO.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Program Section */}
        <ProgramSection />

        {/* Official ISRO Contacts & Notice */}
        <section className="about-view__notice hud-text">
          <div className="about-view__notice-card">
            <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>
              DIRECTORATE OF SPACE SITUATIONAL AWARENESS AND MANAGEMENT (DSSAM)
            </span>
            <p style={{ margin: '8px 0', color: 'var(--text-secondary)' }}>
              ISRO Telemetry, Tracking and Command Network (ISTRAC), Peenya Industrial Area, Bengaluru, Karnataka 560058, Bharat (India).
            </p>
            <span className="hud__faint">
              FOR OFFICIAL NOTICES TO MARINERS &amp; AIRMEN (NOTAM): ssa-operations@isro.gov.in
            </span>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
