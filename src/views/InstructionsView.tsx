import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import Footer from '../components/Footer'
import './InstructionsView.css'

function Key({ children }: { children: ReactNode }) {
  return <kbd className="hud-key">{children}</kbd>
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="guide-steps">
      {items.map((item, i) => (
        <li key={i} data-step={String(i + 1).padStart(2, '0')}>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

export default function InstructionsView() {
  return (
    <div className="about-view">
      <div className="about-view__inner">
        {/* Hero */}
        <section className="about-view__hero">
          <span className="kicker hud-text">NETRA // OPERATOR FLIGHT MANUAL</span>
          <h1 className="about-view__headline display">
            HOW TO RUN THE COCKPIT
          </h1>
          <p className="about-view__lead">
            Everything NETRA can do, in the order you will need it — from boot to live
            tracking, on a desktop or a phone. No account, no setup, no manual required.
          </p>
          <div className="guide-cta">
            <Link to="/tracking" className="btn-primary">
              LAUNCH LIVE 3D COCKPIT ↗
            </Link>
          </div>
        </section>

        <div className="guide-grid">
          {/* 01 — Boot sequence */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">01 // BOOT SEQUENCE</span>
            <h2 className="guide-card__title">From load to liftoff</h2>
            <Steps
              items={[
                <>On first load NETRA runs a diagnostic boot — planetary textures, SGP4 orbital math, and WebGL rendering are verified in sequence.</>,
                <>A confirmation HUD reports each subsystem as it comes online; rows flip to <strong>ONLINE</strong> one by one.</>,
                <>When every row is ONLINE the cockpit engages by itself after a short countdown, or press <strong>CONFIRM &amp; ENTER 3D COCKPIT</strong> to go immediately.</>,
                <>Closed it early? The <strong>3D COCKPIT</strong> tab re-opens the view at any time.</>,
              ]}
            />
            <p className="guide-note">
              On slower connections the boot waits for the 3D engine to finish downloading —
              the countdown starts only once every subsystem reports in.
            </p>
          </section>

          {/* 02 — Cockpit controls */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">02 // 3D COCKPIT CONTROLS</span>
            <h2 className="guide-card__title">Fly the globe</h2>
            <Steps
              items={[
                <>Drag anywhere to orbit the camera around Earth; scroll or pinch to zoom from the full planet down to a single satellite.</>,
                <>Hover a marker to reveal its name; click it to open the inspector drawer with live orbital telemetry.</>,
                <>The inspector follows the selected satellite in real time — press <strong>Esc</strong> or its close control to dismiss it.</>,
              ]}
            />
            <div className="guide-kbd-row">
              <span>
                <Key>↑</Key>
                <Key>↓</Key> move through search results
              </span>
              <span>
                <Key>Enter</Key> inspect the highlighted result
              </span>
              <span>
                <Key>Esc</Key> close the inspector, suggestions, or side menu
              </span>
            </div>
          </section>

          {/* 03 — Search & filters */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">03 // FIND &amp; FILTER</span>
            <h2 className="guide-card__title">Locate any object</h2>
            <Steps
              items={[
                <>Type a satellite name, a NORAD ID, or an operator into the search box — results filter as you type.</>,
                <>Refine with the regime chips: <strong>ALL</strong> · <strong>ISRO</strong> · <strong>DEBRIS</strong> · <strong>LEO</strong> · <strong>GEO</strong>, to isolate one class of objects.</>,
                <>Use the clear control to drop the filter and bring back the full fleet.</>,
              ]}
            />
            <p className="guide-note">
              Selecting a result from the list jumps the camera and opens the inspector in one step.
            </p>
          </section>

          {/* 04 — Time controls */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">04 // TIME CONTROLS</span>
            <h2 className="guide-card__title">Bend time without losing truth</h2>
            <Steps
              items={[
                <>Orbits propagate from real ephemeris data — the clock chip shows the current simulation time.</>,
                <>Scrub the clock backward or forward in steps of 1 minute or 10 minutes to rewind or preview a pass.</>,
                <>Accelerate time to <strong>1×</strong>, <strong>10×</strong>, or <strong>60×</strong> real time to watch whole orbits unfold in seconds.</>,
                <>The <strong>LIVE</strong> control snaps the clock back to real time; the badge reads LIVE whenever you are within 2.5 seconds of now.</>,
              ]}
            />
          </section>

          {/* 05 — Mobile */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">05 // ON YOUR PHONE</span>
            <h2 className="guide-card__title">The mobile HUD</h2>
            <Steps
              items={[
                <>Phones get a floating chip tray at the top: <strong>SEARCH</strong> · <strong>TELEMETRY</strong> · <strong>RADAR</strong> · <strong>STATUS</strong>. Tap a chip to slide its panel in.</>,
                <>One panel opens at a time; tap the backdrop or the panel close control to dismiss it.</>,
                <>Navigate the whole site from the bottom bar: BRIEFING, 3D COCKPIT, CATALOG, DEBRIS, ALERTS, and this GUIDE.</>,
                <>For smooth frames on small screens, marker labels appear only for the selected satellite — tap a marker to reveal its name.</>,
              ]}
            />
          </section>

          {/* 06 — Performance tiers */}
          <section className="guide-card guide-card--wide">
            <span className="guide-card__num hud-text">06 // PERFORMANCE TIERS</span>
            <h2 className="guide-card__title">Smooth on every device</h2>
            <p className="guide-card__desc">
              NETRA profiles your screen size, CPU cores, and memory on load, then picks a
              rendering tier so the cockpit stays responsive — from workstations down to
              entry-level phones.
            </p>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Behaviour</th>
                  <th>Typical devices</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HIGH</td>
                  <td>Full effects — atmosphere, city lights, and a label on every satellite.</td>
                  <td>Desktop GPUs, modern laptops</td>
                </tr>
                <tr>
                  <td>MEDIUM</td>
                  <td>Reduced effects and a shorter label range.</td>
                  <td>Tablets, mid-range laptops</td>
                </tr>
                <tr>
                  <td>LOW</td>
                  <td>Minimal effects; labels appear for the selected or hovered satellite only.</td>
                  <td>Phones, low-end hardware</td>
                </tr>
              </tbody>
            </table>
            <p className="guide-note">
              If the frame rate still drops, the renderer automatically steps the tier down —
              tracking keeps running, visual detail is trimmed.
            </p>
          </section>

          {/* 07 — Data sources */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">07 // LIVE DATA</span>
            <h2 className="guide-card__title">Where the numbers come from</h2>
            <Steps
              items={[
                <>Two-line elements refresh live from CelesTrak and the SatNOGS database, then propagate with the SGP4 model — the same mathematics flight-dynamics teams use.</>,
                <>If a feed is unreachable or rate-limited, NETRA falls back to a bundled demo catalog so the sky is never empty.</>,
                <>Expect 90+ objects when the full catalog loads; the exact count depends on the feed and your active filters.</>,
              ]}
            />
          </section>

          {/* 08 — Troubleshooting */}
          <section className="guide-card">
            <span className="guide-card__num hud-text">08 // TROUBLESHOOTING</span>
            <h2 className="guide-card__title">If something looks off</h2>
            <Steps
              items={[
                <><strong>Empty canvas instead of the globe.</strong> Your browser could not provide WebGL; NETRA shows a 2D telemetry notice and keeps the data panels alive. Try another browser or enable hardware acceleration.</>,
                <><strong>Satellites without name labels.</strong> On the LOW tier, labels follow selection only — click or tap a marker to reveal it.</>,
                <><strong>403 warnings in the browser console.</strong> The public TLE feeds are rate-limited; the demo fallback covers the gap automatically.</>,
                <><strong>Frames turn choppy over time.</strong> The tier system has already trimmed effects — closing other GPU-heavy tabs helps on low-end machines.</>,
              ]}
            />
          </section>
        </div>

        <Footer />
      </div>
    </div>
  )
}
