import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import { playBlip, playLockSound } from '../utils/audio'
import { useSatellites } from '../context/SatelliteContext'

export default function LandingPageView() {
  const { satellites, apiStatus } = useSatellites()

  const isroSats = satellites.filter((s) => s.operator.includes('ISRO'))
  const debrisSats = satellites.filter((s) => s.type === 'debris')

  return (
    <div className="landing-view">
      {/* Floating Tactical Quick Launch Bar */}
      <div className="landing-view__quick-bar hud-text">
        <span className="landing-view__quick-status">
          <span className="landing-view__quick-dot" />
          ISRO DSSAM SENSORS ONLINE • EPHEMERIS: {apiStatus}
        </span>
        <div className="landing-view__quick-actions">
          <Link
            to="/tracking"
            className="landing-view__quick-btn landing-view__quick-btn--primary"
            onClick={() => playLockSound()}
          >
            ENTER 3D COCKPIT ↗
          </Link>
          <Link
            to="/catalog"
            className="landing-view__quick-btn"
            onClick={() => playBlip(1100, 0.02)}
          >
            VIEW SATELLITE CATALOG
          </Link>
        </div>
      </div>

      {/* Hero Section with Photorealistic Authentic Earth */}
      <Hero />

      {/* 3D Mission Cockpit Launch Portal Banner */}
      <section className="landing-view__portal-section" id="cockpit-portal">
        <div className="portal-card">
          <div className="portal-card__glow-line" />
          
          <div className="portal-card__header">
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
                    {isroSats.length || 9} PAYLOADS
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
                  onClick={() => playLockSound()}
                >
                  <span className="portal-card__launch-icon">◎</span>
                  <span>LAUNCH 3D SURVEILLANCE COCKPIT ↗</span>
                </Link>
                <Link
                  to="/catalog"
                  className="portal-card__secondary-btn hud-text"
                  onClick={() => playBlip(1200, 0.02)}
                >
                  BROWSE ALL {satellites.length || 14} SATELLITES →
                </Link>
              </div>
            </div>

            {/* Tactical 3D Preview Radar Widget */}
            <div className="portal-card__preview-panel">
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
