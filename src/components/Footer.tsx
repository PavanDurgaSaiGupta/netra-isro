export default function Footer() {
  return (
    <footer className="footer hud-text">
      <div className="footer__grid">
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            NETRA <span style={{ color: 'var(--accent-orange)' }}>—</span> BHARAT'S EYES IN ORBIT
          </div>
          <small>
            Concept project, not an official ISRO product. Not affiliated with or endorsed by the
            Indian Space Research Organisation. Satellite positions are illustrative SGP4
            propagations of publicly documented orbital elements; statistics are rounded for
            presentation.
          </small>
        </div>

        <div className="footer__meta">
          <small>
            EARTH TEXTURES © NASA VISIBLE EARTH / SOLAR SYSTEM SCOPE (CC)
            <br />
            TYPE: ORBITRON • SPACE MONO • INTER (GOOGLE FONTS)
          </small>
          <small style={{ textAlign: 'right' }}>
            BUILT WITH REACT • THREE.JS • GSAP • ANIME.JS
            <br />
            SGP4 PROPAGATION: SATELLITE.JS
            <br />
            <span style={{ color: 'var(--accent-orange)' }}>CYCLE 2485 • ALL SYSTEMS NOMINAL</span>
          </small>
        </div>
      </div>
    </footer>
  )
}
